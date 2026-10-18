"use client";

import {
  TaskForm,
  taskToFormValues,
  type TaskFormValues,
} from "./task-form";
import type { OfficerProfile, Task } from "@/lib/tasks";
import { actionUpdateTask } from "@/app/tasks/actions";

type Props = {
  workspaceId: string;
  task: Task;
  officers: OfficerProfile[];
};

export function EditTaskForm({ workspaceId, task, officers }: Props) {
  async function onSubmit(values: TaskFormValues) {
    await actionUpdateTask({ workspaceId, taskId: task.id, values });
  }

  return (
    <TaskForm
      officers={officers}
      initial={taskToFormValues(task)}
      submitLabel="Save changes"
      onSubmit={onSubmit}
    />
  );
}
