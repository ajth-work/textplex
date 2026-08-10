---
plugin: "cloudflare:cloudflare"
plugin_name: "Cloudflare"
document_type: "Infrastructure recommendation"
status: "Advisory"
date: "2026-08-10"
---

# Cloudflare Recommendations for TextPlex

This document records recommendations produced with the `cloudflare:cloudflare` plugin. It is an advisory architecture note, not evidence that the recommended Cloudflare products are already enabled in production.

## Executive recommendation

Keep the existing Cloudflare API and domain arrangement unless verification shows a missing security or routing boundary. Do not migrate the whole TextPlex stack to Cloudflare solely because Cloudflare is already in the request path.

The most useful future additions are:

1. **R2** for large book and media objects when TextPlex moves beyond a single API host.
2. **Queues** for durable, retryable processing jobs when imports, OCR, translation, or embedding work becomes concurrent or failure-prone.

Keep Next.js, FastAPI/Python processing, Supabase, and structured SQLite data in their existing roles until a specific operational problem justifies a change.

## Current TextPlex context

TextPlex currently has:

- a Next.js web application;
- a FastAPI API and Python book processor;
- per-book and learner SQLite data;
- Supabase authentication and hosted account data;
- local or container-mounted book assets under the data directories;
- Cloudflare documented as a DNS, proxy, CDN, and security layer, although the repository does not identify whether the API uses a Worker, Tunnel, or ordinary proxied origin.

The existing local filesystem is reasonable for a single-host MVP. R2 and Queues should be introduced to solve concrete hosting and processing problems, not as architecture for its own sake.

## R2 rationale

R2 is appropriate for unstructured objects such as:

- uploaded PDFs or page-image sets;
- rendered page images;
- OCR and extraction artifacts;
- generated audio or other future media;
- downloadable exports and backups where appropriate.

R2 would separate large files from the API machine. That supports API replacement, multiple API instances, browser delivery of page assets, simpler storage migration, and more durable hosted operations. Cloudflare describes R2 as S3-compatible object storage with no internet egress fees and strong consistency.

R2 should not replace:

- book SQLite databases;
- learner profile databases;
- Supabase Auth, entitlements, or hosted learner records.

Book and learner truth must remain separated. R2 stores blobs; the API and databases retain ownership, permissions, metadata, and learning state.

R2 is not urgent while TextPlex runs as one local or self-managed API host with manageable storage. It becomes a priority when production needs independent storage, failover, multi-instance API deployment, or frequent delivery of large page assets.

Production R2 buckets should remain private by default. Use authenticated API access, a Worker, or short-lived signed URLs. Do not expose private books through the `r2.dev` development URL.

Reference: <https://developers.cloudflare.com/r2/how-r2-works/>

## Queues rationale

The current API starts extraction work in the application process. That couples a user request to a long-running workflow and makes interruption, retries, concurrency, and status recovery harder.

A queue-backed workflow would look like:

```text
Upload source -> store source object -> enqueue job -> return job ID
                                      |
                                      v
                           Python processor consumes job
                                      |
                                      v
                         update book status and assets
```

Queues would provide:

- buffering when several users import books at once;
- retryable processing after transient failures;
- separation between HTTP request handling and book processing;
- a durable job boundary for OCR, translation, and future embedding work;
- cleaner progress reporting and operational replay.

The queue message should contain small, durable job metadata such as `job_id`, `book_id`, source object key, page range, language, and processing mode. The PDF or image payload should live in object storage rather than inside the message.

Queue consumers must be idempotent because delivery is not ordered and a job may be retried. Page processing should continue to use the Python/PyMuPDF processor; Queues coordinate the work but do not replace that runtime.

Queues are not urgent while imports are infrequent and a single API process can safely own the work. They become worthwhile when imports are long-running, concurrent, or costly to recover after a restart.

Reference: <https://developers.cloudflare.com/queues/reference/how-queues-works/>

## Recommended adoption order

### Phase 0: verify the existing Cloudflare boundary

- Confirm the production API hostname and whether it is DNS proxying, a Tunnel route, or a Worker route.
- Confirm separate preview and production origins, credentials, storage, and CORS settings.
- Confirm that uploads and protected learner mutations are authenticated and rate-limited.

### Phase 1: adopt R2 when hosted object storage is needed

- Add separate preview and production buckets.
- Move page images and source uploads behind an API-owned storage abstraction.
- Keep book SQLite databases separate until query and migration requirements justify another design.
- Add backup, retention, deletion, and access-control rules before moving private books.

### Phase 2: adopt Queues when processing needs a durable job boundary

- Replace in-process background extraction with explicit job records and queue messages.
- Make extraction, OCR, translation, and asset publication idempotent.
- Add retry and dead-letter handling.
- Keep `/health` and `/ready` independent from individual job completion.
- Preserve the existing book-processing state machine and progress contracts.

### Phase 3: consider deeper Cloudflare adoption only with evidence

Evaluate Workers, D1, Vectorize, Workers AI, or a Next.js-to-Workers deployment only when a measured latency, cost, availability, or product requirement justifies it. Do not move authentication, learner truth, or the Python processor merely to reduce the number of vendors.

## Decision summary

| Decision | Recommendation |
| --- | --- |
| Cloudflare API boundary | Verify and retain the existing arrangement unless a concrete gap is found |
| R2 | Adopt when book/media storage must be independent of the API host |
| Queues | Adopt when processing needs retries, buffering, concurrency, or replay |
| D1 | Do not use as a default replacement for existing SQLite or Supabase data |
| Workers | Use for focused edge/API/storage integrations; defer a whole-app migration |
| Supabase | Retain for authentication and hosted learner/account data |
| FastAPI/Python | Retain for book processing and local-domain business logic |
