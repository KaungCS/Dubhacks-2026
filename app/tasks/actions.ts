"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireMembership, requireUser } from "@/lib/auth";
import {
  createTask,
  getTask,
  updateTask,
  type TaskDifficulty,
  type TaskStatus,
} from "@/lib/tasks";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications";
import type { TaskFormValues } from "@/components/tasks/task-form";

const LAST_VISIT_COOKIE = "clubops_tasks_last_visit";

export async function actionCreateTask(form: {
  workspaceId: string;
  values: TaskFormValues;
}) {
  const { user } = await requireMembership(form.workspaceId);
  const dueAt = form.values.dueAt ? new Date(form.values.dueAt) : null;

  const task = await createTask({
    workspaceId: form.workspaceId,
    title: form.values.title,
    description: form.values.description || undefined,
    dueAt,
    status: form.values.status,
    difficulty: form.values.difficulty,
    isPrereq: form.values.isPrereq,
    createdBy: user.id,
    assigneeIds: form.values.assigneeIds,
    taggedOfficerIds: form.values.isPrereq
      ? form.values.taggedOfficerIds
      : [],
  });

  redirect(`/tasks/${task.id}?workspaceId=${form.workspaceId}`);
}

export async function actionUpdateTask(form: {
  workspaceId: string;
  taskId: string;
  values: TaskFormValues;
}) {
  await requireMembership(form.workspaceId);
  const existing = await getTask(form.taskId);
  if (existing.workspaceId !== form.workspaceId) {
    throw new Error("Task does not belong to this workspace");
  }

  const dueAt = form.values.dueAt ? new Date(form.values.dueAt) : null;

  await updateTask(form.taskId, {
    title: form.values.title,
    description: form.values.description || null,
    dueAt,
    status: form.values.status as TaskStatus,
    difficulty: form.values.difficulty as TaskDifficulty,
    isPrereq: form.values.isPrereq,
    assigneeIds: form.values.assigneeIds,
    taggedOfficerIds: form.values.isPrereq
      ? form.values.taggedOfficerIds
      : [],
  });

  redirect(`/tasks/${form.taskId}?workspaceId=${form.workspaceId}`);
}

export async function actionSetTaskStatus(form: {
  workspaceId: string;
  taskId: string;
  status: TaskStatus;
}) {
  await requireMembership(form.workspaceId);
  const existing = await getTask(form.taskId);
  if (existing.workspaceId !== form.workspaceId) {
    throw new Error("Task does not belong to this workspace");
  }
  await updateTask(form.taskId, { status: form.status });
  redirect(`/tasks/${form.taskId}?workspaceId=${form.workspaceId}`);
}

export async function actionListNotifications(
  userId: string,
): Promise<Notification[]> {
  const user = await requireUser();
  if (user.id !== userId) {
    throw new Error("Cannot list another user's notifications");
  }
  return listNotifications(userId);
}

export async function actionMarkNotificationRead(
  notificationId: string,
): Promise<void> {
  await requireUser();
  await markNotificationRead(notificationId);
}

export async function actionMarkAllNotificationsRead(
  userId: string,
): Promise<void> {
  const user = await requireUser();
  if (user.id !== userId) {
    throw new Error("Cannot mark another user's notifications");
  }
  await markAllNotificationsRead(userId);
}

/** Refresh last-visit cookie — call from a client effect, not RSC render. */
export async function actionTouchLastVisit(): Promise<void> {
  const jar = await cookies();
  jar.set(LAST_VISIT_COOKIE, new Date().toISOString(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
