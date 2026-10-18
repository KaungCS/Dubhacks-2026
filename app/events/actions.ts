"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createEventFromTemplate, deleteEvent } from "@/lib/events";

export async function actionCreateEventFromTemplate(form: {
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
}) {
  const { user, workspace } = await requireMembership();
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

export async function actionDeleteEvent(fd: FormData) {
  const { workspace } = await requireMembership();
  await deleteEvent(workspace.id, String(fd.get("id")));
  redirect("/events");
}
