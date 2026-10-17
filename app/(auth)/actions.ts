'use server'

import { notFound, redirect } from 'next/navigation'
import { authClient, requireUser, setCurrentWorkspace } from '@/lib/auth'
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
  const { data: ws } = await db
    .from('workspaces')
    .select('id, admin_user_id, shared_drive_id, calendar_id')
    .eq('invite_code', String(formData.get('code')))
    .maybeSingle()
  if (!ws) notFound()

  const { error } = await db
    .from('memberships')
    .upsert({ workspace_id: ws.id, user_id: user.id }, { onConflict: 'workspace_id,user_id', ignoreDuplicates: true })
  if (error) throw error
  // Rejoining after being removed: back as an officer, never as a former admin.
  await db
    .from('memberships')
    .update({ left_at: null, role: 'officer', joined_at: new Date().toISOString() })
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .not('left_at', 'is', null)

  if (user.id !== ws.admin_user_id) {
    await shareWithOfficer(ws.id, user.email, { driveId: ws.shared_drive_id, calendarId: ws.calendar_id })
  }
  await setCurrentWorkspace(ws.id)
  redirect('/')
}
