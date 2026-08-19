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

const FORM_ORDER = Object.keys(FORM_LABELS) as JapaneseFormSlot[];

export function JapaneseConjugationGrid({
  conjugation,
  inventoryPrefix,
}: {
  conjugation: JapaneseConjugationResponse;
  inventoryPrefix: "reader" | "study";
}) {
  const overridden = new Set(conjugation.overridden_slots);
  return (
    <section className="japanese-conjugation-card" data-inventory-id={`${inventoryPrefix}.japanese-conjugation-card`}>
      <div className="japanese-conjugation-heading">
        <div>
          <span className="eyebrow">Japanese conjugation</span>
          <h3>{conjugation.verb.lemma}</h3>
        </div>
        <span className="pill">{conjugation.verb.conjugation_class}</span>
      </div>
      <p className="small-copy japanese-conjugation-rule">
        Derived from {conjugation.verb.rule_id}. {overridden.size ? "Lexical overrides are marked." : "No lexical overrides."}
      </p>
      <div className="japanese-conjugation-grid" data-inventory-id={`${inventoryPrefix}.japanese-conjugation-grid`}>
        {FORM_ORDER.map((slot) => (
          <div className={`japanese-conjugation-cell ${overridden.has(slot) ? "is-overridden" : ""}`} key={slot}>
            <span>{FORM_LABELS[slot]}</span>
            <strong lang="ja">{conjugation.forms[slot]}</strong>
            {overridden.has(slot) ? <em>lexical override</em> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
