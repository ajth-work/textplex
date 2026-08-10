"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchJson,
  patchJson,
  postJson,
  type FeedbackRecord,
  type TesterRecord,
} from "../lib/textplex";

const statusOptions: FeedbackRecord["status"][] = ["needs_review", "in_progress", "completed", "acknowledged", "dismissed"];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
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
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [testers, setTesters] = useState<TesterRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackRecord["status"]>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [savingTesterId, setSavingTesterId] = useState<string | null>(null);
  const [nicknameDrafts, setNicknameDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchJson<{ records: FeedbackRecord[] }>("/feedback"),
      fetchJson<{ testers: TesterRecord[] }>("/feedback/testers"),
    ])
      .then(([feedbackResponse, testersResponse]) => {
        if (active) {
          setRecords(feedbackResponse.records);
          setSelectedId((current) => current ?? feedbackResponse.records[0]?.id ?? null);
          setTesters(testersResponse.testers);
          setNicknameDrafts(Object.fromEntries(testersResponse.testers.map((tester) => [tester.tester_id, tester.nickname ?? ""])));
        }
      })
      .catch(() => active && setError("Feedback administration requires an admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [record.original_text, record.triage.title, record.context.route, record.context.language_code, record.user_id, testers.find((tester) => tester.tester_id === record.user_id)?.nickname]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [records, search, statusFilter, testers]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;
  const testersById = useMemo(() => new Map(testers.map((tester) => [tester.tester_id, tester])), [testers]);

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
    const note = window.prompt(`Optional note for ${statusLabel(status)}:`, selectedRecord.resolution_note ?? "") ?? null;
    if (note === null) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const updated = await patchJson<FeedbackRecord>(`/feedback/${selectedRecord.id}/status`, { status, note: note.trim() || null });
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
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

  async function saveTesterNickname(testerId: string) {
    setSavingTesterId(testerId);
    setActionMessage(null);
    try {
      const updated = await patchJson<TesterRecord>(`/feedback/testers/${encodeURIComponent(testerId)}`, {
        nickname: nicknameDrafts[testerId]?.trim() || null,
      });
      setTesters((current) => current.map((tester) => tester.tester_id === updated.tester_id ? updated : tester));
      setNicknameDrafts((current) => ({ ...current, [testerId]: updated.nickname ?? "" }));
      setActionMessage(`Nickname saved for ${updated.tester_id}.`);
    } catch {
      setActionMessage("The tester nickname could not be saved.");
    } finally {
      setSavingTesterId(null);
    }
  }

  return (
    <main className="admin-feedback-page" data-inventory-id="admin-feedback.page">
      <section className="card admin-feedback-hero">
        <span className="eyebrow">Admin workspace</span>
        <h1>Feedback operations</h1>
        <p className="route-description">Review tester reports, open their linked GitHub issues, and keep a private nickname directory so tester IDs are easier to recognize.</p>
      </section>

      <section className="card admin-feedback-filters" data-inventory-id="admin-feedback.filters">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Text, route, user, or title" />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | FeedbackRecord["status"])}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}
          </select>
        </label>
        <span className="small-copy">{filteredRecords.length} of {records.length} reports</span>
      </section>

      {loading ? <div className="card">Loading feedback…</div> : null}
      {error ? <div className="card error-card" role="alert">{error}</div> : null}
      {!loading && !error ? (
        <>
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
                    <div className="admin-feedback-tester-id">
                      <strong>{tester.nickname || "Unnamed tester"}</strong>
                      <code>{tester.tester_id}</code>
                      <span className="small-copy">{tester.feedback_count} report{tester.feedback_count === 1 ? "" : "s"}</span>
                    </div>
                    <label>
                      Nickname
                      <input
                        value={nicknameDrafts[tester.tester_id] ?? ""}
                        onChange={(event) => setNicknameDrafts((current) => ({ ...current, [tester.tester_id]: event.target.value }))}
                        placeholder="e.g. Maya"
                        maxLength={80}
                      />
                    </label>
                    <button type="submit" className="button button-secondary" disabled={savingTesterId === tester.tester_id}>
                      {savingTesterId === tester.tester_id ? "Saving…" : "Save nickname"}
                    </button>
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
                <span className="admin-feedback-list-item-meta">{testerLabel(record.user_id)} · {statusLabel(record.status)} · {record.context.language_code ?? "language unknown"}</span>
                <span className="admin-feedback-list-item-route">{record.context.route}</span>
              </button>
            ))}
          </section>

          {selectedRecord ? (
            <section className="card admin-feedback-detail" data-inventory-id="admin-feedback.detail">
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
                <span>Language: <code>{selectedRecord.context.language_code ?? "unknown"}</code></span>
                <span>Build: <code>{selectedRecord.context.app_version}</code></span>
              </div>
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
                {selectedRecord.status_history.map((event) => <p key={`${event.changed_at}-${event.event_type}`}><strong>{formatDate(event.changed_at)}</strong> · {event.event_type === "github_linked" ? "GitHub linked" : statusLabel(event.status)}{event.note ? ` — ${event.note}` : ""}</p>)}
              </div>
            </section>
          ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
