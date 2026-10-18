import type { ComponentProps, ReactNode } from 'react'

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
