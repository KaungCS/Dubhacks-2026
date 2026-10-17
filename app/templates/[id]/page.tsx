import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { getTemplate } from "@/lib/events";
import { TemplateEditor } from "@/components/events/template-editor";
import { actionUpdateTemplate } from "../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ workspaceId?: string }>;

export default async function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { workspaceId: workspaceParam } = await searchParams;

  let template;
  try {
    template = await getTemplate(id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">Template</h1>
        <p className="mt-2 text-sm text-red-600">
          {err instanceof Error ? err.message : "Template not found"}
        </p>
      </main>
    );
  }

  const workspaceId = workspaceParam || template.workspaceId;
  await requireMembership(workspaceId);

  async function save(values: {
    name: string;
    taskItems: Parameters<typeof actionUpdateTemplate>[0]["taskItems"];
    fileTypes: Parameters<typeof actionUpdateTemplate>[0]["fileTypes"];
  }) {
    "use server";
    await actionUpdateTemplate({
      workspaceId,
      templateId: id,
      ...values,
    });
  }

  return (
    <main className="space-y-6 px-6 py-10">
      <div className="mx-auto max-w-xl space-y-2">
        <p className="text-sm text-neutral-500">
          <Link
            href={`/templates?workspaceId=${workspaceId}`}
            className="underline-offset-2 hover:underline"
          >
            Templates
          </Link>
          {" / "}
          {template.name}
        </p>
        <h1 className="text-2xl font-medium text-black">Edit template</h1>
      </div>

      <TemplateEditor
        initial={{
          name: template.name,
          taskItems: template.taskItems,
          fileTypes: template.fileTypes,
        }}
        submitLabel="Save template"
        onSubmit={save}
      />
    </main>
  );
}
