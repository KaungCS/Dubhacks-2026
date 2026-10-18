import Link from "next/link";
import { Page, Tabs, buttonClass } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import type { Task } from "@/lib/db";
import { listEvents, listTemplates } from "@/lib/events";
import { listTasksForCalendar } from "@/lib/tasks";
import { EventList } from "@/components/events/event-list";
import { CalendarView } from "@/components/events/calendar-view";

// Events (/events) and Calendar (/calendar) are two views of one page, each with its own sidebar link.
const VIEWS = [
  { key: "list", label: "List", href: "/events" },
  { key: "calendar", label: "Calendar", href: "/calendar" },
];

// Days shown under "Plan from a template", e.g. "4 tasks over 14 days".
function templateSummary(t: Awaited<ReturnType<typeof listTemplates>>[number]) {
  const span = Math.max(0, ...t.task_items.map((i) => i.days_before));
  const tasks = `${t.task_items.length} ${t.task_items.length === 1 ? "task" : "tasks"}`;
  return span ? `${tasks} over ${span} days` : tasks;
}

export async function EventsOverview({ view }: { view: "list" | "calendar" }) {
  const { workspace } = await requireMembership();
  const calendar = view === "calendar";

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = calendar
    ? new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  let events = [] as Awaited<ReturnType<typeof listEvents>>;
  let tasks: Task[] = [];
  let templates = [] as Awaited<ReturnType<typeof listTemplates>>;
  let loadError: string | null = null;
  try {
    ;[events, tasks, templates] = await Promise.all([
      listEvents(workspace.id, from, to),
      // Tasks are due before their event, so look back further for the list's "tasks done" counts.
      listTasksForCalendar(workspace.id, new Date(from.getFullYear(), from.getMonth() - 3, 1), to),
      listTemplates(workspace.id),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load events";
  }

  return (
    <Page
      title={calendar ? "Calendar" : "Events"}
      actions={
        <Link href="/events/new" className={buttonClass}>
          New event
        </Link>
      }
    >
      {templates.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm text-neutral-600">Plan from a template</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.slice(0, 3).map((t) => (
              <Link
                key={t.id}
                href={`/events/new?template=${t.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-neutral-200 p-4 hover:border-neutral-400"
              >
                <span className="flex justify-between font-semibold">
                  {t.name}
                  <span aria-hidden="true" className="font-normal text-neutral-500">
                    →
                  </span>
                </span>
                <span className="text-sm text-neutral-600">{templateSummary(t)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Tabs label="Events view" current={calendar ? "calendar" : "list"} items={VIEWS} />

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {calendar ? (
        <CalendarView
          events={events}
          tasks={tasks}
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
          todayKey={now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })}
        />
      ) : (
        <EventList events={events} tasks={tasks} />
      )}
    </Page>
  );
}
