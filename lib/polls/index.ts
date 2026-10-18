import { getDb, type Enums } from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { canSeeResults, diffOptions, isClosingSoon, isOpen, isValidVote } from './rules'

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

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null)

// Creator only. Options keep their votes when their label stays (see diffOptions).
export async function updatePoll(pollId: string, input: NewPoll) {
  const db = getDb()
  const { data: poll } = await db
    .from('polls')
    .select('closes_at, multiple_choice, poll_options(id, label), votes(option_id, user_id)')
    .eq('id', pollId)
    .eq('workspace_id', input.workspaceId)
    .eq('created_by', input.createdBy)
    .maybeSingle()
  if (!poll) throw new Error('Only the poll creator can edit it.')

  const { error } = await db
    .from('polls')
    .update({
      question: input.question,
      multiple_choice: input.multipleChoice,
      closes_at: input.closesAt,
      results_visibility: input.resultsVisibility,
      // A new close time gets its own "closing soon" notice.
      ...(ms(input.closesAt) !== ms(poll.closes_at) && { closing_notified_at: null }),
    })
    .eq('id', pollId)
  if (error) throw error

  const { remove, keep, add } = diffOptions(poll.poll_options, input.options)
  // Removing an option removes its votes (on delete cascade).
  const results = await Promise.all([
    remove.length ? db.from('poll_options').delete().in('id', remove) : null,
    ...keep.map((o) => db.from('poll_options').update({ position: o.position }).eq('id', o.id)),
    add.length ? db.from('poll_options').insert(add.map((o) => ({ poll_id: pollId, ...o }))) : null,
  ])
  const failed = results.find((r) => r?.error)
  if (failed?.error) throw failed.error

  // Now single choice: officers who picked several options vote again.
  if (poll.multiple_choice && !input.multipleChoice) {
    const counts = new Map<string, number>()
    for (const v of poll.votes) if (!remove.includes(v.option_id)) counts.set(v.user_id, (counts.get(v.user_id) ?? 0) + 1)
    const several = [...counts].filter(([, n]) => n > 1).map(([id]) => id)
    if (several.length) await db.from('votes').delete().eq('poll_id', pollId).in('user_id', several)
  }
}

// Creator only. Options and votes go with it (on delete cascade).
export async function deletePoll(workspaceId: string, pollId: string, userId: string) {
  const { error } = await getDb().from('polls').delete().eq('id', pollId).eq('workspace_id', workspaceId).eq('created_by', userId)
  if (error) throw error
}
