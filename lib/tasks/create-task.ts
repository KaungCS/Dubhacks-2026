import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendAssignmentEmail } from "@/lib/email";
import { pacificDateString } from "@/lib/email";
import { mapTaskRow, type TaskRow } from "./map";
import { replaceAssignees, replaceTags } from "./relations";
import {
  getMembershipLastEmailedOn,
  getUsersByIds,
  setMembershipLastEmailedOn,
} from "./users";
import type { NewTask, Task } from "./types";

/**
 * Contract used by Jun (templates) and the tasks UI.
 * Creates the task, assignees, tags; sends the once-a-day assignment email;
 * creates in-app notifications for assignees.
 */
export async function createTask(input: NewTask): Promise<Task> {
  const db = getDb();
  const assigneeIds = [...new Set((input.assigneeIds ?? []).filter(Boolean))];
  const taggedOfficerIds = [
    ...new Set((input.taggedOfficerIds ?? []).filter(Boolean)),
  ];

  const { data, error } = await db
    .from("task")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title,
      description: input.description ?? null,
      event_id: input.eventId ?? null,
      due_at: input.dueAt ? input.dueAt.toISOString() : null,
      status: input.status ?? "todo",
      difficulty: input.difficulty ?? "medium",
      is_prereq: input.isPrereq ?? false,
      created_by: input.createdBy,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`createTask insert failed: ${error.message}`);
  }

  const row = data as TaskRow;
  await replaceAssignees(row.id, assigneeIds);
  await replaceTags(row.id, taggedOfficerIds);

  const task = mapTaskRow(row, assigneeIds, taggedOfficerIds);

  await notifyAndMaybeEmailAssignees({
    workspaceId: input.workspaceId,
    task,
    assigneeIds,
    createdBy: input.createdBy,
  });

  return task;
}

async function notifyAndMaybeEmailAssignees(opts: {
  workspaceId: string;
  task: Task;
  assigneeIds: string[];
  createdBy: string;
}): Promise<void> {
  const { workspaceId, task, assigneeIds, createdBy } = opts;
  if (assigneeIds.length === 0) return;

  const today = pacificDateString();
  const users = await getUsersByIds(assigneeIds);
  const lastEmailed = await getMembershipLastEmailedOn(workspaceId, assigneeIds);

  for (const userId of assigneeIds) {
    try {
      await createNotification(userId, "task_assigned", {
        taskId: task.id,
        title: task.title,
        workspaceId,
      });
    } catch (err) {
      console.error("createNotification (task_assigned) failed", err);
    }

    // Spec: nobody is emailed about a task they created and assigned to themselves.
    if (userId === createdBy) continue;

    const profile = users.get(userId);
    if (!profile?.email) continue;

    if (lastEmailed.get(userId) === today) continue;

    try {
      await sendAssignmentEmail({
        to: profile.email,
        assigneeName: profile.name,
        taskTitle: task.title,
        dueAt: task.dueAt,
      });
      await setMembershipLastEmailedOn(workspaceId, userId, today);
      lastEmailed.set(userId, today);
    } catch (err) {
      console.error("assignment email failed", err);
    }
  }
}
