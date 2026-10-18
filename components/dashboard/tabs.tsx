import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonClass, Card, StatCard, Tag } from '@/components/ui'
import { rate, type FileState } from '@/lib/dashboard/stats'

// The dashboard's five tabs. app/page.tsx loads and shapes the data; these only lay it out.

export type EventRow = {
  id: string
  title: string
  date: string
  location: string | null
  when: string
  rsvps: number
  attended: number
  status: 'Planned' | 'Done' | 'Cancelled'
  folderUrl: string | null
}

const pillSmall = 'inline-flex items-center whitespace-nowrap rounded-full border border-black px-3 py-0.5 text-sm hover:bg-black hover:text-white'

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">{children}</div>
}

function TableCard({ title, action, empty, children }: { title: string; action?: ReactNode; empty?: string | false; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {empty ? <p className="px-3 py-4 text-sm text-neutral-600">{empty}</p> : <div className="overflow-x-auto">{children}</div>}
    </section>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-xs text-neutral-600">
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap px-3 py-2.5 font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums [&_td]:whitespace-nowrap [&_td]:px-3 [&_td]:py-3 [&_tr]:border-b [&_tr]:border-neutral-100 [&_tr:last-child]:border-0">
        {children}
      </tbody>
    </table>
  )
}

const EventLink = ({ row }: { row: { id: string; title: string } }) => (
  <Link href={`/events/${row.id}`} className="font-medium underline-offset-2 hover:underline">
    {row.title}
  </Link>
)

const statusTag = (status: EventRow['status']) => <Tag tone={status === 'Done' ? 'done' : 'neutral'}>{status}</Tag>

function FileCell({ state, url }: { state: FileState; url: string | null }) {
  if (state === 'ok' && url)
    return (
      <a href={url} target="_blank" rel="noreferrer" className={pillSmall}>
        Open
      </a>
    )
  if (state === 'missing') return <span className="inline-flex rounded-full border border-dashed border-neutral-400 px-3 py-0.5 text-sm text-neutral-600">Missing</span>
  return <span className="text-neutral-400">–</span>
}

// File management

export type FileRow = { id: string; title: string; date: string; files: { key: string; state: FileState; url: string | null }[] }
export const FILE_COLUMNS = [
  { key: 'folder', label: 'Folder' },
  { key: 'rsvp_form', label: 'RSVP form' },
  { key: 'signin_sheet', label: 'Sign-in sheet' },
  { key: 'slides', label: 'Slides' },
  { key: 'notes', label: 'Notes' },
] as const

