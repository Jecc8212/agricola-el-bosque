import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { useDialogo } from '@/lib/useDialogo'

/**
 * Diálogo en página. No se trae una librería para esto: el sistema ya tiene
 * `useDialogo` (foco atrapado, Escape, scroll bloqueado) y sus propios tokens,
 * y un modal ajeno se nota de inmediato por venir con otra tipografía.
 *
 * Entra animado y sale de golpe, a propósito. Con `exit` y `AnimatePresence` la
 * salida se quedaba a medias y el modal no llegaba a desmontarse: se apilaban
 * unos sobre otros y el clic siguiente caía en el diálogo equivocado. Un cierre
 * instantáneo no se echa de menos; un diálogo fantasma sí se nota.
 *
 * **El alto está acotado a la pantalla y sólo el cuerpo hace scroll.** Sin eso,
 * un formulario largo —la ficha de trabajador tiene trece campos— crecía más
 * que la ventana: al estar centrado, el título quedaba cortado por arriba, los
 * botones caían por debajo del borde y no había forma de llegar a ellos. La
 * cabecera y el pie se quedan quietos; lo que se mueve es el contenido.
 */
export function Modal({
  titulo, descripcion, children, pie, onCerrar, ancho = 'max-w-md',
}: {
  titulo: string
  descripcion?: ReactNode
  children?: ReactNode
  pie: ReactNode
  onCerrar: () => void
  ancho?: string
}) {
  const reduce = useReducedMotion()
  const panel = useDialogo(true, onCerrar)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="fixed inset-0 bg-papel-950/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onCerrar}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={panel as React.RefObject<HTMLDivElement>}
        tabIndex={-1}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${ancho} flex-col rounded-lg border border-line bg-surface-raised shadow-overlay`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="shrink-0 px-5 pb-4 pt-5">
          <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
          {descripcion && <p className="mt-1.5 text-base text-ink-faint">{descripcion}</p>}
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-1">{children}</div>}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 pb-5 pt-4">
          {pie}
        </div>
      </motion.div>
    </div>
  )
}

/** Confirmación destructiva. Dice qué se borra, no «¿está seguro?». */
export function ModalConfirmar({
  titulo, descripcion, confirmar = 'Eliminar', tono = 'danger', onConfirmar, onCerrar,
}: {
  titulo: string
  descripcion?: ReactNode
  confirmar?: string
  /** El rojo es sólo para lo que destruye; un alta se confirma en verde. */
  tono?: 'danger' | 'primary'
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <Modal
      titulo={titulo}
      descripcion={descripcion}
      onCerrar={onCerrar}
      pie={
        <>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button variant={tono} onClick={onConfirmar}>{confirmar}</Button>
        </>
      }
    />
  )
}
