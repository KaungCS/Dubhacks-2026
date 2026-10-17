import { redirect } from 'next/navigation'
import { authClient, safePath } from '@/lib/auth'
import { getDb } from '@/lib/db'

// Supabase redirects here after Google sign-in.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const { data, error } = await (await authClient()).auth.exchangeCodeForSession(params.get('code') ?? '')
  if (error) redirect('/sign-in?error=1')

  const { id, email, user_metadata: meta } = data.user
  const { error: dbError } = await getDb()
    .from('users')
    .upsert({ id, email: email!, name: meta.full_name ?? meta.name ?? null, google_sub: meta.provider_id ?? meta.sub ?? null })
  if (dbError) throw dbError

  redirect(safePath(params.get('next')))
}
