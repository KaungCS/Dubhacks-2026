-- Custom roles with feature permissions + role-targeted invites (#14, #15).
-- Only Kaung applies migrations to the shared Supabase project.

create table workspace_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  name_normalized text not null generated always as (lower(trim(name))) stored,
  is_system boolean not null default false,
  is_active boolean not null default true,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (workspace_id, name_normalized)
);

create index workspace_roles_workspace_id_idx on workspace_roles (workspace_id);

create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  workspace_role_id uuid not null references workspace_roles on delete restrict,
  email text,
  created_by uuid references users on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index invites_workspace_id_idx on invites (workspace_id);
create index invites_role_id_idx on invites (workspace_role_id);

alter table memberships
  add column workspace_role_id uuid references workspace_roles on delete restrict;

create index memberships_workspace_role_id_idx on memberships (workspace_role_id);

-- Seed built-in Admin + default Officer for every existing workspace, then
-- point memberships at them. Permission keys match lib/auth/permissions.ts.
do $$
declare
  admin_perms text[] := array[
    'tasks:view', 'tasks:create', 'tasks:assign', 'tasks:update_assigned',
    'calendar:view', 'calendar:create', 'calendar:edit',
    'templates:view', 'templates:edit',
    'polls:view', 'polls:create', 'polls:vote',
    'metrics:view',
    'settings:manage'
  ];
  officer_perms text[] := array[
    'tasks:view', 'tasks:create', 'tasks:assign', 'tasks:update_assigned',
    'calendar:view', 'calendar:create', 'calendar:edit',
    'templates:view',
    'polls:view', 'polls:create', 'polls:vote',
    'metrics:view'
  ];
  ws record;
  admin_role_id uuid;
  officer_role_id uuid;
begin
  for ws in select id from workspaces loop
    insert into workspace_roles (workspace_id, name, is_system, permissions)
    values (ws.id, 'Admin', true, admin_perms)
    returning id into admin_role_id;

    insert into workspace_roles (workspace_id, name, is_system, permissions)
    values (ws.id, 'Officer', false, officer_perms)
    returning id into officer_role_id;

    update memberships
      set workspace_role_id = admin_role_id
      where workspace_id = ws.id and role = 'admin';

    update memberships
      set workspace_role_id = officer_role_id
      where workspace_id = ws.id and role = 'officer';
  end loop;
end $$;

alter table workspace_roles enable row level security;
alter table invites enable row level security;
