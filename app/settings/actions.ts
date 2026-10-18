'use server'

import { redirect } from 'next/navigation'
import { google } from 'googleapis'
import { requireMembership, requireUser, setCurrentWorkspace } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getGoogleClient, GoogleNotConnectedError, shareWithAllOfficers, unshareWithOfficer } from '@/lib/google/client'

async function requireAdmin() {
  const ctx = await requireMembership()
  if (ctx.membership.role !== 'admin') redirect('/settings')
  return ctx
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
  const { error: memberError } = await db.from('memberships').insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' })
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

// Accepts a link or ID for a shared drive or a regular folder: the club's root for Drive files.
// ponytail: a My Drive folder means the admin owns the files (personal Gmail can't make shared drives);
// fine for the pilot, use a Workspace (e.g. UW) shared drive when admins hand off.
export async function saveSharedDrive(formData: FormData) {
  const { workspace } = await requireAdmin()
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
  const { user, workspace } = await requireAdmin()
  const id = String(formData.get('id'))
  const title = String(formData.get('title') ?? '').trim() || null
  const role = formData.get('role') === 'admin' ? 'admin' : 'officer'
  const db = getDb()
  const { data: target } = await db.from('memberships').select('user_id').eq('id', id).eq('workspace_id', workspace.id).maybeSingle()
  if (target) {
    // Admins can't change their own role, so a club never loses its last admin by accident.
    await db.from('memberships').update(target.user_id === user.id ? { title } : { title, role }).eq('id', id)
  }
  redirect('/settings')
}

export async function removeMember(formData: FormData) {
  const { user, workspace } = await requireAdmin()
  const db = getDb()
  const { data: target } = await db
    .from('memberships')
    .update({ left_at: new Date().toISOString() })
    .eq('id', String(formData.get('id')))
    .eq('workspace_id', workspace.id)
    .neq('user_id', user.id)
    .select('user_id, user:users(email)')
    .maybeSingle()
  if (target?.user_id === workspace.admin_user_id) {
    // Their Google token must stop acting for the club; another admin reconnects.
    await db.from('workspaces').update({ google_token: null }).eq('id', workspace.id)
  } else if (target) {
    await unshareWithOfficer(workspace.id, target.user.email, { driveId: workspace.shared_drive_id, calendarId: workspace.calendar_id })
  }
  redirect('/settings')
}
