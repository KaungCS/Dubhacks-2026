'use client'

import type { ReactNode } from 'react'
import { useLinkStatus } from 'next/link'

// Dims a link's label while the page it opens is loading, so a click shows at once. Use inside <Link>.
export function PendingLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus()
  return <span className={pending ? 'opacity-50' : undefined}>{children}</span>
}
