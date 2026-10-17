import type { Event } from '@/lib/db'

// Stub from the scaffold. Dom owns this file and replaces it; keep the signature (TEAM_PLAN.md "Contracts").
// Use getGoogleClient(workspaceId) from '@/lib/google/client' for auth.

export async function createSignInSheet(workspaceId: string, event: Event): Promise<{ sheetId: string; url: string }> {
  void workspaceId
  return { sheetId: `stub-sheet-${event.id}`, url: 'https://example.com/stub-sign-in-sheet' }
}
