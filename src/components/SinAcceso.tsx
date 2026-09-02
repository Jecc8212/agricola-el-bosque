import { NavLink } from 'react-router-dom'
import { nombreRol, useAuth } from '@/lib/auth'

/** Ocultar el enlace no es control de acceso: la ruta también se cierra. */
export function SinAcceso({ seccion }: { seccion: string }) {
  const { sesion } = useAuth()
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Sin acceso a esta sección</h1>
      <p className="mt-2 text-base text-ink-faint">
        Su perfil {sesion ? `(${nombreRol(sesion.rol).toLowerCase()})` : ''} no tiene concedida
        la sección <strong className="text-ink-muted">{seccion}</strong>. Pídale acceso a quien
        administre el sistema.
      </p>
      <div className="mt-5">
        <NavLink to="/" className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-base font-medium text-on-primary">
          Volver al inicio
        </NavLink>
      </div>
    </div>
  )
}
