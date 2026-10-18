import { requireUser } from '@/lib/auth'
import { countUnread } from '@/lib/notifications'
import { NotificationMenu } from './notification-bell'

// app/layout.tsx renders this on every signed-in page. The list loads when opened, because the
// layout doesn't re-render on navigation. A failed count never breaks the page.
export async function NotificationBell() {
  const user = await requireUser()
  const unread = await countUnread(user.id).catch(() => 0)
  return <NotificationMenu initialUnread={unread} />
}
