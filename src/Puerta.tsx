import { useEffect, useRef, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Intro } from '@/components/Intro'
import { Login } from '@/pages/Login'
import { CambiarClave } from '@/pages/CambiarClave'
import { useAuth } from '@/lib/auth'
import { router } from '@/router'

/**
 * Decide qué se muestra antes que cualquier módulo: pantalla de acceso, cambio
 * obligatorio de clave provisoria, o el sistema.
 */
export function Puerta() {
  const { sesion, listo, fallo } = useAuth()
  /* La cortina se muestra una vez por pestaña, no en cada recarga: durante el
     trabajo se recarga a menudo y dos segundos cada vez cansan. */
  const [introVista, setIntroVista] = useState(() => {
    try {
      return sessionStorage.getItem('aeb.intro') === 'vista'
    } catch {
      return true
    }
  })

  /**
   * Al iniciar sesión se aterriza en el Home, no en la pantalla que quedara en
   * la barra de direcciones.
   *
   * Se hace con `router.navigate` y no tocando el historial: el router guarda
   * su propia ubicación, así que cambiar la URL por fuera le movería la barra
   * de direcciones sin cambiarle la pantalla.
   */
  const sesionPrevia = useRef<typeof sesion>(null)
  const yaArranco = useRef(false)
  useEffect(() => {
    if (!listo) return
    /* El primer render con la sesión ya resuelta es el arranque, no un login:
       se anota y no se navega. Si no, recargar una pantalla cualquiera te
       devolvería al Home y los enlaces directos dejarían de funcionar. */
    if (!yaArranco.current) {
      yaArranco.current = true
      sesionPrevia.current = sesion
      return
    }
    if (!sesionPrevia.current && sesion) void router.navigate('/')
    sesionPrevia.current = sesion
  }, [sesion, listo])

  if (!introVista) {
    return (
      <Intro
        onTerminar={() => {
          try {
            sessionStorage.setItem('aeb.intro', 'vista')
          } catch {
            /* almacenamiento bloqueado */
          }
          setIntroVista(true)
        }}
      />
    )
  }

  // Sembrar la primera cuenta hashea, y eso es asíncrono. Sin esta espera se ve
  // el login por un instante aunque haya sesión guardada.
  if (!listo) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <p className="text-base text-ink-faint">Cargando…</p>
      </div>
    )
  }

  if (fallo) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-4">
        <p className="max-w-md rounded-md border border-line bg-warning-tint px-4 py-3 text-base text-warning-text">
          {fallo}
        </p>
      </div>
    )
  }

  if (!sesion) return <Login />
  if (sesion.provisoria) return <CambiarClave />
  return <RouterProvider router={router} />
}
