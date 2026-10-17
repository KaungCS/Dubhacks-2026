import { redirect } from 'next/navigation'
import { Button, Page } from '@/components/ui'
import { getContext, safePath } from '@/lib/auth'
import { signIn } from '../actions'

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const { next: rawNext, error } = await searchParams
  const next = safePath(rawNext)
  if (await getContext()) redirect(next)
  return (
    <Page title="Club Ops">
      <p>Sign in with the Google account you use for your club.</p>
      <form action={signIn}>
        <input type="hidden" name="next" value={next} />
        <Button>Sign in with Google</Button>
      </form>
      {error && <p className="text-sm text-red-600">Sign-in failed. Try again.</p>}
    </Page>
  )
}
