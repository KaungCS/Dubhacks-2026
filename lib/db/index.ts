import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from './types'

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './types'
export type User = Tables<'users'>
export type Membership = Tables<'memberships'>
export type Task = Tables<'tasks'>
export type Event = Tables<'events'>

let db: SupabaseClient<Database> | undefined

// Service-role client: bypasses RLS, server only. Call requireMembership() first
// and filter every query by the workspace it returns.
// ponytail: app-level auth instead of RLS policies; add policies if a browser ever queries directly.
export function getDb() {
  return (db ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  }))
}
