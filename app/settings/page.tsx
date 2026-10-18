import { redirect } from 'next/navigation'
import { Button, buttonClass, Card, Input, Page, Select } from '@/components/ui'
import { getContext } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { signOut } from '../(auth)/actions'
import { createWorkspace, removeMember, saveSharedDrive, switchWorkspace, updateMember } from './actions'

const errors: Record<string, string> = {
  google: 'Connecting Google failed or was cancelled. Try again.',
  scopes: 'Google access was only partly granted. Reconnect and leave every permission checked.',
  drive: "Couldn't open that drive or folder. Check the link and that you have access to it. If you connected Google before the switch to full Drive access, reconnect first.",
  'not-folder': "That link isn't a folder. Paste a link to a shared drive or a Drive folder.",
}

export default async function SettingsPage({ searchParams }: PageProps<'/settings'>) {
  const ctx = await getContext()
  if (!ctx) redirect('/sign-in?next=/settings')
  const { error } = await searchParams
  const account = (
    <Card className="flex items-center justify-between gap-4">
      <p className="text-sm">Signed in as {ctx.user.email}</p>
      <form action={signOut}>
        <Button>Sign out</Button>
      </form>
    </Card>
  )

  if (!ctx.current) {
    return (
      <Page title="Set up your club">
        <p className="text-neutral-500">Officers: open the invite link your club admin sent you.</p>
        <Card>
          <form action={createWorkspace} className="flex flex-wrap gap-2">
            <Input name="name" placeholder="Club name" aria-label="Club name" required />
            <Input name="school" placeholder="School" aria-label="School" />
            <Button>Create club</Button>
          </form>
        </Card>
        {account}
      </Page>
    )
  }

  const { workspace, role, user_id: myId } = ctx.current
  const isAdmin = role === 'admin'
  const { data: members } = await getDb()
    .from('memberships')
    .select('id, user_id, role, title, user:users(name, email)')
    .eq('workspace_id', workspace.id)
    .is('left_at', null)
    .order('joined_at')

  return (
    <Page title="Settings">
      {typeof error === 'string' && errors[error] && <p className="text-sm text-red-600">{errors[error]}</p>}

      <Card className="space-y-1">
        <h2 className="font-semibold">{workspace.name}</h2>
        {workspace.school && <p className="text-sm text-neutral-500">{workspace.school}</p>}
      </Card>

      {ctx.memberships.length > 1 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Your clubs</h2>
          {ctx.memberships.map((m) => (
            <form key={m.id} action={switchWorkspace} className="flex items-center justify-between">
              <span className="text-sm">{m.workspace.name}</span>
              <input type="hidden" name="id" value={m.workspace_id} />
              <Button disabled={m.workspace_id === workspace.id}>Switch</Button>
            </form>
          ))}
        </Card>
      )}

      {isAdmin && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Google</h2>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              {workspace.google_connected ? 'Connected. Calendar, Drive, Forms and Sheets run as the admin who connected.' : 'Not connected.'}
            </p>
            {/* Plain <a>: this route redirects to Google, which client-side navigation can't follow. */}
            <a href="/settings/google" className={buttonClass}>
              {workspace.google_connected ? 'Reconnect' : 'Connect Google'}
            </a>
          </div>
          <p className="text-sm">Club calendar: {workspace.calendar_id ? 'created and shared with officers' : 'created when you connect'}</p>
          <form action={saveSharedDrive} className="flex flex-wrap items-center gap-2">
            <Input
              name="drive"
              defaultValue={workspace.shared_drive_id ?? ''}
              placeholder="Shared drive or folder link"
              aria-label="Shared drive or folder link"
              className="min-w-72 flex-1"
              required
            />
            <Button disabled={!workspace.google_connected}>Save shared drive</Button>
          </form>
        </Card>
      )}

      {isAdmin && (
        <Card className="space-y-2">
          <h2 className="font-semibold">Invite officers</h2>
          <p className="text-sm text-neutral-500">Send this link to your officers. Anyone with it can join as an officer.</p>
          <Input readOnly value={`${process.env.APP_URL}/join/${workspace.invite_code}`} aria-label="Invite link" className="w-full" />
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">Officers</h2>
        {members?.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3">
            <div className="text-sm">
              <p>{m.user.name ?? m.user.email}</p>
              <p className="text-neutral-500">{m.user.email}</p>
            </div>
            {isAdmin ? (
              <form action={updateMember} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <Input name="title" defaultValue={m.title ?? ''} placeholder="Title, e.g. Treasurer" aria-label="Title" />
                {m.user_id === myId ? (
                  <span className="px-2 text-sm">Admin</span>
                ) : (
                  <Select name="role" defaultValue={m.role} aria-label="Role">
                    <option value="officer">Officer</option>
                    <option value="admin">Admin</option>
                  </Select>
                )}
                <Button>Save</Button>
                {m.user_id !== myId && <Button formAction={removeMember}>Remove</Button>}
              </form>
            ) : (
              <p className="text-sm text-neutral-500">
                {[m.title, m.role === 'admin' ? 'Admin' : 'Officer'].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </Card>

      {account}
    </Page>
  )
}
