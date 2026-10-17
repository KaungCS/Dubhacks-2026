import { getDb } from "@/lib/db";
import { mapTaskRow, type TaskRow } from "./map";
import { loadAssigneesByTaskIds, loadTagsByTaskIds } from "./relations";
import type { Task } from "./types";

/**
 * Contract used by Jun's calendar: tasks with due_at in [from, to].
 */
export async function listTasksForCalendar(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<Task[]> {
  const db = getDb();
  const { data, error } = await db
    .from("task")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("due_at", "is", null)
    .gte("due_at", from.toISOString())
    .lte("due_at", to.toISOString())
    .order("due_at", { ascending: true });

  if (error) {
    throw new Error(`listTasksForCalendar failed: ${error.message}`);
  }

  const rows = (data ?? []) as TaskRow[];
  const ids = rows.map((r) => r.id);
  const [assignees, tags] = await Promise.all([
    loadAssigneesByTaskIds(ids),
    loadTagsByTaskIds(ids),
  ]);

  return rows.map((row) =>
    mapTaskRow(row, assignees.get(row.id) ?? [], tags.get(row.id) ?? []),
  );
}
