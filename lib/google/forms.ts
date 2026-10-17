import type { Event } from '@/lib/db'

// Stub from the scaffold. Dom owns this file and replaces it; keep the signature (TEAM_PLAN.md "Contracts").
// Use getGoogleClient(workspaceId) from '@/lib/google/client' for auth.

export async function createRsvpForm(workspaceId: string, event: Event): Promise<{ formId: string; url: string }> {
  void workspaceId
  return { formId: `stub-form-${event.id}`, url: 'https://example.com/stub-rsvp-form' }
}
