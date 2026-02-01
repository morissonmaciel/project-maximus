# Cron Timezone Evaluation Plan

Goal: identify where cron timezones are defined, applied, and presented so we can explain the mismatch between UTC, job timezone labels, and the user’s local clock—without changing code.

## Phase 1 — Baseline & Ground Truth
- Record the host clock and timezone offset (current `date` shows local UTC-3), and note whether the app is expected to reflect host time or a user profile time.
- Collect an example cron event payload from logs or the UI that triggered the confusion, including the exact `ExecutedAt` and “Schedule” lines, plus the user’s stated local time for that moment.

## Phase 2 — Data Model & Storage
- Confirm where timezone is persisted for a job: `gateway/cron/db.js` defines `cron_jobs.timezone` and stores it via `insertCronJob` / `updateCronJob`.
- Verify when `next_run_at` and `last_run_at` are persisted: `gateway/cron/db.js` (timestamps stored as epoch ms).

## Phase 3 — Scheduling Semantics
- Trace schedule parsing rules in `gateway/cron/scheduler.js`:
  - `cron:` schedules use `node-cron` with `timezone: job.timezone` when present.
  - `computeNextRun` uses `cron-parser` with `{ tz: timezone }` when present, otherwise defaulting to system/UTC behavior.
  - `interval:` and `at:` schedules ignore timezone and use `Date.now()` or `Date.parse()` directly.
- Validate that job creation passes timezone through unchanged: `gateway/tools/core-tools.js` → `cronStore.createJob` → `gateway/cron/index.js` → `gateway/cron/scheduler.js`.

## Phase 4 — Event Construction & User-Facing Text
- Inspect cron event text generation in `gateway/cron/runner.js`:
  - `ExecutedAt` is always `new Date().toISOString()` (UTC).
  - The timezone only appears as a suffix in `Schedule: <expr> (<timezone>)`.
  - Cron events are embedded as `[CRON EVENT]` blocks and stored in memory.
- Inspect pending event formatting in `gateway/cron/formatter.js`, which wraps events with timestamps rendered as ISO UTC via `new Date(evt.created_at).toISOString()`.
- Trace the delivery path: `gateway/cron/index.js` → `onNotify` in `gateway/server.js` → `triggerCronMessage` → message injection with `{ source: 'cron' }`.

## Phase 5 — Interpretation & UX Mismatch Analysis
- Compare the actual job timezone (`cron_jobs.timezone`) with the `ExecutedAt` UTC timestamp; if the assistant replies in local time, it must convert explicitly.
- Verify that there is no automatic conversion to the user’s locale/timezone anywhere in the cron pipeline (cron creation, execution, or event formatting).
- Identify likely confusion points:
  - UTC `ExecutedAt` vs user clock (UTC-3) without conversion.
  - Jobs created without explicit timezone defaulting to system/UTC behavior.
  - `interval:` or `at:` schedules ignoring timezone entirely.

## Phase 6 — Evidence Checklist (What to Capture)
- A real cron job row from `cron_jobs` (schedule + timezone + next_run_at).
- The corresponding cron event message (with `ExecutedAt`).
- The user’s reported local time at the same moment.
- Any system time tool output (if `GetCurrentTime` is used, note both UTC/local).

## Phase 7 — Findings Template (For the Report)
- “Observed behavior” with concrete timestamps and timezones.
- “Expected behavior” based on job timezone or user preference.
- “Root cause candidates” mapped to exact files/lines.
- “Severity and scope” (is it only messaging, or scheduling).
