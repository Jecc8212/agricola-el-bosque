import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useAuth } from '@/lib/auth'

export function Login() {
  const { entrar, usuarios } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  /* Si nadie cambió todavía la clave de la primera cuenta, hay que decir cuál
     es: si no, el sistema queda cerrado sin forma de entrar. */
  const sinEstrenar = usuarios.length === 1 && usuarios[0].provisoria

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const r = await entrar(usuario, clave)
    setEnviando(false)
    if (!r.ok) setError(r.error ?? 'No se pudo entrar')
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Agrícola El Bosque</h1>
          <p className="mt-1 text-base text-ink-faint">Sistema de gestión</p>
        </div>

        <form
          onSubmit={enviar}
          className="mt-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-5"
        >
          <Field
            label="Usuario" autoFocus autoComplete="username"
            value={usuario} onChange={(e) => { setUsuario(e.target.value); setError('') }}
          />
          <Field
            label="Contraseña" type="password" autoComplete="current-password"
            value={clave} onChange={(e) => { setClave(e.target.value); setError('') }}
          />

          {error && (
            <p role="alert" className="rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={enviando} className="mt-1 w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        {sinEstrenar && (
          <p className="mt-4 rounded-md border border-line bg-warning-tint px-3 py-2.5 text-sm text-warning-text">
            Primera cuenta: usuario <strong>admin</strong>, contraseña <strong>Admin2026</strong>.
            El sistema pedirá cambiarla al entrar.
          </p>
        )}
      </div>
    </div>
  )
}
