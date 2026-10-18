"use client";

import { TaskForm, type TaskFormValues } from "./task-form";
import type { OfficerProfile } from "@/lib/tasks";
import { actionCreateTask } from "@/app/tasks/actions";

type Props = {
  workspaceId: string;
  officers: OfficerProfile[];
};

export function CreateTaskForm({ workspaceId, officers }: Props) {
  async function onSubmit(values: TaskFormValues) {
    await actionCreateTask({ workspaceId, values });
  }

  return (
    <TaskForm
      officers={officers}
      submitLabel="Create task"
      onSubmit={onSubmit}
    />
  );
}
