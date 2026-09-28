import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Marca } from '@/components/Marca'
import { CUENTAS_INICIALES, ROL_NOMBRE, useAuth } from '@/lib/auth'

/**
 * Fondo del acceso: un campo al atardecer, dibujado.
 *
 * Va en SVG y no como fotografía por tres razones prácticas: no hay que
 * descargar nada al abrir, se ve nítido en cualquier pantalla, y toma los
 * colores del tema —así el modo oscuro no queda con una foto luminosa detrás.
 */
function Paisaje() {
  return (
    <svg
      aria-hidden="true" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-surface-sunken)" />
          <stop offset="100%" stopColor="var(--color-canvas)" />
        </linearGradient>
      </defs>

      <rect width="1200" height="800" fill="url(#cielo)" />

      {/* Cerros al fondo, cada vez más tenues: es lo que da profundidad. */}
      <path d="M0 470 Q 180 380 360 450 T 720 430 T 1200 460 V800 H0Z"
        fill="currentColor" className="text-primary" opacity="0.07" />
      <path d="M0 540 Q 240 460 480 520 T 960 500 T 1200 530 V800 H0Z"
        fill="currentColor" className="text-primary" opacity="0.10" />

      {/* Hileras del cultivo, en perspectiva hacia el horizonte. */}
      {Array.from({ length: 9 }, (_, i) => {
        const y = 580 + i * 26
        return (
          <path
            key={i}
            d={`M${-80 + i * 14} 800 Q 600 ${y} ${1280 - i * 14} 800`}
            fill="none" stroke="currentColor" className="text-primary"
            strokeWidth={1 + i * 0.3} opacity={0.05 + i * 0.012}
          />
        )
      })}

      {/* Tres árboles, recortados contra los cerros. */}
      {[{ x: 170, e: 1 }, { x: 1010, e: 0.8 }, { x: 880, e: 0.55 }].map(({ x, e }) => (
        <g key={x} transform={`translate(${x} 560) scale(${e})`} opacity="0.16">
          <path d="M0 0 L-34 -46h17L-26 -92h16L0 -132l10 40h16L-9 -46h17Z"
            fill="currentColor" className="text-primary" />
          <rect x="-3" y="0" width="6" height="26" fill="currentColor" className="text-primary" />
        </g>
      ))}
    </svg>
  )
}

export function Login() {
  const { entrar, usuarios } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  /* Cada cuenta se muestra sólo mientras conserve su clave de arranque. En
     cuanto alguien la cambia, desaparece de aquí: dejar una clave escrita en la
     pantalla de acceso después de eso sería regalarla. */
  const sinEstrenar = CUENTAS_INICIALES.filter((c) =>
    usuarios.some((u) => u.usuario === c.usuario && u.provisoria),
  )

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const r = await entrar(usuario, clave)
    setEnviando(false)
    if (!r.ok) setError(r.error ?? 'No se pudo entrar')
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <Paisaje />

      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <Marca className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Agrícola El Bosque</h1>
          <p className="mt-1 text-base text-ink-faint">Sistema de gestión</p>
        </div>

        <form
          onSubmit={enviar}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-surface/95 p-5 shadow-lg backdrop-blur-sm"
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

        {sinEstrenar.length > 0 && (
          <div className="mt-4 rounded-md border border-line bg-warning-tint px-3 py-2.5">
            <p className="text-2xs font-semibold tracking-wide text-warning-text">
              CUENTAS DE ARRANQUE
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {sinEstrenar.map((c) => (
                <li key={c.usuario} className="text-sm text-warning-text">
                  <button
                    type="button"
                    onClick={() => { setUsuario(c.usuario); setClave(c.clave); setError('') }}
                    className="cursor-pointer text-left underline underline-offset-2"
                  >
                    <strong>{c.usuario}</strong> · {c.clave}
                  </button>
                  <span className="ml-1 opacity-80">— {ROL_NOMBRE[c.rol]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-warning-text opacity-90">
              El sistema pide cambiar la contraseña al entrar; en cuanto se cambia, la cuenta
              deja de aparecer aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
