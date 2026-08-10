"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  fetchJson,
  postJson,
  type FeedbackNotification,
  type FeedbackNotificationListResponse,
} from "../lib/textplex";
import { useAuth } from "./auth-provider";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function statusLabel(status: FeedbackNotification["status"]): string {
  return status.replaceAll("_", " ");
}

export function FeedbackNotificationBell() {
  const { configured, loading, user } = useAuth();
  const [data, setData] = useState<FeedbackNotificationListResponse>({ notifications: [], unread_count: 0 });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) {
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

  return (
    <div ref={rootRef} className="feedback-notification-root" data-inventory-id="shell.feedback-notifications">
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
      {open ? (
        <div className="feedback-notification-panel card" role="dialog" aria-label="Feedback notifications">
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
          {data.notifications.length === 0 ? (
            <p className="small-copy">No feedback updates yet.</p>
          ) : (
            <div className="feedback-notification-list">
              {data.notifications.map((notification) => (
                <article className={`feedback-notification-item${notification.read ? " is-read" : ""}`} key={notification.id}>
                  <div className="feedback-notification-item-topline">
                    <strong>{notification.title}</strong>
                    <span className="feedback-notification-status">{statusLabel(notification.status)}</span>
                  </div>
                  <p>{notification.message}</p>
                  <div className="feedback-notification-links">
                    <Link href={notification.route}>View page</Link>
                    {notification.github_issue_url ? <a href={notification.github_issue_url} target="_blank" rel="noreferrer">Open GitHub issue</a> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
