"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { syncAuthSessionCookie } from "../../../lib/auth-session";
import { getSupabaseClient } from "../../../lib/supabase";

const DEFAULT_RETURN_TO = "/home";

function normalizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }
  return value;
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

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const code = searchParams.get("code");
  const callbackError = searchParams.get("error_description") ?? searchParams.get("error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function finishAuthentication() {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error("Supabase is not configured for this web app.");
      }

      if (callbackError) {
        throw new Error(callbackError.replaceAll("+", " "));
      }

      const sessionResult = await withAuthTimeout(client.auth.getSession(), "Supabase did not respond while restoring the session.");
      if (!sessionResult.data.session && code) {
        const exchangeResult = await withAuthTimeout(client.auth.exchangeCodeForSession(code), "Supabase did not respond while confirming the account.");
        if (exchangeResult.error) {
          throw exchangeResult.error;
        }
      }

      const restoredSession = await withAuthTimeout(client.auth.getSession(), "Supabase did not respond while verifying the restored session.");
      if (!restoredSession.data.session) {
        throw new Error("The confirmation link did not restore a session. Check that this app URL is allowed in Supabase Auth.");
      }

      syncAuthSessionCookie(restoredSession.data.session);
      router.replace(returnTo);
      router.refresh();
    }

    void finishAuthentication().catch((callbackFailure: unknown) => {
      if (active) {
        setError(callbackFailure instanceof Error ? callbackFailure.message : "Unable to restore the account session.");
      }
    });

    return () => {
      active = false;
    };
  }, [callbackError, code, returnTo, router]);

  return (
    <main className="auth-shell" data-inventory-id="auth.callback-state">
      <section className="auth-card card">
        <span className="eyebrow">Account</span>
        <h1>{error ? "Sign-in needs attention" : "Finishing sign-in..."}</h1>
        <p className="lede">{error ?? "Your secure session is being restored."}</p>
        {error ? <Link className="button button-primary" href={`/auth?returnTo=${encodeURIComponent(returnTo)}`}>Return to sign in</Link> : null}
      </section>
    </main>
  );
}
