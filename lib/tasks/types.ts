/** Shared task types for Jackson's tasks module (used by Jun via createTask). */

export type TaskStatus = "todo" | "doing" | "done";
export type TaskDifficulty = "easy" | "medium" | "hard";

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  eventId: string | null;
  dueAt: string | null;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  isPrereq: boolean;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assigneeIds: string[];
  taggedOfficerIds: string[];
};

/** Input for the createTask contract. Matches what Jun's templates call. */
export type NewTask = {
  workspaceId: string;
  title: string;
  description?: string;
  eventId?: string | null;
  dueAt?: Date | null;
  status?: TaskStatus;
  difficulty?: TaskDifficulty;
  isPrereq?: boolean;
  createdBy: string;
  /** Officers responsible for the task. */
  assigneeIds?: string[];
  /** Officers emailed when a prereq task is marked done. */
  taggedOfficerIds?: string[];
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  eventId?: string | null;
  dueAt?: Date | null;
  status?: TaskStatus;
  difficulty?: TaskDifficulty;
  isPrereq?: boolean;
  assigneeIds?: string[];
  taggedOfficerIds?: string[];
};
