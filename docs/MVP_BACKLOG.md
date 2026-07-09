# MVP Backlog

## Milestone 0 - Repository and contracts

- [x] Initialize git repository
- [x] Add web app workspace
- [x] Add API workspace
- [x] Add processor package
- [x] Configure linting and tests
- [x] Add `.env.example`
- [x] Freeze first database migrations
- [x] Add one 2-3 page legal/public-domain test fixture

Exit criterion: web and API boot locally; processor test command runs.

## Milestone 1 - Import and page preparation

- [ ] Import one PDF
- [ ] Hash source file
- [ ] Register book metadata
- [ ] Split PDF into deterministic page filenames
- [ ] Record page rows
- [ ] Resume after partial failure
- [ ] Show processing status in API

Exit criterion: a PDF becomes an ordered page set with durable status.

## Milestone 2 - Text and token database

- [ ] Implement extraction provider interface
- [ ] Add first OCR/AI extraction adapter
- [ ] Validate page extraction schema
- [ ] Persist sentences
- [ ] Persist lexical entries
- [ ] Persist token occurrences
- [ ] Calculate book frequency counts
- [ ] Retry one failed page without rerunning prior pages

Exit criterion: processed pages can be queried as structured reading data.

## Milestone 3 - Reader vertical slice

- [x] Library screen
- [x] Book detail screen
- [x] Reader route
- [x] Previous/next page navigation
- [x] Token click interaction
- [x] Definition panel
- [x] Book frequency display
- [x] Page active-time tracker

Exit criterion: one can read a processed book and inspect vocabulary.

## Milestone 4 - Learning profile

- [x] Create profile DB
- [x] Record reading sessions
- [x] Record page-read events
- [ ] Create exposure ledger entries
- [ ] Aggregate vocabulary progress
- [ ] Record definition lookups
- [ ] Add manual known/unknown override

Exit criterion: reading the same vocabulary across pages/books changes the learner state.

## Milestone 5 - Dashboard

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
