import { useId } from 'react'
import { NavLink } from 'react-router-dom'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { aplanar, useMaestros } from '@/lib/maestros'
import { etiquetaMes, mesesDisponibles } from '@/lib/mes'
import type { Nodo } from '@/lib/maestros'
import { cn } from '@/lib/cn'

/** Etiqueta al costado y no encima: en una barra horizontal, apilarlas
 *  duplicaría la altura del cromo fijo de cada pantalla. */
function Filtro({
  etiqueta, valor, onChange, opciones, etiquetaTodos, vacio, bloqueado,
}: {
  etiqueta: string
  valor: string
  onChange: (v: string) => void
  opciones: Nodo[]
  etiquetaTodos: string
  vacio?: string
  bloqueado?: boolean
}) {
  const id = useId()
  const filas = aplanar(opciones)
  const activo = valor !== TODOS

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="shrink-0 text-2xs font-medium tracking-wide text-ink-faint">
        {etiqueta.toUpperCase()}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={bloqueado || filas.length === 0}
        title={bloqueado ? 'Su perfil está acotado a este campo' : undefined}
        className={cn(
          'h-8 w-40 cursor-pointer rounded-sm border bg-surface px-2 text-base text-ink sm:w-48',
          'transition-colors duration-150 ease-out disabled:cursor-default disabled:text-ink-disabled',
          activo ? 'border-primary font-medium' : 'border-line-strong',
        )}
      >
        <option value={TODOS}>{filas.length === 0 ? (vacio ?? 'Sin definir') : etiquetaTodos}</option>
        {filas.map(({ nodo, nivel }) => (
          <option key={nodo.id} value={nodo.id}>
            {`${'— '.repeat(nivel)}${nodo.nombre}`}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * El filtro no es de una página: acota todo el sistema a la vez. Vive pegado
 * bajo la cabecera y sigue visible al hacer scroll — un filtro que se pierde de
 * vista es un filtro que se olvida puesto.
 */
export function BarraFiltros() {
  const { maestros } = useMaestros()
  const {
    temporadaId, campoId, centroCostoId, campoBloqueado, mes,
    setTemporadaId, setCampoId, setCentroCostoId, setMes,
  } = useContextoOperacion()

  const activos = [temporadaId, campoBloqueado ? TODOS : campoId, centroCostoId]
    .filter((v) => v !== TODOS).length

  return (
    <section
      aria-label="Filtros del sistema"
      className="sticky top-12 z-10 border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur-sm sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* El embudo ancla la barra: sin él, una fila de selects bajo la
            cabecera se lee como contenido de la página. */}
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-faint" fill="none"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M3 5h18l-7 8v6l-4 2v-8Z" />
        </svg>

        <Filtro
          etiqueta="Temporada" valor={temporadaId} onChange={setTemporadaId}
          opciones={maestros.temporadas} etiquetaTodos="Todas las temporadas"
        />
        <Filtro
          etiqueta="Campo" valor={campoId} onChange={setCampoId}
          opciones={maestros.campos} etiquetaTodos="Todos los campos"
          bloqueado={campoBloqueado}
        />
        <Filtro
          etiqueta="Centro de costo" valor={centroCostoId} onChange={setCentroCostoId}
          opciones={maestros.centrosCosto} etiquetaTodos="Todos los centros"
          vacio="Aún sin centros de costo"
        />

        {/* El mes manda sobre todo lo que se mide: costo, liquidación e
            indicadores. Por eso vive aquí y no repetido en cada pantalla. */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filtro-mes" className="shrink-0 text-2xs font-medium tracking-wide text-ink-faint">
            MES
          </label>
          <select
            id="filtro-mes" value={mes} onChange={(e) => setMes(e.target.value)}
            className={cn(
              'h-8 w-40 cursor-pointer rounded-sm border border-line-strong bg-surface px-2 text-base text-ink',
              'transition-colors duration-150 ease-out',
            )}
          >
            {mesesDisponibles().map((m) => <option key={m} value={m}>{etiquetaMes(m)}</option>)}
          </select>
        </div>

        {activos > 0 && (
          <button
            type="button"
            onClick={() => {
              setTemporadaId(TODOS)
              setCampoId(TODOS)
              setCentroCostoId(TODOS)
            }}
            className="cursor-pointer text-2xs text-primary-text underline underline-offset-2 transition-colors duration-150 hover:text-ink"
          >
            Limpiar ({activos})
          </button>
        )}

        {maestros.centrosCosto.length === 0 && (
          <NavLink to="/maestros/centros-costo"
            className="text-2xs text-primary-text underline underline-offset-2">
            Cargar centros de costo
          </NavLink>
        )}
      </div>
    </section>
  )
}
