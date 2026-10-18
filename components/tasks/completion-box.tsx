'use client'

import { useOptimistic, useTransition } from 'react'
import { setCompletionAction } from '@/app/tasks/actions'

type Props = { taskId: string; assigneeId: string | null; label: string; checked: boolean; disabled: boolean }

// One assignee's checkbox (assigneeId null = the whole unassigned task). Shows the click at once and
// falls back to the saved value if the server refuses.
export function CompletionBox({ taskId, assigneeId, label, checked, disabled }: Props) {
  const [shown, setShown] = useOptimistic(checked)
  const [pending, startTransition] = useTransition()
  return (
    <label className={`flex items-center gap-1.5 text-sm ${disabled ? 'text-neutral-400' : ''}`} title={disabled ? 'Only an admin can change this' : undefined}>
      <input
        type="checkbox"
        checked={shown}
        disabled={disabled || pending}
        onChange={(e) => {
          const done = e.target.checked
          startTransition(async () => {
            setShown(done)
            await setCompletionAction(taskId, assigneeId, done)
          })
        }}
        className="accent-black"
      />
      {label}
    </label>
  )
}
