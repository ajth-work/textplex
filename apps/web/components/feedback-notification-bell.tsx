"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  fetchJson,
  postJson,
  type FeedbackNotification,
  type FeedbackNotificationListResponse,
  type FeedbackRecord,
} from "../lib/textplex";
import { useAuth } from "./auth-provider";

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function AdminArrowIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
}

function GitHubIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .65A11.35 11.35 0 0 0 8.41 22.77c.57.1.78-.25.78-.55v-2.16c-3.18.7-3.85-1.35-3.85-1.35-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.74 2.67 1.24 3.32.95.1-.74.4-1.24.73-1.53-2.54-.29-5.21-1.27-5.21-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.12 1.17A10.85 10.85 0 0 1 12 4.99c.96 0 1.93.13 2.83.38 2.16-1.48 3.12-1.17 3.12-1.17.62 1.57.23 2.73.11 3.02.73.8 1.18 1.82 1.18 3.07 0 4.4-2.67 5.37-5.22 5.66.41.35.78 1.04.78 2.1v3.11c0 .3.21.66.79.55A11.35 11.35 0 0 0 12 .65Z" /></svg>;
}

export function FeedbackNotificationBell({ placement = "footer" }: { placement?: "footer" | "top" | "menu" }) {
  const { configured, loading, user } = useAuth();
  const [data, setData] = useState<FeedbackNotificationListResponse>({ notifications: [], unread_count: 0 });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubLoadingId, setGithubLoadingId] = useState<string | null>(null);
  const [githubToast, setGithubToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!configured || loading || !user) {
      return undefined;
    }

    let active = true;
    void fetchJson<FeedbackNotificationListResponse>("/feedback/notifications")
      .then((response) => {
        if (active) {
          setData(response);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError("Notifications are unavailable.");
        }
      });

    const interval = window.setInterval(() => {
      void fetchJson<FeedbackNotificationListResponse>("/feedback/notifications")
        .then((response) => active && setData(response))
        .catch(() => undefined);
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [configured, loading, user]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && (rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target))) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!configured || loading || !user) {
    return null;
  }

  async function markAllRead() {
    const unreadIds = data.notifications.filter((notification) => !notification.read).map((notification) => notification.id);
    if (unreadIds.length === 0) {
      return;
    }
    try {
      await postJson<void>("/feedback/notifications/read", { notification_ids: unreadIds });
      setData((current) => ({
        notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
        unread_count: 0,
      }));
    } catch {
      setError("Notifications could not be marked read.");
    }
  }

  async function openGitHubIssue(notification: FeedbackNotification) {
    if (notification.github_issue_url) {
      window.location.assign(notification.github_issue_url);
      return;
    }
    setGithubLoadingId(notification.feedback_id);
    setGithubToast("Generating GitHub issue… You will be redirected when it is ready.");
    setError(null);
    try {
      const record = await postJson<FeedbackRecord>(`/feedback/${notification.feedback_id}/github-issue`, {});
      const issueUrl = record.github?.issue_url;
      if (!issueUrl) {
        throw new Error("The issue URL was not returned.");
      }
      window.location.assign(issueUrl);
    } catch {
      setGithubToast(null);
      setError("This feedback could not be sent to GitHub.");
    } finally {
      setGithubLoadingId(null);
    }
  }

  const panel = open ? (
    <div ref={panelRef} className={`feedback-notification-panel feedback-notification-panel-${placement} card`} role="dialog" aria-label="Feedback notifications">
      <div className="feedback-notification-header">
        <div>
          <span className="eyebrow">Feedback updates</span>
          <strong>Your reports</strong>
        </div>
        <button type="button" className="button button-secondary button-compact" onClick={() => void markAllRead()} disabled={data.unread_count === 0}>
          Mark read
        </button>
      </div>
      {error ? <p className="app-feedback-error" role="alert">{error}</p> : null}
      {githubToast ? <p className="feedback-notification-toast" role="status">{githubToast}</p> : null}
      {data.notifications.length === 0 ? (
        <p className="small-copy">No feedback updates yet.</p>
      ) : (
        <div className="feedback-notification-list">
          {data.notifications.map((notification) => (
            <article className={`feedback-notification-item${notification.read ? " is-read" : ""}`} key={notification.id}>
              <Link className="feedback-notification-report-link" href={`/admin/feedback?feedbackId=${encodeURIComponent(notification.feedback_id)}`} title="Open this report in Feedback admin">
                <span>{notification.title}</span>
                <AdminArrowIcon />
              </Link>
              <button
                type="button"
                className="button button-secondary feedback-notification-github-button"
                onClick={() => void openGitHubIssue(notification)}
                disabled={githubLoadingId === notification.feedback_id}
                aria-label={notification.github_issue_url ? "Open GitHub issue" : "Generate GitHub issue"}
                title={notification.github_issue_url ? "Open GitHub issue" : "Generate GitHub issue"}
                data-inventory-id="shell.feedback-github-button"
              >
                {githubLoadingId === notification.feedback_id ? "…" : <GitHubIcon />}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`feedback-notification-root feedback-notification-root-${placement}`} data-inventory-id="shell.feedback-notifications">
      <button
        type="button"
        className="button button-secondary feedback-notification-button"
        aria-label={data.unread_count > 0 ? `${data.unread_count} unread feedback notifications` : "Feedback notifications"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {data.unread_count > 0 ? <span className="feedback-notification-count">{data.unread_count > 9 ? "9+" : data.unread_count}</span> : null}
      </button>
      {placement === "top" && typeof document !== "undefined" ? createPortal(panel, document.body) : panel}
    </div>
  );
}

export function FeedbackNotificationDot() {
  const { configured, loading, user } = useAuth();
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (!configured || loading || !user) {
      return undefined;
    }
    let active = true;
    const refresh = () => {
      void fetchJson<FeedbackNotificationListResponse>("/feedback/notifications")
        .then((response) => active && setUnread(response.unread_count > 0))
        .catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [configured, loading, user]);

  return unread ? <span className="feedback-notification-dot" aria-label="Unread feedback notification" title="Unread feedback notification" /> : null;
}
