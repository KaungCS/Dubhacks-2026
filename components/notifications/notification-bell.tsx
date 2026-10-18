'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { buttonClass } from '@/components/ui'
import type { Notification } from '@/lib/notifications'
import { listMyNotifications, markReadAction } from './actions'

const LABELS: Record<string, string> = {
  task_assigned: 'Assigned to you',
  prereq_done: 'Prereq done',
  event_created: 'Event created',
  poll_opened: 'New poll',
  poll_closing: 'Poll closing soon',
  rsvp_target: 'RSVP target reached',
}

const field = (n: Notification, key: string) => {
  const value = (n.payload as Record<string, unknown> | null)?.[key]
  return typeof value === 'string' ? value : ''
}

function labelFor(n: Notification) {
  const name = field(n, 'title') || field(n, 'question')
  const label = LABELS[n.kind] ?? n.kind
  return name ? `${label}: ${name}` : label
}

function hrefFor(n: Notification) {
  if (field(n, 'taskId')) return `/tasks/${field(n, 'taskId')}`
  if (field(n, 'eventId')) return `/events/${field(n, 'eventId')}`
  if (field(n, 'pollId')) return '/polls'
  return null
}

export function NotificationMenu({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(initialUnread)
  const [, startTransition] = useTransition()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    setOpen(!open)
    if (open) return
    startTransition(async () => {
      const list = await listMyNotifications()
      setItems(list)
      setUnread(list.filter((n) => !n.read_at).length)
    })
  }

  function markRead(id?: string) {
    const now = new Date().toISOString()
    setItems((list) => list?.map((n) => (!id || n.id === id ? { ...n, read_at: n.read_at ?? now } : n)) ?? null)
    setUnread((count) => (id ? Math.max(0, count - 1) : 0))
    startTransition(() => markReadAction(id))
  }

  return (
    <div ref={root} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} className={buttonClass}>
        Notifications{unread > 0 && ` (${unread > 99 ? '99+' : unread})`}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-sm">
            <span className="font-semibold">Notifications</span>
            <button type="button" onClick={() => markRead()} disabled={unread === 0} className="text-neutral-500 hover:underline disabled:opacity-40">
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto text-sm">
            {items === null && <li className="px-4 py-6 text-center text-neutral-500">Loading…</li>}
            {items?.length === 0 && <li className="px-4 py-6 text-center text-neutral-500">No notifications</li>}
            {items?.map((n) => {
              const href = hrefFor(n)
              const read = () => !n.read_at && markRead(n.id)
              const body = (
                <>
                  <p className={n.read_at ? 'text-neutral-500' : 'font-medium'}>{labelFor(n)}</p>
                  <p className="text-xs text-neutral-500">{new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </>
              )
              return (
                <li key={n.id} className="border-b border-neutral-100 last:border-0">
                  {href ? (
                    <Link href={href} onClick={() => (read(), setOpen(false))} className="block px-4 py-2 hover:bg-neutral-50">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={read} className="block w-full px-4 py-2 text-left hover:bg-neutral-50">
                      {body}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
