import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { TemplateEditor } from "@/components/events/template-editor";
import { actionCreateTemplate } from "../actions";

export default async function NewTemplatePage() {
  await requireMembership();

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
        <p className="text-sm text-neutral-600">
          In the <span className="font-medium text-black">Duplicate from Google link</span>{" "}
          section, paste Form / Slides / Sheet links. Events created from this
          template will Drive-copy those files into the event folder.
        </p>
      </div>

      <TemplateEditor
        initial={{
          name: "",
          taskItems: [{ title: "", days_before: 7, role: "" }],
          fileTypeConfigs: [
            { key: "folder", sourceFileId: null, sourceUrl: null },
            { key: "rsvp_form", sourceFileId: null, sourceUrl: null },
            { key: "slides", sourceFileId: null, sourceUrl: null },
            { key: "signin_sheet", sourceFileId: null, sourceUrl: null },
          ],
        }}
        submitLabel="Create template"
        onSubmit={save}
      />
    </div>
  );
}
