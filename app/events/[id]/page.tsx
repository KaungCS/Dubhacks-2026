import { requireMembership } from "@/lib/auth";
import { getEvent } from "@/lib/events";
import { getEventAttendance } from "@/lib/attendance";
import type { Task } from "@/lib/db";
import { listTasksForCalendar } from "@/lib/tasks";
import { EventDetail } from "@/components/events/event-detail";

type Params = Promise<{ id: string }>;

export default async function EventDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  // The event read doesn't depend on the session, so it runs alongside the membership check.
  const [{ workspace }, found] = await Promise.all([
    requireMembership(),
    getEvent(id).then(
      (event) => ({ event, error: null }),
      (error: unknown) => ({ event: null, error }),
    ),
  ]);

  const { event, error: err } = found;
  if (!event) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Event</h1>
        <p className="text-sm text-red-600">
          {err instanceof Error ? err.message : "Event not found"}
        </p>
      </div>
    );
  }

  if (event.workspace_id !== workspace.id) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Event</h1>
        <p className="text-sm text-red-600">Event not found in this club</p>
      </div>
    );
  }

  // Attendance (which may refresh from Google) and the event's tasks load together.
  const from = new Date(event.starts_at);
  from.setUTCMonth(from.getUTCMonth() - 3);
  const to = new Date(event.ends_at ?? event.starts_at);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const [attendance, tasks] = await Promise.all([
    getEventAttendance(event.id).catch(() => null),
    listTasksForCalendar(workspace.id, from, to).then(
      (rows) => rows.filter((row) => row.event_id === event.id),
      (): Task[] => [],
    ),
  ]);

  return <EventDetail event={event} attendance={attendance} tasks={tasks} />;
}
