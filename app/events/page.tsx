import Link from "next/link";
import { Page, buttonClass } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { listEvents } from "@/lib/events";
import { EventList } from "@/components/events/event-list";

export default async function EventsPage() {
  const { workspace } = await requireMembership();

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  let events = [] as Awaited<ReturnType<typeof listEvents>>;
  let loadError: string | null = null;
  try {
    events = await listEvents(workspace.id, from, to);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load events";
  }

  return (
    <Page
      title="Events"
      actions={
        <div className="flex gap-2">
          <Link href="/calendar" className={buttonClass}>
            Calendar
          </Link>
          <Link href="/events/new" className={buttonClass}>
            New event
          </Link>
        </div>
      }
    >
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <EventList events={events} />
    </Page>
  );
}
