import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { getTemplate } from "@/lib/events";
import { TemplateEditor } from "@/components/events/template-editor";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { actionDeleteTemplate, actionUpdateTemplate } from "../actions";

type Params = Promise<{ id: string }>;

export default async function EditTemplatePage({ params }: { params: Params }) {
  const { id } = await params;
  const { workspace } = await requireMembership();

  let template;
  try {
    template = await getTemplate(id);
  } catch (err) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Template</h1>
        <p className="text-sm text-red-600">
          {err instanceof Error ? err.message : "Template not found"}
        </p>
      </div>
    );
  }

  if (template.workspace_id !== workspace.id) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Template</h1>
        <p className="text-sm text-red-600">Template not found in this club</p>
      </div>
    );
  }

  async function save(values: {
    name: string;
    taskItems: Parameters<typeof actionUpdateTemplate>[0]["taskItems"];
    fileTypeConfigs: Parameters<typeof actionUpdateTemplate>[0]["fileTypeConfigs"];
  }) {
    "use server";
    await actionUpdateTemplate({ templateId: id, ...values });
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl space-y-2">
        <p className="text-sm text-neutral-500">
          <Link href="/templates" className="underline-offset-2 hover:underline">
            Templates
          </Link>
          {" / "}
          {template.name}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Edit template</h1>
          <form action={actionDeleteTemplate}>
            <input type="hidden" name="id" value={id} />
            <ConfirmButton message={`Delete "${template.name}"? Events made from it stay.`}>Delete</ConfirmButton>
          </form>
        </div>
        <p className="text-sm text-neutral-600">
          Scroll to <span className="font-medium text-black">Duplicate from Google link</span>{" "}
          to paste Form / Slides / Sheet URLs. Those files are copied into each
          new event&apos;s Drive folder.
        </p>
      </div>

      <TemplateEditor
        initial={{
          name: template.name,
          taskItems: template.task_items,
          fileTypeConfigs: template.file_type_configs,
        }}
        submitLabel="Save template"
        onSubmit={save}
      />
    </div>
  );
}
