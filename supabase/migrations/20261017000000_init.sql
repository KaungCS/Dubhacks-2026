-- Club Ops schema. See "Data model" in the spec.
-- RLS is enabled on every table with no policies: browsers (anon key) can read
-- nothing; server code uses the service-role key via getDb() and checks access
-- with requireMembership().

create type member_role as enum ('admin', 'officer');
create type event_status as enum ('planned', 'done', 'cancelled');
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_difficulty as enum ('easy', 'medium', 'hard');
create type poll_visibility as enum ('live', 'after_vote', 'after_close');
create type poll_status as enum ('open', 'closed');

create table users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  name text,
  google_sub text,
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text,
  admin_user_id uuid not null references users,   -- whose Google token is stored
  shared_drive_id text,
  calendar_id text,
  google_token text,                               -- encrypted refresh token; null = reconnect needed
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid not null references users on delete cascade,
  role member_role not null default 'officer',
  title text,                                      -- e.g. "Treasurer"; matched by template task roles
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_emailed_on date,                            -- Pacific date of the last assignment email
  last_seen_at timestamptz,                        -- powers "new since your last visit"
  unique (workspace_id, user_id)
);

create table event_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  task_items jsonb not null default '[]',          -- [{ title, days_before, role }]
  file_types text[] not null default '{}',         -- folder | rsvp_form | slides | signin_sheet
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  status event_status not null default 'planned',
  template_id uuid references event_templates on delete set null,
  calendar_event_id text,
  drive_folder_id text,
  rsvp_form_id text,
  rsvp_form_url text,                              -- responder URL can't be derived from the form id
  signin_sheet_id text,
  slides_id text,
  rsvp_target int,
  rsvp_target_notified_at timestamptz,
  attendance_fetched_at timestamptz,               -- 5-minute cache for getEventAttendance
  created_by uuid references users on delete set null,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  event_id uuid references events on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status task_status not null default 'todo',
  difficulty task_difficulty not null default 'medium',
  is_prereq boolean not null default false,
  completed_at timestamptz,
  created_by uuid references users on delete set null,
  created_at timestamptz not null default now()
);

create table task_assignees (
  task_id uuid not null references tasks on delete cascade,
  user_id uuid not null references users on delete cascade,
  primary key (task_id, user_id)
);

create table task_tags (
  task_id uuid not null references tasks on delete cascade,
  user_id uuid not null references users on delete cascade,
  primary key (task_id, user_id)
);

create table polls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  question text not null,
  created_by uuid references users on delete set null,
  closes_at timestamptz,
  multiple_choice boolean not null default false,
  results_visibility poll_visibility not null default 'live',
  status poll_status not null default 'open',
  closing_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls on delete cascade,
  label text not null,
  position int not null default 0
);

create table votes (
  poll_id uuid not null references polls on delete cascade,
  option_id uuid not null references poll_options on delete cascade,
  user_id uuid not null references users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

create table attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  email text not null,
  name text,
  rsvped_at timestamptz,
  attended boolean not null default false,
  unique (event_id, email)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  metric text not null,
  period text not null,
  value numeric not null,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
