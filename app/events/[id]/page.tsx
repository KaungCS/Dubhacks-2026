import { requireMembership } from "@/lib/auth";
import { getEvent } from "@/lib/events";
import { getEventAttendance } from "@/lib/attendance";
import { listTasksForCalendar } from "@/lib/tasks";
import { EventDetail } from "@/components/events/event-detail";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ workspaceId?: string }>;

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { workspaceId: workspaceParam } = await searchParams;

  let event;
  try {
    event = await getEvent(id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Event</h1>
        <p className="mt-2 text-sm text-red-600">
          {err instanceof Error ? err.message : "Event not found"}
        </p>
      </main>
    );
  }

  const workspaceId = workspaceParam || event.workspaceId;
  await requireMembership(workspaceId);

  let attendance: { rsvps: number; attended: number } | null = null;
  try {
    attendance = await getEventAttendance(event.id);
  } catch {
    attendance = null;
  }

  let tasks: Array<{ id: string; title: string; dueAt: string; status?: string }> = [];
  try {
    const from = new Date(event.startsAt);
    from.setUTCMonth(from.getUTCMonth() - 3);
    const to = new Date(event.endsAt);
    to.setUTCMonth(to.getUTCMonth() + 1);
    const rows = await listTasksForCalendar(workspaceId, from, to);
    tasks = (rows as unknown as Record<string, unknown>[])
      .filter((row) => String(row.eventId ?? row.event_id ?? "") === event.id)
      .map((row) => ({
        id: String(row.id),
        title: String(row.title ?? ""),
        dueAt: String(row.dueAt ?? row.due_at ?? ""),
        status: row.status ? String(row.status) : undefined,
      }));
  } catch {
    tasks = [];
  }

  return (
    <main className="px-6 py-10">
      <EventDetail
        event={event}
        attendance={attendance}
        tasks={tasks}
        workspaceId={workspaceId}
      />
    </main>
  );
}
