import Link from "next/link";
import { Page, buttonClass } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { listEvents } from "@/lib/events";
import { listTasksForCalendar } from "@/lib/tasks";
import { CalendarView } from "@/components/events/calendar-view";

export default async function CalendarPage() {
  const { workspace } = await requireMembership();

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  let events = [] as Awaited<ReturnType<typeof listEvents>>;
  let tasks = [] as Awaited<ReturnType<typeof listTasksForCalendar>>;
  let loadError: string | null = null;

  try {
    ;[events, tasks] = await Promise.all([
      listEvents(workspace.id, from, to),
      listTasksForCalendar(workspace.id, from, to),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load calendar";
  }

  return (
    <Page
      title="Calendar"
      actions={
        <div className="flex gap-2">
          <Link href="/events" className={buttonClass}>
            Events
          </Link>
          <Link href="/events/new" className={buttonClass}>
            New event
          </Link>
        </div>
      }
    >
      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : (
        <CalendarView
          events={events}
          tasks={tasks}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
        />
      )}
    </Page>
  );
}
