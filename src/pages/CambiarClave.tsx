import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'

/** Una clave que puso otra persona no es secreta. Se cambia antes de entrar. */
export function CambiarClave() {
  const { sesion, cambiarClave, salir } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (nueva !== repetida) return setError('Las dos contraseñas nuevas no coinciden')
    const r = await cambiarClave(actual, nueva)
    if (!r.ok) setError(r.error ?? 'No se pudo cambiar')
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Cambia tu contraseña</h1>
        <p className="mt-1 text-base text-ink-faint">
          Hola {sesion?.nombre}. La contraseña con la que entraste la puso otra persona:
          elige una propia antes de seguir.
        </p>

        <form onSubmit={enviar} className="mt-5 flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <Field label="Contraseña actual" type="password" autoComplete="current-password" autoFocus
            value={actual} onChange={(e) => { setActual(e.target.value); setError('') }} />
          <Field label="Nueva contraseña" type="password" autoComplete="new-password"
            hint="Al menos 8 caracteres."
            value={nueva} onChange={(e) => { setNueva(e.target.value); setError('') }} />
          <Field label="Repite la nueva" type="password" autoComplete="new-password"
            value={repetida} onChange={(e) => { setRepetida(e.target.value); setError('') }} />

          {error && (
            <p role="alert" className="rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="mt-1 w-full">Guardar y entrar</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={salir}>Cerrar sesión</Button>
        </form>
      </div>
    </div>
  )
}
