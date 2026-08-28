import { useId, useMemo } from 'react'
import { useContextoOperacion } from '@/lib/contexto'
import type { CampoSeleccion } from '@/lib/contexto'
import { TEMPORADAS, etiquetaTemporada, mesesDeTemporada } from '@/lib/temporada'
import type { Temporada } from '@/lib/temporada'
import { CAMPOS, CAMPO_LABEL } from '@/lib/types'

function Segmento({
  etiqueta,
  valor,
  onChange,
  children,
  ancho,
}: {
  etiqueta: string
  valor: string
  onChange: (v: string) => void
  children: React.ReactNode
  ancho: string
}) {
  const id = useId()
  return (
    <div className="relative flex min-w-0 flex-1 items-center lg:flex-none">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${ancho} h-8 cursor-pointer appearance-none bg-transparent pl-2.5 pr-7 text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-surface-sunken`}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-faint"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/**
 * Contexto de operación, no filtros de página. Temporada, mes y campo acotan
 * todo el sistema a la vez: la tarja, el costeo y el cierre miran siempre el
 * mismo recorte. Por eso vive en la cabecera y no dentro de cada módulo.
 */
export function FranjaContexto() {
  const { temporada, mes, campo, setTemporada, setMes, setCampo } = useContextoOperacion()
  const meses = useMemo(() => mesesDeTemporada(temporada), [temporada])

  return (
    <div
      role="group"
      aria-label="Contexto de operación"
      className="flex w-full divide-x divide-line rounded-sm border border-line-strong bg-surface lg:w-auto"
    >
      <Segmento
        etiqueta="Temporada"
        valor={temporada}
        onChange={(v) => setTemporada(v as Temporada)}
        ancho="lg:w-32"
      >
        {TEMPORADAS.map((t) => (
          <option key={t} value={t}>
            {etiquetaTemporada(t)}
          </option>
        ))}
      </Segmento>

      <Segmento etiqueta="Mes" valor={mes} onChange={setMes} ancho="lg:w-40">
        {meses.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.label}
          </option>
        ))}
      </Segmento>

      <Segmento
        etiqueta="Campo"
        valor={campo}
        onChange={(v) => setCampo(v as CampoSeleccion)}
        ancho="lg:w-44"
      >
        <option value="TODOS">Todos los campos</option>
        {CAMPOS.map((c) => (
          <option key={c} value={c}>
            {CAMPO_LABEL[c]}
          </option>
        ))}
      </Segmento>
    </div>
  )
}
