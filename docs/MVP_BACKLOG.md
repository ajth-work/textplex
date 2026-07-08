# MVP Backlog

## Milestone 0 — Repository and contracts

- [ ] Initialize git repository
- [ ] Add web app workspace
- [ ] Add API workspace
- [ ] Add processor package
- [ ] Configure linting and tests
- [ ] Add `.env.example`
- [ ] Freeze first database migrations
- [ ] Add one 2–3 page legal/public-domain test fixture

Exit criterion: web and API boot locally; processor test command runs.

## Milestone 1 — Import and page preparation

- [ ] Import one PDF
- [ ] Hash source file
- [ ] Register book metadata
- [ ] Split PDF into deterministic page filenames
- [ ] Record page rows
- [ ] Resume after partial failure
- [ ] Show processing status in API

Exit criterion: a PDF becomes an ordered page set with durable status.

## Milestone 2 — Text and token database

- [ ] Implement extraction provider interface
- [ ] Add first OCR/AI extraction adapter
- [ ] Validate page extraction schema
- [ ] Persist sentences
- [ ] Persist lexical entries
- [ ] Persist token occurrences
- [ ] Calculate book frequency counts
- [ ] Retry one failed page without rerunning prior pages

Exit criterion: processed pages can be queried as structured reading data.

## Milestone 3 — Reader vertical slice

- [ ] Library screen
- [ ] Book detail screen
- [ ] Reader route
- [ ] Previous/next page navigation
- [ ] Token click interaction
- [ ] Definition panel
- [ ] Book frequency display
- [ ] Page active-time tracker

Exit criterion: one can read a processed book and inspect vocabulary.

## Milestone 4 — Learning profile

- [ ] Create profile DB
- [ ] Record reading sessions
- [ ] Record page-read events
- [ ] Create exposure ledger entries
- [ ] Aggregate vocabulary progress
- [ ] Record definition lookups
- [ ] Add manual known/unknown override

Exit criterion: reading the same vocabulary across pages/books changes the learner state.

## Milestone 5 — Dashboard

- [ ] Reading progress
- [ ] Unique vocabulary encountered
- [ ] Vocabulary state counts
- [ ] Proficiency-level distribution
- [ ] Most frequent book words
- [ ] Recently learned words

Exit criterion: learner can see measurable progress derived from reading behavior.

## Post-MVP

- AI book Q&A with spoiler boundary
- entity and character analysis
- grammar tracking
- image-overlay reader
- sentence explanations
- spaced review
- reading recommendations based on lexical coverage
- multi-language profile
- cloud sync and accounts
