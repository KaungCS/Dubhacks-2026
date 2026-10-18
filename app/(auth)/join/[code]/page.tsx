import { notFound, redirect } from 'next/navigation'
import { Button, Page } from '@/components/ui'
import { getContext, getInviteByCode, summarizePermissions, parsePermissions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { joinWorkspace } from '../../actions'

const errors: Record<string, string> = {
  'role-inactive':
    'This invite’s role was deactivated or deleted. Ask an admin to update the invite with an active role.',
  'invite-used': 'This invite link was already used or revoked. Ask an admin for a new one.',
}

// Invite link: admins share /join/<code> — either a role invite or the legacy workspace code.
export default async function JoinPage({
  params,
  searchParams,
}: PageProps<'/join/[code]'>) {
  const { code } = await params
  const sp = await searchParams
  const error = typeof sp.error === 'string' ? sp.error : undefined
  if (!(await getContext())) redirect(`/sign-in?next=${encodeURIComponent(`/join/${code}`)}`)

  const invite = await getInviteByCode(code)
  if (invite) {
    const role = Array.isArray(invite.role) ? invite.role[0] : invite.role
    const workspace = Array.isArray(invite.workspace) ? invite.workspace[0] : invite.workspace
    if (!workspace) notFound()
    const perms = parsePermissions(role?.permissions)
    return (
      <Page title={`Join ${workspace.name}`}>
        {'school' in workspace && workspace.school && <p className="text-neutral-500">{workspace.school}</p>}
        {error && errors[error] && <p className="text-sm text-red-600">{errors[error]}</p>}
        {!error && role && !role.is_active && (
          <p className="text-sm text-red-600">{errors['role-inactive']}</p>
        )}
        <p>
          You&apos;ll join as <strong>{role?.name ?? 'a member'}</strong>
          {perms.length ? ` — ${summarizePermissions(perms)}` : ''}.
        </p>
        <p className="text-sm text-neutral-500">You&apos;ll get access to the club&apos;s shared drive and calendar.</p>
        {role?.is_active && !invite.revoked_at && !invite.accepted_at ? (
          <form action={joinWorkspace}>
            <input type="hidden" name="code" value={code} />
            <Button>Join</Button>
          </form>
        ) : null}
      </Page>
    )
  }

  const { data: ws } = await getDb().from('workspaces').select('name, school').eq('invite_code', code).maybeSingle()
  if (!ws) notFound()
  return (
    <Page title={`Join ${ws.name}`}>
      {ws.school && <p className="text-neutral-500">{ws.school}</p>}
      {error && errors[error] && <p className="text-sm text-red-600">{errors[error]}</p>}
      <p>You&apos;ll join as an Officer and get access to the club&apos;s shared drive and calendar.</p>
      <form action={joinWorkspace}>
        <input type="hidden" name="code" value={code} />
        <Button>Join</Button>
      </form>
    </Page>
  )
}
