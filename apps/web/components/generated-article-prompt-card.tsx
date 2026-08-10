"use client";

import { formatDateTime, type GeneratedReaderArticlePromptDetails } from "../lib/textplex";
import { languageShortCode } from "../lib/language-options";

type GeneratedArticlePromptCardProps = {
  details: GeneratedReaderArticlePromptDetails | null;
  loading?: boolean;
  inventoryId: string;
  title?: string;
  description?: string;
};

function renderTermList(label: string, terms: GeneratedReaderArticlePromptDetails["known_terms"]): JSX.Element {
  return (
    <div className="generated-article-prompt-term-group">
      <strong>{label}</strong>
      {terms.length ? (
        <ul className="generated-article-prompt-term-list">
          {terms.map((term) => (
            <li key={`${label}-${term.term}`} className="generated-article-prompt-term">
              <span className="generated-article-prompt-term-form">{term.term}</span>
              <span className="generated-article-prompt-term-meta">
                {term.pronunciation ? `${term.pronunciation} | ` : ""}
                {term.definition_short ?? "No definition"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small-copy">No {label.toLowerCase()} terms were captured.</p>
      )}
    </div>
  );
}

export function GeneratedArticlePromptCard({
  details,
  loading = false,
  inventoryId,
  title = "Prompt details",
  description = "The saved request payload shows exactly what TextPlex sent to the generator for this article.",
}: GeneratedArticlePromptCardProps) {
  return (
    <article className="card feature-card generated-article-prompt-card" data-inventory-id={inventoryId}>
      <div className="card-topline">
        <h2>{title}</h2>
        <span className="pill">{details ? details.generation_source : loading ? "Loading" : "Unavailable"}</span>
      </div>
      <p className="small-copy">{description}</p>
      {details ? (
        <>
          <dl className="generated-article-prompt-metrics">
            <div>
              <dt>Generated</dt>
              <dd>{formatDateTime(details.generated_at)}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{details.model}</dd>
            </div>
            <div>
              <dt>Prompt version</dt>
              <dd>{details.prompt_version}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>
                {details.language_label} ({languageShortCode(details.language_code)})
              </dd>
            </div>
            <div>
              <dt>Topic</dt>
              <dd>{details.topic}</dd>
            </div>
            <div>
              <dt>Genre / tone</dt>
              <dd>
                {details.genre} / {details.tone}
              </dd>
            </div>
            <div>
              <dt>Curriculum</dt>
              <dd>
                {details.curriculum_label ?? details.curriculum_level ?? "Auto"} | {details.curriculum_mode}
              </dd>
            </div>
            <div>
              <dt>Sentence count</dt>
              <dd>
                {details.requested_sentence_count}
                {details.actual_sentence_count !== details.requested_sentence_count ? ` -> ${details.actual_sentence_count}` : ""}
              </dd>
            </div>
          </dl>

          <div className="generated-article-prompt-window">
            {renderTermList("Known", details.known_terms)}
            {renderTermList("Recent", details.recent_terms)}
            {renderTermList("Upcoming", details.upcoming_terms)}
          </div>

          <details className="generated-article-prompt-text">
            <summary>Prompt text</summary>
            <pre>{details.prompt_text}</pre>
          </details>

          <p className="small-copy">
            New-lemma budget: {details.max_new_lemmas}. Unknown lemmas: {details.unknown_lemma_count}.
          </p>
        </>
      ) : (
        <p className="small-copy">{loading ? "Loading prompt details..." : "No saved prompt details are available for this book."}</p>
      )}
    </article>
  );
}
