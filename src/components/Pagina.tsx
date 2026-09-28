import type { ReactNode } from 'react'
import { Aparece } from '@/components/Aparece'

/** Encabezado común: título, para qué sirve la pantalla, y sus acciones. */
export function Pagina({
  titulo, descripcion, acciones, children,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <Aparece className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion && (
            <p className="mt-1 max-w-[70ch] text-base text-ink-faint">{descripcion}</p>
          )}
        </div>
        {acciones}
      </Aparece>
      <div className="mt-6">{children}</div>
    </>
  )
}
