"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createTemplate, updateTemplate } from "@/lib/events";
import type { FileTypeKey, TemplateTaskItem } from "@/lib/events/types";

export async function actionCreateTemplate(form: {
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypes: FileTypeKey[];
}) {
  const { workspace } = await requireMembership();
  const template = await createTemplate({
    workspaceId: workspace.id,
    name: form.name,
    taskItems: form.taskItems,
    fileTypes: form.fileTypes,
  });
  redirect(`/templates/${template.id}`);
}

export async function actionUpdateTemplate(form: {
  templateId: string;
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypes: FileTypeKey[];
}) {
  await requireMembership();
  await updateTemplate(form.templateId, {
    name: form.name,
    taskItems: form.taskItems,
    fileTypes: form.fileTypes,
  });
  redirect(`/templates/${form.templateId}`);
}
