"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminOnly } from "./admin-only";
import { fetchJson, formatElapsed, type AdminUsageSummary } from "../lib/textplex";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
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

  useEffect(() => {
    let active = true;
    void fetchJson<AdminUsageSummary>("/admin/usage")
      .then((response) => active && setSummary(response))
      .catch(() => active && setError("Usage analytics require an admin account and an available API."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminOnly>
      <main className="admin-usage-page" data-inventory-id="admin.page">
        <section className="card admin-usage-hero" data-inventory-id="admin.hero">
          <div>
            <span className="eyebrow">Admin console</span>
            <h1>Platform usage</h1>
            <p className="route-description">A private, aggregate view of how TextPlex is being used across the local data store.</p>
          </div>
          <nav className="admin-usage-links" aria-label="Admin tools">
            <Link className="button button-primary" href="/admin">Usage overview</Link>
            <Link className="button button-secondary" href="/admin/feedback">Feedback queue</Link>
            <Link className="button button-secondary" href="/roadmap">Roadmap</Link>
          </nav>
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

            <section className="admin-usage-content-grid">
              <article className="card admin-usage-activity" data-inventory-id="admin.activity-card">
                <div className="card-topline">
                  <div>
                    <span className="eyebrow">Last 30 days</span>
                    <h2>Reading activity</h2>
                  </div>
                  <span className="pill">Aggregate</span>
                </div>
                {summary.activity.length === 0 ? <p className="small-copy">No reading activity has been recorded yet.</p> : (
                  <div className="admin-usage-activity-list">
                    {summary.activity.slice(-14).map((point) => {
                      const height = Math.max(12, Math.min(100, point.page_reads + point.sentence_reads));
                      return (
                        <div className="admin-usage-activity-row" key={point.date}>
                          <span className="admin-usage-activity-date">{formatDate(point.date)}</span>
                          <div className="admin-usage-activity-bar" aria-hidden="true"><span style={{ height: `${height}%` }} /></div>
                          <span className="admin-usage-activity-count">{formatNumber(point.page_reads + point.sentence_reads)} reads</span>
                        </div>
                      );
                    })}
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
