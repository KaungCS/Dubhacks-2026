<<<<<<< HEAD
import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jun owns this folder.
export default async function EventsPage() {
  await requireMembership()
  return (
    <Page title="Events">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
=======
import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listEvents } from "@/lib/events";
import { EventList } from "@/components/events/event-list";

type SearchParams = Promise<{ workspaceId?: string }>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Events</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  let events = [] as Awaited<ReturnType<typeof listEvents>>;
  let loadError: string | null = null;
  try {
    events = await listEvents(workspaceId, from, to);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load events";
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-black">Events</h1>
        <div className="flex gap-2">
          <Link
            href={`/calendar?workspaceId=${workspaceId}`}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
          >
            Calendar
          </Link>
          <Link
            href={`/events/new?workspaceId=${workspaceId}`}
            className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
          >
            New event
          </Link>
        </div>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <EventList workspaceId={workspaceId} events={events} />
    </main>
  );
>>>>>>> de0b907 (feat(jun): calendar, events, and templates module)
}
