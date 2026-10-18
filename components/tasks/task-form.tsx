'use client'

import { useState, useSyncExternalStore } from 'react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { createTaskAction, updateTaskAction } from '@/app/tasks/actions'
import type { Event } from '@/lib/db'
import type { Officer, TaskWithPeople } from '@/lib/tasks'

const noop = () => () => {}

// datetime-local wants the officer's local "YYYY-MM-DDTHH:mm".
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function OfficerPicker({ legend, name, officers, selected }: { legend: string; name: string; officers: Officer[]; selected: Set<string> }) {
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="text-neutral-500">{legend}</legend>
      {officers.length === 0 && <p className="text-neutral-500">No officers yet.</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {officers.map((o) => (
          <label key={o.id} className="flex items-center gap-2">
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.has(o.id)} className="accent-black" />
            {o.name}
            {o.title && <span className="text-neutral-500">{o.title}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Create (no task) or edit. Status isn't here: it follows the assignees' checkboxes.
export function TaskForm({ officers, events, task }: { officers: Officer[]; events: Event[]; task?: TaskWithPeople }) {
  const [isPrereq, setIsPrereq] = useState(task?.is_prereq ?? false)
  // The server doesn't know the officer's time zone, so the due field gets its value only in the browser.
  const inBrowser = useSyncExternalStore(noop, () => true, () => false)
  const assigned = new Set(task?.assignees.map((a) => a.user_id))
  const tagged = new Set(task?.tags.map((t) => t.user_id))

  return (
    <Card>
      <form
        action={(fd) => {
          // datetime-local has no time zone; convert here, in the officer's own zone, before it reaches the server.
          const local = String(fd.get('due_at') ?? '')
          fd.set('due_at', local ? new Date(local).toISOString() : '')
          return (task ? updateTaskAction : createTaskAction)(fd)
        }}
        className="space-y-4"
      >
        {task && <input type="hidden" name="id" value={task.id} />}
        <Input name="title" defaultValue={task?.title} placeholder="Title" aria-label="Title" required className="w-full" />
        <Textarea name="description" defaultValue={task?.description ?? ''} placeholder="Description" aria-label="Description" rows={3} className="w-full" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            Due
            <Input key={String(inBrowser)} type="datetime-local" name="due_at" defaultValue={inBrowser ? toLocalInput(task?.due_at) : ''} />
          </label>
          <label className="flex items-center gap-2">
            Difficulty
            <Select name="difficulty" defaultValue={task?.difficulty ?? 'medium'}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </label>
          <label className="flex items-center gap-2">
            Event
            <Select name="event_id" defaultValue={task?.event_id ?? ''}>
              <option value="">No event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.starts_at.slice(0, 10)})
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_prereq" checked={isPrereq} onChange={(e) => setIsPrereq(e.target.checked)} className="accent-black" />
            Prerequisite
          </label>
        </div>
        <OfficerPicker legend="Assignees" name="assignee" officers={officers} selected={assigned} />
        {isPrereq && <OfficerPicker legend="Notify when done" name="tag" officers={officers} selected={tagged} />}
        <Button>{task ? 'Save' : 'Create task'}</Button>
      </form>
    </Card>
  )
}
