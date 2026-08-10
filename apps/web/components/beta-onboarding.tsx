"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "./auth-provider";
import { fetchJson, putJson, type SettingsSurfaceResponse } from "../lib/textplex";
import { languageDisplayLabel, targetLanguageOptions, type TargetLanguageCode } from "../lib/language-options";
import { learningTrackOptions, type LearningTrackCode } from "../lib/learning-track-options";

const ONBOARDING_VERSION = "beta-1";
const ONBOARDING_COMPLETED_KEY = "onboarding.completed";
const ONBOARDING_KEYS = new Set([
  ONBOARDING_COMPLETED_KEY,
  "onboarding.version",
  "onboarding.target_language",
  "onboarding.target_language_other",
  "onboarding.learning_track",
  "onboarding.intent",
  "onboarding.confidence",
  "onboarding.support",
  "onboarding.first_goal",
  "onboarding.beta_acknowledged_at",
]);

type OnboardingForm = {
  targetLanguage: TargetLanguageCode | "other";
  targetLanguageOther: string;
  intent: string;
  confidence: string;
  support: string;
  firstGoal: string;
  learningTrack: LearningTrackCode;
  betaAcknowledged: boolean;
};

const initialForm: OnboardingForm = {
  targetLanguage: "zh",
  targetLanguageOther: "",
  intent: "",
  confidence: "",
  support: "balanced",
  firstGoal: "",
  learningTrack: "local",
  betaAcknowledged: false,
};

function normalizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value === "/onboarding") {
    return "/home";
  }
  return value;
}

function settingValue(entries: SettingsSurfaceResponse["entries"], key: string): string {
  return entries.find((entry) => entry.key === key)?.value ?? "";
}

