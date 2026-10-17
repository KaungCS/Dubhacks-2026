import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendPrereqDoneEmail } from "@/lib/email";
import { getTask } from "./get-task";
import { replaceAssignees, replaceTags } from "./relations";
import { getUsersByIds } from "./users";
import type { Task, UpdateTaskInput } from "./types";

/**
 * Update task fields. When status flips to done on a prereq task,
 * always email tagged officers (bypasses daily limit) and notify them in-app.
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const before = await getTask(taskId);
  const db = getDb();

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.eventId !== undefined) patch.event_id = input.eventId;
  if (input.dueAt !== undefined) {
    patch.due_at = input.dueAt ? input.dueAt.toISOString() : null;
  }
  if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
  if (input.isPrereq !== undefined) patch.is_prereq = input.isPrereq;

  const becomingDone =
    input.status === "done" && before.status !== "done";
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completed_at = becomingDone
      ? new Date().toISOString()
      : input.status === "done"
        ? before.completedAt
        : null;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from("task").update(patch).eq("id", taskId);
    if (error) {
      throw new Error(`updateTask failed: ${error.message}`);
    }
  }

  if (input.assigneeIds !== undefined) {
    await replaceAssignees(taskId, input.assigneeIds);
  }
  if (input.taggedOfficerIds !== undefined) {
    await replaceTags(taskId, input.taggedOfficerIds);
  }

  const after = await getTask(taskId);

  if (becomingDone && after.isPrereq && after.taggedOfficerIds.length > 0) {
    await notifyPrereqDone(after);
  }

  // New assignees on edit get in-app notify only (email rule is create-time once/day).
  if (input.assigneeIds !== undefined) {
    const added = input.assigneeIds.filter(
      (id) => !before.assigneeIds.includes(id),
    );
    for (const userId of added) {
      try {
        await createNotification(userId, "task_assigned", {
          taskId: after.id,
          title: after.title,
          workspaceId: after.workspaceId,
        });
      } catch (err) {
        console.error("createNotification (task_assigned on update) failed", err);
      }
    }
  }

  return after;
}

async function notifyPrereqDone(task: Task): Promise<void> {
  const users = await getUsersByIds(task.taggedOfficerIds);

  for (const userId of task.taggedOfficerIds) {
    try {
      await createNotification(userId, "prereq_done", {
        taskId: task.id,
        title: task.title,
        workspaceId: task.workspaceId,
      });
    } catch (err) {
      console.error("createNotification (prereq_done) failed", err);
    }

    const profile = users.get(userId);
    if (!profile?.email) continue;

    try {
      await sendPrereqDoneEmail({
        to: profile.email,
        officerName: profile.name,
        taskTitle: task.title,
      });
    } catch (err) {
      console.error("prereq-done email failed", err);
    }
  }
}
