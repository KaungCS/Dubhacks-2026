import { requireMembership } from "@/lib/auth";
import { getEvent } from "@/lib/events";
import { getEventAttendance } from "@/lib/attendance";
import type { Task } from "@/lib/db";
import { listTasksForCalendar } from "@/lib/tasks";
import { EventDetail } from "@/components/events/event-detail";

type Params = Promise<{ id: string }>;

export default async function EventDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { workspace } = await requireMembership();

  let event;
  try {
    event = await getEvent(id);
  } catch (err) {
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

  let attendance: { rsvps: number; attended: number } | null = null;
  try {
    attendance = await getEventAttendance(event.id);
  } catch {
    attendance = null;
  }

  let tasks: Task[] = [];
  try {
    const from = new Date(event.starts_at);
    from.setUTCMonth(from.getUTCMonth() - 3);
    const to = new Date(event.ends_at ?? event.starts_at);
    to.setUTCMonth(to.getUTCMonth() + 1);
    const rows = await listTasksForCalendar(workspace.id, from, to);
    tasks = rows.filter((row) => row.event_id === event.id);
  } catch {
    tasks = [];
  }

  return <EventDetail event={event} attendance={attendance} tasks={tasks} />;
}
