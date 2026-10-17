import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";
import { CreateEventForm } from "@/components/events/create-event-form";

type SearchParams = Promise<{ workspaceId?: string }>;

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">New event</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  let templates = [] as Awaited<ReturnType<typeof listTemplates>>;
  let loadError: string | null = null;
  try {
    templates = await listTemplates(workspaceId);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load templates";
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link
            href={`/events?workspaceId=${workspaceId}`}
            className="underline-offset-2 hover:underline"
          >
            Events
          </Link>
          {" / New"}
        </p>
        <h1 className="text-2xl font-medium text-black">Create event from template</h1>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <CreateEventForm workspaceId={workspaceId} templates={templates} />
    </main>
  );
}
