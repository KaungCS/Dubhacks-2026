import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jun owns this folder.
export default async function TemplatesPage() {
  await requireMembership()
  return (
    <Page title="Templates">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
}
