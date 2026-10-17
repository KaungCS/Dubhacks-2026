# Team Plan: Club Ops App

Product spec and data model: [Club Ops App — Data Model & MVP Plan.md](<Club Ops App — Data Model & MVP Plan.md>). Read it first. This file only says who builds what and how we avoid stepping on each other.

Deadline: **first push by 10pm tonight, finished by 10am tomorrow.**

## Ground rules

1. **Edit only your own folders** (table below). Never edit another person's files. If you need a change there, message the owner.
2. **Shared files belong to Kaung**: `supabase/`, `lib/db/`, `lib/auth/`, `lib/nav.ts`, `app/layout.tsx`, `components/ui/`, root config, `package.json`, `.env.example`. Need a new column, route, or dependency? Ask Kaung.
3. **Call other modules only through the exported functions in the "Contracts" section.** Don't import their internals.
4. One branch per person: `kaung/foundation`, `jackson/tasks`, `jun/calendar-events`, `dom/polls-rsvp-metrics`. Push small and often. `git pull --rebase origin main` before every push. Open a PR and merge it yourself when your piece works, not when it's perfect; no review needed, since you only touch your own folders. If your merge breaks `main` or the Vercel build, fixing it comes before anything else.
5. If a contract function isn't implemented yet, it exists as a stub (returns empty or throws "not implemented"). Build against the stub; the real one lands when the owner merges.

## Setup (Kaung does this)

Kaung creates the Google Cloud OAuth client, one **shared** Supabase project, the Resend key (club domain), and the Vercel project, and shares the `.env.local` values with the team privately (never in the repo).

- Everyone connects to the same Supabase project. **Only Kaung applies migrations**; nobody else runs them.
- Test data is shared, so prefix your test rows with your name (e.g. "jun: test event").
- Until Google verifies the app, only listed test users can sign in. Kaung adds Jackson, Jun and Dom's Google accounts (and any extra test officer accounts) to the OAuth consent screen's test users, and registers `localhost:3000` and the Vercel URL as redirect URIs.

## Ownership

| Person | Builds | Owns (only touch these) |
| --- | --- | --- |
| **Kaung** | Foundation: scaffold, schema, sign-in, workspaces, officers and roles, Google token service | `app/(auth)/`, `app/settings/`, `app/layout.tsx`, `lib/db/`, `lib/auth/`, `lib/nav.ts`, `lib/google/client.ts`, `components/ui/`, `supabase/` |
| **Jackson** | Tasks, the two emails, in-app notification bell | `app/tasks/`, `lib/tasks/`, `lib/email/`, `lib/notifications/`, `components/tasks/`, `components/notifications/` |
| **Jun** | Calendar, events, templates | `app/calendar/`, `app/events/`, `app/templates/`, `lib/events/`, `lib/google/calendar.ts`, `lib/google/drive.ts`, `components/events/` |
| **Dom** | Polls, RSVP and attendance, metrics | `app/polls/`, `app/metrics/`, `lib/polls/`, `lib/attendance/`, `lib/google/forms.ts`, `lib/google/sheets.ts`, `components/polls/` |

## Design: minimal, mostly white

The goal is for officers to focus on the task and not be annoyed. Everyone follows this:

- **Background white** (`#fff`). Text black or dark gray. Light gray (`#f5f5f5`-ish) only for subtle separation.
- **Buttons are pills**: fully rounded (`rounded-full`), white fill, **1px solid black border**, black text. Hover may invert to black fill with white text; nothing else.
- **No shadows, no gradients, no glossy or shine effects, no blur.** Flat everywhere.
- **No decorative color.** Use color only for meaning, sparingly (e.g. overdue in red). No accent-colored buttons.
- Plenty of whitespace, one system font, few type sizes, no icons-for-decoration, no animations beyond a simple hover.
- **Use the shared components in `components/ui/`** (`Button`, `Input`, `Card` etc., owned by Kaung) instead of styling your own. If one is missing, ask Kaung; don't create a lookalike in your module.

## Step 0: Kaung's scaffold commit (target: first 45 minutes)

Everyone else: until this lands on `main`, read the plan and sketch UI, but don't create the project.

Kaung pushes one commit containing:
- Next.js (App Router, TypeScript), Tailwind, Supabase client, `googleapis`, `resend`.
- The complete Supabase schema for every table in the spec, as migrations, plus generated TypeScript types in `lib/db/types.ts`.
- `lib/nav.ts` with every route already listed (Tasks, Calendar, Events, Templates, Polls, Metrics, Settings), so nobody edits navigation.
- `components/ui/` with the design above already implemented: pill `Button` (and a pill-shaped `Input`/`Select` where it fits), plain `Card`, page layout with white background. Tailwind config set up so no shadow or gradient utilities are used.
- A stub `page.tsx` in each module folder so the routes exist.
- Stub files for every contract below.
- `.env.example` and a README section: how to run locally.

## Contracts (the only cross-module surface)

Foundation (Kaung), used by everyone:

