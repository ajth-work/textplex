# TextPlex Academic Review

Date: 2026-07-25

This note reviews the learning model implied by TextPlex's docs and implementation and compares it with mainstream second-language acquisition and vocabulary-learning research.

It is not a literature survey in the abstract. It is a product-facing review of whether the repo's current pedagogy is defensible, where it is well supported, and where it should stay explicitly provisional.

## Executive View

TextPlex is best understood as a hybrid reading system:

- extensive reading and narrow reading for meaning-focused input
- glossed and assisted reading for word learning support
- frequency- and exam-based sequencing where a public ladder exists
- morphology-aware lexical tracking for non-Romanized languages
- spaced repetition or mastery timing underneath the visible progression model

That overall direction is academically reasonable. The main risk is not the direction itself. The risk is overclaiming what the telemetry means. Exposure counts, tap events, confidence scores, and state buckets are useful operational signals, but they are not direct measures of mastery.

## What TextPlex Is Assuming

The repo's docs and code make several pedagogical assumptions:

- reading is a primary route to acquisition
- repeated exposure matters
- help, glosses, and pronunciation support make input more learnable
- learner state should accumulate across books and sessions
- lemma or headword identity matters more than raw surface form in morphologically rich languages
- progression should be driven by frequency, corpus coverage, or a public proficiency ladder when available
- generated practice text can be made safer if it is constrained by a learner window

These assumptions are visible in [ARCHITECTURE.md](./ARCHITECTURE.md), [PROCESSING_CONTRACT.md](./PROCESSING_CONTRACT.md), [LANGUAGE_LEARNING_PROGRAM_TEMPLATE.md](./LANGUAGE_LEARNING_PROGRAM_TEMPLATE.md), [ADAPTIVE_GENERATED_READER_ARTICLES.md](./ADAPTIVE_GENERATED_READER_ARTICLES.md), and the language-specific notes.

## Strongly Supported Parts

### 1. Extensive reading and meaning-focused input

The broad idea that reading helps vocabulary growth and reading proficiency is well supported. A meta-analysis of extensive reading found positive effects on reading outcomes, and later work on incidental vocabulary learning continues to show that meaningful input can produce gains.

This supports TextPlex's core loop:

- import a real text
- make it readable
- let the learner meet the same vocabulary repeatedly
- record exposure over time

Relevant sources:

