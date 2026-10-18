import { google } from 'googleapis'
import type { Event } from '@/lib/db'
import { getGoogleClient } from '@/lib/google/client'
import { eventParent } from '@/lib/google/forms'
import type { SignIn } from '@/lib/attendance/merge'

// Door sign-in sheet in the event folder: attendees (or an officer) fill in Name and Email, one row each.
export async function createSignInSheet(workspaceId: string, event: Event): Promise<{ sheetId: string; url: string }> {
  const auth = await getGoogleClient(workspaceId)
  const parent = await eventParent(event)
  const { data } = await google.drive({ version: 'v3', auth }).files.create({
    supportsAllDrives: true,
    fields: 'id',
    requestBody: {
      name: `${event.title} — Sign-in`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: parent ? [parent] : undefined,
    },
  })
  const sheetId = data.id!
  await google.sheets({ version: 'v4', auth }).spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'A1:B1',
    valueInputOption: 'RAW',
    requestBody: { values: [['Name', 'Email']] },
  })
  return { sheetId, url: `https://docs.google.com/spreadsheets/d/${sheetId}` }
}

// Rows under the header that have an email; rows without one can't be matched to an attendee.
export async function readSignIns(workspaceId: string, sheetId: string): Promise<SignIn[]> {
  const sheets = google.sheets({ version: 'v4', auth: await getGoogleClient(workspaceId) })
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'A2:B' })
  return (data.values ?? [])
    .map(([name, email]) => ({ name: String(name ?? '').trim() || null, email: String(email ?? '').trim() }))
    .filter((r) => r.email.includes('@'))
}
