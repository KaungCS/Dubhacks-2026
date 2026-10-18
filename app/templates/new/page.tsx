import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { TemplateEditor } from "@/components/events/template-editor";
import { actionCreateTemplate } from "../actions";

export default async function NewTemplatePage() {
  await requireMembership();

  async function save(values: {
    name: string;
    taskItems: Parameters<typeof actionCreateTemplate>[0]["taskItems"];
    fileTypes: Parameters<typeof actionCreateTemplate>[0]["fileTypes"];
  }) {
    "use server";
    await actionCreateTemplate(values);
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl space-y-2">
        <p className="text-sm text-neutral-500">
          <Link href="/templates" className="underline-offset-2 hover:underline">
            Templates
          </Link>
          {" / New"}
        </p>
        <h1 className="text-2xl font-semibold">New template</h1>
      </div>

      <TemplateEditor
        initial={{
          name: "",
          taskItems: [{ title: "", days_before: 7, role: "" }],
          fileTypes: ["folder", "rsvp_form", "signin_sheet"],
        }}
        submitLabel="Create template"
        onSubmit={save}
      />
    </div>
  );
}
