import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Cortina de entrada: una manzana que se pinta como un reloj, en dos segundos.
 *
 * Va dibujada en SVG y no como imagen: pesa nada, se ve nítida a cualquier
 * tamaño y toma el color del tema. El relleno avanza con una máscara cónica
 * animada, que es lo que da el barrido de manecilla.
 *
 * Se puede saltar con un clic o con cualquier tecla —nadie quiere esperar dos
 * segundos cada vez— y quien pide movimiento reducido no la ve en absoluto.
 */
const DURACION = 2000

export function Intro({ onTerminar }: { onTerminar: () => void }) {
  const reduce = useReducedMotion()
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    if (reduce) {
      onTerminar()
      return
    }
    const fin = window.setTimeout(() => setSaliendo(true), DURACION)
    const saltar = () => setSaliendo(true)
    window.addEventListener('keydown', saltar)
    return () => {
      window.clearTimeout(fin)
      window.removeEventListener('keydown', saltar)
    }
  }, [reduce, onTerminar])

  if (reduce) return null

  return (
    <motion.div
      onClick={() => setSaliendo(true)}
      animate={saliendo ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      onAnimationComplete={() => saliendo && onTerminar()}
      className="fixed inset-0 z-[60] grid cursor-pointer place-items-center bg-canvas"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-28 w-28">
          {/* Contorno: la manzana siempre visible, apenas insinuada. */}
          <Manzana className="absolute inset-0 h-full w-full text-primary opacity-25" />
          {/* Relleno: la misma forma, revelada por el barrido del reloj. */}
          <div className="absolute inset-0 animate-[barrido_2s_linear_forwards] [mask-image:conic-gradient(#000_var(--barrido),transparent_0)] [mask-size:100%_100%]">
            <Manzana className="h-full w-full text-primary" relleno />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-base font-semibold tracking-tight"
        >
          Agrícola El Bosque
        </motion.p>
      </div>
    </motion.div>
  )
}

function Manzana({ className, relleno = false }: { className?: string; relleno?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Cuerpo: dos lóbulos que se juntan, como una manzana de verdad. */}
      <path
        d="M32 20c-4-6-12-7-16-2-5 6-3 18 2 26 3 5 7 9 11 9 2 0 3-1 3-1s1 1 3 1c4 0 8-4 11-9 5-8 7-20 2-26-4-5-12-4-16 2Z"
        fill={relleno ? 'currentColor' : 'none'}
        fillOpacity={relleno ? 1 : 0}
      />
      {/* Hoja y tallo. */}
      <path d="M32 20v-7" />
      <path d="M32 14c5-4 11-3 12-3 0 1-1 7-6 8-3 1-6-2-6-5Z"
        fill={relleno ? 'currentColor' : 'none'} fillOpacity={relleno ? 1 : 0} />
    </svg>
  )
}
