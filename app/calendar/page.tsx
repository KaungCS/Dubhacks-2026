<<<<<<< HEAD
import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jun owns this folder.
export default async function CalendarPage() {
  await requireMembership()
  return (
    <Page title="Calendar">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
=======
import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listEvents } from "@/lib/events";
import { listTasksForCalendar } from "@/lib/tasks";
import { CalendarView, type CalendarTask } from "@/components/events/calendar-view";

type SearchParams = Promise<{ workspaceId?: string }>;

function normalizeTask(raw: Record<string, unknown>): CalendarTask | null {
  const id = String(raw.id ?? "");
  const title = String(raw.title ?? "");
  const dueAt = String(raw.dueAt ?? raw.due_at ?? "");
  if (!id || !dueAt) return null;
  return { id, title, dueAt };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Calendar</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  let events = [] as Awaited<ReturnType<typeof listEvents>>;
  let tasks: CalendarTask[] = [];
  let loadError: string | null = null;

  try {
    const [eventRows, taskRows] = await Promise.all([
      listEvents(workspaceId, from, to),
      listTasksForCalendar(workspaceId, from, to),
    ]);
    events = eventRows;
    tasks = (taskRows as unknown as Record<string, unknown>[])
      .map(normalizeTask)
      .filter((t): t is CalendarTask => t !== null);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load calendar";
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div />
        <div className="flex gap-2">
          <Link
            href={`/events?workspaceId=${workspaceId}`}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
          >
            Events
          </Link>
          <Link
            href={`/events/new?workspaceId=${workspaceId}`}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
          >
            New event
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <CalendarView
          workspaceId={workspaceId}
          events={events}
          tasks={tasks}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
        />
      )}
    </main>
  );
>>>>>>> de0b907 (feat(jun): calendar, events, and templates module)
}
