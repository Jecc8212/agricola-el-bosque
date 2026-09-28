import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Entrada suave y escalonada para listas y tarjetas.
 *
 * El desplazamiento es de 8 píxeles y dura menos de 300 ms: lo justo para que
 * el ojo siga de dónde salió cada cosa. Más que eso se vuelve espera, y esta es
 * una herramienta que se usa ocho horas al día.
 *
 * Quien pide movimiento reducido recibe sólo la opacidad: se conserva lo que
 * comunica y se elimina lo que desplaza.
 */
export function Aparece({
  children, retraso = 0, className,
}: {
  children: ReactNode
  /** Posición en la lista. El escalonado se detiene a los ocho elementos. */
  retraso?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(retraso, 8) * 0.04,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
