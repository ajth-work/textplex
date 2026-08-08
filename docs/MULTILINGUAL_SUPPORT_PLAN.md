# Multilingual Support Plan

## Goal

Allow learners to use TextPlex in their preferred interface and explanation language while studying content in one or more target languages.

The first important use case is:

> A Japanese learner uses a Japanese interface and Japanese explanations to study English content.

## Core model

Do not use one `language_code` field for every language-related concern. TextPlex should distinguish these concepts:

| Concept | Example | Purpose |
| --- | --- | --- |
| UI locale | `ja-JP` | Language used for navigation, labels, settings, and system messages. |
| Learner target language | `en` | Language the learner is studying. |
| Explanation language | `ja` | Language used for definitions, translations, grammar explanations, and practice instructions. |
| Content language | `en` | Language of an imported book, article, or other reading material. |

This separation allows `UI locale = ja-JP`, `explanation language = ja`, and `content language = en` to work together without changing the meaning of learner progress data.

## Design principles

1. Interface localization, learning-language support, and translation support are separate systems.
2. Language codes should use normalized BCP 47 or ISO-compatible values consistently; display labels should never be used as identifiers.
3. Book truth remains attached to the book database, while learner truth remains attached to the learner profile.
4. Language-specific behavior should be described by language-pack capabilities rather than scattered `if language == ...` branches.
5. English is the fallback locale, not an assumption that meanings or translations are always English.
6. Machine-generated translations and definitions must retain provider and provenance information.

## Canonical language registry

Create one registry shared by the web app, API, processor, and language-aware product surfaces.

```ts
{
  code: "en",
  bcp47: "en-US",
  nativeName: "English",
  direction: "ltr",
  script: "Latn",
  tokenizer: "whitespace",
  normalizer: "lowercase",
  ttsSupported: true,
  lexiconSupported: true,
  curricula: ["cefr"]
}
```

Each language pack should define, as applicable:

- script and text direction
- sentence and token segmentation
- normalization and lemmatization
- pronunciation, romanization, and TTS behavior
- lexicon sources and definition availability
- curriculum or proficiency systems
- translation support and fallback behavior
- font, line-height, and text-layout requirements

The existing processor already carries `language_code` through books, extraction, tokens, lexicons, and learner progress. The next step is to move language-specific rules behind this registry and its capabilities.

## User settings and profile model

Add explicit preferences for the language experience:

```text
interface_locale = ja-JP
explanation_locale = ja
default_target_language = en
```

The current singular hosted `target_language` field can remain temporarily for compatibility. The long-term model should support multiple learning languages:

```text
learner_languages
- language_code
- role: target
- proficiency_level
- selected
- created_at
```

These preferences should work in local-only mode and synchronize to the authenticated hosted profile when available.

## UI localization

Move visible interface text into namespaced message catalogs:

```text
messages/en-US/common.json
messages/en-US/reader.json
messages/en-US/study.json
messages/ja-JP/common.json
messages/ja-JP/reader.json
messages/ja-JP/study.json
```

Use stable keys rather than inline English strings:

```json
{
  "reader": {
    "meaning": "Meaning",
    "translationUnavailable": "Translation unavailable.",
    "tapWordForMeaning": "Tap a word to see its meaning."
  }
}
```

The localization layer should support:

- fallback to English for missing keys
- pluralization and gender/select rules where needed
- locale-aware dates, numbers, and relative times
- translated accessibility labels and status messages
- text expansion without fixed-width layout assumptions
- right-to-left layout when languages such as Arabic or Hebrew are added

Avoid concatenating translated fragments in components. Message keys should own the complete sentence and its variables.

## Language-aware educational output

Definitions, sentence translations, grammar explanations, generated articles, and practice prompts should carry both directions:

```json
{
  "source_language_code": "en",
  "target_language_code": "ja",
  "text": "走る",
  "source": "machine",
  "provenance": "Google Translate"
}
```

A lexicon entry should eventually support multiple explanation languages:

```text
lexicon entry
- learning_language: en
- lemma: run
- meaning_language: ja
- definition: 走る
- source: curated | machine | user
```

