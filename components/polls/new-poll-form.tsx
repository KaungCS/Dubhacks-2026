'use client'

import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { createPollAction } from '@/app/polls/actions'

export function NewPollForm() {
  return (
    <Card>
      <form
        action={(fd) => {
          // datetime-local has no time zone; convert here, in the officer's own zone, before it reaches the server.
          const local = String(fd.get('closes_at') ?? '')
          fd.set('closes_at', local ? new Date(local).toISOString() : '')
          return createPollAction(fd)
        }}
        className="space-y-3"
      >
        <h2 className="font-semibold">New poll</h2>
        <Input name="question" placeholder="Question" aria-label="Question" required className="w-full" />
        <Textarea name="options" placeholder="Options, one per line" aria-label="Options, one per line" rows={4} required className="w-full" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="multiple_choice" className="accent-black" />
            Allow several choices
          </label>
          <label className="flex items-center gap-2">
            Closes
            <Input type="datetime-local" name="closes_at" />
          </label>
          <label className="flex items-center gap-2">
            Results
            <Select name="results_visibility" defaultValue="live">
              <option value="live">Always visible</option>
              <option value="after_vote">After you vote</option>
              <option value="after_close">Hidden until closed</option>
            </Select>
          </label>
        </div>
        <Button>Create poll</Button>
      </form>
    </Card>
  )
}
