import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function Select({ label, className, children, ...rest }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-2xs font-medium text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        className={cn(
          'h-8 cursor-pointer rounded-sm border border-line-strong bg-surface px-2 text-base text-ink',
          'transition-colors duration-150 ease-out',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}
