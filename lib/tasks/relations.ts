import { getDb } from "@/lib/db";
import type { TaskAssigneeRow, TaskTagRow } from "./map";

export async function replaceAssignees(
  taskId: string,
  assigneeIds: string[],
): Promise<void> {
  const db = getDb();
  const { error: delError } = await db
    .from("task_assignee")
    .delete()
    .eq("task_id", taskId);
  if (delError) {
    throw new Error(`replaceAssignees delete failed: ${delError.message}`);
  }

  const unique = [...new Set(assigneeIds.filter(Boolean))];
  if (unique.length === 0) return;

  const { error } = await db.from("task_assignee").insert(
    unique.map((user_id) => ({ task_id: taskId, user_id })),
  );
  if (error) {
    throw new Error(`replaceAssignees insert failed: ${error.message}`);
  }
}

export async function replaceTags(
  taskId: string,
  taggedOfficerIds: string[],
): Promise<void> {
  const db = getDb();
  const { error: delError } = await db
    .from("task_tag")
    .delete()
    .eq("task_id", taskId);
  if (delError) {
    throw new Error(`replaceTags delete failed: ${delError.message}`);
  }

  const unique = [...new Set(taggedOfficerIds.filter(Boolean))];
  if (unique.length === 0) return;

  const { error } = await db.from("task_tag").insert(
    unique.map((user_id) => ({ task_id: taskId, user_id })),
  );
  if (error) {
    throw new Error(`replaceTags insert failed: ${error.message}`);
  }
}

export async function loadAssigneesByTaskIds(
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;

  const db = getDb();
  const { data, error } = await db
    .from("task_assignee")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  if (error) {
    throw new Error(`loadAssigneesByTaskIds failed: ${error.message}`);
  }

  for (const row of (data ?? []) as TaskAssigneeRow[]) {
    const list = map.get(row.task_id) ?? [];
    list.push(row.user_id);
    map.set(row.task_id, list);
  }
  return map;
}

export async function loadTagsByTaskIds(
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;

  const db = getDb();
  const { data, error } = await db
    .from("task_tag")
    .select("task_id, user_id")
    .in("task_id", taskIds);

  if (error) {
    throw new Error(`loadTagsByTaskIds failed: ${error.message}`);
  }

  for (const row of (data ?? []) as TaskTagRow[]) {
    const list = map.get(row.task_id) ?? [];
    list.push(row.user_id);
    map.set(row.task_id, list);
  }
  return map;
}
