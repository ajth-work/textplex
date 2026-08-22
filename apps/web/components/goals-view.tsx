"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

import { RoutePage } from "./route-page";
import type { ProgressSurfaceResponse } from "../lib/textplex";
import { fetchJson, putJson, type SettingsSurfaceResponse, type SettingsUpdateRequest } from "../lib/textplex";

const DEFAULTS = { pages: 6, sentences: 50, words: 25, sessions: 3 };
const KEYS = {
  pages: "goals.weeklyPages",
  sentences: "goals.dailySentences",
  words: "goals.monthlyWords",
  sessions: "goals.weeklySessions",
} as const;

type GoalKey = keyof typeof DEFAULTS;
type GoalState = Record<GoalKey, number>;
type GoalsViewProps = { demo?: boolean };

const goalMeta: Record<GoalKey, { title: string; detail: string; unit: string; period: string; icon: string }> = {
  pages: { title: "Weekly reading", detail: "Keep a steady reading rhythm", unit: "pages", period: "This week", icon: "↗" },
  sentences: { title: "Daily exposure", detail: "Give your brain a little more context", unit: "sentences", period: "Today", icon: "✦" },
  words: { title: "New vocabulary", detail: "Meet words that expand your reading world", unit: "new words", period: "This month", icon: "Aa" },
  sessions: { title: "Reading sessions", detail: "Build a habit you can return to", unit: "sessions", period: "This week", icon: "◷" },
};

function readGoalSettings(result: SettingsSurfaceResponse): GoalState {
  return (Object.keys(DEFAULTS) as GoalKey[]).reduce((goals, key) => {
    const entry = result.entries.find((item) => item.key === KEYS[key]);
    const value = entry ? Number(entry.value) : DEFAULTS[key];
    goals[key] = Number.isSafeInteger(value) && value > 0 ? value : DEFAULTS[key];
    return goals;
  }, {} as GoalState);
}

function progressFor(key: GoalKey, data: ProgressSurfaceResponse, demo: boolean): number {
  if (key === "pages") return demo ? 4 : data.weekly_page_reads ?? data.profile.today_sentence_reads ?? 0;
  if (key === "sentences") return demo ? 34 : data.profile.today_sentence_reads;
  if (key === "words") return demo ? 17 : data.profile.unique_words_seen;
  return demo ? 2 : data.profile.reading_sessions;
}

export function GoalsSurface({ demo = false }: Readonly<GoalsViewProps>) {
  const [data, setData] = useState<ProgressSurfaceResponse | null>(null);
  const [goals, setGoals] = useState<GoalState>(DEFAULTS);
  const [editing, setEditing] = useState<GoalKey | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const progress = demo
        ? ({ profile: { today_sentence_reads: 34, unique_words_seen: 17, reading_sessions: 2 }, weekly_page_reads: 4 } as unknown as ProgressSurfaceResponse)
        : await fetchJson<ProgressSurfaceResponse>("/progress");
      if (!active) return;
      setData(progress);
      if (!demo) {
        const settings = await fetchJson<SettingsSurfaceResponse>("/settings");
        if (active) setGoals(readGoalSettings(settings));
      }
    };
    void load().catch((err) => active && setError(err instanceof Error ? err.message : "Unable to load your goals."));
    return () => { active = false; };
  }, [demo]);

  const completed = useMemo(() => data ? (Object.keys(DEFAULTS) as GoalKey[]).filter((key) => progressFor(key, data, demo) >= goals[key]).length : 0, [data, demo, goals]);

  function beginEdit(key: GoalKey) {
    setError(null);
    setEditing(key);
    setDraft(String(goals[key]));
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>, key: GoalKey) {
    event.preventDefault();
    const value = Number(draft);
    if (!Number.isSafeInteger(value) || value < 1) { setError("Choose a whole-number goal of at least 1."); return; }
    setSaving(true);
    try {
      if (!demo) {
        const settings = await fetchJson<SettingsSurfaceResponse>("/settings");
        await putJson<SettingsSurfaceResponse>("/settings", { entries: [...settings.entries.filter((item) => item.key !== KEYS[key]), { key: KEYS[key], value: String(value) }] } satisfies SettingsUpdateRequest);
      }
      setGoals((current) => ({ ...current, [key]: value }));
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save this goal."); }
    finally { setSaving(false); }
  }

  return (
    <RoutePage inventoryId="goals.page" eyebrow="Goals" title="Make progress feel tangible" description="Choose the rhythms that matter to you, then watch small actions add up." badge={data ? `${completed} of 4 on track` : "Loading"} links={[{ href: "/home", label: "Back to home" }, { href: "/progress", label: "View analytics" }]} metrics={data ? [{ label: "On track", value: `${completed} / 4`, detail: "goals currently met" }, { label: "Today", value: String(data.profile.today_sentence_reads), detail: "sentences exposed" }, { label: "Momentum", value: data.profile.reading_sessions > 0 ? "Active" : "Ready", detail: "your reading habit" }] : []}>
      {error ? <p className="goals-error" role="alert">{error}</p> : null}
      <section className="goals-focus card" data-inventory-id="goals.focus-card">
        <div><span className="eyebrow">Your next win</span><h2>{completed === 4 ? "You’re keeping every promise to yourself." : "A few focused minutes can move this forward."}</h2><p>{completed === 4 ? "Take a moment to notice the consistency. Then raise one target when you’re ready." : "Start with the goal that feels easiest to complete today. Consistency compounds."}</p></div>
        <div className="goals-focus-orbit" aria-hidden="true"><span>✦</span></div>
      </section>
      <section className="goals-grid" aria-label="Editable reading goals" data-inventory-id="goals.list">
        {(Object.keys(DEFAULTS) as GoalKey[]).map((key) => {
          const meta = goalMeta[key];
          const current = data ? progressFor(key, data, demo) : 0;
          const percent = Math.min(100, Math.round((current / goals[key]) * 100));
          return <article className={`goal-detail-card card${percent >= 100 ? " is-complete" : ""}`} key={key} data-inventory-id={`goals.${key}-card`}>
            <div className="goal-detail-topline"><span className="goal-detail-icon" aria-hidden="true">{meta.icon}</span><span className="goal-period">{meta.period}</span>{percent >= 100 ? <span className="goal-complete-label">Complete</span> : null}</div>
            {editing === key ? <form className="goal-edit-form" onSubmit={(event) => void saveGoal(event, key)}><label htmlFor={`goal-${key}`}>{meta.title} target</label><div className="goal-edit-row"><input id={`goal-${key}`} className="text-input" type="number" min="1" value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus /><span>{meta.unit}</span></div><div className="button-row"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save target"}</button></div></form> : <button type="button" className="goal-detail-button" onClick={() => beginEdit(key)} aria-label={`Edit ${meta.title} goal`}><div><h2>{meta.title}</h2><p>{meta.detail}</p></div><span className="goal-edit-label">Edit</span></button>}
            {editing !== key ? <><div className="goal-progress-numbers"><strong>{current}</strong><span>/ {goals[key]} {meta.unit}</span><b>{percent}%</b></div><div className="goal-progress-track"><span style={{ width: `${percent}%` }} /></div><p className="goal-progress-note">{percent >= 100 ? "You did it. Keep the momentum going." : `${Math.max(goals[key] - current, 0)} ${meta.unit} to go`}</p></> : null}
          </article>;
        })}
      </section>
      <p className="goals-footnote">Targets are saved to your learner profile. Adjust them whenever your season of reading changes.</p>
    </RoutePage>
  );
}
