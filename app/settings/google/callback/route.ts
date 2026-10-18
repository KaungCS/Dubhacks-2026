import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { google } from 'googleapis'
import { requireMembership, memberHasPermission } from '@/lib/auth'
import { encrypt } from '@/lib/auth/crypto'
import { getDb } from '@/lib/db'
import { getGoogleClient, GOOGLE_SCOPES, oauthClient, shareWithAllOfficers } from '@/lib/google/client'

// Google redirects here after the admin consents. Stores the refresh token encrypted and
// creates the club calendar the first time.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const state = params.get('state')
  const code = params.get('code')
  if (!code || !state || state !== (await cookies()).get('google_oauth_state')?.value) redirect('/settings?error=google')

  const { user, membership, workspace } = await requireMembership(state.split('.')[0])
  if (!memberHasPermission(membership, 'settings:manage')) redirect('/settings?error=forbidden')

  const { tokens } = await oauthClient().getToken(code)
  const granted = tokens.scope?.split(' ') ?? []
  if (!tokens.refresh_token || !GOOGLE_SCOPES.every((s) => granted.includes(s))) redirect('/settings?error=scopes')

  const db = getDb()
  await db.from('workspaces').update({ google_token: encrypt(tokens.refresh_token), admin_user_id: user.id }).eq('id', workspace.id)

  // ponytail: a different admin reconnecting reuses the calendar, which they only have read access to;
  // fine while each club has one admin, otherwise share the calendar as writer with admins.
  if (!workspace.calendar_id) {
    const auth = await getGoogleClient(workspace.id)
    const { data: cal } = await google
      .calendar({ version: 'v3', auth })
      .calendars.insert({ requestBody: { summary: workspace.name, timeZone: 'America/Los_Angeles' } })
    await db.from('workspaces').update({ calendar_id: cal.id }).eq('id', workspace.id)
    await shareWithAllOfficers(workspace.id, user.id, { calendarId: cal.id })
  }
  redirect('/settings')
}
