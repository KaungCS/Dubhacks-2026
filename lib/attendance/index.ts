import { getDb } from '@/lib/db'
import { getEvent } from '@/lib/events'
import { readRsvps } from '@/lib/google/forms'
import { readSignIns } from '@/lib/google/sheets'
import { notifyAll, officerIds } from '@/lib/polls'
import { mergeAttendees } from './merge'

const CACHE_MS = 5 * 60 * 1000

// Events created before the real form/sheet functions existed have placeholder ids from the scaffold stubs.
const realId = (id: string | null) => (id && !id.startsWith('stub-') ? id : null)

// RSVPs from the event's form and sign-ins from its sheet. Refetched from Google at most every 5 minutes
// (events.attendance_fetched_at) and stored in attendees. Notifies officers once when RSVPs reach rsvp_target.
export async function getEventAttendance(eventId: string): Promise<{ rsvps: number; attended: number }> {
  const event = await getEvent(eventId)
  const db = getDb()

  if (!event.attendance_fetched_at || Date.now() - Date.parse(event.attendance_fetched_at) > CACHE_MS) {
    const formId = realId(event.rsvp_form_id)
    const sheetId = realId(event.signin_sheet_id)
    const [rsvps, signIns] = await Promise.all([
      formId ? readRsvps(event.workspace_id, formId) : [],
      sheetId ? readSignIns(event.workspace_id, sheetId) : [],
    ])
    const rows = mergeAttendees(eventId, rsvps, signIns)
    if (rows.length) {
      const { error } = await db.from('attendees').upsert(rows, { onConflict: 'event_id,email' })
      if (error) throw error
    }
    await db.from('events').update({ attendance_fetched_at: new Date().toISOString() }).eq('id', eventId)
  }

  const { data } = await db.from('attendees').select('rsvped_at, attended').eq('event_id', eventId)
  const counts = { rsvps: (data ?? []).filter((a) => a.rsvped_at).length, attended: (data ?? []).filter((a) => a.attended).length }

  if (event.rsvp_target && counts.rsvps >= event.rsvp_target && !event.rsvp_target_notified_at) {
    // Claim first so two page loads can't both notify.
    const { data: claimed } = await db
      .from('events')
      .update({ rsvp_target_notified_at: new Date().toISOString() })
      .eq('id', eventId)
      .is('rsvp_target_notified_at', null)
      .select('id')
    if (claimed?.length) {
      await notifyAll(await officerIds(event.workspace_id), 'rsvp_target', { eventId, title: event.title, rsvps: counts.rsvps })
    }
  }
  return counts
}
