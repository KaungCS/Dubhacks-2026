import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { getTask, listWorkspaceOfficers, type TaskStatus } from "@/lib/tasks";
import { EditTaskForm } from "@/components/tasks/edit-task-form";
import { actionSetTaskStatus } from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ workspaceId?: string }>;

function QuickDoneButton({
  workspaceId,
  taskId,
  status,
  completedAt,
}: {
  workspaceId: string;
  taskId: string;
  status: TaskStatus;
  completedAt: string | null;
}) {
  if (status === "done") {
    return (
      <p className="text-sm text-neutral-600">
        Completed
        {completedAt ? ` ${new Date(completedAt).toLocaleString()}` : ""}
      </p>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await actionSetTaskStatus({
          workspaceId,
          taskId,
          status: "done",
        });
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
      >
        Mark done
      </button>
    </form>
  );
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { workspaceId } = await searchParams;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Task</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  let task: Awaited<ReturnType<typeof getTask>> | null = null;
  let officers = [] as Awaited<ReturnType<typeof listWorkspaceOfficers>>;
  let loadError: string | null = null;

  try {
    task = await getTask(id);
    if (task.workspaceId !== workspaceId) {
      throw new Error("Task does not belong to this workspace");
    }
    officers = await listWorkspaceOfficers(workspaceId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load task";
  }

  if (!task) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Task</h1>
        <p className="mt-2 text-sm text-red-600">{loadError ?? "Not found"}</p>
        <Link
          href={`/tasks?workspaceId=${workspaceId}`}
          className="mt-4 inline-block rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
        >
          Back to tasks
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-black">{task.title}</h1>
        <Link
          href={`/tasks?workspaceId=${workspaceId}`}
          className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
        >
          Back
        </Link>
      </div>

      <QuickDoneButton
        workspaceId={workspaceId}
        taskId={task.id}
        status={task.status}
        completedAt={task.completedAt}
      />

      <EditTaskForm
        workspaceId={workspaceId}
        task={task}
        officers={officers}
      />
    </main>
  );
}
