"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchJson,
  submitFeedbackVerification,
  type FeedbackRecord,
} from "../lib/textplex";
import { useAuth } from "./auth-provider";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(value: string): string {
  if (value === "ready_for_testing") {
    return "ready for tester review";
  }
  return value.replaceAll("_", " ");
}

function eventLabel(event: FeedbackRecord["status_history"][number]): string {
  if (event.event_type === "github_linked") {
    return "GitHub issue linked";
  }
  if (event.event_type === "tester_response") {
    return `Your response: ${event.note || statusLabel(event.status)}`;
  }
  return statusLabel(event.status);
}

export function TesterConsoleView() {
  const { configured, loading: authLoading, user } = useAuth();
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void fetchJson<{ records: FeedbackRecord[] }>("/feedback/mine")
      .then((response) => {
        if (active) {
          setRecords(response.records);
          setSelectedId((current) => current ?? response.records[0]?.id ?? null);
          setError(null);
        }
      })
      .catch(() => active && setError("Your tester console could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  const awaitingReviewCount = records.filter((record) => record.status === "ready_for_testing").length;
  const openCount = records.filter((record) => !["completed", "acknowledged", "dismissed"].includes(record.status)).length;

  async function respondToVerification(response: "verified" | "still_unresolved" | "partially_improved") {
    if (!selectedRecord) {
      return;
    }
    setActionId(selectedRecord.id);
    setError(null);
    try {
      const updated = await submitFeedbackVerification(selectedRecord.id, response, reviewNote);
      setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
      setReviewNote("");
    } catch {
      setError("Your verification response could not be saved.");
    } finally {
      setActionId(null);
    }
  }

  if (!configured) {
    return <main className="tester-console-page" data-inventory-id="tester.page"><section className="card tester-console-state"><h1>Tester console</h1><p>Account services are not configured in this build.</p></section></main>;
  }

  if (authLoading || loading) {
    return <main className="tester-console-page" data-inventory-id="tester.page"><section className="card tester-console-state">Loading your tester console…</section></main>;
  }

  if (!user) {
    return <main className="tester-console-page" data-inventory-id="tester.page"><section className="card tester-console-state"><h1>Tester console</h1><p>Sign in to review the feedback you have submitted and see TextPlex responses.</p><Link className="button button-primary" href="/auth?returnTo=%2Ftester">Sign in</Link></section></main>;
  }

  return (
    <main className="tester-console-page" data-inventory-id="tester.page">
      <section className="card tester-console-hero">
        <span className="eyebrow">Tester workspace</span>
        <h1>Your feedback</h1>
        <p className="route-description">Review what you submitted, see how TextPlex responded, and verify fixes when they are ready.</p>
      </section>

      <section className="tester-console-summary" data-inventory-id="tester.summary">
        <article className="card tester-console-summary-card"><span className="eyebrow">Submitted</span><strong>{records.length}</strong><span className="small-copy">feedback reports</span></article>
        <article className="card tester-console-summary-card"><span className="eyebrow">Open</span><strong>{openCount}</strong><span className="small-copy">awaiting a final outcome</span></article>
        <article className="card tester-console-summary-card"><span className="eyebrow">Review requested</span><strong>{awaitingReviewCount}</strong><span className="small-copy">fixes ready to verify</span></article>
      </section>

      {error ? <section className="card error-card" role="alert">{error}</section> : null}
      {records.length === 0 ? (
        <section className="card tester-console-state"><h2>No feedback yet</h2><p>Use the Send feedback button at the bottom of a page when you notice something confusing, useful, or broken.</p></section>
      ) : (
        <div className="tester-console-layout">
          <section className="card tester-console-list" data-inventory-id="tester.record-list">
            <div className="tester-console-section-heading"><span className="eyebrow">History</span><strong>Your reports</strong></div>
            {records.map((record) => (
              <button type="button" className={`tester-console-list-item${record.id === selectedRecord?.id ? " is-selected" : ""}`} key={record.id} onClick={() => setSelectedId(record.id)}>
                <span className="tester-console-list-title">{record.triage.title}</span>
                <span className="tester-console-list-meta">{statusLabel(record.status)} · {formatDate(record.submitted_at)}</span>
                <span className="tester-console-list-route">{record.context.route}</span>
              </button>
            ))}
          </section>

          {selectedRecord ? (
            <section className="card tester-console-detail" data-inventory-id="tester.detail">
              <div className="tester-console-detail-header">
                <div>
                  <span className="eyebrow">{selectedRecord.triage.category} · {selectedRecord.context.language_code ?? "language unknown"}</span>
                  <h2>{selectedRecord.triage.title}</h2>
                  <p className="small-copy">Submitted {formatDate(selectedRecord.submitted_at)} on <code>{selectedRecord.context.route}</code></p>
                </div>
                <span className={`tester-console-status status-${selectedRecord.status}`}>{statusLabel(selectedRecord.status)}</span>
              </div>
              <section className="tester-console-original" data-inventory-id="tester.original-feedback">
                <strong>Your original feedback</strong>
                <p>{selectedRecord.original_text}</p>
              </section>
              {selectedRecord.verification && selectedRecord.status === "ready_for_testing" ? (
                <section className="tester-console-verification" data-inventory-id="tester.verification">
                  <div className="tester-console-section-heading"><span className="eyebrow">Action requested</span><strong>Try build {selectedRecord.verification.implementation_build}</strong></div>
                  <p>{selectedRecord.verification.instructions}</p>
                  <label>
                    Optional note
                    <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="What did you notice?" rows={3} maxLength={1200} disabled={actionId === selectedRecord.id} />
                  </label>
                  <div className="tester-console-verification-actions">
                    <button type="button" className="button button-primary" onClick={() => void respondToVerification("verified")} disabled={actionId === selectedRecord.id}>Works for me</button>
                    <button type="button" className="button button-secondary" onClick={() => void respondToVerification("partially_improved")} disabled={actionId === selectedRecord.id}>Partially improved</button>
                    <button type="button" className="button button-secondary" onClick={() => void respondToVerification("still_unresolved")} disabled={actionId === selectedRecord.id}>Still happening</button>
                  </div>
                </section>
              ) : null}
              <section className="tester-console-timeline" data-inventory-id="tester.timeline">
                <div className="tester-console-section-heading"><span className="eyebrow">Updates</span><strong>Feedback timeline</strong></div>
                {selectedRecord.status_history.map((event) => (
                  <article className="tester-console-event" key={`${event.changed_at}-${event.event_type}`}>
                    <strong>{eventLabel(event)}</strong>
                    <span>{formatDate(event.changed_at)}</span>
                    {event.note && event.event_type !== "tester_response" ? <p>{event.note}</p> : null}
                  </article>
                ))}
              </section>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
