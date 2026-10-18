import Link from "next/link";
import type { Task, TaskStatus } from "@/lib/tasks";

type Props = {
  workspaceId: string;
  tasks: Task[];
};

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "doing", label: "Doing" },
  { status: "done", label: "Done" },
];

function isOverdue(task: Task): boolean {
  if (!task.dueAt || task.status === "done") return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

export function TaskBoard({ workspaceId, tasks }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        return (
          <section key={col.status} className="min-h-40 border border-neutral-200">
            <h2 className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-black">
              {col.label}
              <span className="ml-2 text-neutral-500">{columnTasks.length}</span>
            </h2>
            <ul className="space-y-2 p-2">
              {columnTasks.length === 0 ? (
                <li className="px-2 py-4 text-xs text-neutral-400">Empty</li>
              ) : (
                columnTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}?workspaceId=${workspaceId}`}
                      className="block border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      <p className="font-medium text-black">{task.title}</p>
                      <p
                        className={
                          isOverdue(task)
                            ? "mt-1 text-xs text-red-600"
                            : "mt-1 text-xs text-neutral-500"
                        }
                      >
                        {task.dueAt
                          ? new Date(task.dueAt).toLocaleDateString()
                          : "No due date"}
                        {task.isPrereq ? " · prereq" : ""}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
