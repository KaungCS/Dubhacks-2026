// Pure dashboard helpers, no imports, so lib/dashboard/stats.test.mjs can run them with plain node.

export const DAY = 24 * 60 * 60 * 1000

type Dated = { starts_at: string }
type Attendee = { event_id: string; email: string; rsvped_at: string | null; attended: boolean }

// ponytail: Pacific for the pilot, like tasks and polls.
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' })

const pacificDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

// "today", "tomorrow", "in 5 days", "3 days ago", by Pacific calendar day.
export function countdown(iso: string, now = Date.now()) {
  const days = Math.round((Date.parse(pacificDay(Date.parse(iso))) - Date.parse(pacificDay(now))) / DAY)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

export const within = (iso: string, fromMs: number, toMs: number) => {
  const t = Date.parse(iso)
  return t >= fromMs && t < toMs
}

export const byStart = <T extends Dated>(a: T, b: T) => Date.parse(a.starts_at) - Date.parse(b.starts_at)

// RSVPs and attended per event id.
export function countsByEvent(attendees: Attendee[]) {
  const out = new Map<string, { rsvps: number; attended: number }>()
  for (const a of attendees) {
    const c = out.get(a.event_id) ?? { rsvps: 0, attended: 0 }
    if (a.rsvped_at) c.rsvps++
    if (a.attended) c.attended++
    out.set(a.event_id, c)
  }
  return out
}

// People who attended two or more of these events.
export function returningMembers(attendees: Attendee[]) {
  const events = new Map<string, Set<string>>()
  for (const a of attendees) {
    if (!a.attended) continue
    events.set(a.email, (events.get(a.email) ?? new Set()).add(a.event_id))
  }
  return [...events.values()].filter((s) => s.size >= 2).length
}

export const rate = (attended: number, rsvps: number) => (rsvps ? `${Math.round((attended / rsvps) * 100)}%` : '–')

// ponytail: there's no event type, so a meeting is an event made from a template with "meeting" in its name.
export const isMeetingTemplate = (name: string) => /meeting/i.test(name)

export type FileState = 'ok' | 'missing' | 'none'

// Each file type: made, expected by the event's template but not made, or not part of the template.
export function fileStates<K extends string>(present: Record<K, boolean>, expected: K[]): Record<K, FileState> {
  const out = {} as Record<K, FileState>
  for (const key of Object.keys(present) as K[]) {
    out[key] = present[key] ? 'ok' : expected.includes(key) ? 'missing' : 'none'
  }
  return out
}