- [Nakanishi (2015), extensive reading meta-analysis](https://doi.org/10.1002/tesq.157)
- [How effective is second language incidental vocabulary learning? A meta-analysis](https://www.cambridge.org/core/journals/language-teaching/article/how-effective-is-second-language-incidental-vocabulary-learning-a-metaanalysis/E38E3468FD2090B1FA3051051DE8E70C)

### 2. Repetition helps

The repo's reliance on repeated reader exposure is aligned with both general learning science and L2 vocabulary research. Spacing and retrieval practice are robust effects in cognitive psychology, and L2 meta-analysis work also finds a positive relationship between repeated encounters and incidental vocabulary learning.

This is the clearest justification for:

- exposure ledgers
- revisit-aware reader behavior
- weighted progress instead of one-shot lookups
- study and reader pathways feeding the same learner state

Relevant sources:

- [Carpenter, Pan, and Butler (2022), spacing and retrieval practice review](https://www.nature.com/articles/s44159-022-00089-1.pdf)
- [Uchihara, Webb, and Yanagisawa (2019), repetition and incidental vocabulary learning](https://doi.org/10.1111/lang.12343)

### 3. Glosses and multimodal aids help

TextPlex's token inspector, pronunciation display, translation fallback, and source provenance are in line with the glossing literature. Meta-analytic work shows that glosses and additional modes often help vocabulary learning, though the benefit depends on design, proficiency, and test type.

This supports:

- token-level definitions
- pronunciation or transliteration on demand
- cached lookup provenance
- optional translation and source-sentence panels

Relevant sources:

- [Ramezanali, Uchihara, and Faez (2020), multimodal glossing meta-analysis](https://doi.org/10.1002/tesq.579)
- [Kim, Lee, and Lee (2021), L1 vs L2 gloss meta-analysis](https://doi.org/10.1177/1362168820981394)
- [Yu and Trainin (2022), technology-assisted L2 vocabulary learning meta-analysis](https://digitalcommons.unl.edu/teachlearnfacpub/512/)

### 4. Lexical coverage matters, but not as a single magic number

The repo's coverage-based thinking is reasonable, but it should be presented carefully. Older work and later replications agree that lexical coverage strongly affects comprehension, yet recent evidence suggests the practical threshold depends on the task and the learner.

This supports:

- coverage-aware difficulty estimates
- reader surfaces that show known versus unknown load
- language-specific progression ladders

It does not support a universal claim that one fixed percentage is enough for every learner and every text.

Relevant sources:

- [Schmitt, Jiang, and Grabe (2011), percentage of known words and reading comprehension](https://doi.org/10.1111/j.1540-4781.2011.01146.x)
- [How does lexical coverage affect the processing of L2 texts?](https://doi.org/10.1093/applin/amae062)

### 5. Morphology-aware tracking is the right unit choice for many languages

For Korean, Japanese, Russian, Arabic, and Hebrew, the repo's insistence on lemma or stem based identity is strongly defensible. Morphology is a major correlate of reading and vocabulary outcomes, and morphologically rich languages should not be modeled as if surface form were the only relevant unit.

This supports:

- lemma-based learner records
- family-aware lookup order
- particle and suffix handling
- preserving visible surface text while tracking canonical lexical identity underneath

Relevant sources:

- [Liu, Groen, and Cain (2024), morphological awareness and reading comprehension meta-analysis](https://eprints.lancs.ac.uk/id/eprint/210432/)
- [Zhang, Ke, and Mo, morphology in reading comprehension meta-analytic SEM study](https://research.polyu.edu.hk/en/publications/morphology-in-reading-comprehension-among-school-aged-readers-of-/)
- [Lardiere (2016), morphology in second language acquisition](https://www.jstage.jst.go.jp/article/secondlanguage/15/0/15_5/_article/-char/en)

## Mixed Or Provisional Parts

### 1. Spaced repetition and mastery timing

The repo's use of `weighted_exposure`, `confidence_score`, and mastery-like states is sensible, but the exact thresholds are not settled by the literature. Spacing effects are robust, but there is no evidence that TextPlex's current weights are the "correct" weights.

Treat these as engineering heuristics that should be validated against retention and recall outcomes.

In practice, the repo should prefer language like:

- "progress signal"
- "learner confidence heuristic"
- "operational mastery state"

instead of implying a calibrated psychometric scale.

### 2. Narrow reading and learner-window generated text

The adaptive generated-article idea is plausible and promising, but it is the least established piece of the system. Narrow reading research supports the idea that thematically or lexically constrained input can improve vocabulary learning. That gives some backing to the learner-window design.

However, the specific idea of asking an LLM to generate a passage from known, recent, and upcoming words is still a product hypothesis. It should be treated as constrained input design, not as a settled acquisition mechanism.

Relevant source:

- [Chang and Renandya (2021), effect of narrow reading on vocabulary acquisition](https://doi.org/10.1177/0033688219871387)

### 3. Coverage thresholds are useful but genre-sensitive

TextPlex's difficulty views should not hard-code one universal coverage target. The literature on lexical coverage is influential, but more recent work shows that processing and learning vary by task, text type, and learner level.

The safest position is:

- use coverage as an input to recommendation and staging
- do not use it as a total answer to comprehension
- keep the metric separate from actual user performance

## What The Repo Should Keep Saying

The documentation and UI copy should stay aligned with the evidence:

- TextPlex helps learners read more and notice more vocabulary.
- Repeated, supported exposure can improve learning.
- Progress metrics are estimates, not mastery guarantees.
- Generated practice content is a controlled supplement, not a replacement for authentic texts.
- Book truth and learner truth must remain separate.

Those statements are all defensible. The repo should avoid stronger claims such as:

- "one read is enough"
- "coverage equals mastery"
- "tap counts directly measure knowledge"
- "generated text is equivalent to authentic reading"

## Product Recommendations

1. Keep the current reader-first architecture.
2. Keep the separate learner profile database.
3. Keep glosses, pronunciation, and provenance visible as optional aids.
4. Keep lemma or headword identity for morphologically rich languages.
5. Treat frequency ladders and public exam ladders as progression anchors, not as complete models of acquisition.
6. Validate the generated-article feature against retention and delayed recall, not just immediate lexical coverage.
7. Make the learning UI say "estimate" when it means estimate.

## Practical Implications For TextPlex

The existing implementation already moves in the right direction:

- [apps/api/app/services/learning_profile.py](../apps/api/app/services/learning_profile.py) uses exposure-ledger aggregation and a confidence heuristic to summarize learner state.
- [docs/CHINESE_LEARNING_PROGRAM.md](./CHINESE_LEARNING_PROGRAM.md), [docs/KOREAN_LEARNING_PROGRAM.md](./KOREAN_LEARNING_PROGRAM.md), [docs/JAPANESE_LEARNING_PROGRAM.md](./JAPANESE_LEARNING_PROGRAM.md), and [docs/RUSSIAN_LEARNING_PROGRAM.md](./RUSSIAN_LEARNING_PROGRAM.md) are already using language-specific proficiency anchors rather than pretending one word-count ladder fits all languages.
- [docs/ADAPTIVE_GENERATED_READER_ARTICLES.md](./ADAPTIVE_GENERATED_READER_ARTICLES.md) correctly treats generated input as constrained learner-window content and keeps mastery writes out of the generator.

The main follow-up is methodological: define which metrics will be used to validate the assumptions. The most useful ones are delayed vocabulary recognition, delayed recall, reading comprehension on new texts, and retention across spaced revisits.

## References

- Nakanishi, T. (2015). A meta-analysis of extensive reading research. TESOL Quarterly. [DOI](https://doi.org/10.1002/tesq.157)
- Webb, S., and colleagues on incidental vocabulary learning through meaning-focused input. [Cambridge abstract](https://www.cambridge.org/core/journals/language-teaching/article/how-effective-is-second-language-incidental-vocabulary-learning-a-metaanalysis/E38E3468FD2090B1FA3051051DE8E70C)
- Uchihara, T., Webb, S., and Yanagisawa, A. (2019). The effects of repetition on incidental vocabulary learning. [DOI](https://doi.org/10.1111/lang.12343)
- Carpenter, S. K., Pan, S. C., and Butler, A. C. (2022). The science of effective learning with spacing and retrieval practice. [PDF](https://www.nature.com/articles/s44159-022-00089-1.pdf)
- Ramezanali, N., Uchihara, T., and Faez, F. (2020). Efficacy of multimodal glossing on second language vocabulary learning. [DOI](https://doi.org/10.1002/tesq.579)
- Kim, H. S., Lee, J. H., and Lee, H. (2021). The relative effects of L1 and L2 glosses on L2 learning: A meta-analysis. [DOI](https://doi.org/10.1177/1362168820981394)
- Schmitt, N., Jiang, X., and Grabe, W. (2011). The percentage of words known in a text and reading comprehension. [DOI](https://doi.org/10.1111/j.1540-4781.2011.01146.x)
- How does lexical coverage affect the processing of L2 texts? (2024). Applied Linguistics. [DOI](https://doi.org/10.1093/applin/amae062)
- Chang, A.-C. S., and Renandya, W. A. (2021). The effect of narrow reading on L2 learners' vocabulary acquisition. [DOI](https://doi.org/10.1177/0033688219871387)
- Liu, Y., Groen, M., and Cain, K. (2024). The association between morphological awareness and reading comprehension in children: A systematic review and meta-analysis. [Accepted version](https://eprints.lancs.ac.uk/id/eprint/210432/)
- Zhang, D., Ke, S., and Mo, Y. Morphology in reading comprehension among school-aged readers of English. [Abstract](https://research.polyu.edu.hk/en/publications/morphology-in-reading-comprehension-among-school-aged-readers-of-/)
- Lardiere, D. (2016). Missing the trees for the forest: Morphology in second language acquisition. [DOI](https://doi.org/10.11431/secondlanguage.15.0_5)
