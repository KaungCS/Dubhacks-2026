// Stub from the scaffold. Dom owns this file and replaces it; keep the signature (TEAM_PLAN.md "Contracts").

// Fetches RSVPs and sign-ins from Google, cached 5 minutes (events.attendance_fetched_at), writes attendees.
export async function getEventAttendance(eventId: string): Promise<{ rsvps: number; attended: number }> {
  void eventId
  return { rsvps: 0, attended: 0 }
}
