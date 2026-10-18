import { Button, Card, Page } from '@/components/ui'
import { NewPollForm } from '@/components/polls/new-poll-form'
import { requireMembership } from '@/lib/auth'
import { listPolls } from '@/lib/polls'
import { pacific } from '@/lib/polls/rules'
import { closePollAction, voteAction } from './actions'

const errors: Record<string, string> = {
  options: 'A poll needs a question and at least two different options.',
  closes: 'The close time has to be in the future.',
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export default async function PollsPage({ searchParams }: PageProps<'/polls'>) {
  const { user, workspace } = await requireMembership()
  const { error } = await searchParams
  const polls = await listPolls(workspace.id, user.id)

  return (
    <Page title="Polls">
      {typeof error === 'string' && errors[error] && <p className="text-sm text-red-600">{errors[error]}</p>}
      <NewPollForm />
      {polls.length === 0 && <p className="text-neutral-500">No polls yet.</p>}

      {polls.map((p) => (
        <Card key={p.id} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{p.question}</h2>
              <p className="text-sm text-neutral-500">
                {[
                  p.open ? (p.closesAt ? `Closes ${pacific(p.closesAt)}` : 'Open') : 'Closed',
                  `${plural(p.voterCount, 'officer')} voted`,
                  p.multipleChoice && 'several choices allowed',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {p.isCreator && p.open && (
              <form action={closePollAction}>
                <input type="hidden" name="id" value={p.id} />
                <Button>Close now</Button>
              </form>
            )}
          </div>

          <form action={voteAction} className="space-y-2">
            <input type="hidden" name="id" value={p.id} />
            {p.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                {p.open && (
                  <input
                    type={p.multipleChoice ? 'checkbox' : 'radio'}
                    name="option"
                    value={o.id}
                    defaultChecked={p.myVotes.includes(o.id)}
                    required={!p.multipleChoice}
                    className="accent-black"
                  />
                )}
                <span>{o.label}</span>
                {o.votes !== null && <span className="text-neutral-500">· {plural(o.votes, 'vote')}</span>}
                {!p.open && p.myVotes.includes(o.id) && <span className="text-neutral-500">· your vote</span>}
              </label>
            ))}
            {p.open && <Button>{p.myVotes.length ? 'Change vote' : 'Vote'}</Button>}
          </form>

          {!p.showResults && (
            <p className="text-sm text-neutral-500">
              {p.visibility === 'after_vote' ? 'Results show after you vote.' : 'Results show when the poll closes.'}
            </p>
          )}
          {p.nonVoters && p.nonVoters.length > 0 && (
            <p className="text-sm text-neutral-500">
              {p.open ? 'Not voted yet' : "Didn't vote"} (only you see this): {p.nonVoters.join(', ')}
            </p>
          )}
        </Card>
      ))}
    </Page>
  )
}
