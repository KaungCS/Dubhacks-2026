# Club Ops — Project Description

**DubHacks 2026** · Student club operations app for officers

## What it is

Club Ops is a single workspace where a student club’s officers plan events, assign tasks, run polls, and track RSVPs and attendance — with Google Drive, Calendar, Forms, and Sheets as the file layer underneath.

The goal is cohesion: an event, its tasks, its files, its RSVPs, and its attendance live in one place. If a feature doesn’t connect to the others, it doesn’t belong in the MVP.

## Who it’s for

**Officers only.** Non-officer members do not use the app. RSVPs happen through a Google Form; attendance is recorded on a Google Sheet. There is no chat and no Discord integration.

## Core product

| Area | What officers get |
| --- | --- |
| **Tasks** | Create and assign work with due dates, difficulty, multiple assignees, and optional “prereq” flags. List and board views. |
| **Calendar** | Club events and task due dates in one view, synced to a shared Google Calendar. |
| **Events & templates** | Admins build templates (task list + file checklist). One click creates the event, its tasks, Drive folder, RSVP form, and sign-in sheet. |
| **Polls** | Single or multiple choice decisions among officers, with creator-controlled results visibility. |
| **Metrics** | Per-event RSVPs, attendance, and related club stats. |
| **Settings** | Workspace setup, Google connection, officers and roles. |

## Notifications (intentionally narrow)

**Email (two cases only, via Resend):**

1. You were assigned a task — at most once per Pacific calendar day (later same-day assignments stay in-app only). You are not emailed about a task you created and assigned to yourself.
2. A prereq task you were tagged on was marked done — always emailed; bypasses the daily limit.

**In-app only:** notification bell and “new since last visit” badges (new tasks, polls, overdue work, upcoming events, RSVP targets, etc.). No digest and no weekly summary.

## Tech stack

| Piece | Choice |
| --- | --- |
| App | Next.js (App Router) on Vercel |
| Auth | Supabase Auth with Google |
| Database | Postgres via Supabase |
| Files / Calendar / Forms / Sheets | Google APIs; admin’s OAuth token stored encrypted server-side |
| Email | Resend (verified club domain) |

Shared drive is the root for club files (`drive.file`), so ownership stays with the drive and there is no handoff dance when officers leave.

## Team modules

| Person | Owns |
| --- | --- |
| **Kaung** | Foundation: scaffold, schema, sign-in, workspaces, Google token, shared UI |
| **Jackson** | Tasks, the two emails, in-app notification bell |
| **Jun** | Calendar, events, templates |
| **Dom** | Polls, RSVP/attendance, metrics |

Cross-module calls go only through the exported contracts in `TEAM_PLAN.md`.

## Scope rules

- Ship a thin, connected MVP — not half-finished extras.
- No Discord, no chat, no task dependency graphs, no weekly digests.
- Times stored in UTC; “once per day” email uses Pacific time for the pilot.
- Until Google verifies the app, only listed test users can sign in (fine for a club pilot).

## Deeper docs

- Product & data model: [Club Ops App — Data Model & MVP Plan.md](<Club%20Ops%20App%20%E2%80%94%20Data%20Model%20%26%20MVP%20Plan.md>)
- Ownership, contracts, and design: [TEAM_PLAN.md](TEAM_PLAN.md)
- Agent / collaboration rules: [AGENTS.md](AGENTS.md)
