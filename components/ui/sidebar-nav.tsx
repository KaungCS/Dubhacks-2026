'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { nav } from '@/lib/nav'

// Pages without their own sidebar entry light up their parent.
const aliases: Record<string, string> = { '/calendar': '/events', '/metrics': '/' }

function isActive(href: string, pathname: string) {
  const path = aliases[pathname] ?? pathname
  return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)
}

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex flex-row flex-wrap gap-0.5 md:flex-col">
      {nav.map((group) => (
        <div key={group.label ?? 'top'} className="contents md:flex md:flex-col md:gap-0.5">
          {group.label ? <p className="hidden px-3 pb-1 pt-4 text-xs text-neutral-600 md:block">{group.label}</p> : null}
          {group.items.map((item) => {
            const active = isActive(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-black ${active ? 'bg-neutral-200/70 font-semibold text-black' : 'text-neutral-800 hover:bg-neutral-100'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
