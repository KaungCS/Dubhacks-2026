import { getDb } from "@/lib/db";
import { mapTaskRow, type TaskRow } from "./map";
import { loadAssigneesByTaskIds, loadTagsByTaskIds } from "./relations";
import type { Task, TaskStatus } from "./types";

export type ListTasksOpts = {
  status?: TaskStatus;
  eventId?: string;
  assigneeId?: string;
};

export async function listTasks(
  workspaceId: string,
  opts: ListTasksOpts = {},
): Promise<Task[]> {
  const db = getDb();
  let query = db
    .from("task")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("due_at", { ascending: true });

  if (opts.status) {
    query = query.eq("status", opts.status);
  }
  if (opts.eventId) {
    query = query.eq("event_id", opts.eventId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`listTasks failed: ${error.message}`);
  }

  let rows = (data ?? []) as TaskRow[];
  const ids = rows.map((r) => r.id);
  const [assignees, tags] = await Promise.all([
    loadAssigneesByTaskIds(ids),
    loadTagsByTaskIds(ids),
  ]);

  let tasks = rows.map((row) =>
    mapTaskRow(row, assignees.get(row.id) ?? [], tags.get(row.id) ?? []),
  );

  if (opts.assigneeId) {
    tasks = tasks.filter((t) => t.assigneeIds.includes(opts.assigneeId!));
  }

  return tasks;
}

/** Tasks created after `since` (for "new since last visit"). */
export async function listTasksSince(
  workspaceId: string,
  since: Date,
): Promise<Task[]> {
  const db = getDb();
  const { data, error } = await db
    .from("task")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gt("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`listTasksSince failed: ${error.message}`);
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
