"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { syncAuthSessionCookie } from "../../../lib/auth-session";
import { resolveAccountLabel } from "../../../lib/auth-display";
import { getSupabaseClient } from "../../../lib/supabase";

const DEFAULT_RETURN_TO = "/home";

function normalizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }
  return value;
}

function readAuthError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error = new URLSearchParams(window.location.search).get("error_description")
    ?? new URLSearchParams(window.location.search).get("error")
    ?? hash.get("error_description")
    ?? hash.get("error");
  return error ? error.replaceAll("+", " ") : null;
}

async function withAuthTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), 8000);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const [ready, setReady] = useState(false);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured for this web app yet.");
      return undefined;
    }
    const supabase = client;

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== "PASSWORD_RECOVERY" || !session) {
        return;
      }
      syncAuthSessionCookie(session);
      setAccountLabel(resolveAccountLabel(session.user));
      setAccountEmail(session.user.email ?? null);
      setReady(true);
      setError(null);
    });

    async function restoreRecoverySession() {
      try {
        const callbackError = readAuthError();
        if (callbackError) {
          throw new Error("This password reset link has expired or has already been used. Request a new link below.");
        }

        const code = searchParams.get("code");
        if (code) {
          const exchangeResult = await withAuthTimeout(supabase.auth.exchangeCodeForSession(code), "Supabase did not respond while opening the reset link.");
          if (exchangeResult.error) {
            throw exchangeResult.error;
          }
        }

        const sessionResult = await withAuthTimeout(supabase.auth.getSession(), "Supabase did not respond while opening the reset link.");
        if (!sessionResult.data.session) {
          throw new Error("This password reset link is invalid or expired. Request a new link below.");
        }

        syncAuthSessionCookie(sessionResult.data.session);
        if (active) {
          setAccountLabel(resolveAccountLabel(sessionResult.data.session.user));
          setAccountEmail(sessionResult.data.session.user.email ?? null);
        }
        if (active) {
          setReady(true);
        }
      } catch (restoreError) {
        if (active) {
          setError(restoreError instanceof Error ? restoreError.message : "Unable to open the password reset link.");
        }
      }
    }

    void restoreRecoverySession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured for this web app yet.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await client.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell" data-inventory-id="auth.reset-password-page">
      <section className="auth-card card" data-inventory-id="auth.reset-password-card">
        <span className="eyebrow">TextPlex account</span>
        <h1>{success ? "Password updated" : "Choose a new password"}</h1>
        <p className="lede">
          {success
            ? "Your new password is ready. Continue to TextPlex to pick up where you left off."
            : ready
              ? "Set a new password for your TextPlex account."
              : "Opening your secure password reset link..."}
        </p>
        {accountEmail && !success ? (
          <p className="small-copy auth-reset-account" data-inventory-id="auth.reset-password-account">
            Resetting the password for <strong>{accountLabel ?? accountEmail}</strong> ({accountEmail}).
          </p>
        ) : null}

        {ready && !success ? (
          <form className="auth-form" onSubmit={submit} data-inventory-id="auth.reset-password-form">
            <label>
              New password
              <input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              Confirm new password
              <input className="text-input" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Update password"}
            </button>
          </form>
        ) : null}

        {success ? (
          <>
            <div className="auth-message" role="status" data-inventory-id="auth.reset-password-success">
              Your password has been updated successfully.
            </div>
            <div className="button-row">
              <Link className="button button-primary" href={returnTo}>Continue to TextPlex</Link>
            </div>
          </>
        ) : null}
        {error ? <p className="auth-error" role="alert" data-inventory-id="auth.reset-password-error">{error}</p> : null}
        {!ready && !error ? <span className="small-copy">If this takes more than a few seconds, request a fresh reset link.</span> : null}
        {error ? <Link className="button button-secondary" href={`/auth?mode=reset&returnTo=${encodeURIComponent(returnTo)}`}>Request a new reset link</Link> : null}
      </section>
    </main>
  );
}
