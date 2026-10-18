'use server'

import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/auth'
import { closePoll, createPoll, vote } from '@/lib/polls'

const VISIBILITY = ['live', 'after_vote', 'after_close'] as const

export async function createPollAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  const question = String(fd.get('question') ?? '').trim()
  const options = [...new Set(String(fd.get('options') ?? '').split('\n').map((s) => s.trim()).filter(Boolean))]
  const closesAt = String(fd.get('closes_at') ?? '')
  const visibility = VISIBILITY.find((v) => v === fd.get('results_visibility')) ?? 'live'
  if (!question || options.length < 2) redirect('/polls?error=options')
  if (closesAt && (Number.isNaN(Date.parse(closesAt)) || Date.parse(closesAt) <= Date.now())) redirect('/polls?error=closes')
  await createPoll({
    workspaceId: workspace.id,
    createdBy: user.id,
    question,
    options,
    multipleChoice: fd.get('multiple_choice') === 'on',
    closesAt: closesAt || null,
    resultsVisibility: visibility,
  })
  redirect('/polls')
}

export async function voteAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  const chosen = fd.getAll('option').map(String)
  if (chosen.length) await vote(workspace.id, String(fd.get('id')), user.id, chosen)
  redirect('/polls')
}

export async function closePollAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  await closePoll(workspace.id, String(fd.get('id')), user.id)
  redirect('/polls')
}
