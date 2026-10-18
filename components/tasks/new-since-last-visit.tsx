import Link from 'next/link'
import { Card } from '@/components/ui'
import type { Task } from '@/lib/db'

// Tasks other officers created since this officer last opened Tasks.
export function NewSinceLastVisit({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null
  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">New since your last visit</h2>
      <ul className="space-y-1 text-sm">
        {tasks.slice(0, 5).map((task) => (
          <li key={task.id}>
            <Link href={`/tasks/${task.id}`} className="hover:underline">
              {task.title}
            </Link>
          </li>
        ))}
      </ul>
      {tasks.length > 5 && <p className="text-xs text-neutral-500">+{tasks.length - 5} more</p>}
    </Card>
  )
}
