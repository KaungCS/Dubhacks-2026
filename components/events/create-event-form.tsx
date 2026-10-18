"use client";

import Link from "next/link";
import { useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Button, Input, Select } from "@/components/ui";
import type { EventTemplate } from "@/lib/events/types";
import { actionCreateEventFromTemplate } from "@/app/events/actions";

type Props = {
  templates: EventTemplate[];
  /** Preselected from ?template= (the "Plan from a template" cards). */
  initialTemplateId?: string;
  /** YYYY-MM-DD from ?date= (clicking a calendar day); prefills 6 to 7 PM. */
  initialDate?: string;
};

export function CreateEventForm({ templates, initialTemplateId, initialDate }: Props) {
  const [templateId, setTemplateId] = useState(
    templates.some((t) => t.id === initialTemplateId) ? initialTemplateId! : (templates[0]?.id ?? ""),
  );
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(initialDate ? `${initialDate}T18:00` : "");
  const [endsAt, setEndsAt] = useState(initialDate ? `${initialDate}T19:00` : "");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await actionCreateEventFromTemplate({
        templateId,
        title,
        startsAt,
        endsAt,
        location,
      });
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Create failed");
      setPending(false);
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No templates yet.{" "}
        <Link href="/templates/new" className="underline-offset-2 hover:underline">
          Create a template
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="template">
          Template
        </label>
        <Select
          id="template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="title">
          Event title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="jun: test event"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm text-neutral-700" htmlFor="starts">
            Starts
          </label>
          <Input
            id="starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-neutral-700" htmlFor="ends">
            Ends
          </label>
          <Input
            id="ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-700" htmlFor="location">
          Location
        </label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
