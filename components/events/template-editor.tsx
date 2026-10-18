"use client";

import { useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
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
  onSubmit,
}: Props) {
  const initialState = configsToState(initial.fileTypeConfigs);
  const [name, setName] = useState(initial.name);
  const [taskItems, setTaskItems] = useState<TemplateTaskItem[]>(initial.taskItems);
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
      // redirect() from the server action throws NEXT_REDIRECT — must rethrow
      // or the save looks failed and navigation never happens.
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Save failed");
      setPending(false);
    }
  }

  const duplicatable = ALL_FILE_TYPES.filter((ft) =>
    DUPLICATABLE_FILE_TYPES.includes(ft.key),
  );
  const otherFileTypes = ALL_FILE_TYPES.filter(
    (ft) => !DUPLICATABLE_FILE_TYPES.includes(ft.key),
  );

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
        {taskItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No tasks. Events start with an empty task list.</p>
        ) : null}
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
              <Button
                type="button"
                onClick={() =>
                  setTaskItems((items) => items.filter((_, i) => i !== index))
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-black">File types</h2>
        <ul className="space-y-2 text-sm text-neutral-800">
          {otherFileTypes.map(({ key, label }) => (
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

      <section className="space-y-3 border border-black p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-black">
            Duplicate from Google link
          </h2>
          <p className="text-sm text-neutral-600">
            Paste a Google Form, Slides, Sheet, or Doc link (or file id) for each type
            you enable. Creating an event copies that file into the event Drive
            folder. Leave blank to create a new blank file. Drive folder (above)
            has no link field — it is created fresh each time.
          </p>
        </div>

        <ul className="space-y-4 text-sm text-neutral-800">
          {duplicatable.map(({ key, label, sourceHint }) => {
            const checked = fileTypes.has(key);
            const sourceValue = sources[key] ?? "";
            return (
              <li key={key} className="space-y-2 border border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    id={`ft-${key}`}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleFileType(key, e.target.checked)}
                    className="h-4 w-4 border border-black"
                  />
                  <label htmlFor={`ft-${key}`} className="font-medium text-black">
                    {label}
                  </label>
                </div>

                <div className="space-y-1">
                  <label
                    className="block text-sm text-neutral-700"
                    htmlFor={`ft-src-${key}`}
                  >
                    {sourceHint ?? "Google file link or id to duplicate"}
                  </label>
                  <Input
                    id={`ft-src-${key}`}
                    value={sourceValue}
                    onChange={(e) => setSource(key, e.target.value)}
                    placeholder="https://docs.google.com/…"
                    autoComplete="off"
                    disabled={!checked}
                    aria-disabled={!checked}
                  />
                  {!checked ? (
                    <p className="text-xs text-neutral-500">
                      Check {label} above to use this link when creating events.
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Use the edit/open link from Drive (not forms.gle or a form
                      response URL).
                    </p>
                  )}
                </div>
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
