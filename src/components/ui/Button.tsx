import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-on-danger hover:bg-danger-hover',
}

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-base gap-2',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-sm font-medium',
        // Emil: propiedades explícitas, nunca `all`. La presión escala 0.97 en 160ms.
        'transition-[background-color,color,border-color,transform] duration-150 ease-out',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}
