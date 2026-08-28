import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-faint',
  primary: 'bg-primary-tint text-primary-text',
  success: 'bg-success-tint text-success-text',
  warning: 'bg-warning-tint text-warning-text',
  danger: 'bg-danger-tint text-danger-text',
}

/** El color nunca va solo: todo chip lleva texto que dice lo mismo que el color. */
export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-2xs font-medium',
        TONE[tone],
      )}
    >
      {children}
    </span>
  )
}
