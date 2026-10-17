import type { Task, TaskDifficulty, TaskStatus } from "./types";

/** Raw task row shape expected from Supabase (Kaung schema). */
export type TaskRow = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  due_at: string | null;
  status: string;
  difficulty: string | null;
  is_prereq: boolean | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TaskAssigneeRow = {
  task_id: string;
  user_id: string;
};

export type TaskTagRow = {
  task_id: string;
  user_id: string;
};

const STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const DIFFICULTIES: TaskDifficulty[] = ["easy", "medium", "hard"];

function asStatus(value: string | null | undefined): TaskStatus {
  if (value && STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }
  return "todo";
}

function asDifficulty(value: string | null | undefined): TaskDifficulty {
  if (value && DIFFICULTIES.includes(value as TaskDifficulty)) {
    return value as TaskDifficulty;
  }
  return "medium";
}

export function mapTaskRow(
  row: TaskRow,
  assigneeIds: string[] = [],
  taggedOfficerIds: string[] = [],
): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    eventId: row.event_id,
    dueAt: row.due_at,
    status: asStatus(row.status),
    difficulty: asDifficulty(row.difficulty),
    isPrereq: Boolean(row.is_prereq),
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeIds,
    taggedOfficerIds,
  };
}
