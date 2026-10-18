import { getDb, type Tables } from '@/lib/db'
import {
  ADMIN_PERMISSION_FLOOR,
  ADMIN_PERMISSIONS,
  type Permission,
  parsePermissions,
} from './permissions'
import { ROLE_PRESETS } from './role-presets'

export type WorkspaceRole = Tables<'workspace_roles'>
export type Invite = Tables<'invites'>

export type RoleWithMeta = WorkspaceRole & {
  permissions: Permission[]
  member_count: number
  pending_invite_count: number
}

const OFFICER_PERMS = ROLE_PRESETS.find((p) => p.id === 'officer')!.permissions

export async function ensureDefaultRoles(workspaceId: string): Promise<{
  adminRoleId: string
  officerRoleId: string
}> {
  const db = getDb()
  const { data: existing } = await db
    .from('workspace_roles')
    .select('id, name_normalized, is_system')
    .eq('workspace_id', workspaceId)

  let admin = existing?.find((r) => r.is_system || r.name_normalized === 'admin')
  let officer = existing?.find((r) => r.name_normalized === 'officer' && !r.is_system)

  if (!admin) {
    const { data, error } = await db
      .from('workspace_roles')
      .insert({
        workspace_id: workspaceId,
        name: 'Admin',
        is_system: true,
        permissions: [...ADMIN_PERMISSIONS],
      })
      .select('id')
      .single()
    if (error) throw error
    admin = { id: data.id, name_normalized: 'admin', is_system: true }
  }

  if (!officer) {
    const { data, error } = await db
      .from('workspace_roles')
      .insert({
        workspace_id: workspaceId,
        name: 'Officer',
        is_system: false,
        permissions: [...OFFICER_PERMS],
      })
      .select('id')
      .single()
    if (error) throw error
    officer = { id: data.id, name_normalized: 'officer', is_system: false }
  }

  return { adminRoleId: admin.id, officerRoleId: officer.id }
}

export async function listWorkspaceRoles(workspaceId: string): Promise<RoleWithMeta[]> {
  const db = getDb()
  const { data: roles, error } = await db
    .from('workspace_roles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('is_system', { ascending: false })
    .order('name')
  if (error) throw error

  const { data: members } = await db
    .from('memberships')
    .select('workspace_role_id')
    .eq('workspace_id', workspaceId)
    .is('left_at', null)

  const { data: invites } = await db
    .from('invites')
    .select('workspace_role_id')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .is('revoked_at', null)

  const memberCounts = new Map<string, number>()
  for (const m of members ?? []) {
    if (!m.workspace_role_id) continue
    memberCounts.set(m.workspace_role_id, (memberCounts.get(m.workspace_role_id) ?? 0) + 1)
  }
  const inviteCounts = new Map<string, number>()
  for (const i of invites ?? []) {
    inviteCounts.set(i.workspace_role_id, (inviteCounts.get(i.workspace_role_id) ?? 0) + 1)
  }

  return (roles ?? []).map((r) => ({
    ...r,
    permissions: parsePermissions(r.permissions),
    member_count: memberCounts.get(r.id) ?? 0,
    pending_invite_count: inviteCounts.get(r.id) ?? 0,
  }))
}

export async function getRole(workspaceId: string, roleId: string): Promise<WorkspaceRole | null> {
  const { data } = await getDb()
    .from('workspace_roles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', roleId)
    .maybeSingle()
  return data
}

export async function getPermissionsForRole(
  role: Pick<WorkspaceRole, 'permissions' | 'is_system'> | null | undefined,
): Promise<Permission[]> {
  if (!role) return [...OFFICER_PERMS]
  if (role.is_system) return [...ADMIN_PERMISSIONS]
  return parsePermissions(role.permissions)
}

export async function resolveMembershipPermissions(
  membership: Pick<Tables<'memberships'>, 'role' | 'workspace_role_id'>,
): Promise<Permission[]> {
  if (membership.role === 'admin') return [...ADMIN_PERMISSIONS]
  if (!membership.workspace_role_id) return [...OFFICER_PERMS]
  const { data: role } = await getDb()
    .from('workspace_roles')
    .select('permissions, is_system, is_active')
    .eq('id', membership.workspace_role_id)
    .maybeSingle()
  if (!role || !role.is_active) return []
  return getPermissionsForRole(role)
}

export function normalizeRoleName(name: string): string {
  return name.trim().toLowerCase()
}

export async function createRole(
  workspaceId: string,
  input: { name: string; permissions: Permission[] },
): Promise<{ role?: WorkspaceRole; error?: string }> {
  const name = input.name.trim()
  if (!name) return { error: 'name-required' }
  if (normalizeRoleName(name) === 'admin') return { error: 'reserved-name' }

  const { data, error } = await getDb()
    .from('workspace_roles')
    .insert({
      workspace_id: workspaceId,
      name,
      is_system: false,
      permissions: input.permissions,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'duplicate-name' }
    throw error
  }
  return { role: data }
}

export async function updateRole(
  workspaceId: string,
  roleId: string,
  input: { name: string; permissions: Permission[] },
): Promise<{ role?: WorkspaceRole; error?: string }> {
  const existing = await getRole(workspaceId, roleId)
  if (!existing) return { error: 'not-found' }

  const name = input.name.trim()
  if (!name) return { error: 'name-required' }

  let permissions = input.permissions
  if (existing.is_system) {
    // Admin floor: cannot strip required admin permissions.
    const set = new Set(permissions)
    for (const p of ADMIN_PERMISSION_FLOOR) set.add(p)
    permissions = [...set]
    // System Admin keeps its name.
    const { data, error } = await getDb()
      .from('workspace_roles')
      .update({ permissions })
      .eq('id', roleId)
      .eq('workspace_id', workspaceId)
      .select()
      .single()
    if (error) throw error
    return { role: data }
  }

  if (normalizeRoleName(name) === 'admin') return { error: 'reserved-name' }

  const { data, error } = await getDb()
    .from('workspace_roles')
    .update({ name, permissions })
    .eq('id', roleId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'duplicate-name' }
    throw error
  }
  return { role: data }
}

