// Pure attendance logic, no imports, so lib/attendance/merge.test.mjs can run it with plain node.

export type Rsvp = { email: string; name: string | null; at: string }
export type SignIn = { email: string; name: string | null }
export type AttendeeRow = { event_id: string; email: string; name: string | null; rsvped_at: string | null; attended: boolean }

// One row per email (lowercased): RSVPs from the form, attended=true from the sign-in sheet.
export function mergeAttendees(eventId: string, rsvps: Rsvp[], signIns: SignIn[]): AttendeeRow[] {
  const rows = new Map<string, AttendeeRow>()
  for (const r of rsvps) {
    const email = r.email.trim().toLowerCase()
    rows.set(email, { event_id: eventId, email, name: r.name, rsvped_at: r.at, attended: false })
  }
  for (const s of signIns) {
    const email = s.email.trim().toLowerCase()
    const row = rows.get(email)
    rows.set(email, { event_id: eventId, email, name: row?.name ?? s.name, rsvped_at: row?.rsvped_at ?? null, attended: true })
  }
  return [...rows.values()]
}

// For each event in date order: attendees seen at no earlier event are new, the rest returning.
export function newVsReturning(events: { id: string; starts_at: string }[], attended: { event_id: string; email: string }[]) {
  const seen = new Set<string>()
  const result = new Map<string, { new: number; returning: number }>()
  for (const ev of [...events].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    const emails = new Set(attended.filter((a) => a.event_id === ev.id).map((a) => a.email))
    const returning = [...emails].filter((e) => seen.has(e)).length
    result.set(ev.id, { new: emails.size - returning, returning })
    emails.forEach((e) => seen.add(e))
  }
  return result
}
