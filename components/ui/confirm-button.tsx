'use client'

import type { ComponentProps } from 'react'
import { Button } from './index'

// A Button that asks first with the browser's own dialog. Put it inside a <form action={...}> for deletes.
export function ConfirmButton({ message, ...props }: ComponentProps<'button'> & { message: string }) {
  return <Button {...props} onClick={(e) => !confirm(message) && e.preventDefault()} />
}
