import Link from "next/link";
import type { Event, Task } from "@/lib/db";
import { eventLinks } from "@/lib/events";
import { ProgressBar, StatCard, Tag, buttonClass } from "@/components/ui";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { actionDeleteEvent } from "@/app/events/actions";
import { countdown } from "@/lib/dashboard/stats";

type Attendance = { rsvps: number; attended: number };

type Props = {
  event: Event;
  attendance: Attendance | null;
  tasks: Task[];
};

const TZ = "America/Los_Angeles";

function formatWhen(event: Event) {
  const start = new Date(event.starts_at);
  const day = start.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  return event.ends_at ? `${day}, ${time(start)} to ${time(new Date(event.ends_at))}` : `${day}, ${time(start)}`;
}

const STATUS_LABELS: Record<Task["status"], string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const isLate = (task: Task) => task.status !== "done" && !!task.due_at && Date.parse(task.due_at) < Date.now();
const hasHappened = (event: Event) => Date.parse(event.starts_at) < Date.now();

export function EventDetail({ event, attendance, tasks }: Props) {
  const links = eventLinks(event);
  const files = [
    { label: "Drive folder", url: links.driveFolderUrl },
    { label: "RSVP form", url: links.rsvpFormUrl },
    { label: "Sign-in sheet", url: links.signinSheetUrl },
    { label: "Slides", url: links.slidesUrl },
    { label: "Notes", url: links.notesUrl },
  ];
  const sorted = [...tasks].sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"));
  const done = tasks.filter((t) => t.status === "done").length;
  const late = sorted.filter(isLate);
  const happened = hasHappened(event);
  const status = event.status === "cancelled" ? "Cancelled" : event.status === "done" || happened ? "Done" : "Planned";

  return (
    <div className="space-y-7">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
        <Link href="/events" className="underline-offset-2 hover:underline">
          Events
        </Link>
        {" / "}
        {event.title}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-black">{event.title}</h1>
            <Tag tone={status === "Done" ? "done" : "neutral"}>{status}</Tag>
          </div>
          <p className="text-neutral-700">
            {formatWhen(event)}
            {event.location ? ` · ${event.location}` : ""} · <strong className="font-semibold text-black">{countdown(event.starts_at)}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tasks/new" className={buttonClass}>
            Add task
          </Link>
          <form action={actionDeleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <ConfirmButton message={`Delete "${event.title}" and its tasks? It is removed from the club calendar; its Drive folder stays, renamed "(Deleted) …".`}>
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="RSVPs"
          value={
            attendance ? (
              <>
                {attendance.rsvps}
                {event.rsvp_target ? <span className="text-base font-normal text-neutral-600"> of {event.rsvp_target}</span> : null}
              </>
            ) : (
              "–"
            )
          }
          note={attendance ? undefined : "Attendance unavailable"}
        >
          {attendance && event.rsvp_target ? (
            <div className="mt-3">
              <ProgressBar value={attendance.rsvps} max={event.rsvp_target} label="RSVPs toward target" />
            </div>
          ) : null}
        </StatCard>
        <StatCard
          label="Tasks done"
          value={
            <>
              {done}
              <span className="text-base font-normal text-neutral-600"> of {tasks.length}</span>
            </>
          }
        >
          {tasks.length ? (
            <div className="mt-3">
              <ProgressBar value={done} max={tasks.length} label="Tasks done" />
            </div>
          ) : null}
        </StatCard>
        <StatCard
          label="Overdue"
          value={<span className={late.length ? "text-red-700" : undefined}>{late.length}</span>}
          note={late[0] ? `${late[0].title}${late.length > 1 ? ` and ${late.length - 1} more` : ""}` : "Nothing overdue"}
        />
        <StatCard
          label="Attended"
          value={happened && attendance ? attendance.attended : "–"}
          note={happened ? "From the sign-in sheet" : "Fills in from the sign-in sheet after the event"}
        />
      </div>

      <section className="space-y-3 rounded-2xl border border-neutral-200 p-5">
        <h2 className="font-semibold">Files</h2>
        <div className="flex flex-wrap gap-2">
          {files.map((f) =>
            f.url ? (
              <a key={f.label} href={f.url} target="_blank" rel="noreferrer" className={buttonClass}>
                {f.label}
              </a>
            ) : (
              <span key={f.label} className="inline-flex items-center rounded-full border border-dashed border-neutral-400 px-4 py-1.5 text-sm text-neutral-600">
                {f.label} not made
              </span>
            ),
          )}
        </div>
      </section>

      <section className="space-y-1 rounded-2xl border border-neutral-200 p-5">
        <h2 className="pb-2 font-semibold">Tasks</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-600">No tasks for this event.</p>
        ) : (
          <ul>
            {sorted.map((task) => {
              const isDone = task.status === "done";
              const lateNow = isLate(task);
              return (
                <li key={task.id} className="border-t border-neutral-100 first:border-0">
                  <Link href={`/tasks/${task.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-black ${isDone ? "bg-black" : ""}`}
                    >
                      {isDone ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2">
                          <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                        </svg>
                      ) : null}
                    </span>
                    <span className={`flex-1 hover:underline ${isDone ? "text-neutral-500 line-through" : "text-black"}`}>{task.title}</span>
                    <span className="text-neutral-600">
                      {task.due_at ? new Date(task.due_at).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" }) : "No due date"}
                    </span>
                    <Tag tone={isDone ? "done" : lateNow ? "late" : "neutral"}>{lateNow ? "Overdue" : STATUS_LABELS[task.status]}</Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
