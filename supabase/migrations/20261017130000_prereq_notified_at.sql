-- Last time a prereq task's tagged officers were told it's done. Re-sends wait out a short cooldown
-- (PREREQ_COOLDOWN_MS in lib/tasks/rules.ts), so completing and undoing repeatedly can't flood them.
alter table tasks add column prereq_notified_at timestamptz;
