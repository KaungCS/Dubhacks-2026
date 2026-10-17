import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { TemplateEditor } from "@/components/events/template-editor";
import { actionCreateTemplate } from "../actions";

type SearchParams = Promise<{ workspaceId?: string }>;

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">New template</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  async function save(values: {
    name: string;
    taskItems: Parameters<typeof actionCreateTemplate>[0]["taskItems"];
    fileTypes: Parameters<typeof actionCreateTemplate>[0]["fileTypes"];
  }) {
    "use server";
    await actionCreateTemplate({ workspaceId: workspaceId!, ...values });
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
          {" / New"}
        </p>
        <h1 className="text-2xl font-medium text-black">New template</h1>
      </div>

      <TemplateEditor
        initial={{
          name: "",
          taskItems: [{ title: "", daysBefore: 7, role: "" }],
          fileTypes: {
            folder: true,
            rsvpForm: true,
            slides: false,
            signInSheet: true,
          },
        }}
        submitLabel="Create template"
        onSubmit={save}
      />
    </main>
  );
}
