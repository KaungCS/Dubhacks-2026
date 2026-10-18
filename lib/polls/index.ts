import { getDb, type Enums } from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { canSeeResults, isClosingSoon, isOpen, isValidVote } from './rules'

// Active officers of a club, optionally minus one user.
export async function officerIds(workspaceId: string, except?: string): Promise<string[]> {
  const { data } = await getDb().from('memberships').select('user_id').eq('workspace_id', workspaceId).is('left_at', null)
  return (data ?? []).map((m) => m.user_id).filter((id) => id !== except)
}

// A failed notification never blocks the poll itself.
export const notifyAll = (userIds: string[], kind: string, payload: object) =>
  Promise.all(userIds.map((id) => createNotification(id, kind, payload).catch((e) => console.error('createNotification failed', e))))

export type NewPoll = {
  workspaceId: string
  createdBy: string
  question: string
  options: string[]
  multipleChoice: boolean
  closesAt: string | null
  resultsVisibility: Enums<'poll_visibility'>
}

export async function createPoll(input: NewPoll): Promise<string> {
  const db = getDb()
  const { data: poll, error } = await db
    .from('polls')
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      question: input.question,
      multiple_choice: input.multipleChoice,
      closes_at: input.closesAt,
      results_visibility: input.resultsVisibility,
    })
    .select('id')
    .single()
  if (error) throw error
  const { error: optionsError } = await db
    .from('poll_options')
    .insert(input.options.map((label, position) => ({ poll_id: poll.id, label, position })))
  if (optionsError) throw optionsError
  await notifyAll(await officerIds(input.workspaceId, input.createdBy), 'poll_opened', { pollId: poll.id, question: input.question })
  return poll.id
}

// Everything the Polls page needs, with results and non-voters already filtered by who's asking.
export async function listPolls(workspaceId: string, userId: string) {
  const db = getDb()
  const [{ data: polls, error }, { data: members }] = await Promise.all([
    db
      .from('polls')
      .select('*, poll_options(id, label, position), votes(option_id, user_id)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    db.from('memberships').select('user_id, user:users(name, email)').eq('workspace_id', workspaceId).is('left_at', null),
  ])
  if (error) throw error
  const officers = members ?? []
  const now = Date.now()

  // ponytail: no scheduler (spec), so "closing soon" goes out when anyone opens Polls in the last 24h.
  for (const p of polls ?? []) {
    if (p.closing_notified_at || !isClosingSoon(p, now)) continue
    // Claim the poll first so two page loads can't both notify.
    const { data: claimed } = await db
      .from('polls')
      .update({ closing_notified_at: new Date(now).toISOString() })
      .eq('id', p.id)
      .is('closing_notified_at', null)
      .select('id')
    if (!claimed?.length) continue
    const voted = new Set(p.votes.map((v) => v.user_id))
    await notifyAll(
      officers.filter((m) => !voted.has(m.user_id)).map((m) => m.user_id),
      'poll_closing',
      { pollId: p.id, question: p.question, closesAt: p.closes_at },
    )
  }

  return (polls ?? []).map((p) => {
    const open = isOpen(p, now)
    const voted = new Set(p.votes.map((v) => v.user_id))
    const myVotes = p.votes.filter((v) => v.user_id === userId).map((v) => v.option_id)
    const showResults = canSeeResults(p.results_visibility, open, myVotes.length > 0)
    const isCreator = p.created_by === userId
    return {
      id: p.id,
      question: p.question,
      multipleChoice: p.multiple_choice,
      visibility: p.results_visibility,
      closesAt: p.closes_at,
      open,
      isCreator,
      myVotes,
      showResults,
      voterCount: voted.size,
      options: [...p.poll_options]
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ id: o.id, label: o.label, votes: showResults ? p.votes.filter((v) => v.option_id === o.id).length : null })),
      // Creator only (spec).
      nonVoters: isCreator ? officers.filter((m) => !voted.has(m.user_id)).map((m) => m.user.name ?? m.user.email) : null,
    }
  })
}

// Replaces the officer's previous vote on this poll.
export async function vote(workspaceId: string, pollId: string, userId: string, optionIds: string[]) {
  const db = getDb()
  const { data: poll } = await db
    .from('polls')
    .select('status, closes_at, multiple_choice, poll_options(id)')
    .eq('id', pollId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!poll || !isOpen(poll) || !isValidVote(optionIds, poll.poll_options.map((o) => o.id), poll.multiple_choice)) {
    throw new Error('That vote is not allowed. The poll may have just closed.')
  }
  await db.from('votes').delete().eq('poll_id', pollId).eq('user_id', userId)
  const { error } = await db.from('votes').insert(optionIds.map((option_id) => ({ poll_id: pollId, option_id, user_id: userId })))
  if (error) throw error
}

// Only the creator can close early.
export async function closePoll(workspaceId: string, pollId: string, userId: string) {
  await getDb().from('polls').update({ status: 'closed' }).eq('id', pollId).eq('workspace_id', workspaceId).eq('created_by', userId)
}
