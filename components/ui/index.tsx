import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { PendingLabel } from './pending-label'

// Shared look (see "Design" in TEAM_PLAN.md). Use these instead of styling your own.
// For a link that looks like a button: <Link className={buttonClass} href="...">.

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

export const buttonClass = `inline-flex items-center justify-center rounded-full border border-black bg-white px-4 py-1.5 text-sm text-black hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-40 ${focus}`

// No rounding here: two rounded-* classes on one element conflict, and Tailwind's stylesheet order (not
// class order) picks the winner. Each field adds its own.
const fieldClass = `border border-black bg-white px-4 py-1.5 text-sm text-black outline-none ${focus}`

export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return <button className={`${buttonClass} ${className}`} {...props} />
}

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${fieldClass} rounded-full ${className}`} {...props} />
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${fieldClass} rounded-full ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${fieldClass} rounded-2xl ${className}`} {...props} />
}

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-2xl border border-neutral-200 bg-white p-6 ${className}`} {...props} />
}

export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  )
}

// Big-number card for dashboards: a label, the number, and an optional small line under it.
export function StatCard({ label, value, note, className = '', children }: { label: string; value: ReactNode; note?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white p-5 ${className}`}>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-xs text-neutral-600">{note}</p> : null}
      {children}
    </section>
  )
}

// Small outlined label for status. Color only for meaning: green done, red overdue.
const tagTones = { neutral: 'border-neutral-300 text-neutral-700', done: 'border-green-700 text-green-700', late: 'border-red-700 text-red-700' }
export function Tag({ tone = 'neutral', children }: { tone?: keyof typeof tagTones; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${tagTones[tone]}`}>{children}</span>
}

// Thin black bar on light grey; value and max are counts.
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-1 rounded-full bg-neutral-200">
      <div className="h-1 rounded-full bg-black" style={{ width: `${pct}%` }} />
    </div>
  )
}

// Segmented control made of links, so server pages can switch views with a search param. The clicked
// tab dims until its view arrives.
export function Tabs({ items, current, label }: { items: { key: string; label: string; href: string }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="flex max-w-full flex-wrap gap-1 self-start rounded-full bg-neutral-100 p-1">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? 'page' : undefined}
          className={`rounded-full border px-4 py-1.5 text-sm ${t.key === current ? 'border-black bg-white text-black' : 'border-transparent text-neutral-700 hover:text-black'} ${focus}`}
        >
          <PendingLabel>{t.label}</PendingLabel>
        </Link>
      ))}
    </nav>
  )
}

// What a page shows while its data loads (each route's loading.tsx), so a click answers right away.
// Flat grey blocks in the shape of a page; no animation.
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 rounded-full bg-neutral-100" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-24 rounded-2xl bg-neutral-100" />
        <div className="h-24 rounded-2xl bg-neutral-100" />
        <div className="h-24 rounded-2xl bg-neutral-100" />
      </div>
      <div className="h-64 rounded-2xl bg-neutral-100" />
    </div>
  )
}
