import { google, type Auth } from 'googleapis'
import { getDb } from '@/lib/db'
import { decrypt } from '@/lib/auth/crypto'

// Full drive (not drive.file): drive.file can create files in the shared drive but can't read it or
// manage its members, so officer sharing failed. drive also covers Forms and Sheets.
// ponytail: drive is a restricted scope; fine for test users, needs Google's security review to go public.
// If a Google call returns 403 for scopes, add the scope here and have an admin reconnect.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
]

export class GoogleNotConnectedError extends Error {
  constructor() {
    super('Google is not connected for this club. An admin must reconnect it in Settings.')
  }
}

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/settings/google/callback`,
  )
}

// One client per club, kept while its stored token stays the same, so its access token (valid about an
// hour) is reused across requests instead of refreshed from Google on every call. Calls that arrive
// together share one refresh. A reconnect stores a new token, which replaces the client.
const clients = new Map<string, { token: string; client: Auth.OAuth2Client }>()

// OAuth client authorized as the club admin who connected Google.
// Throws GoogleNotConnectedError if no token is stored or Google revoked it (then the
// token is cleared and every page shows the reconnect banner).
export async function getGoogleClient(workspaceId: string): Promise<Auth.OAuth2Client> {
  const { data } = await getDb().from('workspaces').select('google_token').eq('id', workspaceId).single()
  if (!data?.google_token) {
    clients.delete(workspaceId)
    throw new GoogleNotConnectedError()
  }
  let cached = clients.get(workspaceId)
  if (cached?.token !== data.google_token) {
    const client = oauthClient()
    client.setCredentials({ refresh_token: decrypt(data.google_token) })
    cached = { token: data.google_token, client }
    clients.set(workspaceId, cached)
  }
  const { client } = cached
  try {
    // No network call while the cached access token is still valid.
    await client.getAccessToken()
  } catch (e) {
    clients.delete(workspaceId)
    if (!String(e).includes('invalid_grant')) throw e
    await getDb().from('workspaces').update({ google_token: null }).eq('id', workspaceId)
    throw new GoogleNotConnectedError()
  }
  return client
}

type Shared = { driveId?: string | null; calendarId?: string | null }

// Give an officer the shared drive (Contributor) and the club calendar (read-only).
// Best effort: failures are logged, not thrown, so joining never breaks on Google.
export async function shareWithOfficer(workspaceId: string, email: string, { driveId, calendarId }: Shared) {
  const auth = await getGoogleClient(workspaceId).catch(() => null)
  if (!auth) return
  const results = await Promise.allSettled([
    driveId &&
      google.drive({ version: 'v3', auth }).permissions.create({
        fileId: driveId,
        supportsAllDrives: true,
        requestBody: { type: 'user', role: 'writer', emailAddress: email },
      }),
    calendarId &&
      google.calendar({ version: 'v3', auth }).acl.insert({
        calendarId,
        requestBody: { role: 'reader', scope: { type: 'user', value: email } },
      }),
  ])
  results.forEach((r) => r.status === 'rejected' && console.error('share failed', email, r.reason))
}

export async function unshareWithOfficer(workspaceId: string, email: string, { driveId, calendarId }: Shared) {
  const auth = await getGoogleClient(workspaceId).catch(() => null)
  if (!auth) return
  const drive = google.drive({ version: 'v3', auth })
  const results = await Promise.allSettled([
    driveId &&
      (async () => {
        const { data } = await drive.permissions.list({ fileId: driveId, supportsAllDrives: true, fields: 'permissions(id,emailAddress)' })
        const p = data.permissions?.find((p) => p.emailAddress?.toLowerCase() === email.toLowerCase())
        if (p?.id) await drive.permissions.delete({ fileId: driveId, permissionId: p.id, supportsAllDrives: true })
      })(),
    calendarId && google.calendar({ version: 'v3', auth }).acl.delete({ calendarId, ruleId: `user:${email}` }),
  ])
  results.forEach((r) => r.status === 'rejected' && console.error('unshare failed', email, r.reason))
}

// Share a newly set drive or calendar with every active officer except the token owner.
export async function shareWithAllOfficers(workspaceId: string, ownerId: string, shared: Shared) {
  const { data } = await getDb()
    .from('memberships')
    .select('user:users(email)')
    .eq('workspace_id', workspaceId)
    .is('left_at', null)
    .neq('user_id', ownerId)
  await Promise.all((data ?? []).map((m) => shareWithOfficer(workspaceId, m.user.email, shared)))
}
