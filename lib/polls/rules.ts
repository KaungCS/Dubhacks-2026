// Pure helpers, no imports, so lib/polls/rules.test.mjs can run them with plain node.

// ponytail: Pacific time for the pilot (spec: "once per day" is Pacific), same zone as the club calendar.
export const pacific = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })

type PollTiming = { status: string; closes_at: string | null }

export const isOpen = (poll: PollTiming, now = Date.now()) =>
  poll.status === 'open' && (!poll.closes_at || Date.parse(poll.closes_at) > now)

// live: always. after_vote: once you've voted. after_close: only when closed. Everyone sees results once closed.
export const canSeeResults = (visibility: string, open: boolean, hasVoted: boolean) =>
  !open || visibility === 'live' || (visibility === 'after_vote' && hasVoted)

export const isValidVote = (chosen: string[], optionIds: string[], multipleChoice: boolean) =>
  chosen.length > 0 &&
  (multipleChoice || chosen.length === 1) &&
  new Set(chosen).size === chosen.length &&
  chosen.every((id) => optionIds.includes(id))

const DAY = 24 * 60 * 60 * 1000
export const isClosingSoon = (poll: PollTiming, now = Date.now()) =>
  isOpen(poll, now) && !!poll.closes_at && Date.parse(poll.closes_at) - now < DAY

// Editing a poll's options: a label that's still there keeps its option (and its votes); the new list sets the order.
export function diffOptions(existing: { id: string; label: string }[], labels: string[]) {
  const byLabel = new Map(existing.map((o) => [o.label, o.id]))
  return {
    remove: existing.filter((o) => !labels.includes(o.label)).map((o) => o.id),
    keep: labels.flatMap((label, position) => (byLabel.has(label) ? [{ id: byLabel.get(label)!, position }] : [])),
    add: labels.flatMap((label, position) => (byLabel.has(label) ? [] : [{ label, position }])),
  }
}
