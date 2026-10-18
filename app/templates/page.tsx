import Link from "next/link";
import { Page, buttonClass } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";

export default async function TemplatesPage() {
  const { workspace } = await requireMembership();

  let templates = [] as Awaited<ReturnType<typeof listTemplates>>;
  let loadError: string | null = null;
  try {
    templates = await listTemplates(workspace.id);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load templates";
  }

  return (
    <Page
      title="Templates"
      actions={
        <Link href="/templates/new" className={buttonClass}>
          New template
        </Link>
      }
    >
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {templates.length === 0 && !loadError ? (
        <p className="text-sm text-neutral-500">No templates yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border border-neutral-200">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/templates/${template.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium text-black">{template.name}</span>
                <span className="text-neutral-500">
                  {template.task_items.length} tasks
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
