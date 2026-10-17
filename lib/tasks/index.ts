import type { TablesInsert, Task } from '@/lib/db'

// Stub from the scaffold. Jackson owns this file and replaces it; keep the signatures (TEAM_PLAN.md "Contracts").

export type NewTask = TablesInsert<'tasks'> & { assignee_ids?: string[]; tag_ids?: string[] }

// Creates the task, its assignees and tags, and sends the once-a-day assignment email.
export async function createTask(input: NewTask): Promise<Task> {
  const { assignee_ids, tag_ids, ...task } = input
  void assignee_ids
  void tag_ids
  return {
    id: crypto.randomUUID(),
    description: null,
    event_id: null,
    due_at: null,
    status: 'todo',
    difficulty: 'medium',
    is_prereq: false,
    completed_at: null,
    created_by: null,
    created_at: new Date().toISOString(),
    ...task,
  }
}

export async function listTasksForCalendar(workspaceId: string, from: Date, to: Date): Promise<Task[]> {
  void [workspaceId, from, to]
  return []
}
