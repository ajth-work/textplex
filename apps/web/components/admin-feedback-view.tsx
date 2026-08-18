"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import {
  fetchJson,
  fetchFeedbackScreenshot,
  patchJson,
  postJson,
  analyzeFeedbackScreenshots,
  type FeedbackRecord,
  type TesterRecord,
} from "../lib/textplex";
import { appVersion } from "../lib/build-info";
import { AdminSubnav } from "./admin-subnav";

const statusOptions: FeedbackRecord["status"][] = ["needs_review", "in_progress", "ready_for_testing", "completed", "acknowledged", "dismissed"];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(value: string): string {
  if (value === "ready_for_testing") {
    return "ready for tester review";
  }
  return value.replaceAll("_", " ");
}

function recordScreenshots(record: FeedbackRecord): NonNullable<FeedbackRecord["screenshots"]> {
  if (record.screenshots?.length) {
    return record.screenshots;
  }
  return record.screenshot ? [record.screenshot] : [];
}

function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) {
    return "—";
  }
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function averageDuration(values: number[]): number | null {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function topCounts(values: string[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 4);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function PencilIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
}

function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function CancelIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12" /><path d="m18 6-12 12" /></svg>;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <svg className={expanded ? "is-expanded" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="admin-feedback-plan-group">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export function AdminFeedbackView() {
  const searchParams = useSearchParams();
  const requestedFeedbackId = searchParams.get("feedbackId");
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [testers, setTesters] = useState<TesterRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackRecord["status"]>("all");
  const [search, setSearch] = useState("");
  const [testerFilter, setTesterFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [screenshotFilter, setScreenshotFilter] = useState("all");
  const [githubFilter, setGithubFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNoteDraft, setResolutionNoteDraft] = useState("");
  const [implementationBuildDraft, setImplementationBuildDraft] = useState(appVersion);
  const [verificationInstructionsDraft, setVerificationInstructionsDraft] = useState("Try the original scenario again and confirm whether the issue is resolved.");
  const [savingTesterId, setSavingTesterId] = useState<string | null>(null);
  const [nicknameDrafts, setNicknameDrafts] = useState<Record<string, string>>({});
  const [expandedTesterId, setExpandedTesterId] = useState<string | null>(null);
  const [editingTesterId, setEditingTesterId] = useState<string | null>(null);
  const [screenshotUrls, setScreenshotUrls] = useState<Record<number, string>>({});
  const selectedDetailRef = useRef<HTMLElement | null>(null);
  const shouldScrollToRequestedFeedbackRef = useRef(Boolean(requestedFeedbackId));

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchJson<{ records: FeedbackRecord[] }>("/feedback"),
      fetchJson<{ testers: TesterRecord[] }>("/feedback/testers"),
    ])
      .then(([feedbackResponse, testersResponse]) => {
        if (active) {
          setRecords(feedbackResponse.records);
          setSelectedId((current) => current ?? (requestedFeedbackId && feedbackResponse.records.some((record) => record.id === requestedFeedbackId) ? requestedFeedbackId : feedbackResponse.records[0]?.id ?? null));
          setTesters(testersResponse.testers);
          setNicknameDrafts(Object.fromEntries(testersResponse.testers.map((tester) => [tester.tester_id, tester.nickname ?? ""])));
        }
      })
      .catch(() => active && setError("Feedback administration requires an admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [requestedFeedbackId]);

  const filterOptions = useMemo(() => {
    const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
    return {
      languages: unique(records.map((record) => record.context.language_code ?? "unknown")),
      routes: unique(records.map((record) => record.context.route)),
      categories: unique(records.map((record) => record.triage.category)),
      severities: unique(records.map((record) => record.triage.severity)),
      priorities: unique(records.map((record) => record.triage.plan.priority)),
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }
      if (testerFilter !== "all" && (record.user_id ?? "anonymous") !== testerFilter) {
        return false;
      }
      if (languageFilter !== "all" && (record.context.language_code ?? "unknown") !== languageFilter) {
        return false;
      }
      if (routeFilter !== "all" && record.context.route !== routeFilter) {
        return false;
      }
      if (categoryFilter !== "all" && record.triage.category !== categoryFilter) {
        return false;
      }
      if (severityFilter !== "all" && record.triage.severity !== severityFilter) {
        return false;
      }
      if (priorityFilter !== "all" && record.triage.plan.priority !== priorityFilter) {
        return false;
      }
      if (screenshotFilter === "with" && recordScreenshots(record).length === 0) {
        return false;
      }
      if (screenshotFilter === "without" && recordScreenshots(record).length > 0) {
        return false;
      }
      if (githubFilter === "linked" && !record.github) {
        return false;
      }
      if (githubFilter === "unlinked" && record.github) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [record.original_text, record.triage.title, record.triage.category, record.triage.severity, record.triage.plan.priority, record.context.route, record.context.language_code, record.user_id, testers.find((tester) => tester.tester_id === record.user_id)?.nickname]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [categoryFilter, githubFilter, languageFilter, priorityFilter, records, routeFilter, search, screenshotFilter, severityFilter, statusFilter, testerFilter, testers]);

  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const testersById = useMemo(() => new Map(testers.map((tester) => [tester.tester_id, tester])), [testers]);
  const attachedScreenshots = selectedRecord ? recordScreenshots(selectedRecord) : [];
  const feedbackSummary = useMemo(() => ({
    needsReview: records.filter((record) => record.status === "needs_review").length,
    inProgress: records.filter((record) => record.status === "in_progress").length,
    withAttachments: records.filter((record) => recordScreenshots(record).length > 0).length,
    githubTracked: records.filter((record) => Boolean(record.github)).length,
  }), [records]);
  const feedbackMetrics = useMemo(() => {
    const firstReviewDurations: number[] = [];
    const resolutionDurations: number[] = [];
    let awaitingTesterReview = 0;
    records.forEach((record) => {
      const submittedAt = Date.parse(record.submitted_at);
      if (!Number.isFinite(submittedAt)) {
        return;
      }
      const firstReview = record.status_history.find((event) => event.event_type === "status_changed" && event.changed_at !== record.submitted_at);
      const firstReviewAt = firstReview ? Date.parse(firstReview.changed_at) : Number.NaN;
      if (Number.isFinite(firstReviewAt) && firstReviewAt >= submittedAt) {
        firstReviewDurations.push(firstReviewAt - submittedAt);
      }
      if (record.status === "ready_for_testing") {
        awaitingTesterReview += 1;
      }
      if (["completed", "acknowledged", "dismissed"].includes(record.status)) {
        const resolutionEvent = [...record.status_history].reverse().find((event) => ["completed", "acknowledged", "dismissed"].includes(event.status));
        const resolvedAt = resolutionEvent ? Date.parse(resolutionEvent.changed_at) : Number.NaN;
        if (Number.isFinite(resolvedAt) && resolvedAt >= submittedAt) {
          resolutionDurations.push(resolvedAt - submittedAt);
        }
      }
    });
    return {
      awaitingTesterReview,
      averageFirstReview: formatDuration(averageDuration(firstReviewDurations)),
      averageResolution: formatDuration(averageDuration(resolutionDurations)),
      topRoutes: topCounts(records.map((record) => record.context.route)),
      topCategories: topCounts(records.map((record) => record.triage.category)),
      topLanguages: topCounts(records.map((record) => record.context.language_code ?? "unknown")),
    };
  }, [records]);

  useEffect(() => {
    setResolutionNoteDraft(selectedRecord?.resolution_note ?? "");
    setImplementationBuildDraft(selectedRecord?.verification?.implementation_build ?? appVersion);
    setVerificationInstructionsDraft(selectedRecord?.verification?.instructions ?? "Try the original scenario again and confirm whether the issue is resolved.");
  }, [selectedRecord?.id, selectedRecord?.resolution_note, selectedRecord?.verification?.implementation_build, selectedRecord?.verification?.instructions]);

  useEffect(() => {
    shouldScrollToRequestedFeedbackRef.current = Boolean(requestedFeedbackId);
  }, [requestedFeedbackId]);

  useEffect(() => {
    if (!requestedFeedbackId || selectedRecord?.id !== requestedFeedbackId || !selectedDetailRef.current || !shouldScrollToRequestedFeedbackRef.current) {
      return;
    }
    const frame = window.requestAnimationFrame(() => selectedDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    shouldScrollToRequestedFeedbackRef.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [requestedFeedbackId, selectedRecord?.id]);

  useEffect(() => {
    let active = true;
    let objectUrls: string[] = [];
    const screenshots = selectedRecord ? recordScreenshots(selectedRecord) : [];
    setScreenshotUrls({});
    if (!selectedRecord || screenshots.length === 0) {
      return () => {
        active = false;
      };
    }
    void Promise.all(screenshots.map((_screenshot, index) => fetchFeedbackScreenshot(selectedRecord.id, index)))
      .then((urls) => {
        if (!active) {
          urls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        objectUrls = urls;
        setScreenshotUrls(Object.fromEntries(urls.map((url, index) => [index, url])));
      })
      .catch(() => active && setActionMessage("Attached screenshots could not be loaded."));
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedRecord]);

  function testerLabel(testerId: string | null | undefined): string {
    if (!testerId) {
      return "anonymous";
    }
    return testersById.get(testerId)?.nickname || testerId;
  }

  async function updateStatus(status: FeedbackRecord["status"]) {
    if (!selectedRecord) {
      return;
    }
    const note = resolutionNoteDraft.trim() || null;
    const implementationBuild = implementationBuildDraft.trim() || null;
    const verificationInstructions = verificationInstructionsDraft.trim() || null;
    if (["completed", "acknowledged", "dismissed"].includes(status) && !note) {
      setActionMessage("Add a resolution note before choosing a final status.");
      return;
    }
    if (status === "ready_for_testing" && (!implementationBuild || !verificationInstructions)) {
      setActionMessage("Add the implementation build and tester instructions before requesting review.");
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await patchJson<FeedbackRecord>(`/feedback/${selectedRecord.id}/status`, {
        status,
        note,
        implementation_build: implementationBuild,
        verification_instructions: verificationInstructions,
      });
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setResolutionNoteDraft(updated.resolution_note ?? note ?? "");
      setImplementationBuildDraft(updated.verification?.implementation_build ?? implementationBuild ?? appVersion);
      setVerificationInstructionsDraft(updated.verification?.instructions ?? verificationInstructions ?? "Try the original scenario again and confirm whether the issue is resolved.");
      setActionMessage(`Feedback moved to ${statusLabel(status)}.`);
    } catch {
      setActionMessage("The status change could not be saved.");
    } finally {
      setActionLoading(false);
    }
  }

  async function createGithubIssue() {
    if (!selectedRecord) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await postJson<FeedbackRecord>(`/feedback/${selectedRecord.id}/github-issue`, {});
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setActionMessage("GitHub issue created and linked.");
    } catch {
      setActionMessage("GitHub issue creation is unavailable. Check the server repository and token configuration.");
    } finally {
      setActionLoading(false);
    }
  }

  async function analyzeScreenshots() {
    if (!selectedRecord || recordScreenshots(selectedRecord).length === 0) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await analyzeFeedbackScreenshots(selectedRecord.id);
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setActionMessage("Screenshots analyzed with AI.");
    } catch {
      setActionMessage("Screenshot analysis could not be completed. Check the OpenAI configuration and try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveTesterNickname(testerId: string) {
    setSavingTesterId(testerId);
    setActionMessage(null);
    try {
      const updated = await patchJson<TesterRecord>(`/feedback/testers/${encodeURIComponent(testerId)}`, {
        nickname: nicknameDrafts[testerId]?.trim() || null,
      });
      setTesters((current) => current.map((tester) => tester.tester_id === updated.tester_id ? updated : tester));
      setNicknameDrafts((current) => ({ ...current, [testerId]: updated.nickname ?? "" }));
      setEditingTesterId(null);
      setActionMessage(`Nickname saved for ${updated.tester_id}.`);
    } catch {
      setActionMessage("The tester nickname could not be saved.");
    } finally {
      setSavingTesterId(null);
    }
  }

  function beginTesterEdit(tester: TesterRecord) {
    setExpandedTesterId(tester.tester_id);
    setEditingTesterId(tester.tester_id);
    setNicknameDrafts((current) => ({ ...current, [tester.tester_id]: tester.nickname ?? "" }));
    setActionMessage(null);
  }

  function cancelTesterEdit(tester: TesterRecord) {
    setNicknameDrafts((current) => ({ ...current, [tester.tester_id]: tester.nickname ?? "" }));
    setEditingTesterId(null);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setTesterFilter("all");
    setLanguageFilter("all");
    setRouteFilter("all");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setScreenshotFilter("all");
    setGithubFilter("all");
    setPriorityFilter("all");
  }

  return (
    <main className="admin-feedback-page" data-inventory-id="admin-feedback.page">
      <AdminSubnav />
      <section className="card admin-feedback-hero">
        <span className="eyebrow">Admin workspace</span>
        <h1>Feedback operations</h1>
        <p className="route-description">Review tester reports, open their linked GitHub issues, and keep a private nickname directory so tester IDs are easier to recognize.</p>
      </section>

      <section className="card admin-feedback-filters" data-inventory-id="admin-feedback.filters">
        <div className="admin-feedback-filter-grid">
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Text, route, user, or title" />
          </label>
          <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as "all" | FeedbackRecord["status"])} options={[{ value: "all", label: "All statuses" }, ...statusOptions.map((status) => ({ value: status, label: statusLabel(status) }))]} />
          <FilterSelect label="Tester" value={testerFilter} onChange={setTesterFilter} options={[{ value: "all", label: "All testers" }, ...(records.some((record) => !record.user_id) ? [{ value: "anonymous", label: "Anonymous" }] : []), ...testers.map((tester) => ({ value: tester.tester_id, label: tester.nickname || tester.tester_id }))]} />
          <FilterSelect label="Language" value={languageFilter} onChange={setLanguageFilter} options={[{ value: "all", label: "All languages" }, ...filterOptions.languages.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Route" value={routeFilter} onChange={setRouteFilter} options={[{ value: "all", label: "All routes" }, ...filterOptions.routes.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All categories" }, ...filterOptions.categories.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Severity" value={severityFilter} onChange={setSeverityFilter} options={[{ value: "all", label: "All severities" }, ...filterOptions.severities.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={[{ value: "all", label: "All priorities" }, ...filterOptions.priorities.map((value) => ({ value, label: value }))]} />
          <FilterSelect label="Screenshots" value={screenshotFilter} onChange={setScreenshotFilter} options={[{ value: "all", label: "Any screenshot state" }, { value: "with", label: "With screenshots" }, { value: "without", label: "Without screenshots" }]} />
          <FilterSelect label="GitHub" value={githubFilter} onChange={setGithubFilter} options={[{ value: "all", label: "Any GitHub state" }, { value: "linked", label: "GitHub linked" }, { value: "unlinked", label: "Not linked" }]} />
        </div>
        <div className="admin-feedback-filter-footer">
          <span className="small-copy">{filteredRecords.length} of {records.length} reports</span>
          <button type="button" className="button button-secondary button-compact" onClick={resetFilters}>Reset filters</button>
        </div>
      </section>

      {loading ? <div className="card">Loading feedback…</div> : null}
      {error ? <div className="card error-card" role="alert">{error}</div> : null}
      {!loading && !error ? (
        <>
          <section className="card admin-feedback-summary" data-inventory-id="admin-feedback.summary">
            <div className="admin-feedback-section-heading">
              <span className="eyebrow">Triage pulse</span>
              <strong>What needs attention</strong>
            </div>
            <div className="admin-feedback-summary-grid">
              <button type="button" className={`admin-feedback-summary-stat${statusFilter === "needs_review" ? " is-selected" : ""}`} onClick={() => setStatusFilter("needs_review")} aria-pressed={statusFilter === "needs_review"}>
                <strong>{feedbackSummary.needsReview}</strong>
                <span>Needs review</span>
              </button>
              <button type="button" className={`admin-feedback-summary-stat${statusFilter === "in_progress" ? " is-selected" : ""}`} onClick={() => setStatusFilter("in_progress")} aria-pressed={statusFilter === "in_progress"}>
                <strong>{feedbackSummary.inProgress}</strong>
                <span>In progress</span>
              </button>
              <div className="admin-feedback-summary-stat">
                <strong>{feedbackSummary.withAttachments}</strong>
                <span>With screenshots</span>
              </div>
              <div className="admin-feedback-summary-stat">
                <strong>{feedbackSummary.githubTracked}</strong>
                <span>GitHub tracked</span>
              </div>
            </div>
          </section>
          <section className="card admin-feedback-metrics" data-inventory-id="admin-feedback.metrics">
            <div className="admin-feedback-section-heading">
              <span className="eyebrow">Feedback metrics</span>
              <strong>Review and resolution health</strong>
            </div>
            <div className="admin-feedback-metric-grid">
              <div className="admin-feedback-metric"><strong>{feedbackMetrics.awaitingTesterReview}</strong><span>Awaiting tester review</span></div>
              <div className="admin-feedback-metric"><strong>{feedbackMetrics.averageFirstReview}</strong><span>Average time to first review</span></div>
              <div className="admin-feedback-metric"><strong>{feedbackMetrics.averageResolution}</strong><span>Average time to resolution</span></div>
              <div className="admin-feedback-metric"><strong>{records.length}</strong><span>Total reports tracked</span></div>
            </div>
            <div className="admin-feedback-breakdown-grid">
              <div className="admin-feedback-breakdown"><strong>Most reported routes</strong>{feedbackMetrics.topRoutes.length === 0 ? <span className="small-copy">No route data yet.</span> : feedbackMetrics.topRoutes.map((item) => <div key={item.label}><code>{item.label}</code><span>{item.count}</span></div>)}</div>
              <div className="admin-feedback-breakdown"><strong>Top categories</strong>{feedbackMetrics.topCategories.length === 0 ? <span className="small-copy">No category data yet.</span> : feedbackMetrics.topCategories.map((item) => <div key={item.label}><span>{item.label}</span><span>{item.count}</span></div>)}</div>
              <div className="admin-feedback-breakdown"><strong>Affected languages</strong>{feedbackMetrics.topLanguages.length === 0 ? <span className="small-copy">No language data yet.</span> : feedbackMetrics.topLanguages.map((item) => <div key={item.label}><span>{item.label}</span><span>{item.count}</span></div>)}</div>
            </div>
          </section>
          <section className="card admin-feedback-testers" data-inventory-id="admin-feedback.tester-list">
            <div className="admin-feedback-section-heading">
              <span className="eyebrow">Tester directory</span>
              <strong>Current testers</strong>
              <p className="small-copy">These are testers who have submitted feedback. Nicknames are private admin notes and stay paired with the tester ID.</p>
            </div>
            {testers.length === 0 ? <p className="small-copy">No identified testers yet.</p> : (
              <div className="admin-feedback-tester-grid">
                {testers.map((tester) => (
                  <form className="admin-feedback-tester" key={tester.tester_id} onSubmit={(event) => { event.preventDefault(); void saveTesterNickname(tester.tester_id); }}>
                    <button
                      type="button"
                      className="admin-feedback-tester-trigger"
                      onClick={() => setExpandedTesterId((current) => current === tester.tester_id ? null : tester.tester_id)}
                      aria-expanded={expandedTesterId === tester.tester_id}
                      aria-controls={`tester-details-${tester.tester_id}`}
                    >
                      <span className="admin-feedback-tester-summary">
                        <strong>{tester.nickname || "Unknown tester"}</strong>
                        <code>{tester.tester_id}</code>
                      </span>
                      <span className="admin-feedback-tester-count">{tester.feedback_count} report{tester.feedback_count === 1 ? "" : "s"}</span>
                      <ChevronIcon expanded={expandedTesterId === tester.tester_id} />
                    </button>
                    <button type="submit" className="admin-feedback-legacy-save" disabled={savingTesterId === tester.tester_id}>
                      {savingTesterId === tester.tester_id ? "Saving…" : "Save nickname"}
                    </button>
                    {expandedTesterId === tester.tester_id ? (
                      <div className="admin-feedback-tester-details" id={`tester-details-${tester.tester_id}`}>
                        {editingTesterId === tester.tester_id ? (
                          <div className="admin-feedback-tester-edit">
                            <label htmlFor={`tester-nickname-${tester.tester_id}`}>Nickname</label>
                            <input
                              id={`tester-nickname-${tester.tester_id}`}
                              value={nicknameDrafts[tester.tester_id] ?? ""}
                              onChange={(event) => setNicknameDrafts((current) => ({ ...current, [tester.tester_id]: event.target.value }))}
                              placeholder="e.g. Maya"
                              maxLength={80}
                              autoFocus
                              disabled={savingTesterId === tester.tester_id}
                              onKeyDown={(event) => { if (event.key === "Escape") cancelTesterEdit(tester); }}
                            />
                            <button type="button" className="admin-feedback-icon-button is-confirm" onClick={() => void saveTesterNickname(tester.tester_id)} disabled={savingTesterId === tester.tester_id} aria-label="Save nickname" title="Save nickname">
                              <CheckIcon />
                            </button>
                            <button type="button" className="admin-feedback-icon-button" onClick={() => cancelTesterEdit(tester)} disabled={savingTesterId === tester.tester_id} aria-label="Cancel nickname edit" title="Cancel nickname edit">
                              <CancelIcon />
                            </button>
                          </div>
                        ) : (
                          <div className="admin-feedback-tester-detail-row">
                            <span className="small-copy">Private admin nickname: <strong>{tester.nickname || "Unknown tester"}</strong></span>
                            <button type="button" className="admin-feedback-icon-button" onClick={() => beginTesterEdit(tester)} aria-label={`Edit nickname for ${tester.tester_id}`} title="Edit nickname">
                              <PencilIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </form>
                ))}
              </div>
            )}
          </section>

          <div className="admin-feedback-layout">
          <section className="card admin-feedback-list" data-inventory-id="admin-feedback.record-list">
            <div className="admin-feedback-section-heading"><span className="eyebrow">Reports</span><strong>Tester feedback</strong></div>
            {filteredRecords.length === 0 ? <p className="small-copy">No reports match these filters.</p> : null}
            {filteredRecords.map((record) => (
              <button type="button" className={`admin-feedback-list-item${record.id === selectedRecord?.id ? " is-selected" : ""}`} key={record.id} onClick={() => setSelectedId(record.id)}>
                <span className="admin-feedback-list-item-title">{record.triage.title}</span>
                <span className="admin-feedback-list-item-meta">{testerLabel(record.user_id)} · {record.account_role ?? "role unknown"} · {statusLabel(record.status)} · {record.context.language_code ?? "language unknown"}</span>
                <span className="admin-feedback-list-item-route">{record.context.route}</span>
              </button>
            ))}
          </section>

          {selectedRecord ? (
            <section ref={selectedDetailRef} id={`feedback-${selectedRecord.id}`} className="card admin-feedback-detail" data-inventory-id="admin-feedback.detail" tabIndex={-1}>
              <div className="admin-feedback-detail-header">
                <div>
                  <span className="eyebrow">{selectedRecord.triage.category} · {selectedRecord.triage.severity}</span>
                  <h2>{selectedRecord.triage.title}</h2>
                  <p className="small-copy">Submitted {formatDate(selectedRecord.submitted_at)} · {testerLabel(selectedRecord.user_id)}</p>
                </div>
                <span className={`admin-feedback-status status-${selectedRecord.status}`}>{statusLabel(selectedRecord.status)}</span>
              </div>
              <div className="admin-feedback-original">
                <strong>Original report</strong>
                <p>{selectedRecord.original_text}</p>
              </div>
              <div className="admin-feedback-context">
                <span>Route: <code>{selectedRecord.context.route}</code></span>
                <span>Tester ID: <code>{selectedRecord.user_id ?? "anonymous"}</code></span>
                <span>Account role: <code>{selectedRecord.account_role ?? "unknown"}</code></span>
                {selectedRecord.context.automated_check ? <span>Automated check: <code>{selectedRecord.context.automated_check}</code></span> : null}
                <span>Language: <code>{selectedRecord.context.language_code ?? "unknown"}</code></span>
                <span>Build: <code>{selectedRecord.context.app_version}</code></span>
                {selectedRecord.context.feedback_target ? (
                  <span>
                    Target: <code>{selectedRecord.context.feedback_target}</code>
                    {selectedRecord.context.feedback_target_text ? <> · <code>{selectedRecord.context.feedback_target_text}</code></> : null}
                    {selectedRecord.context.feedback_reason ? <> · Reason: <code>{selectedRecord.context.feedback_reason}</code></> : null}
                  </span>
                ) : null}
              </div>
              {attachedScreenshots.length > 0 ? (
                <section className="admin-feedback-screenshots" data-inventory-id="admin-feedback.screenshots">
                  <div className="admin-feedback-section-heading">
                    <span className="eyebrow">Tester attachments</span>
                    <strong>{attachedScreenshots.length} screenshot{attachedScreenshots.length === 1 ? "" : "s"}</strong>
                    <p className="small-copy">Review the submitted images here. They are not sent to AI unless you request an analysis.</p>
                  </div>
                  <div className="admin-feedback-screenshot-grid">
                    {attachedScreenshots.map((screenshot, index) => (
                      <a className="admin-feedback-screenshot" href={screenshotUrls[index]} target="_blank" rel="noreferrer" key={`${screenshot.filename}-${index}`}>
                        {screenshotUrls[index] ? <Image src={screenshotUrls[index]} alt={screenshot.filename} width={240} height={160} unoptimized /> : <span className="small-copy">Loading screenshot…</span>}
                        <span>{screenshot.filename}</span>
                      </a>
                    ))}
                  </div>
                  <button type="button" className="button button-secondary" onClick={() => void analyzeScreenshots()} disabled={actionLoading}>
                    {selectedRecord.screenshot_analysis ? "Analyze screenshots again" : "Analyze screenshots with AI"}
                  </button>
                  {selectedRecord.screenshot_analysis ? (
                    <div className="admin-feedback-screenshot-analysis">
                      <div className="admin-feedback-section-heading"><span className="eyebrow">AI screenshot review</span><strong>{formatDate(selectedRecord.screenshot_analysis.analyzed_at)}</strong></div>
                      <p>{selectedRecord.screenshot_analysis.summary}</p>
                      <PlanList title="Visible observations" items={selectedRecord.screenshot_analysis.observations} />
                      <PlanList title="Visible text" items={selectedRecord.screenshot_analysis.visible_text} />
                      {selectedRecord.screenshot_analysis.suggested_action ? <p className="small-copy"><strong>Suggested action:</strong> {selectedRecord.screenshot_analysis.suggested_action}</p> : null}
                    </div>
                  ) : null}
                </section>
              ) : null}
              <div className="admin-feedback-plan" data-inventory-id="admin-feedback.plan">
                <div className="admin-feedback-section-heading"><span className="eyebrow">AI planning</span><strong>Implementation package</strong></div>
                <p>{selectedRecord.triage.plan.problem_statement || selectedRecord.triage.summary}</p>
                <div className="admin-feedback-plan-grid">
                  <PlanList title="Reproduction" items={selectedRecord.triage.plan.reproduction_steps} />
                  <PlanList title="Implementation tasks" items={selectedRecord.triage.plan.implementation_tasks} />
                  <PlanList title="Acceptance criteria" items={selectedRecord.triage.plan.acceptance_criteria} />
                  <PlanList title="Suggested tests" items={selectedRecord.triage.plan.suggested_tests} />
                  <PlanList title="Risks" items={selectedRecord.triage.plan.risks} />
                </div>
                <p className="small-copy">Priority: <strong>{selectedRecord.triage.plan.priority}</strong> · Effort: <strong>{selectedRecord.triage.plan.estimated_effort}</strong></p>
              </div>
              <section className="admin-feedback-resolution" data-inventory-id="admin-feedback.resolution">
                <div className="admin-feedback-section-heading">
                  <span className="eyebrow">Admin decision</span>
                  <strong>Resolution note</strong>
                  <p className="small-copy">Required when marking feedback completed, acknowledged, or dismissed. This note is retained in the report history.</p>
                </div>
                <label>
                  Build for tester review
                  <input value={implementationBuildDraft} onChange={(event) => setImplementationBuildDraft(event.target.value)} placeholder="e.g. 0.1.0" maxLength={64} disabled={actionLoading} />
                </label>
                <label>
                  Tester verification instructions
                  <textarea value={verificationInstructionsDraft} onChange={(event) => setVerificationInstructionsDraft(event.target.value)} placeholder="Tell the tester exactly what to try." maxLength={1200} rows={3} disabled={actionLoading} />
                </label>
                <textarea
                  value={resolutionNoteDraft}
                  onChange={(event) => setResolutionNoteDraft(event.target.value)}
                  placeholder="What did we change, decide, or learn from this report?"
                  maxLength={1200}
                  rows={3}
                  aria-label="Resolution note"
                  disabled={actionLoading}
                />
              </section>
              <div className="admin-feedback-actions">
                <label>
                  Move to
                  <select value={selectedRecord.status} onChange={(event) => void updateStatus(event.target.value as FeedbackRecord["status"])} disabled={actionLoading}>
                    {statusOptions.map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}
                  </select>
                </label>
                {selectedRecord.github ? (
                  <a className="button button-secondary" href={selectedRecord.github.issue_url} target="_blank" rel="noreferrer">Open GitHub issue</a>
                ) : (
                  <button type="button" className="button button-primary" onClick={() => void createGithubIssue()} disabled={actionLoading}>Create GitHub issue</button>
                )}
              </div>
              {selectedRecord.github ? <p className="small-copy">Tracked in {selectedRecord.github.repository} #{selectedRecord.github.issue_number}{selectedRecord.github.project_url ? ` · Project: ${selectedRecord.github.project_url}` : ""}</p> : null}
              {actionMessage ? <p className="form-message" role="status">{actionMessage}</p> : null}
              <div className="admin-feedback-history">
                <div className="admin-feedback-section-heading"><span className="eyebrow">Timeline</span><strong>Status history</strong></div>
                {selectedRecord.status_history.map((event) => <p key={`${event.changed_at}-${event.event_type}`}><strong>{formatDate(event.changed_at)}</strong> · {event.event_type === "github_linked" ? "GitHub linked" : event.event_type === "tester_response" ? `Tester response: ${event.note || statusLabel(event.status)}` : statusLabel(event.status)}{event.event_type === "tester_response" ? "" : event.note ? ` — ${event.note}` : ""}</p>)}
              </div>
            </section>
          ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
