'use server'

import { notFound, redirect } from 'next/navigation'
import {
  authClient,
  requireUser,
  setCurrentWorkspace,
  ensureDefaultRoles,
  getInviteByCode,
} from '@/lib/auth'
import { getDb } from '@/lib/db'
import { shareWithOfficer } from '@/lib/google/client'

export async function signIn(formData: FormData) {
  const next = encodeURIComponent(String(formData.get('next') ?? '/'))
  const { data, error } = await (await authClient()).auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.APP_URL}/auth/callback?next=${next}` },
  })
  if (error) throw error
  redirect(data.url)
}

export async function signOut() {
  await (await authClient()).auth.signOut()
  redirect('/sign-in')
}

export async function joinWorkspace(formData: FormData) {
  const user = await requireUser()
  const db = getDb()
  const code = String(formData.get('code'))

  // Prefer role-targeted invites; fall back to the legacy workspace invite_code.
  const invite = await getInviteByCode(code)
  if (invite) {
    if (invite.revoked_at || invite.accepted_at) {
      redirect(`/join/${code}?error=invite-used`)
    }
    const role = Array.isArray(invite.role) ? invite.role[0] : invite.role
    const workspace = Array.isArray(invite.workspace) ? invite.workspace[0] : invite.workspace
    if (!workspace) notFound()
    if (!role || !role.is_active) {
      redirect(`/join/${code}?error=role-inactive`)
    }

    const isAdminRole = role.is_system || role.name_normalized === 'admin'
    const { data: existing } = await db
      .from('memberships')
      .select('id, left_at')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error } = await db.from('memberships').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: isAdminRole ? 'admin' : 'officer',
        workspace_role_id: role.id,
      })
      if (error) throw error
    } else if (existing.left_at) {
      await db
        .from('memberships')
        .update({
          left_at: null,
          role: isAdminRole ? 'admin' : 'officer',
          workspace_role_id: role.id,
          joined_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    }

    await db.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    if (user.id !== workspace.admin_user_id) {
      await shareWithOfficer(workspace.id, user.email, {
        driveId: workspace.shared_drive_id,
        calendarId: workspace.calendar_id,
      })
    }
    await setCurrentWorkspace(workspace.id)
    redirect('/')
  }

  const { data: ws } = await db
    .from('workspaces')
    .select('id, admin_user_id, shared_drive_id, calendar_id')
    .eq('invite_code', code)
    .maybeSingle()
  if (!ws) notFound()

  const { officerRoleId } = await ensureDefaultRoles(ws.id)

  const { error } = await db
    .from('memberships')
    .upsert({ workspace_id: ws.id, user_id: user.id, workspace_role_id: officerRoleId, role: 'officer' }, {
      onConflict: 'workspace_id,user_id',
      ignoreDuplicates: true,
    })
  if (error) throw error
  // Rejoining after being removed: back as an officer, never as a former admin.
  await db
    .from('memberships')
    .update({
      left_at: null,
      role: 'officer',
      workspace_role_id: officerRoleId,
      joined_at: new Date().toISOString(),
    })
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .not('left_at', 'is', null)

  if (user.id !== ws.admin_user_id) {
    await shareWithOfficer(ws.id, user.email, { driveId: ws.shared_drive_id, calendarId: ws.calendar_id })
  }
  await setCurrentWorkspace(ws.id)
  redirect('/')
}
