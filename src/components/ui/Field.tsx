import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function Field({ label, hint, error, className, ...rest }: Props) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-8 rounded-sm border bg-surface px-2 text-base text-ink',
          'transition-colors duration-150 ease-out',
          'placeholder:text-ink-disabled',
          error ? 'border-danger' : 'border-line-strong',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${id}-err`} className="text-2xs text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-2xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
