import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";
import { CreateEventForm } from "@/components/events/create-event-form";

export default async function NewEventPage({ searchParams }: PageProps<"/events/new">) {
  const { workspace } = await requireMembership();
  const { template, date } = await searchParams;

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
        <p className="text-sm text-neutral-600">
          If the template has Google Form / Slides / Sheet / Doc links set under Templates
          → edit → <span className="font-medium text-black">Duplicate from Google link</span>,
          those files are Drive-copied into this event&apos;s folder.
        </p>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <CreateEventForm
        templates={templates}
        initialTemplateId={typeof template === "string" ? template : undefined}
        initialDate={typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined}
      />
    </div>
  );
}
