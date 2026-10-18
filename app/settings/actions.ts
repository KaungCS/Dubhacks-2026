'use server'

import { redirect } from 'next/navigation'
import { google } from 'googleapis'
import {
  requireMembership,
  requirePermission,
  requireUser,
  setCurrentWorkspace,
  ensureDefaultRoles,
  createRole,
  updateRole,
  deactivateOrDeleteRole,
  createInvite,
  revokeInvite,
  getRole,
  countActiveAdmins,
  isPermission,
  type Permission,
} from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getGoogleClient, GoogleNotConnectedError, shareWithAllOfficers, unshareWithOfficer } from '@/lib/google/client'

async function requireSettingsManage() {
  return requirePermission('settings:manage')
}

function permissionsFromForm(formData: FormData): Permission[] {
  return formData
    .getAll('permission')
    .map(String)
    .filter(isPermission)
}

export async function createWorkspace(formData: FormData) {
  const user = await requireUser()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) redirect('/settings')
  const db = getDb()
  const { data: ws, error } = await db
    .from('workspaces')
    .insert({ name, school: String(formData.get('school') ?? '').trim() || null, admin_user_id: user.id })
    .select('id')
    .single()
  if (error) throw error
  const { adminRoleId } = await ensureDefaultRoles(ws.id)
  const { error: memberError } = await db.from('memberships').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'admin',
    workspace_role_id: adminRoleId,
  })
  if (memberError) throw memberError
  await setCurrentWorkspace(ws.id)
  redirect('/settings')
}

export async function switchWorkspace(formData: FormData) {
  const id = String(formData.get('id'))
  await requireMembership(id)
  await setCurrentWorkspace(id)
  redirect('/')
}

export async function saveSharedDrive(formData: FormData) {
  const { workspace } = await requireSettingsManage()
  const driveId = String(formData.get('drive') ?? '').trim().split('?')[0].split('/').filter(Boolean).pop()
  if (!driveId) redirect('/settings')
  let error = ''
  try {
    const drive = google.drive({ version: 'v3', auth: await getGoogleClient(workspace.id) })
    const { data } = await drive.files.get({ fileId: driveId, supportsAllDrives: true, fields: 'mimeType' })
    if (data.mimeType !== 'application/vnd.google-apps.folder') error = 'not-folder'
  } catch (e) {
    console.error('shared drive check failed', e)
    error = e instanceof GoogleNotConnectedError ? 'google' : 'drive'
  }
  if (error) redirect(`/settings?error=${error}`)
  await getDb().from('workspaces').update({ shared_drive_id: driveId }).eq('id', workspace.id)
  await shareWithAllOfficers(workspace.id, workspace.admin_user_id, { driveId })
  redirect('/settings')
}

export async function updateMember(formData: FormData) {
  const { user, workspace } = await requireSettingsManage()
  const id = String(formData.get('id'))
  const title = String(formData.get('title') ?? '').trim() || null
  const workspaceRoleId = String(formData.get('workspace_role_id') ?? '')
  const db = getDb()

  const { data: target } = await db
    .from('memberships')
    .select('id, user_id, role')
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .is('left_at', null)
    .maybeSingle()
  if (!target) redirect('/settings')

  // Members cannot escalate their own permissions / change their own role.
  if (target.user_id === user.id) {
    await db.from('memberships').update({ title }).eq('id', id)
    redirect('/settings')
  }

  const role = await getRole(workspace.id, workspaceRoleId)
  if (!role || !role.is_active) redirect('/settings?error=role-inactive')

  const nextIsAdmin = role.is_system || role.name_normalized === 'admin'
  if (target.role === 'admin' && !nextIsAdmin) {
    const remaining = await countActiveAdmins(workspace.id, target.id)
    if (remaining < 1) redirect('/settings?error=last-admin')
  }

  await db
    .from('memberships')
    .update({
      title,
      workspace_role_id: role.id,
      role: nextIsAdmin ? 'admin' : 'officer',
    })
    .eq('id', id)

  redirect('/settings')
}

export async function removeMember(formData: FormData) {
  const { user, workspace } = await requireSettingsManage()
  const db = getDb()
  const membershipId = String(formData.get('id'))

  const { data: target } = await db
    .from('memberships')
    .select('id, user_id, role, user:users(email)')
    .eq('id', membershipId)
    .eq('workspace_id', workspace.id)
    .neq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()
  if (!target) redirect('/settings')

  if (target.role === 'admin') {
    const remaining = await countActiveAdmins(workspace.id, target.id)
    if (remaining < 1) redirect('/settings?error=last-admin')
  }

  await db.from('memberships').update({ left_at: new Date().toISOString() }).eq('id', target.id)

  if (target.user_id === workspace.admin_user_id) {
    await db.from('workspaces').update({ google_token: null }).eq('id', workspace.id)
  } else {
    await unshareWithOfficer(workspace.id, target.user.email, {
      driveId: workspace.shared_drive_id,
      calendarId: workspace.calendar_id,
    })
  }
  redirect('/settings')
}

export async function saveRole(formData: FormData) {
  const { workspace } = await requireSettingsManage()
  const roleId = String(formData.get('role_id') ?? '')
  const name = String(formData.get('name') ?? '')
  const permissions = permissionsFromForm(formData)

  const result = roleId
    ? await updateRole(workspace.id, roleId, { name, permissions })
    : await createRole(workspace.id, { name, permissions })

  if (result.error === 'duplicate-name') redirect('/settings?error=duplicate-role')
  if (result.error === 'reserved-name') redirect('/settings?error=reserved-role')
  if (result.error === 'name-required') redirect('/settings?error=role-name')
  if (result.error) redirect('/settings?error=role')
  redirect('/settings#roles')
}

export async function retireRole(formData: FormData) {
  const { workspace } = await requireSettingsManage()
  const roleId = String(formData.get('role_id'))
  const mode = formData.get('mode') === 'delete' ? 'delete' : 'deactivate'
  const result = await deactivateOrDeleteRole(workspace.id, roleId, mode)
  if (result.error === 'role-in-use') redirect('/settings?error=role-in-use')
  if (result.error === 'system-role') redirect('/settings?error=system-role')
  if (result.error) redirect('/settings?error=role')
  redirect('/settings#roles')
}

export async function createRoleInvite(formData: FormData) {
  const { user, workspace } = await requireSettingsManage()
  const workspaceRoleId = String(formData.get('workspace_role_id') ?? '')
  const email = String(formData.get('email') ?? '').trim() || null
  const result = await createInvite(workspace.id, {
    workspaceRoleId,
    email,
    createdBy: user.id,
  })
  if (result.error === 'role-inactive') redirect('/settings?error=role-inactive')
  if (!result.invite) redirect('/settings?error=invite')
  redirect(`/settings?invite=${result.invite.code}#invites`)
}

export async function revokeRoleInvite(formData: FormData) {
  const { workspace } = await requireSettingsManage()
  await revokeInvite(workspace.id, String(formData.get('invite_id')))
  redirect('/settings#invites')
}
