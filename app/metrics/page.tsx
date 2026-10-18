import { Card, Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { listEvents } from '@/lib/events'
import { getEventAttendance } from '@/lib/attendance'
import { newVsReturning } from '@/lib/attendance/merge'
import { pacific } from '@/lib/polls/rules'

const YEAR = 365 * 24 * 60 * 60 * 1000
const rate = (attended: number, rsvps: number) => (rsvps ? `${Math.round((attended / rsvps) * 100)}%` : '—')
// A year back and a year ahead.
const eventsAroundNow = (workspaceId: string) => listEvents(workspaceId, new Date(Date.now() - YEAR), new Date(Date.now() + YEAR))

export default async function MetricsPage() {
  const { workspace } = await requireMembership()
  const events = await eventsAroundNow(workspace.id)

  // Refresh each event from Google (cached 5 min per event). A failing event keeps its last stored numbers.
  // ponytail: one Google fetch per stale event per page load; fine for a club's dozens of events.
  await Promise.all(events.map((e) => getEventAttendance(e.id).catch((err) => console.error('attendance refresh failed', e.id, err))))

  const db = getDb()
  const [{ data: attendees }, { count: officers }] = await Promise.all([
    events.length
      ? db.from('attendees').select('event_id, email, rsvped_at, attended').in('event_id', events.map((e) => e.id))
      : Promise.resolve({ data: [] }),
    db.from('memberships').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).is('left_at', null),
  ])
  const rows = attendees ?? []
  const attended = rows.filter((a) => a.attended)
  const totalRsvps = rows.filter((a) => a.rsvped_at).length
  const split = newVsReturning(events, attended)
  const byEvent = [...events]
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    .map((e) => {
      const mine = rows.filter((a) => a.event_id === e.id)
      return {
        ...e,
        rsvps: mine.filter((a) => a.rsvped_at).length,
        attended: mine.filter((a) => a.attended).length,
        ...split.get(e.id)!,
      }
    })

  const tiles = [
    ['Officers', officers ?? 0],
    ['Events', events.length],
    ['People who attended', new Set(attended.map((a) => a.email)).size],
    ['Attendance rate', rate(attended.length, totalRsvps)],
  ] as const

  return (
    <Page title="Metrics">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label} className="space-y-1">
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        {byEvent.length === 0 ? (
          <p className="text-neutral-500">No events yet. RSVPs and sign-ins show up here once events have them.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-4 font-normal">Event</th>
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="py-2 pr-4 text-right font-normal">RSVPs</th>
                <th className="py-2 pr-4 text-right font-normal">Attended</th>
                <th className="py-2 pr-4 text-right font-normal">Rate</th>
                <th className="py-2 pr-4 text-right font-normal">New</th>
                <th className="py-2 text-right font-normal">Returning</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {byEvent.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 pr-4">{e.title}</td>
                  <td className="py-2 pr-4 whitespace-nowrap text-neutral-500">{pacific(e.starts_at)}</td>
                  <td className="py-2 pr-4 text-right">{e.rsvps}</td>
                  <td className="py-2 pr-4 text-right">{e.attended}</td>
                  <td className="py-2 pr-4 text-right">{rate(e.attended, e.rsvps)}</td>
                  <td className="py-2 pr-4 text-right">{e.new}</td>
                  <td className="py-2 text-right">{e.returning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-sm text-neutral-500">
        Rate is attended ÷ RSVPs. New means first time at any club event; walk-ins without an RSVP still count as attended.
      </p>
    </Page>
  )
}
