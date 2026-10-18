# Tasks: per-assignee completion, grouped list, in-app notifications

Oct 17, 2026 · Kaung, building on Jackson's tasks branch

## Problem / outcome

Tasks on `main` are still the scaffold stub, so calendar, event pages and templates show no tasks. Jackson's `origin/jackson/tasks` (commit `77bdf11`) implements most of the module but was never merged and was built before the scaffold, so it doesn't match the schema or contracts.

Outcome: one tasks module on `main` that keeps Jackson's work (credited to his GitHub account), lets each assignee mark their own part done (admins can mark anyone's), shows every task on one page grouped by event and then by assignee title, and notifies only in-app. Email is dropped.

## Jackson's credit

Branch `kaung/tasks` from `origin/main`. Its first commit is `77bdf11` cherry-picked with author `Jackson Le <238914704+Icy-Monkey@users.noreply.github.com>` (verified: GitHub resolves it to `Icy-Monkey`). His files are unchanged in that commit. All fixes land as later commits. **Merge the PR with a merge commit, not squash**, or his authorship is lost.

## Schema (new migration)

- `task_assignees.completed_at timestamptz`: that assignee's completion. Null = not done.
- Drop `memberships.last_emailed_on`; nothing uses it without email.
- Update `lib/db/types.ts` by hand to match. Kaung applies the migration to the shared project.

## Completion rules

- Each assignee has their own checkbox. Officers can set completion only on their own assignments (their own checkbox on tasks assigned to them). Only admins can set completion for everyone else.
- `tasks.status` is derived, never set directly: no assignee done → `todo`, some → `in_progress`, all → `done`. `tasks.completed_at` is set when the task becomes `done` and cleared when it leaves `done`.
- A task with no assignees has one task-level checkbox; only admins may toggle it (`todo` ↔ `done`).
- The status dropdown is removed from the task form.
- Every write checks on the server that the task is in the caller's workspace and that the caller is that assignee or an admin.
- When a prereq task becomes `done`, its tagged officers get a `prereq_done` notification.

## Task list (`/tasks`)

All tasks on one page, no filters:

1. **Event groups**, ordered by event start; a "No event" group last. The header shows the event title and date and links to `/events/[id]`.
2. Inside each event, **groups by assignee title** (`memberships.title`), alphabetical, then "No title", then "Unassigned". A task whose assignees have different titles appears in each of those groups; each row shows only that group's assignees.
3. **Row**: title (links to `/tasks/[id]`), due date (red when overdue and not done), difficulty, "prereq" marker, and one checkbox per assignee in that group (disabled when the viewer may not toggle it).

Kept from Jackson: board view (To do / In progress / Done, from the derived status) and "New since your last visit". The task form gains an optional **Event** select (Jun's `listEvents`), so manual tasks can join an event group.

## Notifications (in-app only)

- Remove `lib/email/`, the `resend` dependency and `RESEND_API_KEY` from `.env.example`.
- `task_assigned`: sent to each newly added assignee on create and on edit, no daily limit. Not sent when you assign yourself.
- `prereq_done`: see completion rules.
- Jackson's bell becomes the layout's `components/notifications/Bell.tsx` (server part loads the unread count; client part lists and marks read) and is removed from the tasks page. Entries link to `/tasks/[id]`, `/events/[id]` or `/polls` from their payload.
- Marking a notification read is limited to the caller's own notifications.

## Fitting Jackson's code to `main`

- Real table names (`tasks`, `task_assignees`, `task_tags`, `users`, `memberships`, `notifications`) and the `in_progress` status.
- Use DB row types (`Task` from `@/lib/db`) instead of the camelCase mapping layer.
- `createTask(input: NewTask)` and `listTasksForCalendar` keep the scaffold signatures, so Jun's calls are unchanged.
- No `?workspaceId=` param: pages and actions call `requireMembership()`.
- UI from `components/ui` instead of hand-styled pills.

## Docs

Spec, `TEAM_PLAN.md`, `AGENTS.md` and README: "two emails" becomes "in-app notifications only"; Resend removed. `TEAM_PLAN.md` ownership: Tasks and notifications move to Kaung.

## Out of scope

- Overdue and "event in 48 hours" notifications (need a scheduler; overdue is already red in the list).
- Auto-assigning template tasks to officers whose title matches the template role (Jun's `create-from-template.ts`; until then they show under "Unassigned").
- Jun's `event_created` notification going only to the creator.

## Verification

- `npm run lint`, `npm run build`, `npm test`.
- One `node --test` file covering the pure rules: derived status, who may toggle, and the event → title grouping.
- Manual click-through by Kaung (sign-in needs a Google test account): create a task with two assignees, each ticks their own box, admin ticks another's, status becomes done, a tagged officer sees `prereq_done` in the bell.

## Risks and assumptions

- Unassigned tasks (including all template tasks today) belong to no officer, so only an admin can complete them.
- Partially ticked tasks show as `in_progress`; an assignee who started but hasn't ticked still shows `todo`.
- A Vercel preview of the first commit alone fails to build (Jackson's code predates `components/ui`); later commits fix it.
