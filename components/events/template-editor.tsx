"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  ALL_FILE_TYPES,
  type FileTypeKey,
  type TemplateTaskItem,
} from "@/lib/events/types";

export type TemplateEditorValues = {
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypes: FileTypeKey[];
};

type Props = {
  initial: TemplateEditorValues;
  submitLabel: string;
  onSubmit: (values: TemplateEditorValues) => Promise<void>;
};

const EMPTY_TASK: TemplateTaskItem = { title: "", days_before: 7, role: "" };

export function TemplateEditor({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [taskItems, setTaskItems] = useState<TemplateTaskItem[]>(
    initial.taskItems.length ? initial.taskItems : [{ ...EMPTY_TASK }],
  );
  const [fileTypes, setFileTypes] = useState<Set<FileTypeKey>>(
    () => new Set(initial.fileTypes),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function updateTask(index: number, patch: Partial<TemplateTaskItem>) {
    setTaskItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function toggleFileType(key: FileTypeKey, checked: boolean) {
    setFileTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cleaned = taskItems.filter((t) => t.title.trim().length > 0);
      await onSubmit({
        name: name.trim(),
        taskItems: cleaned,
        fileTypes: [...fileTypes],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-8">
      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="template-name">
          Template name
        </label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. General meeting"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-black">Task list</h2>
          <Button
            type="button"
            onClick={() => setTaskItems((items) => [...items, { ...EMPTY_TASK }])}
          >
            Add task
          </Button>
        </div>
        <ul className="space-y-3">
          {taskItems.map((item, index) => (
            <li key={index} className="space-y-2 border border-neutral-200 p-3">
              <Input
                value={item.title}
                onChange={(e) => updateTask(index, { title: e.target.value })}
                placeholder="Task title"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">
                    Days before
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={item.days_before}
                    onChange={(e) =>
                      updateTask(index, {
                        days_before: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Role</label>
                  <Input
                    value={item.role}
                    onChange={(e) => updateTask(index, { role: e.target.value })}
                    placeholder="e.g. logistics"
                  />
                </div>
              </div>
              {taskItems.length > 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setTaskItems((items) => items.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-black">File types</h2>
        <ul className="space-y-2 text-sm text-neutral-800">
          {ALL_FILE_TYPES.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-2">
              <input
                id={`ft-${key}`}
                type="checkbox"
                checked={fileTypes.has(key)}
                onChange={(e) => toggleFileType(key, e.target.checked)}
                className="h-4 w-4 border border-black"
              />
              <label htmlFor={`ft-${key}`}>{label}</label>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
