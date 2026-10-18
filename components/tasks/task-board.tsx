import Link from 'next/link'
import { Card } from '@/components/ui'
import type { TaskWithPeople } from '@/lib/tasks'
import { isOverdue, pacific, type Status } from '@/lib/tasks/rules'

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
]

export function TaskBoard({ tasks }: { tasks: TaskWithPeople[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status)
        return (
          <Card key={col.status} className="space-y-2">
            <h2 className="font-semibold">
              {col.label} <span className="font-normal text-neutral-500">{columnTasks.length}</span>
            </h2>
            <ul className="divide-y divide-neutral-100">
              {columnTasks.map((task) => (
                <li key={task.id} className="py-2">
                  <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline">
                    {task.title}
                  </Link>
                  <p className={`text-xs ${isOverdue(task) ? 'text-red-600' : 'text-neutral-500'}`}>
                    {task.due_at ? pacific(task.due_at) : 'No due date'}
                    {task.is_prereq && ' · prereq'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
