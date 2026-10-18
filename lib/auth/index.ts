import { cache } from 'react'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { getDb, type Membership, type Tables, type User } from '@/lib/db'

export const WORKSPACE_COOKIE = 'workspace'

// The workspace as pages see it: the encrypted token never leaves this module.
export type Workspace = Omit<Tables<'workspaces'>, 'google_token'> & { google_connected: boolean }

// Supabase client for the auth session only (sign in, sign out, read the session).
// Use getDb() for data.
export async function authClient() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session.
        }
      },
    },
  })
}

// Verified id of the signed-in user, read from the session cookie once per request.
const getSessionUserId = cache(async (): Promise<string | null> => {
  const { data } = await (await authClient()).auth.getClaims()
  return data?.claims.sub ?? null
})

const getSessionUser = cache(async (): Promise<User | null> => {
  const id = await getSessionUserId()
  if (!id) return null
  const { data: user } = await getDb().from('users').select().eq('id', id).maybeSingle()
  return user
})

// Signed-in user, their active memberships, and the current one (cookie, else the first).
// Null when signed out. Doesn't redirect, so the layout can use it.
export const getContext = cache(async () => {
  const id = await getSessionUserId()
  if (!id) return null
  // Both queries only need the user id, so they run together: every page load waits on this.
  const [user, { data }] = await Promise.all([
    getSessionUser(),
    getDb()
      .from('memberships')
      .select('*, workspace:workspaces(*)')
      .eq('user_id', id)
      .is('left_at', null)
      .order('joined_at'),
  ])
  if (!user) return null
  const memberships = (data ?? []).map(({ workspace: { google_token, ...ws }, ...m }) => ({
    ...m,
    workspace: { ...ws, google_connected: !!google_token } as Workspace,
  }))
  const wanted = (await cookies()).get(WORKSPACE_COOKIE)?.value
  const current = memberships.find((m) => m.workspace_id === wanted) ?? memberships[0]
  return { user, memberships, current }
})

// A ?next= redirect target, limited to same-site paths so links can't bounce users elsewhere.
export const safePath = (p: unknown) => (typeof p === 'string' && /^\/(?![/\\])/.test(p) ? p : '/')

// Server actions and route handlers only (Server Components can't set cookies).
export async function setCurrentWorkspace(workspaceId: string) {
  ;(await cookies()).set(WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
}

export async function requireUser(): Promise<User> {
  return (await getSessionUser()) ?? redirect('/sign-in')
}

// Omit workspaceId to use the signed-in user's current club.
// Redirects to /sign-in if signed out, /settings if they have no club; 404 if not a member of workspaceId.
export async function requireMembership(
  workspaceId?: string,
): Promise<{ user: User; membership: Membership; workspace: Workspace }> {
  const ctx = await getContext()
  if (!ctx) redirect('/sign-in')
  const m = workspaceId ? ctx.memberships.find((m) => m.workspace_id === workspaceId) : ctx.current
  if (!m) return workspaceId ? notFound() : redirect('/settings')
  const { workspace, ...membership } = m
  return { user: ctx.user, membership, workspace }
}
