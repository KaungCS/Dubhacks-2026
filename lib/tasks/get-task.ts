import { getDb } from "@/lib/db";
import { mapTaskRow, type TaskRow } from "./map";
import { loadAssigneesByTaskIds, loadTagsByTaskIds } from "./relations";
import type { Task } from "./types";

export async function getTask(taskId: string): Promise<Task> {
  const db = getDb();
  const { data, error } = await db
    .from("task")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(`getTask failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const row = data as TaskRow;
  const [assignees, tags] = await Promise.all([
    loadAssigneesByTaskIds([row.id]),
    loadTagsByTaskIds([row.id]),
  ]);

  return mapTaskRow(
    row,
    assignees.get(row.id) ?? [],
    tags.get(row.id) ?? [],
  );
}
