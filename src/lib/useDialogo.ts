import { useEffect, useRef } from 'react'

const FOCUSABLES =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Comportamiento de diálogo modal: cierra con Escape, mueve el foco adentro al
 * abrir, lo atrapa mientras está abierto y lo devuelve a donde estaba al cerrar.
 * Además bloquea el scroll del fondo compensando el ancho de la barra, para que
 * el contenido no salte al abrir.
 */
export function useDialogo(abierto: boolean, alCerrar: () => void) {
  const panel = useRef<HTMLElement>(null)
  const origen = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!abierto) return

    origen.current = document.activeElement as HTMLElement | null

    const nodo = panel.current
    const primero = nodo?.querySelector<HTMLElement>(FOCUSABLES)
    ;(primero ?? nodo)?.focus()

    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrar()
        return
      }
      if (e.key !== 'Tab' || !nodo) return

      const focusables = [...nodo.querySelectorAll<HTMLElement>(FOCUSABLES)].filter(
        (el) => el.offsetParent !== null,
      )
      if (focusables.length === 0) return

      const inicio = focusables[0]
      const fin = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault()
        fin.focus()
      } else if (!e.shiftKey && document.activeElement === fin) {
        e.preventDefault()
        inicio.focus()
      }
    }

    document.addEventListener('keydown', alTeclado)

    const anchoBarra = window.innerWidth - document.documentElement.clientWidth
    const overflowPrevio = document.body.style.overflow
    const paddingPrevio = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`

    return () => {
      document.removeEventListener('keydown', alTeclado)
      document.body.style.overflow = overflowPrevio
      document.body.style.paddingRight = paddingPrevio
      origen.current?.focus()
    }
  }, [abierto, alCerrar])

  return panel
}
