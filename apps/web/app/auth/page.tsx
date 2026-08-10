"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "../../components/auth-provider";
import { SignOutButton } from "../../components/sign-out-button";
import { resolveAccountLabel } from "../../lib/auth-display";
import { targetLanguageOptions } from "../../lib/language-options";
import { learningTrackOptions } from "../../lib/learning-track-options";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabase";

type AuthMode = "sign-in" | "sign-up" | "reset";

const DEFAULT_RETURN_TO = "/home";
const OTHER_LANGUAGE_CODE = "other";

function normalizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }
  return value;
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>(searchParams.get("mode") === "sign-up" ? "sign-up" : searchParams.get("mode") === "reset" ? "reset" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [targetLanguageOther, setTargetLanguageOther] = useState("");
  const [learningTrack, setLearningTrack] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const isAddingAccount = searchParams.get("mode") === "add-account";

  if (user && !isAddingAccount) {
    const accountLabel = resolveAccountLabel(user);
    return (
      <main className="auth-shell" data-inventory-id="auth.page">
        <section className="auth-card card" data-inventory-id="auth.account-card">
          <span className="eyebrow">Account</span>
          <h1>Signed in as {accountLabel}</h1>
          <p className="lede">{user.email ?? user.id}</p>
          <div className="button-row">
            <Link className="button button-primary" href={returnTo}>
              Open Home
            </Link>
            <Link className="button button-secondary" href="/library">
              Open library
            </Link>
            <SignOutButton className="button button-secondary" redirectTo="/">
              Sign out
            </SignOutButton>
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

    if (mode === "sign-up" && !targetLanguage) {
      setError("Choose your target language before creating your account.");
      return;
    }
    if (mode === "sign-up" && !learningTrack) {
      setError("Choose a learning path before creating your account.");
      return;
    }
    if (mode === "sign-up" && targetLanguage === OTHER_LANGUAGE_CODE && !targetLanguageOther.trim()) {
      setError("Tell us which language you would like to see added.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/auth/reset-password?returnTo=${encodeURIComponent(returnTo)}`;
        const result = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (result.error) throw result.error;
        setMessage("Check your email for a password reset link.");
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

      if (mode === "sign-up") {
        const result = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || undefined,
              target_language: targetLanguage,
              target_language_other: targetLanguageOther.trim() || undefined,
              learning_track: learningTrack,
            },
            emailRedirectTo: redirectTo,
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          router.replace(returnTo);
          router.refresh();
          return;
        }
        setMessage("Account created. Check your email to confirm the account.");
        return;
      }

      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      const sessionResult = await client.auth.getSession();
      if (!sessionResult.data.session) {
        throw new Error("Sign-in completed, but the session was not restored. Please try again.");
      }
      router.replace(returnTo);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to complete authentication.");
    } finally {
      setSubmitting(false);
    }
  }

  const isReset = mode === "reset";
  const isSignUp = mode === "sign-up";
  const authPublicReturnPrompt = isReset ? "Want to return to the start?" : isSignUp ? "Not ready to create an account?" : "Not ready to sign in?";

  return (
    <main className="auth-shell" data-inventory-id="auth.page">
      <section className="auth-card card" data-inventory-id="auth.account-card">
        <span className="eyebrow">TextPlex account</span>
        <h1>{isReset ? "Reset your password" : isSignUp ? "Create your learner account" : isAddingAccount ? "Add another account" : "Welcome back"}</h1>
        <p className="lede">
          {isReset
            ? "We will send a secure reset link to your email address."
            : isAddingAccount
              ? "Sign in to another TextPlex account. Your saved accounts remain available from the account menu on this device."
            : "Keep your reading history, vocabulary progress, and preferences available across devices."}
        </p>

        <form className="auth-form" onSubmit={submit} data-inventory-id="auth.form">
          {isSignUp ? (
            <label>
              Display name
              <input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}
          {isSignUp ? (
            <label data-inventory-id="auth.target-language">
              Target language
              <select className="text-input" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} required>
                <option value="">Choose a target language</option>
                {targetLanguageOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.label} ({option.shortCode})</option>
                ))}
                <option value={OTHER_LANGUAGE_CODE}>Other</option>
              </select>
            </label>
          ) : null}
          {isSignUp ? (
            <label>
              Suggest another language <span className="muted">(optional)</span>
              <input
                className="text-input"
                value={targetLanguageOther}
                onChange={(event) => setTargetLanguageOther(event.target.value)}
                placeholder="For example, Spanish"
                maxLength={80}
                required={targetLanguage === OTHER_LANGUAGE_CODE}
              />
              <span className="small-copy">If your language is not listed, choose Other and tell us what you would like to read.</span>
            </label>
          ) : null}
          {isSignUp ? (
            <label data-inventory-id="auth.learning-track">
              Learning path
              <select className="text-input" value={learningTrack} onChange={(event) => setLearningTrack(event.target.value)} required>
                <option value="">Choose a learning path</option>
                {learningTrackOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
              <span className="small-copy">
                {learningTrackOptions.find((option) => option.code === learningTrack)?.description ?? "Choose the kind of progress you want TextPlex to organize around."}
              </span>
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
        {error ? <p className="auth-error" role="alert" data-inventory-id="auth.error-state">{error}</p> : null}

        <div className="auth-links">
          {mode !== "sign-in" ? <button type="button" className="ghost-link" onClick={() => selectMode("sign-in")}>Sign in</button> : null}
          {mode !== "sign-up" ? <button type="button" className="ghost-link" onClick={() => selectMode("sign-up")}>Create account</button> : null}
          {mode !== "reset" ? <button type="button" className="ghost-link" onClick={() => selectMode("reset")}>Forgot password?</button> : null}
        </div>

        <div className="auth-public-return" data-inventory-id="auth.public-return">
          <p className="small-copy">{authPublicReturnPrompt}</p>
          <Link className="button button-secondary auth-public-return-link" href="/">
            Explore TextPlex
          </Link>
        </div>

        {isSignUp ? (
          <p className="small-copy auth-policy-note" data-inventory-id="auth.policy-note">
            Review the <Link href="/privacy">Privacy policy</Link> before creating your account.
          </p>
        ) : null}
      </section>
    </main>
  );
}
