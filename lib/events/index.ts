import type { Event } from '@/lib/db'

// Stub from the scaffold. Jun owns this file and replaces it; keep the signatures (TEAM_PLAN.md "Contracts").

export async function getEvent(eventId: string): Promise<Event> {
  throw new Error(`getEvent(${eventId}): not implemented`)
}

export async function listEvents(workspaceId: string, from: Date, to: Date): Promise<Event[]> {
  void [workspaceId, from, to]
  return []
}