export function BetaOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEntries, setExistingEntries] = useState<SettingsSurfaceResponse["entries"]>([]);
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const signupLearningTrack = useMemo(() => {
    const metadata = user?.user_metadata;
    const value = metadata && typeof metadata.learning_track === "string" ? metadata.learning_track : "";
    return learningTrackOptions.find((option) => option.code === value)?.code ?? "local";
  }, [user]);
  const signupTargetLanguage = useMemo(() => {
    const metadata = user?.user_metadata;
    const targetLanguage = metadata && typeof metadata.target_language === "string" ? metadata.target_language : "";
    return targetLanguageOptions.some((option) => option.code === targetLanguage) || targetLanguage === "other" ? targetLanguage as TargetLanguageCode | "other" : "zh";
  }, [user]);
  const signupTargetLanguageOther = useMemo(() => {
    const metadata = user?.user_metadata;
    return metadata && typeof metadata.target_language_other === "string" ? metadata.target_language_other : "";
  }, [user]);
  const selectedLanguage = form.targetLanguage === "other"
    ? form.targetLanguageOther || signupTargetLanguageOther || "Other language"
    : languageDisplayLabel(form.targetLanguage);

  useEffect(() => {
    let active = true;
    void fetchJson<SettingsSurfaceResponse>("/settings")
      .then((settings) => {
        if (!active) return;
        setExistingEntries(settings.entries);
        setForm((current) => ({
          ...current,
          targetLanguage: (settingValue(settings.entries, "onboarding.target_language") as TargetLanguageCode | "other") || signupTargetLanguage,
          targetLanguageOther: settingValue(settings.entries, "onboarding.target_language_other") || signupTargetLanguageOther,
          intent: settingValue(settings.entries, "onboarding.intent"),
          confidence: settingValue(settings.entries, "onboarding.confidence"),
          support: settingValue(settings.entries, "onboarding.support") || "balanced",
          firstGoal: settingValue(settings.entries, "onboarding.first_goal"),
          learningTrack: learningTrackOptions.find((option) => option.code === settingValue(settings.entries, "onboarding.learning_track"))?.code ?? signupLearningTrack,
          betaAcknowledged: settingValue(settings.entries, ONBOARDING_COMPLETED_KEY) === "true",
        }));
        setLoading(false);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load beta onboarding.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [signupLearningTrack, signupTargetLanguage, signupTargetLanguageOther]);

  function updateForm<Key extends keyof OnboardingForm>(key: Key, value: OnboardingForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.targetLanguage || (form.targetLanguage === "other" && !form.targetLanguageOther.trim()) || !form.intent || !form.confidence || !form.support || !form.learningTrack || !form.betaAcknowledged) {
      setError("Choose a target language, answer the setup questions, and acknowledge the beta expectations before continuing.");
      return;
    }

    setSaving(true);
    try {
      const preservedEntries = existingEntries.filter((entry) => !ONBOARDING_KEYS.has(entry.key));
      await putJson<SettingsSurfaceResponse>("/settings", {
        entries: [
          ...preservedEntries,
          { key: "onboarding.version", value: ONBOARDING_VERSION },
          { key: "onboarding.target_language", value: form.targetLanguage },
          { key: "onboarding.target_language_other", value: form.targetLanguage === "other" ? form.targetLanguageOther.trim() : "" },
          { key: "onboarding.learning_track", value: form.learningTrack },
          { key: ONBOARDING_COMPLETED_KEY, value: "true" },
          { key: "onboarding.intent", value: form.intent },
          { key: "onboarding.confidence", value: form.confidence },
          { key: "onboarding.support", value: form.support },
          { key: "onboarding.first_goal", value: form.firstGoal.trim() },
          { key: "onboarding.beta_acknowledged_at", value: new Date().toISOString() },
        ],
      });
      router.replace(returnTo);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save beta onboarding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="onboarding-shell"><section className="onboarding-card card"><p className="small-copy">Preparing your beta setup…</p></section></main>;
  }

  return (
    <main className="onboarding-shell" data-inventory-id="onboarding.page">
      <section className="onboarding-card card">
        <span className="eyebrow">TextPlex beta</span>
        <h1>Let&apos;s set up your first reading session</h1>
        <p className="lede">A few answers help us choose the right amount of support. This takes less than a minute, and you can change these preferences later.</p>

        <div className="onboarding-intro" data-inventory-id="onboarding.expectations-card">
          <h2>Before you begin</h2>
          <ul>
            <li>TextPlex is still in beta; labels, features, and saved data may change.</li>
            <li>Only import books and text you are allowed to use.</li>
            <li>Use the feedback button when something is confusing, useful, or broken.</li>
          </ul>
          <p className="small-copy">Your target language: <strong>{selectedLanguage}</strong></p>
          <p className="small-copy"><Link href="/privacy">Read how account and reading data are handled</Link>.</p>
        </div>

        <form className="onboarding-form" onSubmit={submit} data-inventory-id="onboarding.form">
          <label className="onboarding-field" data-inventory-id="onboarding.target-language-question">
            Which language are you here to read?
            <select className="text-input" value={form.targetLanguage} onChange={(event) => updateForm("targetLanguage", event.target.value as TargetLanguageCode | "other")} required>
              <option value="">Choose a target language</option>
              {targetLanguageOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label} ({option.shortCode})</option>
              ))}
              <option value="other">Other language</option>
            </select>
            {form.targetLanguage === "other" ? (
              <input className="text-input" value={form.targetLanguageOther} onChange={(event) => updateForm("targetLanguageOther", event.target.value)} placeholder="Tell us which language" maxLength={80} required />
            ) : null}
          </label>
          <label className="onboarding-field" data-inventory-id="onboarding.learning-track-question">
            Which learning path fits you best?
            <select className="text-input" value={form.learningTrack} onChange={(event) => updateForm("learningTrack", event.target.value as LearningTrackCode)} required>
              {learningTrackOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
            <span className="small-copy">
              {learningTrackOptions.find((option) => option.code === form.learningTrack)?.description}
            </span>
          </label>
          <fieldset data-inventory-id="onboarding.intent-question">
            <legend>What are you hoping to do first?</legend>
            {[
              ["read", "Read books or articles"],
              ["vocabulary", "Build vocabulary from reading"],
              ["study", "Study toward an exam or course"],
              ["explore", "Explore a new language"],
              ["test", "Try the product and give feedback"],
            ].map(([value, label]) => (
              <label className="onboarding-choice" key={value}>
                <input type="radio" name="intent" value={value} checked={form.intent === value} onChange={(event) => updateForm("intent", event.target.value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset data-inventory-id="onboarding.confidence-question">
            <legend>How does the language feel right now?</legend>
            {[
              ["starting", "I'm just starting"],
              ["basics", "I know the basics"],
              ["comfortable", "I can handle familiar material"],
              ["advanced", "I'm comfortable and stretching further"],
            ].map(([value, label]) => (
              <label className="onboarding-choice" key={value}>
                <input type="radio" name="confidence" value={value} checked={form.confidence === value} onChange={(event) => updateForm("confidence", event.target.value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset data-inventory-id="onboarding.support-question">
            <legend>How much help should we show by default?</legend>
            {[
              ["light", "Light — let me read"],
              ["balanced", "Balanced — help when I need it"],
              ["detailed", "Detailed — show more explanation"],
            ].map(([value, label]) => (
              <label className="onboarding-choice" key={value}>
                <input type="radio" name="support" value={value} checked={form.support === value} onChange={(event) => updateForm("support", event.target.value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <label className="onboarding-field" data-inventory-id="onboarding.first-goal-question">
            What would make your first week with TextPlex useful? <span className="muted">(optional)</span>
            <textarea className="text-input onboarding-textarea" value={form.firstGoal} onChange={(event) => updateForm("firstGoal", event.target.value)} maxLength={500} placeholder="For example: finish a chapter, understand more dialogue, or see whether the reader fits my routine." />
          </label>

          <label className="onboarding-acknowledgement" data-inventory-id="onboarding.beta-acknowledgement">
            <input type="checkbox" checked={form.betaAcknowledged} onChange={(event) => updateForm("betaAcknowledged", event.target.checked)} />
            <span>I understand this is a beta product, I will only import authorized material, and I&apos;m willing to share feedback as I use it.</span>
          </label>

          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={saving} data-inventory-id="onboarding.continue-action">
            {saving ? "Saving setup…" : "Continue to TextPlex"}
          </button>
        </form>
      </section>
    </main>
  );
}
