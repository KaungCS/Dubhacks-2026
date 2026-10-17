import Link from "next/link";
import type { Task } from "@/lib/tasks";

type Props = {
  workspaceId: string;
  tasks: Task[];
};

function isOverdue(task: Task): boolean {
  if (!task.dueAt || task.status === "done") return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

export function TaskList({ workspaceId, tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-500">No tasks yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 border border-neutral-200">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/tasks/${task.id}?workspaceId=${workspaceId}`}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-black">{task.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {task.status}
                {task.isPrereq ? " · prereq" : ""}
                {` · ${task.difficulty}`}
                {task.assigneeIds.length
                  ? ` · ${task.assigneeIds.length} assignee${task.assigneeIds.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <span
              className={
                isOverdue(task) ? "shrink-0 text-red-600" : "shrink-0 text-neutral-500"
              }
            >
              {task.dueAt
                ? new Date(task.dueAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "No due date"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
