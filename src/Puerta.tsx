import { RouterProvider } from 'react-router-dom'
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