```ts
// lib/auth
requireUser(): Promise<User>
requireMembership(workspaceId: string): Promise<{ user: User; membership: Membership }>
// lib/db
getDb(): SupabaseClient<Database>
// lib/google/client.ts
getGoogleClient(workspaceId: string): Promise<OAuth2Client>   // admin's stored token
```

Tasks and notifications (Jackson), used by Jun and Dom:

```ts
// lib/notifications
createNotification(userId: string, kind: string, payload: object): Promise<void>   // in-app bell
// lib/tasks
createTask(input: NewTask): Promise<Task>          // handles assignees, tagged officers, the once-a-day email
listTasksForCalendar(workspaceId: string, from: Date, to: Date): Promise<Task[]>
```

Events and Google files (Jun), used by Dom:

```ts
// lib/events
getEvent(eventId: string): Promise<Event>
listEvents(workspaceId: string, from: Date, to: Date): Promise<Event[]>
```

Forms, Sheets and attendance (Dom), used by Jun:

```ts
// lib/google/forms.ts
createRsvpForm(workspaceId: string, event: Event): Promise<{ formId: string; url: string }>
// lib/google/sheets.ts
createSignInSheet(workspaceId: string, event: Event): Promise<{ sheetId: string; url: string }>
// lib/attendance
getEventAttendance(eventId: string): Promise<{ rsvps: number; attended: number }>   // fetch from Google, cache 5 min
```

Jun's "create event from template" calls `createTask` (Jackson) for each template item and `createRsvpForm` / `createSignInSheet` (Dom) for the checked file types. Until those are real, the stubs return fake ids.

## Kaung: Foundation

Spec phase 1. Done when an admin sets up a club and three officers join.
1. Scaffold commit (Step 0), then notify the team.
2. Google sign-in through Supabase Auth.
3. Create workspace; admin connects Google (Calendar, Drive, Forms, Sheets scopes) and the refresh token is stored encrypted server-side.
4. Create or pick the shared drive. **First check that `drive.file` works against a shared drive; if not, tell the team immediately.**
5. Invite officers (shared-drive and calendar share), roles (admin, officer), settings page.
6. Real `getGoogleClient`, `requireUser`, `requireMembership`.
7. Then: integration, deploy to Vercel, bug triage for everyone.

## Jackson: Tasks

Spec phase 2. Done when a club can run a real week of tasks.
1. Create, edit, status, due date, `difficulty` (easy, medium, hard), `is_prereq`, multiple assignees, tagged officers.
2. List view and board view.
3. Email, via Resend, **only two cases**:
   - A task assigned to you, only the first assignment each day (`membership.last_emailed_on`, Pacific date). Don't email someone about a task they created and assigned to themselves.
   - A prereq task marked done emails its tagged officers. Always sent; bypasses the daily limit.
4. In-app notification bell and "new since your last visit" on the dashboard. Implement `createNotification` early; Jun and Dom call it.
5. Implement `createTask` and `listTasksForCalendar` early; Jun calls them.

## Jun: Calendar, events, templates

Spec phases 3 and 4. Done when an event is planned from a template and officers see it in their own Google Calendar.
1. Calendar view showing events and task due dates (`listTasksForCalendar`).
2. Sync events to the shared club Google Calendar.
3. Event page: details, its tasks, links to its Drive folder, RSVP form and sign-in sheet, the RSVP and attendance counts (`getEventAttendance`).
4. Template editor: name, task list (title, days before event, role) and a checkbox list of file types (folder, RSVP form, slides, sign-in sheet).
5. "Create event from template": creates the event, its tasks (due date = event date minus days before), the Drive folder, then calls Dom's functions for the form and sheet.

## Dom: Polls, RSVP and attendance, metrics

Spec phases 5, 6, 7. Start with polls; they need no Google.
1. Polls: single or multiple choice (per poll), one vote per officer (or several options if multiple choice), close date, results visibility chosen by the creator (live, after I vote, hidden until closed), non-voter list visible to the creator only. Call `createNotification` when a poll opens and when it is closing.
2. `createRsvpForm` and `createSignInSheet`. Jun needs these for templates, so do this right after polls.
3. `getEventAttendance`: fetch form responses and the sign-in sheet when called, cache 5 minutes, write results to `attendee`. When RSVPs reach an event's target, call `createNotification` for officers.
4. Metrics page: per event RSVPs, attended, attendance rate; member count; new vs returning attendees if time allows.

## Timeline

| When | What |
| --- | --- |
| Now to +45 min | Kaung: scaffold commit. Others: read the spec, sketch UI. |
| +45 min to 10pm | Everyone builds on their branch; Jackson merges `createTask` / `createNotification` first. **First push by 10pm.** |
| Overnight | Merge to `main` as pieces work. Kaung deploys to Vercel and tests sign-in with real officer accounts. |
| 8am | Integration pass: run the full flow (sign in, create task, make event from template, RSVP, poll, metrics). |
| 9:30am | Feature freeze. Anything not working goes under "Not done" in the spec. |
| 10am | Deadline. |

## When something is blocked

- Need a schema change: tell Kaung, don't edit `supabase/`.
- A stub you depend on isn't real yet: keep building against the stub.
- Merge conflict: you probably edited someone else's file. Revert that file and ask its owner.
