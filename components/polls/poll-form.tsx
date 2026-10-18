'use client'

import { Button, Input, Select, Textarea } from '@/components/ui'
import { createPollAction, updatePollAction } from '@/app/polls/actions'
import type { listPolls } from '@/lib/polls'

type Poll = Awaited<ReturnType<typeof listPolls>>[number]

// ISO -> the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in the officer's own zone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

// New poll, or edit one when `poll` is given.
export function PollForm({ poll }: { poll?: Poll }) {
  return (
    <form
      action={(fd) => {
        // datetime-local has no time zone; convert here, in the officer's own zone, before it reaches the server.
        const local = String(fd.get('closes_at') ?? '')
        fd.set('closes_at', local ? new Date(local).toISOString() : '')
        return poll ? updatePollAction(fd) : createPollAction(fd)
      }}
      className="space-y-3"
    >
      {poll ? <input type="hidden" name="id" value={poll.id} /> : <h2 className="font-semibold">New poll</h2>}
      <Input name="question" placeholder="Question" aria-label="Question" required className="w-full" defaultValue={poll?.question} />
      <Textarea
        name="options"
        placeholder="Options, one per line"
        aria-label="Options, one per line"
        rows={4}
        required
        className="w-full"
        defaultValue={poll?.options.map((o) => o.label).join('\n')}
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="multiple_choice" className="accent-black" defaultChecked={poll?.multipleChoice} />
          Allow several choices
        </label>
        <label className="flex items-center gap-2">
          Closes
          {/* Filled in the browser, not on the server, so it's in the officer's zone. */}
          <Input type="datetime-local" name="closes_at" ref={(el) => { if (el && poll?.closesAt) el.value = toLocalInput(poll.closesAt) }} />
        </label>
        <label className="flex items-center gap-2">
          Results
          <Select name="results_visibility" defaultValue={poll?.visibility ?? 'live'}>
            <option value="live">Always visible</option>
            <option value="after_vote">After you vote</option>
            <option value="after_close">Hidden until closed</option>
          </Select>
        </label>
      </div>
      <Button>{poll ? 'Save poll' : 'Create poll'}</Button>
    </form>
  )
}
