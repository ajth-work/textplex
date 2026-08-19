"use client";

import { useState } from "react";
import type { JapaneseConjugationResponse, JapaneseFormSlot } from "../lib/textplex";

const FORM_LABELS: Record<JapaneseFormSlot, string> = {
  plain_present: "Plain present",
  polite_present: "Polite present",
  plain_past: "Plain past",
  polite_past: "Polite past",
  plain_negative: "Plain negative",
  polite_negative: "Polite negative",
  plain_past_negative: "Plain past negative",
  polite_past_negative: "Polite past negative",
  te: "て-form",
  conditional: "Conditional",
  volitional: "Volitional",
  passive: "Passive",
  causative: "Causative",
  potential: "Potential",
  imperative: "Imperative",
};

const QUICK_FORM_SLOTS: JapaneseFormSlot[] = ["plain_present", "polite_present", "plain_past", "plain_negative", "te", "potential"];
const FORM_GROUPS: Array<{ label: string; slots: JapaneseFormSlot[] }> = [
  { label: "Basic", slots: ["plain_present", "polite_present", "plain_past", "polite_past"] },
  { label: "Negative", slots: ["plain_negative", "polite_negative", "plain_past_negative", "polite_past_negative"] },
  { label: "Connecting", slots: ["te", "conditional", "volitional"] },
  { label: "Voice and mood", slots: ["passive", "causative", "potential", "imperative"] },
];
const FORM_EXPLANATIONS: Record<JapaneseFormSlot, { title: string; general: string }> = {
  plain_present: { title: "Plain present", general: "The everyday dictionary form. It can describe a present or future action, depending on context." },
  polite_present: { title: "Polite present", general: "The polite non-past form, used when speaking respectfully or keeping a neutral learner-friendly tone." },
  plain_past: { title: "Plain past", general: "The casual completed form: an action that happened or a state that was true." },
  polite_past: { title: "Polite past", general: "The respectful completed form, commonly used in polite conversation." },
  plain_negative: { title: "Plain negative", general: "The casual way to say that the verb does not happen or is not true." },
  polite_negative: { title: "Polite negative", general: "The respectful way to say that the verb does not happen or is not true." },
  plain_past_negative: { title: "Plain past negative", general: "The casual way to say that the verb did not happen or was not true." },
  polite_past_negative: { title: "Polite past negative", general: "The respectful way to say that the verb did not happen or was not true." },
  te: { title: "て-form", general: "A connecting form used to link actions, make requests, describe ongoing states, and build patterns such as ている." },
  conditional: { title: "Conditional", general: "An if/when form: it describes what happens if a condition is met." },
  volitional: { title: "Volitional", general: "A let's or I intend to form used for suggestions, plans, and willingness." },
  passive: { title: "Passive", general: "A form where the subject receives the action, often meaning “be done to” or “be affected by.”" },
  causative: { title: "Causative", general: "A form meaning make or let someone do something." },
  potential: { title: "Potential", general: "An ability form meaning can do something or be able to do something." },
  imperative: { title: "Imperative", general: "A direct command. It is forceful and is less common in ordinary polite conversation." },
};

function explainJapaneseForm(surfaceForm: string | null | undefined, lemma: string): string | null {
  const surface = surfaceForm?.trim();
  if (!surface || surface === lemma) {
    return null;
  }
  if (/^し(?:て|た|ます|ない|よう|ろ|ません|なかった)/u.test(surface)) {
    return `${surface} is a derived form of ${lemma}.`;
  }
  return `${surface} is a derived form of ${lemma}.`;
}

function explainConjugationClass(conjugationClass: JapaneseConjugationResponse["verb"]["conjugation_class"]): string {
  switch (conjugationClass) {
    case "godan":
      return "A verb whose ending changes across forms, such as 書く → 書きます. These are often called u-verbs.";
    case "ichidan":
      return "A verb that usually drops る before adding an ending, such as 食べる → 食べます. These are often called ru-verbs.";
    case "suru":
      return "A する verb. It commonly turns a noun into an action, such as 勉強する, meaning “to study.”";
    case "kuru":
      return "The irregular 来る verb, meaning “to come.” Its forms use き, こ, or 来 depending on the form.";
    default:
      return "An irregular verb whose forms need a specific lexical rule rather than a regular class pattern.";
  }
}

function explainFormMeaning(surfaceForm: string | null | undefined, translatedMeaning: string | null | undefined): string {
  if (surfaceForm && /^し(?:て|た|ます|ない|よう|ろ|ません|なかった)/u.test(surfaceForm)) {
    return `${surfaceForm} uses する in a changed form; with ていた, it commonly expresses “was doing” or “had been doing.”`;
  }
  return translatedMeaning
    ? `The dictionary meaning here is “${translatedMeaning}.” The selected form applies the tense, politeness, or voice shown by its label.`
    : "The selected form applies the tense, politeness, or voice shown by its label to the verb’s core meaning.";
}

