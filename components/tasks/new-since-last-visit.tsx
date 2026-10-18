import Link from "next/link";
import type { Task } from "@/lib/tasks";

type Props = {
  workspaceId: string;
  tasks: Task[];
};

/**
 * Dashboard strip: tasks created since the officer's last visit cookie.
 * Mount on the tasks page (and any home/dashboard Kaung adds later).
 */
export function NewSinceLastVisit({ workspaceId, tasks }: Props) {
  if (tasks.length === 0) return null;

  return (
    <section className="border border-neutral-200 bg-neutral-50 px-4 py-3">
      <h2 className="text-sm font-medium text-black">
        New since your last visit
      </h2>
      <ul className="mt-2 space-y-1">
        {tasks.slice(0, 5).map((task) => (
          <li key={task.id}>
            <Link
              href={`/tasks/${task.id}?workspaceId=${workspaceId}`}
              className="text-sm text-black underline-offset-2 hover:underline"
            >
              {task.title}
            </Link>
          </li>
        ))}
      </ul>
      {tasks.length > 5 ? (
        <p className="mt-2 text-xs text-neutral-500">
          +{tasks.length - 5} more
        </p>
      ) : null}
    </section>
  );
}
