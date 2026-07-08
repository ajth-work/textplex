# Contributing

## Development rules

1. Keep book data and user learning data separate.
2. Processor writes must be idempotent and page-retryable.
3. AI output is never written directly to storage without schema validation.
4. Add a migration for schema changes; do not silently mutate databases.
5. New features must state whether they belong to processor, book API, reader, or learner profile.
6. Do not add post-MVP features until the vertical slice in the root README works end to end.
7. Use public-domain or user-owned text fixtures in tests.

## Branch naming

- `feat/...`
- `fix/...`
- `docs/...`
- `chore/...`

## Definition of done

A change is complete when it has tests for core logic, updates contracts/docs when relevant, handles failure states, and does not expose secrets or generated book data to git.
