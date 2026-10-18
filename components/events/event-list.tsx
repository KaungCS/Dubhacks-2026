import Link from "next/link";
import type { Event, Task } from "@/lib/db";
import { Tag } from "@/components/ui";
import { countdown } from "@/lib/dashboard/stats";

type Props = {
  events: Event[];
  tasks: Task[];
};

const TZ = "America/Los_Angeles";

export function EventList({ events, tasks }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No events in this range.{" "}
        <Link href="/events/new" className="underline-offset-2 hover:underline">
          Plan one from a template.
        </Link>
      </p>
    );
  }

  return (
    <ul className="rounded-2xl border border-neutral-200 px-4 sm:px-5">
      {events.map((event) => {
        const start = new Date(event.starts_at);
        const mine = tasks.filter((t) => t.event_id === event.id);
        const done = mine.filter((t) => t.status === "done").length;
        const when = countdown(event.starts_at);
        const past = when.endsWith("ago") || when === "yesterday";
        return (
          <li key={event.id} className="border-b border-neutral-100 last:border-0">
            <Link href={`/events/${event.id}`} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
              <span className="flex w-12 flex-col items-center">
                <span className="text-xs text-neutral-600">{start.toLocaleDateString("en-US", { timeZone: TZ, month: "short" })}</span>
                <span className="text-xl font-semibold tabular-nums">{start.toLocaleDateString("en-US", { timeZone: TZ, day: "numeric" })}</span>
              </span>
              <span className="flex min-w-0 flex-1 basis-56 flex-col">
                <span className="font-semibold hover:underline">{event.title}</span>
                <span className="text-sm text-neutral-600">
                  {start.toLocaleString("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" })}
                  {event.location ? ` · ${event.location}` : ""}
                </span>
              </span>
              {mine.length ? (
                <span className="text-sm text-neutral-700">
                  {done} of {mine.length} tasks done
                </span>
              ) : null}
              {event.status === "cancelled" ? <Tag>Cancelled</Tag> : <Tag tone={past ? "done" : "neutral"}>{past ? "Done" : when}</Tag>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
