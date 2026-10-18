import Link from "next/link";
import { buttonClass, Page, Tabs } from "@/components/ui";
import { CalendarView } from "@/components/events/calendar-view";
import {
  EngagementTab,
  FILE_COLUMNS,
  FilesTab,
  MeetingsTab,
  OutreachTab,
  PastTab,
  type EventRow,
} from "@/components/dashboard/tabs";
import { requireMembership } from "@/lib/auth";
import { getDb, type Event } from "@/lib/db";
import { eventLinks, listEvents, listTemplates } from "@/lib/events";
import { getEventAttendance } from "@/lib/attendance";
import { newVsReturning } from "@/lib/attendance/merge";
import { listPolls } from "@/lib/polls";
import { listTasks } from "@/lib/tasks";
import { isOverdue } from "@/lib/tasks/rules";
import {
  byStart,
  countdown,
  countsByEvent,
  DAY,
  fileStates,
  isMeetingTemplate,
  returningMembers,
  shortDate,
  within,
} from "@/lib/dashboard/stats";

const TABS = [
  { key: "files", label: "File management" },
  { key: "engagement", label: "Engagement" },
  { key: "meetings", label: "Meetings" },
  { key: "outreach", label: "Outreach" },
  { key: "past", label: "Past events" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const ALL_FILES = FILE_COLUMNS.map((c) => c.key);
// Server render: one clock reading per request.
const clock = () => Date.now();
const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const best = <T,>(xs: T[], score: (x: T) => number) =>
  xs.reduce<T | null>((top, x) => (top === null || score(x) > score(top) ? x : top), null);

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const { user, workspace } = await requireMembership();
  const asked = (await searchParams).tab;
  const tab: TabKey = TABS.find((t) => t.key === asked)?.key ?? "files";

  const now = clock();
  const today = new Date(now);
  const [allEvents, templates, tasks, polls] = await Promise.all([
    listEvents(workspace.id, new Date(now - 365 * DAY), new Date(now + 365 * DAY)),
    listTemplates(workspace.id),
    listTasks(workspace.id),
    listPolls(workspace.id, user.id),
  ]);
  const events = allEvents.filter((e) => e.status !== "cancelled").sort(byStart);
  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= now);
  const past = events.filter((e) => Date.parse(e.starts_at) < now);
  const recent = past.filter((e) => within(e.starts_at, now - 90 * DAY, now));
  const nextEvent = upcoming[0] ?? null;

  // Refresh attendance from Google only for what this view shows (cached 5 min per event).
  // A failing event keeps its last stored numbers, as on Metrics.
  const refresh = tab === "files" ? [] : tab === "past" ? past : recent;
  await Promise.all(
    [...refresh, ...(nextEvent ? [nextEvent] : [])].map((e) =>
      getEventAttendance(e.id).catch((err) => console.error("attendance refresh failed", e.id, err)),
    ),
  );
  const { data: attendeeRows } = events.length
    ? await getDb()
        .from("attendees")
        .select("event_id, email, rsvped_at, attended")
        .in("event_id", events.map((e) => e.id))
    : { data: [] };
  const attendees = attendeeRows ?? [];
  const counts = countsByEvent(attendees);
  const count = (id: string) => counts.get(id) ?? { rsvps: 0, attended: 0 };

  const row = (e: Event): EventRow => ({
    id: e.id,
    title: e.title,
    date: shortDate(e.starts_at),
    location: e.location,
    when: countdown(e.starts_at, now),
    ...count(e.id),
    status: e.status === "cancelled" ? "Cancelled" : e.status === "done" || Date.parse(e.starts_at) < now ? "Done" : "Planned",
    folderUrl: eventLinks(e).driveFolderUrl,
  });

  // The strip above the tabs.
  const mine = tasks.filter((t) => t.status !== "done" && t.assignees.some((a) => a.user_id === user.id && !a.completed_at));
  const overdue = mine.filter((t) => isOverdue(t, now));
  const dueThisWeek = mine.filter((t) => !isOverdue(t, now) && t.due_at && Date.parse(t.due_at) < now + 7 * DAY);
  const nextTask = overdue[0] ?? dueThisWeek[0] ?? null;
  const waiting = polls.filter((p) => p.open && p.myVotes.length === 0);

  return (
    <Page
      title="Dashboard"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/polls" className={buttonClass}>
            New poll
          </Link>
          <Link href="/events/new" className={buttonClass}>
            Plan an event
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Link href={nextEvent ? `/events/${nextEvent.id}` : "/events/new"} className="flex flex-col gap-1 rounded-2xl border border-neutral-200 p-5 hover:border-neutral-400">
          <span className="text-sm text-neutral-600">Next event</span>
          {nextEvent ? (
            <>
              <span className="font-semibold">{nextEvent.title}</span>
              <span className="text-sm text-neutral-600">
                {shortDate(nextEvent.starts_at)} · {countdown(nextEvent.starts_at, now)} · {count(nextEvent.id).rsvps}
                {nextEvent.rsvp_target ? ` of ${nextEvent.rsvp_target}` : ""} RSVPs
              </span>
            </>
          ) : (
            <span className="font-semibold">Nothing planned yet</span>
          )}
        </Link>
        <Link href="/tasks" className="flex flex-col gap-1 rounded-2xl border border-neutral-200 p-5 hover:border-neutral-400">
          <span className="text-sm text-neutral-600">My tasks</span>
          <span className="font-semibold">
            {overdue.length ? <span className="text-red-700">{overdue.length} overdue</span> : "Nothing overdue"} · {dueThisWeek.length} due this week
          </span>
          {nextTask ? <span className="truncate text-sm text-neutral-600">{nextTask.title}</span> : null}
        </Link>
        <Link href="/polls" className="flex flex-col gap-1 rounded-2xl border border-neutral-200 p-5 hover:border-neutral-400">
          <span className="text-sm text-neutral-600">Polls</span>
          <span className="font-semibold">{waiting.length ? `${waiting.length} waiting on your vote` : "You're all caught up"}</span>
          {waiting[0] ? <span className="truncate text-sm text-neutral-600">{waiting[0].question}</span> : null}
        </Link>
      </div>

      <Tabs label="Dashboard views" current={tab} items={TABS.map((t) => ({ ...t, href: t.key === "files" ? "/" : `/?tab=${t.key}` }))} />

      {tab === "files" && (
        <FilesTab
          driveUrl={workspace.shared_drive_id ? `https://drive.google.com/drive/folders/${workspace.shared_drive_id}` : null}
          rows={upcoming.map((e) => {
            const links = eventLinks(e);
            const urls = { folder: links.driveFolderUrl, rsvp_form: links.rsvpFormUrl, signin_sheet: links.signinSheetUrl, slides: links.slidesUrl, notes: links.notesUrl };
            const template = templates.find((t) => t.id === e.template_id);
            const states = fileStates(
              { folder: !!urls.folder, rsvp_form: !!urls.rsvp_form, signin_sheet: !!urls.signin_sheet, slides: !!urls.slides, notes: !!urls.notes },
              template ? template.file_types : ALL_FILES,
            );
            return { id: e.id, title: e.title, date: shortDate(e.starts_at), files: ALL_FILES.map((key) => ({ key, state: states[key], url: urls[key] })) };
          })}
        />
      )}

      {tab === "engagement" && (
        <EngagementTab
          data={(() => {
            const inRecent = new Set(recent.map((e) => e.id));
            const last30 = new Set(recent.filter((e) => within(e.starts_at, now - 30 * DAY, now)).map((e) => e.id));
            const sum = (ids: Set<string>, key: "rsvps" | "attended") => [...ids].reduce((n, id) => n + count(id)[key], 0);
            return {
              rsvps: sum(inRecent, "rsvps"),
              attended: sum(inRecent, "attended"),
              rsvpsLast30: sum(last30, "rsvps"),
              attendedLast30: sum(last30, "attended"),
              returning: returningMembers(attendees.filter((a) => inRecent.has(a.event_id))),
              bars: recent.slice(-8).map((e) => ({ id: e.id, label: e.title, ...count(e.id) })),
            };
          })()}
        />
      )}

      {tab === "meetings" && (
        <MeetingsTab
          data={(() => {
            const meetingTemplates = templates.filter((t) => isMeetingTemplate(t.name));
            const ids = new Set(meetingTemplates.map((t) => t.id));
            const meetings = events.filter((e) => e.template_id && ids.has(e.template_id));
            const next = meetings.find((e) => Date.parse(e.starts_at) >= now);
            const recentMeetings = meetings.filter((e) => within(e.starts_at, now - 90 * DAY, now));
            const agenda = next ? tasks.filter((t) => t.event_id === next.id) : [];
            return {
              templateNames: meetingTemplates.map((t) => t.name),
              next: next ? { ...row(next), tasksDone: agenda.filter((t) => t.status === "done").length, tasksTotal: agenda.length } : null,
              recentCount: recentMeetings.length,
              avgAttendance: average(recentMeetings.map((e) => count(e.id).attended)),
              rows: [...meetings].reverse().map(row),
            };
          })()}
        />
      )}

      {tab === "outreach" && (
        <OutreachTab
          data={(() => {
            const split = newVsReturning(past, attendees.filter((a) => a.attended));
            const rows = recent.map((e) => ({ id: e.id, title: e.title, ...split.get(e.id)! }));
            const top = best(rows, (r) => r.new);
            return {
              newLast30: rows.filter((r) => within(recent.find((e) => e.id === r.id)!.starts_at, now - 30 * DAY, now)).reduce((n, r) => n + r.new, 0),
              newPerEvent: rows.length ? Math.round((rows.reduce((n, r) => n + r.new, 0) / rows.length) * 10) / 10 : null,
              best: top && top.new > 0 ? { title: top.title, count: top.new } : null,
              rows: rows.slice(-8).reverse(),
            };
          })()}
        />
      )}

      {tab === "past" && (
        <PastTab
          data={(() => {
            const top = best(recent, (e) => count(e.id).attended);
            return {
              recentCount: recent.length,
              recentLast30: recent.filter((e) => within(e.starts_at, now - 30 * DAY, now)).length,
              avgAttendance: average(recent.map((e) => count(e.id).attended)),
              best: top && count(top.id).attended > 0 ? { title: top.title, count: count(top.id).attended } : null,
              rows: [...past].reverse().map(row),
            };
          })()}
        />
      )}

      <section className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Calendar</h2>
          <Link href="/calendar" className="text-sm underline-offset-2 hover:underline">
            Open full calendar
          </Link>
        </div>
        <CalendarView
          events={allEvents}
          tasks={tasks}
          initialYear={today.getFullYear()}
          initialMonth={today.getMonth()}
          todayKey={today.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })}
        />
      </section>
    </Page>
  );
}
