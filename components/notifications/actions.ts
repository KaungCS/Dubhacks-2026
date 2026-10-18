'use server'

import { requireUser } from '@/lib/auth'
import { listNotifications, markRead } from '@/lib/notifications'

export async function listMyNotifications() {
  return listNotifications((await requireUser()).id)
}

// One notification, or all when id is omitted. Always the signed-in user's own.
export async function markReadAction(id?: string) {
  await markRead((await requireUser()).id, id)
}
