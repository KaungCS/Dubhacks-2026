"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createEventFromTemplate } from "@/lib/events";

export async function actionCreateEventFromTemplate(form: {
  workspaceId: string;
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
}) {
  const { user } = await requireMembership(form.workspaceId);
  const event = await createEventFromTemplate({
    workspaceId: form.workspaceId,
    templateId: form.templateId,
    title: form.title,
    startsAt: new Date(form.startsAt),
    endsAt: new Date(form.endsAt),
    location: form.location || undefined,
    createdByUserId: user.id,
  });
  redirect(`/events/${event.id}?workspaceId=${form.workspaceId}`);
}
