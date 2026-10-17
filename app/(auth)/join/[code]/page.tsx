import { notFound, redirect } from 'next/navigation'
import { Button, Page } from '@/components/ui'
import { getContext } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { joinWorkspace } from '../../actions'

// Invite link: admins share /join/<invite_code> with officers.
export default async function JoinPage({ params }: PageProps<'/join/[code]'>) {
  const { code } = await params
  if (!(await getContext())) redirect(`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`)
  const { data: ws } = await getDb().from('workspaces').select('name, school').eq('invite_code', code).maybeSingle()
  if (!ws) notFound()
  return (
    <Page title={`Join ${ws.name}`}>
      {ws.school && <p className="text-neutral-500">{ws.school}</p>}
      <p>You&apos;ll join as an officer and get access to the club&apos;s shared drive and calendar.</p>
      <form action={joinWorkspace}>
        <input type="hidden" name="code" value={code} />
        <Button>Join</Button>
      </form>
    </Page>
  )
}
