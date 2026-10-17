"use client";

import { useState, useTransition } from "react";
import type { EventPlan } from "@/lib/plan";

type ConfirmResult = {
  calendar?: { id?: string; htmlLink?: string };
  drive?: { id?: string; webViewLink?: string };
  plan: EventPlan;
};

export function PlanFlow() {
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generatePlan() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        const data = (await response.json()) as {
          plan?: EventPlan;
          error?: string;
        };
        if (!response.ok || !data.plan) {
          throw new Error(data.error ?? "Could not generate plan");
        }
        setPlan(data.plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate plan");
      }
    });
  }

  function confirmPlan() {
    if (!plan) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/plan/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plan),
        });
        const data = (await response.json()) as ConfirmResult & {
          error?: string;
          partial?: boolean;
        };
        // Partial success: Calendar created, Drive failed — still show the event link.
        if (data.partial && data.calendar) {
          setResult(data);
          setError(data.error ?? "Drive folder failed after Calendar create.");
          return;
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Could not create Calendar/Drive items");
        }
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not create Calendar/Drive items",
        );
      }
    });
  }

  if (result) {
    const driveOk = Boolean(result.drive?.webViewLink || result.drive?.id);
    return (
      <div className="animate-rise space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
            {driveOk ? "Event kicked off" : "Calendar created"}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {driveOk
              ? `${result.plan.title} is on the calendar and has a Drive folder.`
              : `${result.plan.title} is on the calendar. Drive folder was not created — see the error below.`}
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-[rgba(140,40,40,0.25)] bg-[rgba(255,240,240,0.8)] px-4 py-3 text-sm text-[#6b1f1f]">
            {error}
          </p>
        ) : null}

        <div className="panel space-y-3">
          {result.calendar?.htmlLink ? (
            <p>
              <a
                className="font-semibold text-[var(--moss)] underline underline-offset-4"
                href={result.calendar.htmlLink}
                target="_blank"
                rel="noreferrer"
              >
                Open Calendar event
              </a>
            </p>
          ) : (
            <p className="text-[var(--ink-soft)]">Calendar event created.</p>
          )}
          {result.drive?.webViewLink ? (
            <p>
              <a
                className="font-semibold text-[var(--moss)] underline underline-offset-4"
                href={result.drive.webViewLink}
                target="_blank"
                rel="noreferrer"
              >
                Open Drive folder
              </a>
            </p>
          ) : null}
        </div>

        <PlanDetails plan={result.plan} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-rise max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
          Plan an event
        </h1>
        <p className="mt-3 text-lg text-[var(--ink-soft)]">
          Describe what you want to run. We will draft a title, time suggestion,
          checklist, and templates. Confirm to create Calendar + Drive.
        </p>
      </div>

      <div className="animate-rise-delay panel max-w-2xl space-y-4">
        <label className="block text-sm font-semibold text-[var(--ink)]" htmlFor="description">
          Event description
        </label>
        <textarea
          id="description"
          className="min-h-40 w-full resize-y rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-base outline-none ring-[var(--moss)] focus:ring-2"
          placeholder="Example: Game night next Friday evening for new members, snacks, icebreakers, need roles and a checklist."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary disabled:opacity-60"
            disabled={isPending || description.trim().length === 0}
            onClick={generatePlan}
          >
            {isPending && !plan ? "Drafting…" : "Draft plan"}
          </button>
          {plan ? (
            <button
              type="button"
              className="btn btn-primary disabled:opacity-60"
              disabled={isPending}
              onClick={confirmPlan}
            >
              {isPending ? "Creating…" : "Confirm → Calendar + Drive"}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="rounded-xl border border-[rgba(140,40,40,0.25)] bg-[rgba(255,240,240,0.8)] px-4 py-3 text-sm text-[#6b1f1f]">
            {error}
          </p>
        ) : null}
        <p className="text-sm text-[var(--ink-soft)]">
          Your description stays in this form if Google calls fail — edit and
          retry without starting over.
        </p>
      </div>

      {plan ? <PlanDetails plan={plan} /> : null}
    </div>
  );
}

function PlanDetails({ plan }: { plan: EventPlan }) {
  const start = new Date(plan.suggestedStart);
  const end = new Date(plan.suggestedEnd);

  return (
    <div className="animate-rise panel max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--moss)]">
          {plan.source === "llm" ? "AI draft" : "Stub draft"}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          {plan.title}
        </h2>
        <p className="mt-2 text-[var(--ink-soft)]">{plan.summary}</p>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          Suggested: {start.toLocaleString()} → {end.toLocaleString()} (
          {plan.timezone})
        </p>
      </div>

      <ListBlock title="Checklist" items={plan.checklist} />
      <ListBlock title="Agenda" items={plan.templates.agenda} />
      <ListBlock title="Roles" items={plan.templates.roles} />
      <ListBlock title="Materials" items={plan.templates.materials} />
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
        {title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--ink-soft)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
