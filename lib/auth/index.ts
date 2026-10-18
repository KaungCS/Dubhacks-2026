import { cache } from 'react'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { getDb, type Membership, type Tables, type User } from '@/lib/db'
import { hasAllPermissions, type Permission } from './permissions'
import { resolveMembershipPermissions } from './roles'

export const WORKSPACE_COOKIE = 'workspace'

export type { Permission } from './permissions'
export {
  PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_GROUPS,
  ADMIN_PERMISSIONS,
  summarizePermissions,
  parsePermissions,
  isPermission,
} from './permissions'
export { ROLE_PRESETS, getPreset } from './role-presets'
export * from './roles'

// The workspace as pages see it: the encrypted token never leaves this module.
export type Workspace = Omit<Tables<'workspaces'>, 'google_token'> & { google_connected: boolean }

export type MembershipWithPermissions = Membership & {
  permissions: Permission[]
  role_name: string
}

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

const getSessionUser = cache(async (): Promise<User | null> => {
  const { data } = await (await authClient()).auth.getClaims()
  if (!data) return null
  const { data: user } = await getDb().from('users').select().eq('id', data.claims.sub).maybeSingle()
  return user
})

// Signed-in user, their active memberships, and the current one (cookie, else the first).
// Null when signed out. Doesn't redirect, so the layout can use it.
export const getContext = cache(async () => {
  const user = await getSessionUser()
  if (!user) return null
  const { data } = await getDb()
    .from('memberships')
    .select('*, workspace:workspaces(*), workspace_role:workspace_roles(id, name, permissions, is_system, is_active)')
    .eq('user_id', user.id)
    .is('left_at', null)
    .order('joined_at')
  const memberships = await Promise.all(
    (data ?? []).map(async ({ workspace: { google_token, ...ws }, workspace_role, ...m }) => {
      const permissions = await resolveMembershipPermissions(m)
      const role_name =
        workspace_role && !Array.isArray(workspace_role)
          ? workspace_role.name
          : m.role === 'admin'
            ? 'Admin'
            : 'Officer'
      return {
        ...m,
        permissions,
        role_name,
        workspace: { ...ws, google_connected: !!google_token } as Workspace,
      }
    }),
  )
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
): Promise<{ user: User; membership: MembershipWithPermissions; workspace: Workspace }> {
  const ctx = await getContext()
  if (!ctx) redirect('/sign-in')
  const m = workspaceId ? ctx.memberships.find((m) => m.workspace_id === workspaceId) : ctx.current
  if (!m) return workspaceId ? notFound() : redirect('/settings')
  const { workspace, ...membership } = m
  return { user: ctx.user, membership, workspace }
}

/** Server-side feature gate. Redirects to settings if the member lacks any of the permissions. */
export async function requirePermission(
  ...needed: Permission[]
): Promise<{ user: User; membership: MembershipWithPermissions; workspace: Workspace }> {
  const ctx = await requireMembership()
  if (!hasAllPermissions(ctx.membership.permissions, needed)) {
    redirect('/settings?error=forbidden')
  }
  return ctx
}

export function memberHasPermission(
  membership: Pick<MembershipWithPermissions, 'permissions'>,
  ...needed: Permission[]
): boolean {
  return hasAllPermissions(membership.permissions, needed)
}
