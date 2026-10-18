-- Each assignee marks their own part done; tasks.status is derived from these (lib/tasks/rules.ts).
alter table task_assignees add column completed_at timestamptz;

-- Email was dropped for in-app notifications only, so the once-a-day rule is gone.
alter table memberships drop column last_emailed_on;
