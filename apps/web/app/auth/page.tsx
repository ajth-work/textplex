"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../../components/auth-provider";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase";

type AuthMode = "sign-in" | "sign-up" | "reset";

export default function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return (
      <main className="auth-shell">
        <section className="auth-card card">
          <span className="eyebrow">Account</span>
          <h1>You are signed in.</h1>
          <p className="lede">{user.email}</p>
          <div className="button-row">
            <Link className="button button-primary" href="/profile">
              Open profile
            </Link>
            <Link className="button button-secondary" href="/library">
              Open library
            </Link>
          </div>
        </section>
      </main>
    );
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      setError("Supabase is not configured for this web app yet.");
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      if (mode === "reset") {
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (result.error) throw result.error;
        setMessage("Check your email for a password reset link.");
        return;
      }

      if (mode === "sign-up") {
        const result = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || undefined },
            emailRedirectTo: redirectTo,
          },
        });
        if (result.error) throw result.error;
        setMessage("Account created. Check your email to confirm the account.");
        return;
      }

      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      router.push("/profile");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to complete authentication.");
    } finally {
      setSubmitting(false);
    }
  }

  const isReset = mode === "reset";
  const isSignUp = mode === "sign-up";

  return (
    <main className="auth-shell">
      <section className="auth-card card">
        <span className="eyebrow">TextPlex account</span>
        <h1>{isReset ? "Reset your password" : isSignUp ? "Create your learner account" : "Welcome back"}</h1>
        <p className="lede">
          {isReset
            ? "We will send a secure reset link to your email address."
            : "Keep your reading history, vocabulary progress, and preferences available across devices."}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {isSignUp ? (
            <label>
              Display name
              <input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}
          <label>
            Email
            <input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          {!isReset ? (
            <label>
              Password
              <input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} required />
            </label>
          ) : null}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Working..." : isReset ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        {message ? <p className="auth-message" role="status">{message}</p> : null}
        {error ? <p className="auth-error" role="alert">{error}</p> : null}

        <div className="auth-links">
          {mode !== "sign-in" ? <button type="button" className="ghost-link" onClick={() => selectMode("sign-in")}>Sign in</button> : null}
          {mode !== "sign-up" ? <button type="button" className="ghost-link" onClick={() => selectMode("sign-up")}>Create account</button> : null}
          {mode !== "reset" ? <button type="button" className="ghost-link" onClick={() => selectMode("reset")}>Forgot password?</button> : null}
        </div>
      </section>
    </main>
  );
}
