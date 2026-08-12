# Feedback Console Admin Roadmap

## Purpose

The feedback console should act as an inbox and case file for every tester report. It should preserve the tester's original words while giving the admin enough structured context to review, plan, track, and communicate the outcome of each report.

## Current foundation

The console already supports:

- compact tester rows with private nickname editing;
- searchable feedback records and status filtering;
- preserved original feedback text and captured page/build/language context;
- screenshot review with explicit, admin-triggered AI image analysis;
- AI-generated implementation planning;
- status history and resolution notes;
- optional GitHub issue creation and project linking; and
- tester-facing status notifications and internal verification responses;
- local operational metrics for review backlog, review/resolution timing, routes, categories, and languages; and
- filters for tester, status, language, route, category, severity, priority, screenshots, and GitHub state.

This implementation pass also adds a visible build number in the shared footer and a `Ready for tester review` state. Admins can record the implementation build and instructions, while testers can respond from the notification bell without GitHub or email configuration.

## Recommended additions

### 1. Triage inbox

Add a compact summary of reports needing attention, in progress, completed, and awaiting a decision. Provide quick filters for tester, language, route, category, severity, attachments, GitHub linkage, and status.

### 2. Feedback detail workspace

Keep each report's case file in one place:

- exact original text;
- AI summary, category, severity, confidence, and suggested action;
- page, route, language, book, build, timestamp, and device context;
- screenshot gallery and optional image analysis;
- related reports from the same tester or page;
- GitHub issue and project-board state; and
- resolution decision, note, target build, and completion timestamp.

### 3. Admin-controlled AI review

Text triage may remain automatic. Screenshot analysis should remain an explicit admin action. The console should show what was sent to AI, retain the returned analysis separately from the original report, and require admin confirmation before an AI recommendation changes a tracker or resolution state.

### 4. Duplicate and related-report suggestions

Suggest likely duplicates or related reports based on route, category, language, text, and existing GitHub links. The admin should approve linking or merging; AI should never silently combine reports.

### 5. Resolution workflow

Use explicit lifecycle states:

- New / Needs review
- Acknowledged
- Planned
- In progress
- Ready for tester review
- Completed
- Noted
- Dismissed

Completed, noted, and dismissed states should require an admin explanation. Store the note, actor, timestamp, target build, and linked GitHub issue or pull request.

When a report is ready for tester review, store the implementation build and tester-facing instructions. A tester response should be a separate timeline event that either completes the report or returns it to in progress.

### 6. GitHub synchronization health

Show whether a report is not routed, linked to an issue, added to the project, synchronized to a board column, or blocked by a configuration error. Provide a manual retry action and preserve the synchronization error in the timeline.

### 7. Tester notification timeline

Expose a consistent event history to the tester notification bell: received, reviewed, routed to GitHub, in progress, completed in a build, noted, or dismissed with rationale. Admin-private notes must remain separate from tester-visible messages.

### 8. Review metrics

Provide small operational metrics for unreviewed reports, reports with attachments, open reports by category, most reported routes, affected languages, average time to resolution, and testers with unresolved reports.

### 9. Audit and privacy controls

Keep the original submission immutable, record every admin and AI action, protect screenshot access, support attachment deletion without deleting the report, and clearly distinguish private notes from tester-visible updates.

## Implementation order

1. Completed: add the triage summary, operational metrics, and explicit resolution-note control.
2. Completed: add build visibility and the internal tester verification loop.
3. Completed: add attachment, GitHub, tester, language, route, category, severity, and priority filters.
4. Add related-report suggestions with admin-approved linking.
5. Add GitHub synchronization health and retry handling.
6. Add audit/privacy tooling and richer long-term operational reporting.

## External setup to-dos

These are intentionally not enabled by the local implementation pass:

- Configure the GitHub token, repository, Project ID, status field ID, and status option mapping before enabling automatic routing and live board synchronization.
- Configure the daily digest delivery provider, sender identity, recipient address, and domain authentication before enabling email delivery.
- Decide the production retention and access policy for uploaded screenshots before moving attachment storage beyond the local feedback directory.

## Stable UI inventory

The primary surface is `/admin/feedback` and its existing inventory IDs:

- `admin-feedback.page`
- `admin-feedback.summary`
- `admin-feedback.filters`
- `admin-feedback.tester-list`
- `admin-feedback.record-list`
- `admin-feedback.detail`
- `admin-feedback.screenshots`
- `admin-feedback.plan`
- `admin-feedback.resolution`

The local implementation now includes `admin-feedback.summary`, `admin-feedback.metrics`, and `admin-feedback.resolution` while preserving the existing feedback contracts and tester notification flow.