export function FilesTab({ rows, driveUrl }: { rows: FileRow[]; driveUrl: string | null }) {
  const complete = rows.filter((r) => r.files.every((f) => f.state !== 'missing')).length
  const missing = rows.flatMap((r) => r.files).filter((f) => f.state === 'missing').length
  const eventsMissing = rows.filter((r) => r.files.some((f) => f.state === 'missing')).length
  return (
    <div className="space-y-5">
      <Grid>
        <StatCard label="Upcoming events with every file" value={`${complete} of ${rows.length}`} note="Files come from each event's template" />
        <StatCard label="Files missing" value={missing} note={missing ? `Across ${eventsMissing} ${eventsMissing === 1 ? 'event' : 'events'}` : 'Nothing missing'} />
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-200 p-5">
          <p className="text-sm text-neutral-600">Club shared drive</p>
          {driveUrl ? (
            <a href={driveUrl} target="_blank" rel="noreferrer" className={`${buttonClass} self-start`}>
              Open in Drive
            </a>
          ) : (
            <Link href="/settings" className={`${buttonClass} self-start`}>
              Pick it in Settings
            </Link>
          )}
        </section>
      </Grid>
      <TableCard
        title="Upcoming event files"
        action={
          <Link href="/events" className="text-sm underline-offset-2 hover:underline">
            View all events
          </Link>
        }
        empty={rows.length === 0 && 'No upcoming events. Plan one from a template and its files are made for you.'}
      >
        <Table head={['Event', 'Date', ...FILE_COLUMNS.map((c) => c.label)]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <EventLink row={r} />
              </td>
              <td className="text-neutral-600">{r.date}</td>
              {r.files.map((f) => (
                <td key={f.key}>
                  <FileCell state={f.state} url={f.url} />
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </TableCard>
    </div>
  )
}

// Engagement

export type EngagementData = {
  rsvps: number
  attended: number
  rsvpsLast30: number
  attendedLast30: number
  returning: number
  bars: { id: string; label: string; rsvps: number; attended: number }[]
}

export function EngagementTab({ data }: { data: EngagementData }) {
  const max = Math.max(1, ...data.bars.map((b) => Math.max(b.rsvps, b.attended)))
  return (
    <div className="space-y-5">
      <Grid>
        <StatCard label="RSVPs, last 90 days" value={data.rsvps} note={`+${data.rsvpsLast30} in the last 30 days`} />
        <StatCard label="Attended" value={data.attended} note={`+${data.attendedLast30} in the last 30 days`} />
        <StatCard label="Attendance rate" value={rate(data.attended, data.rsvps)} note="Of people who RSVP'd" />
        <StatCard label="Returning members" value={data.returning} note="Came to 2 or more events" />
      </Grid>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Attendance per event</h2>
            <p className="text-sm text-neutral-600">Black is attended, grey is RSVPs</p>
          </div>
          <Link href="/metrics" className={buttonClass}>
            Every event&apos;s numbers
          </Link>
        </div>
        {data.bars.length === 0 ? (
          <p className="text-sm text-neutral-600">No past events in the last 90 days yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="flex h-56 items-end gap-4 border-b border-neutral-300 px-2" role="img" aria-label="Attended and RSVPs per event">
                {data.bars.map((b) => (
                  <div key={b.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-xs tabular-nums text-neutral-700">{b.attended}</span>
                    <div className="relative h-44 w-full max-w-11">
                      <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-neutral-200" style={{ height: `${(b.rsvps / max) * 100}%` }} />
                      <div className="absolute inset-x-2 bottom-0 rounded-t bg-black" style={{ height: `${(b.attended / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 px-2 pt-2">
                {data.bars.map((b) => (
                  <span key={b.id} className="flex-1 truncate text-center text-xs text-neutral-600" title={b.label}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// Meetings

export type MeetingsData = {
  templateNames: string[]
  next: (EventRow & { tasksDone: number; tasksTotal: number }) | null
  recentCount: number
  avgAttendance: number | null
  rows: EventRow[]
}

export function MeetingsTab({ data }: { data: MeetingsData }) {
  if (data.templateNames.length === 0) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-neutral-700">
          Meetings are events made from a template with &quot;meeting&quot; in its name, like General meeting. No template has that yet.
        </p>
        <Link href="/templates/new" className={buttonClass}>
          Make a meeting template
        </Link>
      </Card>
    )
  }
  const { next } = data
  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-600">Showing events made from {data.templateNames.join(', ')}.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {next ? (
          <Link href={`/events/${next.id}`} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-5 hover:border-neutral-400 sm:col-span-2">
            <span className="text-sm text-neutral-600">Next meeting</span>
            <span className="text-xl font-semibold">{next.title}</span>
            <span className="text-sm text-neutral-700">
              {next.date}
              {next.location ? ` · ${next.location}` : ''} · {next.when}
            </span>
            <span className="flex flex-wrap gap-2">
              <Tag>
                Agenda {next.tasksDone} of {next.tasksTotal} tasks done
              </Tag>
              <Tag>{next.folderUrl ? 'Docs ready' : 'No docs yet'}</Tag>
              <Tag>{next.rsvps} RSVPs</Tag>
            </span>
          </Link>
        ) : (
          <section className="rounded-2xl border border-neutral-200 p-5 sm:col-span-2">
            <p className="text-sm text-neutral-600">Next meeting</p>
            <p className="mt-2 text-sm">None planned.</p>
            <Link href="/events/new" className={`${buttonClass} mt-3`}>
              Plan one
            </Link>
          </section>
        )}
        <StatCard label="Meetings, last 90 days" value={data.recentCount} />
        <StatCard label="Average attendance" value={data.avgAttendance ?? '–'} note="Per meeting, last 90 days" />
      </div>
      <TableCard title="Meetings" empty={data.rows.length === 0 && 'No meetings yet.'}>
        <Table head={['Meeting', 'Date', 'RSVPs', 'Attended', 'Docs', 'Status']}>
          {data.rows.map((m) => (
            <tr key={m.id}>
              <td>
                <EventLink row={m} />
              </td>
              <td className="text-neutral-600">{m.date}</td>
              <td>{m.rsvps}</td>
              <td>{m.status === 'Done' ? m.attended : '–'}</td>
              <td>
                <FileCell state={m.folderUrl ? 'ok' : 'missing'} url={m.folderUrl} />
              </td>
              <td>{statusTag(m.status)}</td>
            </tr>
          ))}
        </Table>
      </TableCard>
    </div>
  )
}

// Outreach

export type OutreachData = {
  newLast30: number
  newPerEvent: number | null
  best: { title: string; count: number } | null
  rows: { id: string; title: string; new: number; returning: number }[]
}

export function OutreachTab({ data }: { data: OutreachData }) {
  const max = Math.max(1, ...data.rows.map((r) => r.new + r.returning))
  return (
    <div className="space-y-5">
      <Grid>
        <StatCard label="New faces, last 30 days" value={data.newLast30} note="First time at any club event" />
        <StatCard label="New faces per event" value={data.newPerEvent ?? '–'} note="Last 90 days" />
        <StatCard label="Best event for new faces" value={<span className="text-xl">{data.best?.title ?? '–'}</span>} note={data.best ? `${data.best.count} first-timers` : undefined} />
      </Grid>
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">New vs returning attendees</h2>
          <p className="text-sm text-neutral-600">Black is first-timers, grey is returning members</p>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-neutral-600">No attendance from the last 90 days yet. It fills in from each event&apos;s sign-in sheet.</p>
        ) : (
          <ul className="space-y-3">
            {data.rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm">
                <Link href={`/events/${r.id}`} className="truncate underline-offset-2 hover:underline">
                  {r.title}
                </Link>
                <div className="flex h-3.5 overflow-hidden rounded-full bg-neutral-100" role="img" aria-label={`${r.new} new, ${r.returning} returning`}>
                  <div className="bg-black" style={{ width: `${(r.new / max) * 100}%` }} />
                  <div className="bg-neutral-400" style={{ width: `${(r.returning / max) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums text-neutral-700">{r.new} new</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// Past events

export type PastData = { recentCount: number; recentLast30: number; avgAttendance: number | null; best: { title: string; count: number } | null; rows: EventRow[] }

export function PastTab({ data }: { data: PastData }) {
  return (
    <div className="space-y-5">
      <Grid>
        <StatCard label="Events, last 90 days" value={data.recentCount} note={`+${data.recentLast30} in the last 30 days`} />
        <StatCard label="Average attendance" value={data.avgAttendance ?? '–'} note="Per event, last 90 days" />
        <StatCard label="Best attended" value={<span className="text-xl">{data.best?.title ?? '–'}</span>} note={data.best ? `${data.best.count} attended` : undefined} />
      </Grid>
      <TableCard title="Past events" empty={data.rows.length === 0 && 'No past events in the last year.'}>
        <Table head={['Event', 'Date', 'RSVPs', 'Attended', 'Rate', 'Status']}>
          {data.rows.map((p) => (
            <tr key={p.id}>
              <td>
                <EventLink row={p} />
              </td>
              <td className="text-neutral-600">{p.date}</td>
              <td>{p.rsvps}</td>
              <td>{p.attended}</td>
              <td>{rate(p.attended, p.rsvps)}</td>
              <td>{statusTag(p.status)}</td>
            </tr>
          ))}
        </Table>
      </TableCard>
    </div>
  )
}
