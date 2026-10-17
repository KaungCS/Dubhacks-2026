<<<<<<< HEAD
import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jun owns this folder.
export default async function TemplatesPage() {
  await requireMembership()
  return (
    <Page title="Templates">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
=======
import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";

type SearchParams = Promise<{ workspaceId?: string }>;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Templates</h1>
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
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-black">Templates</h1>
        <Link
          href={`/templates/new?workspaceId=${workspaceId}`}
          className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
        >
          New template
        </Link>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {templates.length === 0 && !loadError ? (
        <p className="text-sm text-neutral-500">No templates yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border border-neutral-200">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}?workspaceId=${workspaceId}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium text-black">{template.name}</span>
                <span className="text-neutral-500">
                  {template.taskItems.length} tasks
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
>>>>>>> de0b907 (feat(jun): calendar, events, and templates module)
}
