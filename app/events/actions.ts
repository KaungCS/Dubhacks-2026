"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createEventFromTemplate } from "@/lib/events";

export async function actionCreateEventFromTemplate(form: {
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
}) {
  const { user, workspace } = await requirePermission("calendar:create");
  const event = await createEventFromTemplate({
    workspaceId: workspace.id,
    templateId: form.templateId,
    title: form.title,
    startsAt: new Date(form.startsAt),
    endsAt: new Date(form.endsAt),
    location: form.location || undefined,
    createdByUserId: user.id,
  });
  redirect(`/events/${event.id}`);
}
