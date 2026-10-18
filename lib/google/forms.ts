import { google } from 'googleapis'
import { getDb, type Event } from '@/lib/db'
import { getGoogleClient } from '@/lib/google/client'
import type { Rsvp } from '@/lib/attendance/merge'
import { pacific } from '@/lib/polls/rules'

// Where an event's files go: its own folder, else the club's Drive root, else the admin's My Drive.
export async function eventParent(event: Event): Promise<string | null> {
  if (event.drive_folder_id) return event.drive_folder_id
  const { data } = await getDb().from('workspaces').select('shared_drive_id').eq('id', event.workspace_id).single()
  return data?.shared_drive_id ?? null
}

// Public RSVP form: Google's own email field plus a required Name question, filed in the event folder.
export async function createRsvpForm(workspaceId: string, event: Event): Promise<{ formId: string; url: string }> {
  const auth = await getGoogleClient(workspaceId)
  const forms = google.forms({ version: 'v1', auth })
  const { data: form } = await forms.forms.create({
    requestBody: { info: { title: `RSVP: ${event.title}`, documentTitle: `${event.title} — RSVP` } },
  })
  const formId = form.formId!
  await forms.forms.batchUpdate({
    formId,
    requestBody: {
      requests: [
        {
          updateFormInfo: {
            info: { description: [pacific(event.starts_at), event.location].filter(Boolean).join(' · ') },
            updateMask: 'description',
          },
        },
        { updateSettings: { settings: { emailCollectionType: 'RESPONDER_INPUT' }, updateMask: 'emailCollectionType' } },
        {
          createItem: {
            item: { title: 'Name', questionItem: { question: { required: true, textQuestion: {} } } },
            location: { index: 0 },
          },
        },
      ],
    },
  })

  // The Forms API always creates in My Drive root; move it next to the event's other files.
  const parent = await eventParent(event)
  if (parent) {
    const drive = google.drive({ version: 'v3', auth })
    const { data } = await drive.files.get({ fileId: formId, fields: 'parents', supportsAllDrives: true })
    await drive.files.update({
      fileId: formId,
      addParents: parent,
      removeParents: data.parents?.join(','),
      supportsAllDrives: true,
    })
  }
  return { formId, url: form.responderUri! }
}

// ponytail: first page only (Google returns up to 5000 responses); paginate if an event ever gets more.
export async function readRsvps(workspaceId: string, formId: string): Promise<Rsvp[]> {
  const forms = google.forms({ version: 'v1', auth: await getGoogleClient(workspaceId) })
  const { data } = await forms.forms.responses.list({ formId })
  return (data.responses ?? [])
    .filter((r) => r.respondentEmail)
    .map((r) => ({
      email: r.respondentEmail!,
      name: Object.values(r.answers ?? {})[0]?.textAnswers?.answers?.[0]?.value ?? null,
      at: r.lastSubmittedTime ?? r.createTime ?? new Date().toISOString(),
    }))
}
