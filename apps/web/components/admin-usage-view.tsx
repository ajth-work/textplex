"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminOnly } from "./admin-only";
import { AdminSubnav } from "./admin-subnav";
import { fetchJson, formatElapsed, type AdminAnalyticsOverview, type AdminUsageSummary } from "../lib/textplex";
import type { AnalyticsAccountRole } from "../../../packages/shared/src";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function metricValue(analytics: AdminAnalyticsOverview, key: string): number {
  return analytics.metrics.find((metric) => metric.key === key)?.value ?? 0;
}

type ActivityChartMode = "bars" | "line";
type FeatureRoleFilter = "all" | AnalyticsAccountRole;

const featureRoleOptions: Array<{ value: FeatureRoleFilter; label: string }> = [
  { value: "all", label: "All users" },
  { value: "member", label: "Members" },
  { value: "tester", label: "Testers" },
  { value: "admin", label: "Admins" },
];

const lineChartTop = 4.5;
const lineChartBottom = 15;
const lineChartHeight = 10.5;
const lineChartViewBoxHeight = 18;

function activityReads(point: AdminUsageSummary["activity"][number]): number {
  return point.page_reads + point.sentence_reads;
}

function buildSmoothLinePath(values: number[], maxValue: number): string {
  if (values.length === 0) return "";

  const points = values.map((value, index) => ({
    x: values.length === 1 ? 50 : 4 + (index / (values.length - 1)) * 92,
    y: lineChartBottom - (value / maxValue) * lineChartHeight,
  }));

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function StatCard({ label, value, detail, inventoryId }: { label: string; value: string; detail: string; inventoryId: string }) {
  return (
    <article className="card admin-usage-stat-card" data-inventory-id={inventoryId}>
      <span className="eyebrow">{label}</span>
      <strong className="admin-usage-stat-value">{value}</strong>
      <span className="small-copy">{detail}</span>
    </article>
  );
}

export function AdminUsageView() {
  const [summary, setSummary] = useState<AdminUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ActivityChartMode>("bars");
  const [showLinePoints, setShowLinePoints] = useState(false);
  const [featureRoleFilter, setFeatureRoleFilter] = useState<FeatureRoleFilter>("all");

  useEffect(() => {
    let active = true;
    void fetchJson<AdminUsageSummary>("/admin/usage")
      .then((response) => active && setSummary(response))
      .catch(() => active && setError("Usage analytics require an admin account and an available API."))
      .finally(() => active && setLoading(false));
    void fetchJson<AdminAnalyticsOverview>("/admin/analytics/overview")
      .then((response) => active && setAnalytics(response))
      .catch(() => active && setAnalyticsError("Conversion signals are not available yet."))
      .finally(() => active && setAnalyticsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const featureDemand = analytics
    ? analytics.features
      .map((feature) => {
        if (featureRoleFilter === "all") {
          return feature;
        }
        const roleUsage = feature.role_breakdown.find((entry) => entry.role === featureRoleFilter);
        return { ...feature, event_count: roleUsage?.event_count ?? 0, user_count: roleUsage?.user_count ?? 0 };
      })
      .filter((feature) => feature.event_count > 0)
      .sort((left, right) => right.event_count - left.event_count || left.feature_key.localeCompare(right.feature_key))
    : [];
  const featureRoleLabel = featureRoleOptions.find((option) => option.value === featureRoleFilter)?.label ?? "All users";

  return (
    <AdminOnly>
      <main className="admin-usage-page" data-inventory-id="admin.page">
        <AdminSubnav />
        <section className="card admin-usage-hero" data-inventory-id="admin.hero">
          <div>
            <span className="eyebrow">Admin console</span>
            <h1>Platform usage</h1>
            <p className="route-description">A private, aggregate view of how TextPlex is being used across the local data store.</p>
          </div>
        </section>

        {loading ? <section className="card admin-usage-state">Loading platform usage…</section> : null}
        {error ? <section className="card error-card admin-usage-state" role="alert">{error}</section> : null}
        {summary ? (
          <>
            <section className="admin-usage-stat-grid" data-inventory-id="admin.summary-grid">
              <StatCard label="Profiles" value={formatNumber(summary.profile_count)} detail={`${formatNumber(summary.active_profiles_7d)} active in the last 7 days`} inventoryId="admin.profile-summary-card" />
              <StatCard label="Reading sessions" value={formatNumber(summary.reading_sessions)} detail={`${formatNumber(summary.active_profiles_30d)} active profiles in 30 days`} inventoryId="admin.reading-summary-card" />
              <StatCard label="Pages read" value={formatNumber(summary.page_reads)} detail={`${formatNumber(summary.sentence_reads)} sentences completed`} inventoryId="admin.reading-depth-card" />
              <StatCard label="Active reading time" value={formatElapsed(summary.active_seconds)} detail={`${formatNumber(summary.unique_words_exposed)} unique words exposed`} inventoryId="admin.exposure-summary-card" />
            </section>

            {analyticsLoading ? <section className="card admin-analytics-state">Loading conversion signals…</section> : null}
            {analyticsError ? <section className="card admin-analytics-state" role="status">{analyticsError}</section> : null}
            {analytics ? (
              <>
                <section className="admin-analytics-overview-grid">
                  <article className="card admin-analytics-card" data-inventory-id="admin.analytics-funnel-card">
                    <div className="card-topline">
                      <div>
                        <span className="eyebrow">Value path</span>
                        <h2>Activation funnel</h2>
                      </div>
                      <span className="pill">n={analytics.sample_size}</span>
                    </div>
                    <p className="small-copy">Directional user counts from first activity through paid intent.</p>
                    <ol className="admin-analytics-funnel">
                      {analytics.funnel.map((stage) => (
                        <li key={stage.key}>
                          <div className="admin-analytics-row-heading"><strong>{stage.label}</strong><span>{formatNumber(stage.users)} · {formatPercent(stage.rate)}</span></div>
                          <div className="admin-analytics-meter" aria-hidden="true"><span style={{ width: `${Math.min(stage.rate ?? 0, 100)}%` }} /></div>
                        </li>
                      ))}
                    </ol>
                  </article>

                  <article className="card admin-analytics-card" data-inventory-id="admin.analytics-value-card">
                    <div className="card-topline">
                      <div>
                        <span className="eyebrow">Leading indicators</span>
                        <h2>Repeated value</h2>
                      </div>
                      <span className="pill">{analytics.window_days} days</span>
                    </div>
                    <dl className="admin-analytics-metrics">
                      <div><dt>Active users (7d)</dt><dd>{formatNumber(metricValue(analytics, "active_users_7d"))}</dd></div>
                      <div><dt>Repeated value</dt><dd>{formatNumber(metricValue(analytics, "repeat_value_users"))}</dd></div>
                      <div><dt>AI feature uses</dt><dd>{formatNumber(metricValue(analytics, "ai_feature_events"))}</dd></div>
                      <div><dt>Feedback users</dt><dd>{formatNumber(metricValue(analytics, "feedback_users"))}</dd></div>
                    </dl>
                  </article>

                  <article className="card admin-analytics-card" data-inventory-id="admin.analytics-paywall-card">
                    <div className="card-topline">
                      <div>
                        <span className="eyebrow">Paid-value signal</span>
                        <h2>AI / paywall demand</h2>
                      </div>
                      <span className="pill">Early signal</span>
                    </div>
                    <strong className="admin-analytics-highlight">{formatNumber(metricValue(analytics, "paywall_intent_users"))}</strong>
                    <p className="small-copy">Users who have reached a limit, pricing surface, paywall, or unlock action.</p>
                    <p className="admin-analytics-note">{analytics.note}</p>
                  </article>
                </section>

                <section className="admin-analytics-detail-grid">
                  <article className="card admin-analytics-card" data-inventory-id="admin.analytics-feature-card">
                    <div className="card-topline"><h2>Feature demand</h2><span className="pill">Captured events</span></div>
                    {featureDemand.length === 0 ? <p className="small-copy">No feature events have been captured for {featureRoleLabel.toLowerCase()} in this window.</p> : (
                      <div className="admin-analytics-feature-list" hidden={featureRoleFilter !== "all"}>
                        {analytics.features.map((feature) => <div key={feature.feature_key}><div className="admin-analytics-row-heading"><strong>{feature.feature_key.replaceAll("_", " ")}</strong><span>{formatNumber(feature.user_count)} users · {formatNumber(feature.event_count)} events</span></div><div className="admin-analytics-meter" aria-hidden="true"><span style={{ width: `${Math.min((feature.event_count / Math.max(analytics.features[0].event_count, 1)) * 100, 100)}%` }} /></div></div>)}
                      </div>
                    )}
                    {featureDemand.length > 0 && featureRoleFilter !== "all" ? (
                      <div className="admin-analytics-feature-list">
                        {featureDemand.map((feature) => (
                          <div key={feature.feature_key}>
                            <div className="admin-analytics-row-heading"><strong>{feature.feature_key.replaceAll("_", " ")}</strong><span>{formatNumber(feature.user_count)} users &middot; {formatNumber(feature.event_count)} events</span></div>
                            <div className="admin-analytics-meter" aria-hidden="true"><span style={{ width: `${Math.min((feature.event_count / Math.max(featureDemand[0].event_count, 1)) * 100, 100)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="admin-analytics-filter-footer" data-inventory-id="admin.analytics-feature-filter">
                      <label htmlFor="admin-feature-role-filter">User group
                        <select id="admin-feature-role-filter" value={featureRoleFilter} onChange={(event) => setFeatureRoleFilter(event.target.value as FeatureRoleFilter)}>
                          {featureRoleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <span className="small-copy">Role is captured when a signed-in event is recorded; older events may be unassigned.</span>
                    </div>
                  </article>

                  <article className="card admin-analytics-card" data-inventory-id="admin.analytics-retention-card">
                    <div className="card-topline"><h2>Retention cohorts</h2><span className="pill">Return days</span></div>
                    {analytics.retention.length === 0 ? <p className="small-copy">Retention will appear after recognized users generate activity events.</p> : (
                      <div className="admin-analytics-retention-table" role="table" aria-label="Retention cohorts">
                        <div className="admin-analytics-retention-row is-header" role="row"><span>Started</span><span>n</span><span>1d</span><span>7d</span><span>30d</span></div>
                        {analytics.retention.slice(-8).map((cohort) => <div className="admin-analytics-retention-row" role="row" key={cohort.cohort_date}><span>{formatDate(cohort.cohort_date)}</span><span>{cohort.cohort_size}</span><span>{formatPercent(cohort.returned_1d_rate)}</span><span>{formatPercent(cohort.returned_7d_rate)}</span><span>{formatPercent(cohort.returned_30d_rate)}</span></div>)}
                      </div>
                    )}
                  </article>
                </section>

                <article className="card admin-analytics-card" data-inventory-id="admin.analytics-user-watchlist">
                  <div className="card-topline"><div><span className="eyebrow">Privacy-safe drilldown</span><h2>Users approaching conversion</h2></div><span className="pill">Pseudonymous</span></div>
                  {analytics.watchlist.length === 0 ? <p className="small-copy">No users have both repeated value or paid-intent signals yet.</p> : (
                    <div className="admin-analytics-watchlist">
                      {analytics.watchlist.map((user) => <div className="admin-analytics-watchlist-row" key={user.pseudonym}><strong>{user.pseudonym}</strong><span>{user.active_days} active days · {user.event_count} events</span><span>{user.paywall_intent ? "Paywall intent" : "Repeated value"}</span></div>)}
                    </div>
                  )}
                </article>
              </>
            ) : null}

            <section className="admin-usage-content-grid">
              <article className="card admin-usage-activity" data-inventory-id="admin.activity-card">
                <div className="card-topline admin-usage-activity-toolbar">
                  <div>
                    <span className="eyebrow">Last 30 days</span>
                    <h2>Reading activity</h2>
                  </div>
                  <div className="admin-usage-chart-controls">
                    <span className="pill">Aggregate</span>
                    <div className="admin-usage-chart-toggle" role="group" aria-label="Reading activity chart type">
                      <button type="button" aria-pressed={chartMode === "bars"} onClick={() => setChartMode("bars")}>Bars</button>
                      <button type="button" aria-pressed={chartMode === "line"} onClick={() => setChartMode("line")}>Line</button>
                    </div>
                    {chartMode === "line" ? (
                      <div className="admin-usage-chart-toggle" role="group" aria-label="Reading activity line options">
                        <button type="button" aria-pressed={showLinePoints} onClick={() => setShowLinePoints((visible) => !visible)}>Points</button>
                      </div>
                    ) : null}
                  </div>
                </div>
                {summary.activity.length === 0 ? <p className="small-copy">No reading activity has been recorded yet.</p> : (
                  <div className="admin-usage-activity-chart" role="img" aria-label={`Reading activity by day as a ${chartMode === "bars" ? "bar" : "line"} chart`}>
                    {(() => {
                      const activity = summary.activity.slice(-14);
                      const values = activity.map(activityReads);
                      const maxReads = Math.max(...values, 1);
                      const linePath = buildSmoothLinePath(values, maxReads);
                      const lineChartGuides = [
                        { y: lineChartTop, value: maxReads },
                        { y: (lineChartTop + lineChartBottom) / 2, value: Math.round(maxReads / 2) },
                        { y: lineChartBottom, value: 0 },
                      ];

                      return chartMode === "bars" ? (
                        <div className="admin-usage-activity-list">
                          {activity.map((point, index) => {
                            const reads = values[index];
                            const height = reads === 0 ? 0 : Math.max(10, Math.round((reads / maxReads) * 100));
                            return (
                              <div className="admin-usage-activity-column" key={point.date} title={`${formatDate(point.date)}: ${formatNumber(reads)} reads`}>
                                <span className="admin-usage-activity-count">{formatNumber(reads)}</span>
                                <div className="admin-usage-activity-bar" aria-hidden="true"><span style={{ height: `${height}%` }} /></div>
                                <span className="admin-usage-activity-date">{formatDate(point.date)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="admin-usage-line-chart">
                          <div className="admin-usage-line-plot-row">
                            <div className="admin-usage-line-y-labels" aria-hidden="true">
                              {lineChartGuides.map((guide) => <span className="admin-usage-line-y-label" key={guide.y} style={{ top: `${(guide.y / lineChartViewBoxHeight) * 100}%` }}>{formatNumber(guide.value)}</span>)}
                            </div>
                            <svg className="admin-usage-line-plot" viewBox="0 0 100 18" aria-hidden="true">
                              {lineChartGuides.map((guide) => <line className="admin-usage-line-guide" key={guide.y} x1="4" x2="96" y1={guide.y} y2={guide.y} />)}
                              <path className="admin-usage-line-path" d={linePath} />
                              {showLinePoints ? activity.map((point, index) => {
                                const x = activity.length === 1 ? 50 : 4 + (index / (activity.length - 1)) * 92;
                                const y = lineChartBottom - (values[index] / maxReads) * lineChartHeight;
                                return <circle className="admin-usage-line-dot" key={point.date} cx={x} cy={y} r="1.8"><title>{`${formatDate(point.date)}: ${formatNumber(values[index])} reads`}</title></circle>;
                              }) : null}
                            </svg>
                          </div>
                          <div className="admin-usage-line-labels">
                            <span className="admin-usage-line-label-spacer" aria-hidden="true" />
                            {activity.map((point) => <span className="admin-usage-line-label" key={point.date}>{formatDate(point.date)}</span>)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </article>

              <article className="card admin-usage-breakdown" data-inventory-id="admin.breakdown-card">
                <div className="card-topline"><h2>Platform signals</h2><span className="pill">Current snapshot</span></div>
                <dl className="admin-usage-details">
                  <div><dt>Books in library</dt><dd>{formatNumber(summary.book_count)}</dd></div>
                  <div><dt>Processed books</dt><dd>{formatNumber(summary.processed_book_count)}</dd></div>
                  <div><dt>Feedback reports</dt><dd>{formatNumber(summary.feedback_count)}</dd></div>
                  <div><dt>Open feedback</dt><dd>{formatNumber(summary.open_feedback_count)}</dd></div>
                  <div><dt>Translation requests this month</dt><dd>{formatNumber(summary.google_translate.request_count)}</dd></div>
                  <div><dt>Translated characters</dt><dd>{formatNumber(summary.google_translate.character_count)}</dd></div>
                </dl>
                <Link className="text-link" href="/admin/feedback">Open the feedback queue →</Link>
              </article>
            </section>

            <p className="admin-usage-note" data-inventory-id="admin.scope-note">
              Snapshot generated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(summary.generated_at))}. It counts local profile databases, book registry records, feedback files, and translation usage; hosted account analytics are not included yet.
            </p>
          </>
        ) : null}
      </main>
    </AdminOnly>
  );
}
