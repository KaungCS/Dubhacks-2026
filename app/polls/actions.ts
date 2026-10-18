'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/auth'
import { closePoll, createPoll, deletePoll, updatePoll, vote, type NewPoll } from '@/lib/polls'

const VISIBILITY = ['live', 'after_vote', 'after_close'] as const

// Shared by create and edit. An invalid form goes back to /polls (still editing, for an edit) with an error.
async function readPollForm(fd: FormData, back: string): Promise<NewPoll> {
  const { user, workspace } = await requireMembership()
  const question = String(fd.get('question') ?? '').trim()
  const options = [...new Set(String(fd.get('options') ?? '').split('\n').map((s) => s.trim()).filter(Boolean))]
  const closesAt = String(fd.get('closes_at') ?? '')
  const visibility = VISIBILITY.find((v) => v === fd.get('results_visibility')) ?? 'live'
  if (!question || options.length < 2) redirect(`${back}error=options`)
  if (closesAt && Number.isNaN(Date.parse(closesAt))) redirect(`${back}error=closes`)
  return {
    workspaceId: workspace.id,
    createdBy: user.id,
    question,
    options,
    multipleChoice: fd.get('multiple_choice') === 'on',
    closesAt: closesAt || null,
    resultsVisibility: visibility,
  }
}

export async function createPollAction(fd: FormData) {
  const input = await readPollForm(fd, '/polls?')
  if (input.closesAt && Date.parse(input.closesAt) <= Date.now()) redirect('/polls?error=closes')
  await createPoll(input)
  revalidatePath('/polls')
  redirect('/polls')
}

// Unlike create, a past close time is allowed: it just means the poll is closed.
export async function updatePollAction(fd: FormData) {
  const id = String(fd.get('id'))
  await updatePoll(id, await readPollForm(fd, `/polls?edit=${id}&`))
  revalidatePath('/polls')
  redirect('/polls')
}

export async function deletePollAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  await deletePoll(workspace.id, String(fd.get('id')), user.id)
  revalidatePath('/polls')
  redirect('/polls')
}

export async function voteAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  const chosen = fd.getAll('option').map(String)
  if (chosen.length) await vote(workspace.id, String(fd.get('id')), user.id, chosen)
  revalidatePath('/polls')
  redirect('/polls')
}

export async function closePollAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  await closePoll(workspace.id, String(fd.get('id')), user.id)
  revalidatePath('/polls')
  redirect('/polls')
}
