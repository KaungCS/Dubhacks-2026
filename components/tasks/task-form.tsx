"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OfficerProfile, Task, TaskDifficulty, TaskStatus } from "@/lib/tasks";

export type TaskFormValues = {
  title: string;
  description: string;
  dueAt: string;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  isPrereq: boolean;
  assigneeIds: string[];
  taggedOfficerIds: string[];
};

type Props = {
  officers: OfficerProfile[];
  initial?: Partial<TaskFormValues>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    dueAt: toLocalInput(task.dueAt),
    status: task.status,
    difficulty: task.difficulty,
    isPrereq: task.isPrereq,
    assigneeIds: task.assigneeIds,
    taggedOfficerIds: task.taggedOfficerIds,
  };
}

const DEFAULTS: TaskFormValues = {
  title: "",
  description: "",
  dueAt: "",
  status: "todo",
  difficulty: "medium",
  isPrereq: false,
  assigneeIds: [],
  taggedOfficerIds: [],
};

export function TaskForm({ officers, initial, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<TaskFormValues>({
    ...DEFAULTS,
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleId(
    field: "assigneeIds" | "taggedOfficerIds",
    userId: string,
  ) {
    setValues((v) => {
      const set = new Set(v[field]);
      if (set.has(userId)) set.delete(userId);
      else set.add(userId);
      return { ...v, [field]: [...set] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        description: values.description.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="title">
          Title
        </label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          required
          placeholder="jackson: book room"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) =>
            setValues((v) => ({ ...v, description: e.target.value }))
          }
          rows={3}
          className="w-full rounded-2xl border border-black bg-white px-4 py-2 text-sm text-black"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm text-neutral-700" htmlFor="due">
            Due
          </label>
          <Input
            id="due"
            type="datetime-local"
            value={values.dueAt}
            onChange={(e) =>
              setValues((v) => ({ ...v, dueAt: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-neutral-700" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={values.status}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                status: e.target.value as TaskStatus,
              }))
            }
            className="w-full rounded-full border border-black bg-white px-4 py-2 text-sm text-black"
          >
            <option value="todo">To do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm text-neutral-700" htmlFor="difficulty">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={values.difficulty}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                difficulty: e.target.value as TaskDifficulty,
              }))
            }
            className="w-full rounded-full border border-black bg-white px-4 py-2 text-sm text-black"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={values.isPrereq}
            onChange={(e) =>
              setValues((v) => ({ ...v, isPrereq: e.target.checked }))
            }
            className="h-4 w-4"
          />
          Prerequisite task
        </label>
      </div>

      <OfficerMultiSelect
        label="Assignees"
        officers={officers}
        selected={values.assigneeIds}
        onToggle={(id) => toggleId("assigneeIds", id)}
      />

      {values.isPrereq ? (
        <OfficerMultiSelect
          label="Tagged officers (emailed when prereq is done)"
          officers={officers}
          selected={values.taggedOfficerIds}
          onToggle={(id) => toggleId("taggedOfficerIds", id)}
        />
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function OfficerMultiSelect({
  label,
  officers,
  selected,
  onToggle,
}: {
  label: string;
  officers: OfficerProfile[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-neutral-700">{label}</legend>
      {officers.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No officers in this workspace yet.
        </p>
      ) : (
        <ul className="space-y-1 border border-neutral-200 p-3">
          {officers.map((o) => (
            <li key={o.id}>
              <label className="flex items-center gap-2 text-sm text-black">
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => onToggle(o.id)}
                  className="h-4 w-4"
                />
                <span>{o.name || o.email}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
