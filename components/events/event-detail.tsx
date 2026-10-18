import Link from "next/link";
import type { Event, Task } from "@/lib/db";
import { eventLinks } from "@/lib/events";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { actionDeleteEvent } from "@/app/events/actions";

type Attendance = { rsvps: number; attended: number };

type Props = {
  event: Event;
  attendance: Attendance | null;
  tasks: Task[];
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventDetail({ event, attendance, tasks }: Props) {
  const links = eventLinks(event);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">
          <Link href="/events" className="underline-offset-2 hover:underline">
            Events
          </Link>
          {" / "}
          {event.title}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-black">{event.title}</h1>
          <form action={actionDeleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <ConfirmButton message={`Delete "${event.title}" and its tasks? It is removed from the club calendar; its Drive files stay.`}>
              Delete
            </ConfirmButton>
          </form>
        </div>
        <p className="text-sm text-neutral-700">
          {formatWhen(event.starts_at)}
          {event.ends_at ? ` – ${formatWhen(event.ends_at)}` : ""}
        </p>
        {event.location ? <p className="text-sm text-neutral-700">{event.location}</p> : null}
        <p className="text-xs uppercase tracking-wide text-neutral-500">{event.status}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-black">Attendance</h2>
        {attendance ? (
          <p className="text-sm text-neutral-700">
            {attendance.rsvps} RSVPs · {attendance.attended} attended
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Attendance unavailable</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-black">Files</h2>
        <ul className="space-y-1 text-sm">
          {links.driveFolderUrl ? (
            <li>
              <a
                href={links.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Drive folder
              </a>
            </li>
          ) : null}
          {links.rsvpFormUrl ? (
            <li>
              <a
                href={links.rsvpFormUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                RSVP form
              </a>
            </li>
          ) : null}
          {links.signinSheetUrl ? (
            <li>
              <a
                href={links.signinSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Sign-in sheet
              </a>
            </li>
          ) : null}
          {links.slidesUrl ? (
            <li>
              <a
                href={links.slidesUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Slides
              </a>
            </li>
          ) : null}
          {!links.driveFolderUrl &&
          !links.rsvpFormUrl &&
          !links.signinSheetUrl &&
          !links.slidesUrl ? (
            <li className="text-neutral-500">No Google files linked yet</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-black">Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-neutral-500">No tasks for this event</p>
        ) : (
          <ul className="divide-y divide-neutral-100 border border-neutral-200">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
              >
                <span className="text-black">{task.title}</span>
                <span className="text-neutral-500">
                  {task.due_at
                    ? `due ${new Date(task.due_at).toLocaleDateString()}`
                    : "no due date"}
                  {` · ${task.status}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
