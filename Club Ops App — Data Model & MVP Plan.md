# Club Ops App — Data Model & MVP Plan

Oct 17, 2026 · @Kaung · Revised after design review

## Overview

One workspace where a club's officers plan events, track tasks and make decisions, with Google Drive, Calendar, Forms and Sheets as the file layer underneath. The point is cohesion: an event, its tasks, its files, its RSVPs and its attendance live in one place. If a piece doesn't connect to the others, it doesn't belong.

- **Calendar**: club events and task due dates in one view, synced to a shared Google Calendar.
- **Tasks**: assignments with one or more owners, due dates, difficulty, and an optional "prereq" flag.
- **Events**: created from a club-built template that generates the event's tasks and Google files.
- **Polls, metrics, files, members, settings**: secondary menu.

Officers only. Non-officer members do not use the app (RSVPs happen through a Google Form). There is no chat and no Discord integration. The only emails are the two described under Notifications.

## Deadline and scope

First push by 10pm tonight; finished by 10am tomorrow. Every component is built in a thin, connected form, in the order below. Anything unfinished at 10am is listed under "Not done," not shipped half-working.

## Architecture

| Piece | Choice | Why |
| --- | --- | --- |
| App | Next.js on Vercel | Fast to ship; server routes hold the Google token |
| Sign-in | Supabase Auth, Google provider | Sessions with almost no code |
| Data | Postgres (Supabase) | Tasks, polls, metrics, members; Google holds only documents |
| Files | Shared drive as the root; `drive` scope | Shared drive owns the files, so no ownership transfer |
| Calendar | Calendar scope, admin's token | One club calendar shared with officers |
| Forms and Sheets | APIs on app-created files | RSVP form and sign-in sheet per event |
| Email | Resend, verified club domain | Only two email types (below) |

Rules that follow:

- The admin connects Google once. The refresh token is stored encrypted on the server. If it is revoked, show a reconnect banner and pause Google actions; any new admin can reconnect.
- Removing an officer is one permission change on the shared drive and one calendar share.
- Until Google verifies the app, only 100 test users can sign in. That is fine for the pilot.
- RSVP counts and sign-in attendance are fetched from Google when an event or metrics page opens, cached 5 minutes, and written to `Attendee`. No Pub/Sub, no scheduler.
- Times are stored in UTC and shown in the browser's time zone. "Once per day" uses Pacific time for the pilot.

## Data model

Everything hangs off a Workspace (one per club). Google IDs are stored as references; the documents stay in Drive.

| Entity | Key fields | Notes |
| --- | --- | --- |
| Workspace | name, school, admin\_user\_id, shared\_drive\_id, calendar\_id, google\_token (encrypted) | One per club |
| User | email, name, google\_sub | Can belong to several workspaces |
| Membership | workspace\_id, user\_id, role (admin, officer), title, joined\_at, left\_at, last\_emailed\_on | `last_emailed_on` drives the once-a-day rule |
| Event | title, starts\_at, ends\_at, location, status, template\_id, calendar\_event\_id, drive\_folder\_id, rsvp\_form\_id, signin\_sheet\_id, slides\_id | Created from a template; owns its tasks |
| EventTemplate | name, task\_items (title, days\_before, role), file\_types (folder, RSVP form, slides, sign-in sheet) | Built by admins; generates tasks and files |
| Task | title, description, event\_id (optional), due\_at, status, difficulty (easy, medium, hard), is\_prereq, completed\_at, created\_by | Shows on the calendar by `due_at` |
| TaskAssignee | task\_id, user\_id | Multiple assignees allowed (co-roles) |
| TaskTag | task\_id, user\_id | Officers to email when a prereq task is done |
| Poll | question, created\_by, closes\_at, multiple\_choice, results\_visibility (live, after\_vote, after\_close), status | Creator sees non-voters |
| PollOption / Vote | poll\_id, option\_id, user\_id | One vote per officer, or several options if multiple choice |
| Attendee | event\_id, email, name, rsvped\_at, attended | Filled from the RSVP form and sign-in sheet |
| Notification | user\_id, kind, payload, read\_at, created\_at | In-app list that powers the bell and badges |
| MetricSnapshot | metric, period, value | Optional; metrics can be computed live first |

Removed from the earlier draft: `TaskDependency` (too technical for a club officer team), `priority`, `NotificationRule`, and the Discord webhook field.

## Notifications

**Email (two cases only):**

| Trigger | Who gets it | Rule |
| --- | --- | --- |
| A task is assigned to you | Assignee | Only the first assignment each day; later ones that day are silent |
| A prereq task is marked done | Its tagged officers | Always sent; bypasses the daily limit |

Nobody is emailed about a task they created and assigned to themselves.

**In-app only** (bell and dashboard badges): new tasks since your last visit, poll opened, poll closing soon, overdue tasks, event in 48 hours, RSVP target reached. There is no digest and no weekly summary.

## Build order

1. **Foundation**: Google sign-in, create a workspace, admin connects Google, create or pick the shared drive, invite officers, roles.
   - Done when: an admin sets up a club and three officers join.
2. **Tasks**: create, multiple assignees, due dates, status, difficulty, `is_prereq` with tagged officers, list and board views, the two emails, "new since last visit."
   - Done when: a club runs a real week of officer tasks.
3. **Calendar**: events, shared Google Calendar, task due dates on the calendar, an event page with its tasks.
   - Done when: officers see club events in their own Google Calendar without doing anything.
4. **Templates and events**: admins edit a template's task list and file-type checklist; one click creates the event, its tasks (due = days before the event) and its Drive folder.
   - Done when: an event is planned from a template.
5. **RSVP and attendance**: a Google Form per event, a sign-in Sheet, counts fetched on page open, RSVP-target badge.
   - Done when: RSVPs and a sign-in sheet show up on the event page.
6. **Polls**: single or multiple choice, creator-controlled results visibility, close date, non-voter list for the creator.
   - Done when: officers vote on a real decision.
7. **Metrics**: per event RSVPs, attended, attendance rate; member count; new vs returning attendees if time allows.

## Not done (fill in at 10am)

List any unfinished piece from the build order here.

## Decisions made

- Shared drive as the root (UW students can create them), so there is no Drive ownership transfer and no handoff flow.
- The admin's token is used for the pilot. A club service account is the fix if an admin graduating becomes a problem.
- No non-officer usage.
- Templates are built by the club from day one: an editable task list plus a file-type checklist, with no arbitrary uploads.
- No Discord. Adoption comes from the Google Calendar sync, which puts events where officers already look.

## Open risks

- [x] Verify `drive.file` works against a shared drive the app didn't create. Result: it can create files there but can't read the drive or manage its members, so officer sharing failed. Switched to the full `drive` scope (restricted: fine for test users, needs Google's security review to go public).
- [ ] Calendar is a sensitive scope: fine for 100 test users, needs Google verification beyond the pilot.
- [ ] The cached 5-minute refresh means RSVP-target badges can lag; acceptable for the pilot.
- [ ] Once-a-day email silences later same-day assignments. "New since last visit" in the app is the safety net; revisit if officers miss tasks.
