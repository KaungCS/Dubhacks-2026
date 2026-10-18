"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  ALL_FILE_TYPES,
  DUPLICATABLE_FILE_TYPES,
  type FileTypeConfig,
  type FileTypeKey,
  type TemplateTaskItem,
} from "@/lib/events/types";

export type TemplateEditorValues = {
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypeConfigs: FileTypeConfig[];
};

type Props = {
  initial: TemplateEditorValues;
  submitLabel: string;
  /** When true, show Google source-link fields for slides/sheet/form. */
  canSetSources?: boolean;
  onSubmit: (values: TemplateEditorValues) => Promise<void>;
};

const EMPTY_TASK: TemplateTaskItem = { title: "", days_before: 7, role: "" };

function configsToState(configs: FileTypeConfig[]) {
  const keys = new Set<FileTypeKey>(configs.map((c) => c.key));
  const sources: Partial<Record<FileTypeKey, string>> = {};
  for (const c of configs) {
    sources[c.key] = c.sourceUrl || c.sourceFileId || "";
  }
  return { keys, sources };
}

export function TemplateEditor({
  initial,
  submitLabel,
  canSetSources = false,
  onSubmit,
}: Props) {
  const initialState = configsToState(initial.fileTypeConfigs);
  const [name, setName] = useState(initial.name);
  const [taskItems, setTaskItems] = useState<TemplateTaskItem[]>(
    initial.taskItems.length ? initial.taskItems : [{ ...EMPTY_TASK }],
  );
  const [fileTypes, setFileTypes] = useState<Set<FileTypeKey>>(
    () => initialState.keys,
  );
  const [sources, setSources] = useState<Partial<Record<FileTypeKey, string>>>(
    () => initialState.sources,
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

  function setSource(key: FileTypeKey, value: string) {
    setSources((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cleaned = taskItems.filter((t) => t.title.trim().length > 0);
      const fileTypeConfigs: FileTypeConfig[] = [...fileTypes].map((key) => {
        const raw = (sources[key] ?? "").trim();
        const canDuplicate = DUPLICATABLE_FILE_TYPES.includes(key);
        return {
          key,
          sourceFileId: null,
          sourceUrl: canDuplicate && raw ? raw : null,
        };
      });
      await onSubmit({
        name: name.trim(),
        taskItems: cleaned,
        fileTypeConfigs,
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
        <ul className="space-y-3 text-sm text-neutral-800">
          {ALL_FILE_TYPES.map(({ key, label, sourceHint }) => {
            const checked = fileTypes.has(key);
            const showSource =
              canSetSources &&
              checked &&
              DUPLICATABLE_FILE_TYPES.includes(key);
            return (
              <li key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id={`ft-${key}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleFileType(key, e.target.checked)}
                    className="h-4 w-4 border border-black"
                  />
                  <label htmlFor={`ft-${key}`}>{label}</label>
                </div>
                {showSource ? (
                  <div className="ml-6 space-y-1">
                    <label
                      className="block text-xs text-neutral-500"
                      htmlFor={`ft-src-${key}`}
                    >
                      {sourceHint ?? "Google file link or id to duplicate"}
                    </label>
                    <Input
                      id={`ft-src-${key}`}
                      value={sources[key] ?? ""}
                      onChange={(e) => setSource(key, e.target.value)}
                      placeholder="https://docs.google.com/…"
                      autoComplete="off"
                    />
                    <p className="text-xs text-neutral-500">
                      Leave blank to create a new blank file. When set, creating an
                      event copies this Google file into the event Drive folder.
                    </p>
                  </div>
                ) : null}
                {!canSetSources &&
                checked &&
                DUPLICATABLE_FILE_TYPES.includes(key) &&
                (sources[key] ?? "").trim() ? (
                  <p className="ml-6 text-xs text-neutral-500">
                    Duplicates from a configured Google file (admin-only to change).
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
