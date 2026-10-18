import { getDb, type Json, type Tables } from '@/lib/db'

export type Notification = Tables<'notifications'>

// In-app notification for the bell. kind: 'task_assigned', 'prereq_done', 'event_created', 'poll_opened',
// 'poll_closing', 'rsvp_target'. Logs instead of throwing, so a failed notification never blocks the
// change that caused it.
export async function createNotification(userId: string, kind: string, payload: object): Promise<void> {
  const { error } = await getDb().from('notifications').insert({ user_id: userId, kind, payload: payload as Json })
  if (error) console.error('createNotification failed', error)
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await getDb()
    .from('notifications')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await getDb()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

// Marks one of the user's notifications read, or all of them when id is omitted. Never touches
// another user's rows.
export async function markRead(userId: string, id?: string): Promise<void> {
  let query = getDb().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  if (id) query = query.eq('id', id)
  const { error } = await query
  if (error) throw error
}