Translation caches and API requests should always include `source_language_code` and `target_language_code`. Translation should not implicitly mean “translate to English.”

## Curriculum and assessment

Curriculum metadata must be pluggable:

```text
assessment_system: CEFR | JLPT | HSK | TOPIK | none
```

The data model should not assume that every language has the same:

- word segmentation rules
- normalization behavior
- definition structure
- proficiency ladder
- pronunciation model
- reading difficulty metrics

Unsupported metrics should be represented explicitly as `unsupported`, `pending`, or `no_evidence`, rather than silently displaying an English-oriented metric.

## Recommended implementation phases

### Phase 1: Establish language boundaries

- Add a canonical language registry.
- Define typed locale and explanation-language settings.
- Audit English-only defaults and labels.
- Keep existing `language_code` behavior compatible.

### Phase 2: Localize the application shell

- Extract web UI text into message catalogs.
- Add English as the complete fallback catalog.
- Add Japanese as the first additional UI locale.
- Add locale selection to Settings and persist it locally and for authenticated users.

### Phase 3: Localize learner assistance

- Add `explanation_locale`.
- Make definitions, sentence translations, grammar help, and study prompts language-pair aware.
- Remove hardcoded “English meaning” and “Type the English meaning” assumptions.
- Label machine-generated output and preserve its provenance.

### Phase 4: Formalize language packs

- Move tokenization, normalization, pronunciation, lexicon, and curriculum behavior behind language-pack capabilities.
- Add language-specific fixtures and focused processor tests.
- Support English as a target language independently from English as a UI or explanation language.

### Phase 5: Expand language coverage safely

- Add languages by capability group where practical, such as Latin-script languages.
- Treat Japanese, Chinese, Korean, Arabic, and Hebrew as distinct script or segmentation profiles rather than forcing them into a generic path.
- Add RTL, font, line-height, and mobile-layout QA before shipping RTL locales.

## First vertical slice

The best first slice is:

> Japanese UI + English learning content + Japanese definitions and sentence translations.

This validates the most important architecture without requiring Japanese books or a complete Japanese target-language curriculum. Once this works, Japanese-as-a-target-language can be added independently.

## Repository alignment

The current repository already provides useful foundations:

- `language_code` is present across book, extraction, lexicon, and learner contracts.
- The processor has language-aware tokenization and normalization branches.
- Speech selection already accepts content language codes.
- Translation alignment contracts already carry source and target language codes.
- The book and learner data stores are separated.

The main gaps are:

- no first-class UI locale setting
- English assumptions in several reader and study labels
- English-oriented lexicon definitions and fallback behavior
- translation alignment and fallback paths that default to English
- language-specific behavior spread across services instead of being owned by a registry or language pack

Relevant existing surfaces include [`packages/shared/src/contracts.ts`](../packages/shared/src/contracts.ts), [`docs/DATA_MODEL.md`](./DATA_MODEL.md), [`apps/web/components/reader-view.tsx`](../apps/web/components/reader-view.tsx), [`apps/web/components/study-practice-view.tsx`](../apps/web/components/study-practice-view.tsx), and [`apps/api/app/services/lexicon.py`](../apps/api/app/services/lexicon.py).

## Acceptance criteria for the first slice

The first multilingual release should demonstrate that:

1. A learner can choose Japanese as the interface locale.
2. The complete primary navigation, settings, reader controls, loading states, errors, and study prompts render in Japanese.
3. An English book remains identified and processed as English.
4. Definitions and sentence translations can be requested in Japanese.
5. Learner progress remains keyed to English lemmas, not translated display text.
6. Missing Japanese translations fall back visibly and safely, with provenance.
7. Switching back to English does not alter the learner's books, progress, or language data.

## Non-goals for the first release

- Translating every historical generated artifact.
- Building a separate curriculum for every supported language.
- Treating machine translation as equivalent to curated dictionary content.
- Adding many locales before the message-key and fallback workflow is stable.
- Replacing the existing book/learner storage separation.
