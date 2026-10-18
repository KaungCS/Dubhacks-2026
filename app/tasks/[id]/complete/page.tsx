import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button, buttonClass, Card, Page } from '@/components/ui'
import { setCompletionAction } from '@/app/tasks/actions'
import { requireMembership, safePath } from '@/lib/auth'
import { getTask, listOfficers } from '@/lib/tasks'
import { canSetCompletion, deriveStatus, PREREQ_COOLDOWN_MS, prereqNotifyDue } from '@/lib/tasks/rules'

// Confirms one completion change (?assignee=<user id>, or none for an unassigned task), so a stray click
// can't mark anything done or notify anyone.
export default async function CompleteTaskPage({ params, searchParams }: PageProps<'/tasks/[id]/complete'>) {
  const { user, membership, workspace } = await requireMembership()
  const { id } = await params
  const { assignee, back } = await searchParams
  const [task, officers] = await Promise.all([getTask(workspace.id, id), listOfficers(workspace.id)])
  if (!task) notFound()
  const assigneeId = typeof assignee === 'string' && assignee ? assignee : null
  const row = task.assignees.find((a) => a.user_id === assigneeId)
  if (assigneeId ? !row : task.assignees.length) notFound()

  const backTo = typeof back === 'string' ? safePath(back) : `/tasks/${task.id}`
  const allowed = canSetCompletion({ id: user.id, isAdmin: membership.role === 'admin' }, assigneeId)
  const cancel = (
    <Link className={buttonClass} href={backTo}>
      {allowed ? 'Cancel' : 'Back'}
    </Link>
  )
  if (!allowed) {
    return (
      <Page title="Not allowed">
        <Card className="space-y-4">
          <p>Only an admin can change someone else&apos;s completion.</p>
          {cancel}
        </Card>
      </Page>
    )
  }

  const names = new Map(officers.map((o) => [o.id, o.name]))
  const done = row ? !row.completed_at : task.status !== 'done'
  const who = assigneeId === user.id ? 'you' : assigneeId ? (names.get(assigneeId) ?? 'a former officer') : null
  const finishes =
    done && (!row || deriveStatus(task.assignees.map((a) => (a === row ? { ...a, completed_at: 'now' } : a))) === 'done')
  const tagged = task.tags.map((t) => names.get(t.user_id) ?? 'a former officer')
  const minutes = PREREQ_COOLDOWN_MS / 60_000

  return (
    <Page title={done ? 'Mark done?' : 'Mark not done?'}>
      <Card className="space-y-4">
        <p>
          Mark <span className="font-semibold">{task.title}</span> {done ? 'done' : 'not done'}
          {who && ` for ${who}`}?
        </p>
        {finishes && task.is_prereq && tagged.length > 0 && (
          <p className="text-sm text-neutral-500">
            {prereqNotifyDue(task.prereq_notified_at)
              ? `This finishes the task, so ${tagged.join(', ')} will be notified.`
              : `${tagged.join(', ')} were notified in the last ${minutes} minutes, so they won't be notified again yet.`}
          </p>
        )}
        <form action={setCompletionAction} className="flex gap-2">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="assignee" value={assigneeId ?? ''} />
          <input type="hidden" name="done" value={String(done)} />
          <input type="hidden" name="back" value={backTo} />
          <Button>Confirm</Button>
          {cancel}
        </form>
      </Card>
    </Page>
  )
}
