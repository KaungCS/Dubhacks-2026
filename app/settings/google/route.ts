import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/auth'
import { GOOGLE_SCOPES, oauthClient } from '@/lib/google/client'

// Admin clicks "Connect Google": send them to Google's consent screen for the club scopes.
export async function GET() {
  const { user, membership, workspace } = await requireMembership()
  if (membership.role !== 'admin') redirect('/settings')
  const state = `${workspace.id}.${randomUUID()}`
  ;(await cookies()).set('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/settings/google', maxAge: 600 })
  redirect(
    oauthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // always returns a refresh token
      scope: GOOGLE_SCOPES,
      state,
      login_hint: user.email,
    }),
  )
}
