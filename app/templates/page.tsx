import Link from "next/link";
import { Page, buttonClass } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { listTemplates } from "@/lib/events";
import { DUPLICATABLE_FILE_TYPES, fileTypeLabel, sourceForFileType } from "@/lib/events/types";

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
      <p className="text-sm text-neutral-600">
        Open a template (or create one) and use{" "}
        <span className="font-medium text-black">Duplicate from Google link</span>{" "}
        to paste Form / Slides / Sheet / Doc links. Create Event then Drive-copies those
        files.
      </p>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {templates.length === 0 && !loadError ? (
        <p className="text-sm text-neutral-500">No templates yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 border border-neutral-200">
          {templates.map((template) => {
            const googleSources = DUPLICATABLE_FILE_TYPES.filter((key) =>
              sourceForFileType(template.file_type_configs, key),
            );
            return (
              <li key={template.id}>
                <Link
                  href={`/templates/${template.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-neutral-50"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-black">{template.name}</span>
                    {googleSources.length > 0 ? (
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        Google link set for{" "}
                        {googleSources.map(fileTypeLabel).join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-neutral-500">
                    {template.task_items.length} tasks
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
