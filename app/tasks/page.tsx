import Link from "next/link";
import { cookies } from "next/headers";
import { requireMembership } from "@/lib/auth";
import { listTasks, listTasksSince } from "@/lib/tasks";
import { countUnreadNotifications } from "@/lib/notifications";
import { TaskList } from "@/components/tasks/task-list";
import { TaskBoard } from "@/components/tasks/task-board";
import { ViewToggle } from "@/components/tasks/view-toggle";
import { NewSinceLastVisit } from "@/components/tasks/new-since-last-visit";
import { TouchLastVisit } from "@/components/tasks/touch-last-visit";
import { NotificationBell } from "@/components/notifications/notification-bell";

const LAST_VISIT_COOKIE = "clubops_tasks_last_visit";

type SearchParams = Promise<{ workspaceId?: string; view?: string }>;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;
  const view = params.view === "board" ? "board" : "list";

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Tasks</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  const { user } = await requireMembership(workspaceId);

  const jar = await cookies();
  const raw = jar.get(LAST_VISIT_COOKIE)?.value;
  const lastVisit = raw ? new Date(raw) : null;
  const since =
    lastVisit && !Number.isNaN(lastVisit.getTime()) ? lastVisit : null;

  let tasks = [] as Awaited<ReturnType<typeof listTasks>>;
  let newTasks = [] as Awaited<ReturnType<typeof listTasksSince>>;
  let unread = 0;
  let loadError: string | null = null;

  try {
    const [taskRows, unreadCount] = await Promise.all([
      listTasks(workspaceId),
      countUnreadNotifications(user.id),
    ]);
    tasks = taskRows;
    unread = unreadCount;
    if (since) {
      newTasks = await listTasksSince(workspaceId, since);
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load tasks";
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <TouchLastVisit />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-black">Tasks</h1>
        <div className="flex flex-wrap items-center gap-2">
          <NotificationBell userId={user.id} initialUnreadCount={unread} />
          <ViewToggle workspaceId={workspaceId} view={view} />
          <Link
            href={`/tasks/new?workspaceId=${workspaceId}`}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
          >
            New task
          </Link>
        </div>
      </div>

      <NewSinceLastVisit workspaceId={workspaceId} tasks={newTasks} />

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {view === "board" ? (
        <TaskBoard workspaceId={workspaceId} tasks={tasks} />
      ) : (
        <TaskList workspaceId={workspaceId} tasks={tasks} />
      )}
    </main>
  );
}
