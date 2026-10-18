import { redirect } from 'next/navigation'
import { Button, buttonClass, Card, Input, Page, Select } from '@/components/ui'
import {
  getContext,
  listWorkspaceRoles,
  listPendingInvites,
  memberHasPermission,
  summarizePermissions,
  ensureDefaultRoles,
} from '@/lib/auth'
import { getDb } from '@/lib/db'
import { signOut } from '../(auth)/actions'
import {
  createWorkspace,
  removeMember,
  saveSharedDrive,
  switchWorkspace,
  updateMember,
  createRoleInvite,
  revokeRoleInvite,
  retireRole,
} from './actions'
import { RoleForm } from './role-form'

const errors: Record<string, string> = {
  google: 'Connecting Google failed or was cancelled. Try again.',
  scopes: 'Google access was only partly granted. Reconnect and leave every permission checked.',
  drive:
    "Couldn't open that drive or folder. Check the link and that you have access to it. If you connected Google before the switch to full Drive access, reconnect first.",
  'not-folder': "That link isn't a folder. Paste a link to a shared drive or a Drive folder.",
  forbidden: "You don't have permission to do that.",
  'duplicate-role': 'A role with that name already exists in this club (names are case-insensitive).',
  'reserved-role': '“Admin” is reserved for the built-in system role.',
  'role-name': 'Enter a role name.',
  'role-in-use': 'Reassign members and revoke pending invites before retiring this role.',
  'system-role': 'Built-in roles cannot be deleted.',
  'role-inactive': 'That role is inactive or missing. Pick another role.',
  'last-admin': 'A club always needs at least one admin. Promote someone else first.',
  role: 'Could not save that role. Try again.',
  invite: 'Could not create that invite. Try again.',
}

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const ctx = await getContext()
  if (!ctx) redirect('/sign-in?next=/settings')
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : undefined
  const newInviteCode = typeof params.invite === 'string' ? params.invite : undefined

  const account = (
    <Card className="flex items-center justify-between gap-4">
      <div className="text-sm">
        <p>Signed in as {ctx.user.email}</p>
        {ctx.current && <p className="text-neutral-500">Your role: {ctx.current.role_name}</p>}
      </div>
      <form action={signOut}>
        <Button>Sign out</Button>
      </form>
    </Card>
  )

  if (!ctx.current) {
    return (
      <Page title="Set up your club">
        <p className="text-neutral-500">Officers: open the invite link your club admin sent you.</p>
        <Card>
          <form action={createWorkspace} className="flex flex-wrap gap-2">
            <Input name="name" placeholder="Club name" aria-label="Club name" required />
            <Input name="school" placeholder="School" aria-label="School" />
            <Button>Create club</Button>
          </form>
        </Card>
        {account}
      </Page>
    )
  }

  const { workspace, user_id: myId } = ctx.current
  const canManage = memberHasPermission(ctx.current, 'settings:manage')

  // Ensure seeded roles exist even if migration backfill hasn't run yet for this workspace.
  if (canManage) {
    try {
      await ensureDefaultRoles(workspace.id)
    } catch {
      // Migration not applied yet — settings still render; Kaung must apply the migration.
    }
  }

  const { data: members } = await getDb()
    .from('memberships')
    .select('id, user_id, role, title, workspace_role_id, user:users(name, email), workspace_role:workspace_roles(name)')
    .eq('workspace_id', workspace.id)
    .is('left_at', null)
    .order('joined_at')

  let roles: Awaited<ReturnType<typeof listWorkspaceRoles>> = []
  let pendingInvites: Awaited<ReturnType<typeof listPendingInvites>> = []
  if (canManage) {
    try {
      roles = await listWorkspaceRoles(workspace.id)
      pendingInvites = await listPendingInvites(workspace.id)
    } catch {
      roles = []
      pendingInvites = []
    }
  }

  const activeRoles = roles.filter((r) => r.is_active)
  const existingNames = roles.map((r) => r.name)
  const appUrl = process.env.APP_URL ?? ''

  return (
    <Page title="Settings">
      {error && errors[error] && <p className="text-sm text-red-600">{errors[error]}</p>}

      <Card className="space-y-1">
        <h2 className="font-semibold">{workspace.name}</h2>
        {workspace.school && <p className="text-sm text-neutral-500">{workspace.school}</p>}
      </Card>

      {ctx.memberships.length > 1 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Your clubs</h2>
          {ctx.memberships.map((m) => (
            <form key={m.id} action={switchWorkspace} className="flex items-center justify-between">
              <span className="text-sm">{m.workspace.name}</span>
              <input type="hidden" name="id" value={m.workspace_id} />
              <Button disabled={m.workspace_id === workspace.id}>Switch</Button>
            </form>
          ))}
        </Card>
      )}

      {canManage && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Google</h2>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              {workspace.google_connected
                ? 'Connected. Calendar, Drive, Forms and Sheets run as the admin who connected.'
                : 'Not connected.'}
            </p>
            <a href="/settings/google" className={buttonClass}>
              {workspace.google_connected ? 'Reconnect' : 'Connect Google'}
            </a>
          </div>
          <p className="text-sm">
            Club calendar: {workspace.calendar_id ? 'created and shared with officers' : 'created when you connect'}
          </p>
          <form action={saveSharedDrive} className="flex flex-wrap items-center gap-2">
            <Input
              name="drive"
              defaultValue={workspace.shared_drive_id ?? ''}
              placeholder="Shared drive or folder link"
              aria-label="Shared drive or folder link"
              className="min-w-72 flex-1"
              required
            />
            <Button disabled={!workspace.google_connected}>Save shared drive</Button>
          </form>
        </Card>
      )}

      {canManage && (
        <Card id="roles" className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-semibold">Roles</h2>
            <p className="text-sm text-neutral-500">
              Create named roles with a feature checklist, then invite people into them. Start from a preset or a blank
              role.
            </p>
          </div>

          {roles.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No roles yet — apply the custom-roles migration, then refresh. You can create your first custom role below.
            </p>
          ) : (
            <ul className="space-y-4">
              {roles.map((role) => (
                <li key={role.id} className="space-y-3 border-t border-neutral-200 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {role.name}
                        {role.is_system && <span className="ml-2 text-xs text-neutral-500">built-in</span>}
                        {!role.is_active && <span className="ml-2 text-xs text-neutral-500">inactive</span>}
                      </p>
                      <p className="text-sm text-neutral-500">{summarizePermissions(role.permissions)}</p>
                      <p className="text-xs text-neutral-500">
                        {role.member_count} member{role.member_count === 1 ? '' : 's'}
                        {role.pending_invite_count
                          ? ` · ${role.pending_invite_count} pending invite${role.pending_invite_count === 1 ? '' : 's'}`
                          : ''}
                      </p>
                    </div>
                    {!role.is_system && role.is_active && (
                      <div className="flex flex-wrap gap-2">
                        <form action={retireRole}>
                          <input type="hidden" name="role_id" value={role.id} />
                          <input type="hidden" name="mode" value="deactivate" />
                          <Button type="submit">Deactivate</Button>
                        </form>
                        <form action={retireRole}>
                          <input type="hidden" name="role_id" value={role.id} />
                          <input type="hidden" name="mode" value="delete" />
                          <Button type="submit">Delete</Button>
                        </form>
                      </div>
                    )}
                  </div>
                  {role.is_active && (
                    <details className="text-sm">
                      <summary className="cursor-pointer">{role.is_system ? 'View permissions' : 'Edit role'}</summary>
                      <div className="mt-3">
                        <RoleForm
                          roleId={role.id}
                          initialName={role.name}
                          initialPermissions={role.permissions}
                          isSystem={role.is_system}
                          existingNames={existingNames}
                        />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}

          <details className="border-t border-neutral-200 pt-4" open={roles.filter((r) => !r.is_system).length === 0}>
            <summary className="cursor-pointer font-medium">Create a role</summary>
            <div className="mt-3">
              <RoleForm existingNames={existingNames} />
            </div>
          </details>
        </Card>
      )}

      {canManage && (
        <Card id="invites" className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold">Invite by role</h2>
            <p className="text-sm text-neutral-500">
              Create a link for a specific role. The invitee joins with that role&apos;s permissions.
            </p>
          </div>

          {newInviteCode && (
            <div className="space-y-2 rounded-2xl border border-neutral-200 p-4">
              <p className="text-sm font-medium">Invite link ready</p>
              <Input readOnly value={`${appUrl}/join/${newInviteCode}`} aria-label="New invite link" className="w-full" />
            </div>
          )}

          <form action={createRoleInvite} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500" htmlFor="invite-role">
                Role
              </label>
              <Select id="invite-role" name="workspace_role_id" required defaultValue={activeRoles.find((r) => !r.is_system)?.id}>
                {activeRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} — {summarizePermissions(role.permissions, 3)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500" htmlFor="invite-email">
                Email hint (optional)
              </label>
              <Input id="invite-email" name="email" type="email" placeholder="officer@school.edu" />
            </div>
            <Button type="submit">Create invite link</Button>
          </form>

          {pendingInvites.length > 0 && (
            <ul className="space-y-3 border-t border-neutral-200 pt-3">
              {pendingInvites.map((invite) => {
                const role = Array.isArray(invite.role) ? invite.role[0] : invite.role
                return (
                  <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p>
                        {role?.name ?? 'Role'}
                        {invite.email ? ` · ${invite.email}` : ''}
                      </p>
                      <p className="text-neutral-500 break-all">{`${appUrl}/join/${invite.code}`}</p>
                    </div>
                    <form action={revokeRoleInvite}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <Button type="submit">Revoke</Button>
                    </form>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-neutral-200 pt-3">
            <p className="text-sm text-neutral-500">
              Legacy club link (joins as Officer):{' '}
              <span className="break-all text-black">{`${appUrl}/join/${workspace.invite_code}`}</span>
            </p>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">Officers</h2>
        {members?.map((m) => {
          const roleName =
            m.workspace_role && !Array.isArray(m.workspace_role)
              ? m.workspace_role.name
              : m.role === 'admin'
                ? 'Admin'
                : 'Officer'
          return (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3">
              <div className="text-sm">
                <p>{m.user.name ?? m.user.email}</p>
                <p className="text-neutral-500">{m.user.email}</p>
              </div>
              {canManage ? (
                <form action={updateMember} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <Input name="title" defaultValue={m.title ?? ''} placeholder="Title, e.g. Treasurer" aria-label="Title" />
                  {m.user_id === myId ? (
                    <span className="px-2 text-sm">{roleName}</span>
                  ) : (
                    <Select
                      name="workspace_role_id"
                      defaultValue={m.workspace_role_id ?? activeRoles[0]?.id}
                      aria-label="Role"
                      required
                    >
                      {activeRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button type="submit">Save</Button>
                  {m.user_id !== myId && <Button formAction={removeMember}>Remove</Button>}
                </form>
              ) : (
                <p className="text-sm text-neutral-500">{[m.title, roleName].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          )
        })}
      </Card>

      {account}
    </Page>
  )
}
