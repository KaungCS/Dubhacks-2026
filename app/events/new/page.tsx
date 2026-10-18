import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";
import { CreateEventForm } from "@/components/events/create-event-form";

export default async function NewEventPage() {
  const { workspace } = await requireMembership();

  let templates = [] as Awaited<ReturnType<typeof listTemplates>>;
  let loadError: string | null = null;
  try {
    templates = await listTemplates(workspace.id);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load templates";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link href="/events" className="underline-offset-2 hover:underline">
            Events
          </Link>
          {" / New"}
        </p>
        <h1 className="text-2xl font-semibold">Create event from template</h1>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <CreateEventForm templates={templates} />
    </div>
  );
}
