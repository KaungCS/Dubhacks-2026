import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { TemplateEditor } from "@/components/events/template-editor";
import { actionCreateTemplate } from "../actions";

export default async function NewTemplatePage() {
  const { membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  async function save(values: {
    name: string;
    taskItems: Parameters<typeof actionCreateTemplate>[0]["taskItems"];
    fileTypeConfigs: Parameters<typeof actionCreateTemplate>[0]["fileTypeConfigs"];
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
        {isAdmin ? (
          <p className="text-sm text-neutral-600">
            Optionally paste Google file links for Slides, RSVP form, or sign-in
            sheet — events created from this template will copy those files into
            the event Drive folder.
          </p>
        ) : null}
      </div>

      <TemplateEditor
        initial={{
          name: "",
          taskItems: [{ title: "", days_before: 7, role: "" }],
          fileTypeConfigs: [
            { key: "folder", sourceFileId: null, sourceUrl: null },
            { key: "rsvp_form", sourceFileId: null, sourceUrl: null },
            { key: "signin_sheet", sourceFileId: null, sourceUrl: null },
          ],
        }}
        canSetSources={isAdmin}
        submitLabel="Create template"
        onSubmit={save}
      />
    </div>
  );
}
