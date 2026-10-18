import Link from "next/link";
import type { Event } from "@/lib/db";

type Props = {
  events: Event[];
};

export function EventList({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No events in this range.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-100 border border-neutral-200">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/events/${event.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <span className="font-medium text-black">{event.title}</span>
            <span className="text-neutral-500">
              {new Date(event.starts_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