export async function deactivateOrDeleteRole(
  workspaceId: string,
  roleId: string,
  mode: 'deactivate' | 'delete',
): Promise<{ error?: string }> {
  const roles = await listWorkspaceRoles(workspaceId)
  const role = roles.find((r) => r.id === roleId)
  if (!role) return { error: 'not-found' }
  if (role.is_system) return { error: 'system-role' }
  if (role.member_count > 0 || role.pending_invite_count > 0) return { error: 'role-in-use' }

  if (mode === 'deactivate') {
    const { error } = await getDb()
      .from('workspace_roles')
      .update({ is_active: false })
      .eq('id', roleId)
      .eq('workspace_id', workspaceId)
    if (error) throw error
    return {}
  }

  const { error } = await getDb().from('workspace_roles').delete().eq('id', roleId).eq('workspace_id', workspaceId)
  if (error) throw error
  return {}
}

export async function countActiveAdmins(workspaceId: string, exceptMembershipId?: string): Promise<number> {
  let q = getDb()
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin')
    .is('left_at', null)
  if (exceptMembershipId) q = q.neq('id', exceptMembershipId)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

export async function createInvite(
  workspaceId: string,
  input: { workspaceRoleId: string; email?: string | null; createdBy: string },
): Promise<{ invite?: Invite; error?: string }> {
  const role = await getRole(workspaceId, input.workspaceRoleId)
  if (!role || !role.is_active) return { error: 'role-inactive' }

  const { data, error } = await getDb()
    .from('invites')
    .insert({
      workspace_id: workspaceId,
      workspace_role_id: input.workspaceRoleId,
      email: input.email?.trim().toLowerCase() || null,
      created_by: input.createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return { invite: data }
}

export async function listPendingInvites(workspaceId: string) {
  const { data, error } = await getDb()
    .from('invites')
    .select('*, role:workspace_roles(id, name, permissions, is_active, is_system)')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  const { error } = await getDb()
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
  if (error) throw error
}

/** Look up a role-targeted invite by code. */
export async function getInviteByCode(code: string) {
  const { data } = await getDb()
    .from('invites')
    .select(
      '*, role:workspace_roles(*), workspace:workspaces(id, name, school, admin_user_id, shared_drive_id, calendar_id, invite_code)',
    )
    .eq('code', code)
    .maybeSingle()
  return data
}