export function JapaneseConjugationGrid({
  conjugation,
  inventoryPrefix,
  surfaceForm = null,
  translatedMeaning = null,
}: {
  conjugation: JapaneseConjugationResponse;
  inventoryPrefix: "reader" | "study";
  surfaceForm?: string | null;
  translatedMeaning?: string | null;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeFormSlot, setActiveFormSlot] = useState<JapaneseFormSlot | null>(null);
  const overridden = new Set(conjugation.overridden_slots);
  const activeFormExplanation = activeFormSlot ? FORM_EXPLANATIONS[activeFormSlot] : null;
  const activeFormValue = activeFormSlot ? conjugation.forms[activeFormSlot] : null;
  const activeFormIsCurrent = Boolean(activeFormSlot && surfaceForm && activeFormValue === surfaceForm);
  const activeFormContext = activeFormExplanation
    ? activeFormIsCurrent
      ? `${surfaceForm} is the ${activeFormExplanation.title.toLowerCase()} form of ${conjugation.verb.lemma}. ${translatedMeaning ? `In this sentence, it means “${translatedMeaning},” with the form adding the grammar meaning above.` : "The form adds the grammar meaning above to this verb."}`
      : `${conjugation.verb.lemma} becomes ${activeFormValue}. ${translatedMeaning ? `Starting from the current dictionary meaning “${translatedMeaning},” this form changes the tense, politeness, connection, voice, or ability as described above.` : "This form applies the grammar meaning above to the current verb."}`
    : null;
  const renderFormCell = (slot: JapaneseFormSlot) => (
    <div className={`japanese-conjugation-cell ${overridden.has(slot) ? "is-overridden" : ""}`} key={slot}>
      <div className="japanese-conjugation-cell-heading">
        <span>{FORM_LABELS[slot]}</span>
        <button
          type="button"
          className="japanese-conjugation-form-info-button"
          aria-label={`Explain ${FORM_LABELS[slot]}`}
          aria-pressed={activeFormSlot === slot}
          title={`Explain ${FORM_LABELS[slot]}`}
          onClick={() => setActiveFormSlot((current) => (current === slot ? null : slot))}
        >
          i
        </button>
      </div>
      <strong lang="ja">{conjugation.forms[slot]}</strong>
      {overridden.has(slot) ? <em>lexical override</em> : null}
    </div>
  );
  return (
    <section className="japanese-conjugation-card" data-inventory-id={`${inventoryPrefix}.japanese-conjugation-card`}>
      <div className="japanese-conjugation-heading">
        <div>
          <span className="eyebrow">Japanese conjugation</span>
          <h3>{conjugation.verb.lemma}</h3>
        </div>
        <div className="japanese-conjugation-type-actions">
          <span className="pill">{conjugation.verb.conjugation_class}</span>
          <button
            type="button"
            className="japanese-conjugation-info-button"
            aria-expanded={showInfo}
            aria-label="Explain this conjugation type"
            title="Explain this conjugation type"
            onClick={() => setShowInfo((current) => !current)}
          >
            i
          </button>
        </div>
      </div>
      {showInfo ? (
        <div className="japanese-conjugation-info" role="note">
          <strong>{conjugation.verb.conjugation_class} verbs in plain terms</strong>
          <p>{explainConjugationClass(conjugation.verb.conjugation_class)}</p>
          <strong>What this form means</strong>
          <p>{explainFormMeaning(surfaceForm, translatedMeaning)}</p>
        </div>
      ) : null}
      {surfaceForm && surfaceForm !== conjugation.verb.lemma ? (
        <div className="japanese-conjugation-current" lang="ja">
          <span className="eyebrow">Current form</span>
          <strong>{surfaceForm}</strong>
          <span>{explainJapaneseForm(surfaceForm, conjugation.verb.lemma)}</span>
        </div>
      ) : null}
      <p className="small-copy japanese-conjugation-rule">
        Derived from {conjugation.verb.rule_id}. {overridden.size ? "Lexical overrides are marked." : "No lexical overrides."}
      </p>
      <div className="japanese-conjugation-quick-grid">
        {QUICK_FORM_SLOTS.map((slot) => (
          renderFormCell(slot)
        ))}
      </div>
      {activeFormExplanation ? (
        <div className="japanese-conjugation-form-info" role="note">
          <strong>{activeFormExplanation.title}</strong>
          <p>{activeFormExplanation.general}</p>
          <p>{activeFormContext}</p>
        </div>
      ) : null}
      <details className="japanese-conjugation-details">
        <summary>View full conjugation</summary>
        <div className="japanese-conjugation-groups" data-inventory-id={`${inventoryPrefix}.japanese-conjugation-grid`}>
          {FORM_GROUPS.map((group) => (
            <section className="japanese-conjugation-group" key={group.label}>
              <span className="eyebrow">{group.label}</span>
              <div className="japanese-conjugation-grid">
                {group.slots.map((slot) => renderFormCell(slot))}
              </div>
            </section>
          ))}
        </div>
      </details>
    </section>
  );
}
