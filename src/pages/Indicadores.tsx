import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { Chip } from '@/components/ui/Chip'
import { Pagina } from '@/components/Pagina'
import { BarraDatos } from '@/components/BarraDatos'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { CLP } from '@/lib/formato'
import { etiquetaMes } from '@/lib/mes'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import { liquidar } from '@/lib/sueldo'
import type { Fila } from '@/lib/planilla'

const num = (n: number, dec = 1) =>
  n.toLocaleString('es-CL', { maximumFractionDigits: dec })

interface Indicador {
  id: string
  nombre: string
  campo: string
  especie: string
  hectareas: number
  plantas: number
  densidad: number
  costoManoObra: number
  costoPorHectarea: number
  jornadas: number
}

/**
 * Indicadores por hectárea, según la ficha de KPI.
 *
 * Todos los indicadores de la ficha dividen por **hectáreas productivas**, así
 * que un centro de costo sin superficie cargada no puede aparecer: se lista
 * aparte para que se vea qué falta, en vez de mostrar una división por cero
 * disfrazada de cero.
 */
export default function Indicadores() {
  const { maestros, asistencia, trabajadores } = useMaestros()
  const { campoId, temporadaId, mes } = useContextoOperacion()

  const { conSuperficie, sinSuperficie } = useMemo(() => {
    const delMes = asistencia.filter((r) => {
      if (!r.fecha.startsWith(mes)) return false
      if (temporadaId !== TODOS && r.temporadaId !== temporadaId) return false
      return true
    })
    const porRut = new Map(trabajadores.map((t) => [t.rut, t]))

    const todos = aplanar(maestros.centrosCosto)
      .filter(({ nodo }) => campoId === TODOS || nodo.campoId === campoId)
      .map(({ nodo }): Indicador => {
        const suyos = new Set([nodo.id, ...aplanar(nodo.hijos).map((f) => f.nodo.id)])
        const registros = delMes.filter((r) => suyos.has(r.centroCostoId))

        /* La mano de obra se valoriza con la misma regla que la liquidación: si
           dijeran cosas distintas, el costo por hectárea no cuadraría con lo
           que de verdad se paga. */
        let costoManoObra = 0
        let jornadas = 0
        for (const rut of new Set(registros.map((r) => r.rut))) {
          const persona = porRut.get(rut)
          if (!persona) continue
          const liq = liquidar(
            persona, registros.filter((r) => r.rut === rut),
            maestros.modalidades, maestros.labores,
          )
          costoManoObra += liq.total
          jornadas += liq.diasTrabajados
        }

        const hectareas = nodo.hectareas ?? 0
        const plantas = nodo.plantas ?? 0
        return {
          id: nodo.id,
          nombre: nodo.nombre,
          campo: buscarNodo(maestros.campos, nodo.campoId)?.nombre ?? '—',
          especie: [
            buscarNodo(maestros.especies, nodo.especieId)?.nombre,
            buscarNodo(maestros.especies, nodo.variedadId)?.nombre,
          ].filter(Boolean).join(' · ') || '—',
          hectareas, plantas,
          densidad: hectareas > 0 ? plantas / hectareas : 0,
          costoManoObra,
          costoPorHectarea: hectareas > 0 ? costoManoObra / hectareas : 0,
          jornadas,
        }
      })

    return {
      conSuperficie: todos.filter((i) => i.hectareas > 0).sort((a, b) => b.costoPorHectarea - a.costoPorHectarea),
      sinSuperficie: todos.filter((i) => i.hectareas === 0),
    }
  }, [maestros, asistencia, trabajadores, mes, campoId, temporadaId])

  const hectareasTotales = conSuperficie.reduce((s, i) => s + i.hectareas, 0)
  const costoTotal = conSuperficie.reduce((s, i) => s + i.costoManoObra, 0)

  const filasExcel: Fila[] = conSuperficie.map((i) => ({
    'Centro de costo': i.nombre,
    Campo: i.campo,
    'Especie y variedad': i.especie,
    Hectáreas: i.hectareas,
    Plantas: i.plantas,
    'Plantas por hectárea': Math.round(i.densidad),
    Jornadas: Number(i.jornadas.toFixed(2)),
    'Costo mano de obra': Math.round(i.costoManoObra),
    'Costo por hectárea': Math.round(i.costoPorHectarea),
  }))

  return (
    <Pagina
      titulo="Indicadores"
      descripcion="Los indicadores por hectárea de la ficha de KPI. Se calculan sobre la superficie de cada centro de costo, así que sólo aparecen los que la tienen cargada."
    >
      <div className="mb-5">
        <BarraDatos
          titulo="Indicadores" nombreArchivo={`indicadores-${mes}`}
          subtitulo={`${etiquetaMes(mes)} · ${num(hectareasTotales, 2)} ha`}
          filas={filasExcel}
        />
      </div>

      {conSuperficie.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-16 text-center">
          <p className="text-base font-medium">Ningún centro de costo tiene hectáreas cargadas</p>
          <p className="mx-auto mt-1 max-w-[56ch] text-sm text-ink-faint">
            Todos los indicadores de la ficha dividen por hectáreas productivas. Cárgalas en{' '}
            <NavLink to="/maestros/centros-costo" className="text-primary-text underline underline-offset-2">
              Maestros › Centros de costo
            </NavLink>{' '}
            y aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              { e: 'SUPERFICIE', v: `${num(hectareasTotales, 2)} ha` },
              { e: 'COSTO MANO DE OBRA', v: CLP.format(Math.round(costoTotal)) },
              {
                e: 'COSTO POR HECTÁREA',
                v: hectareasTotales > 0 ? CLP.format(Math.round(costoTotal / hectareasTotales)) : '—',
              },
            ].map((m, i) => (
              <motion.div
                key={m.e}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-xl border border-line bg-surface px-4 py-3"
              >
                <p className="text-2xs tracking-wide text-ink-faint">{m.e}</p>
                <p className="num mt-0.5 text-2xl font-semibold tracking-tight">{m.v}</p>
              </motion.div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
                  <th className="px-3 py-2 text-left font-medium">CENTRO DE COSTO</th>
                  <th className="px-3 py-2 text-left font-medium">ESPECIE</th>
                  <th className="px-3 py-2 text-right font-medium">HECTÁREAS</th>
                  <th className="px-3 py-2 text-right font-medium">PLANTAS/HA</th>
                  <th className="px-3 py-2 text-right font-medium">JORNADAS</th>
                  <th className="px-3 py-2 text-right font-medium">MANO DE OBRA</th>
                  <th className="px-3 py-2 text-right font-medium">COSTO/HA</th>
                </tr>
              </thead>
              <tbody>
                {conSuperficie.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0 transition-colors duration-100 hover:bg-surface-sunken/50">
                    <td className="px-3 py-2">
                      <span className="block font-medium">{i.nombre}</span>
                      <span className="block text-2xs text-ink-faint">{i.campo}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{i.especie}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right">{num(i.hectareas, 2)}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right">
                      {i.densidad > 0 ? num(i.densidad, 0) : <span className="text-ink-disabled">—</span>}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right">{num(i.jornadas, 2)}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right">{CLP.format(Math.round(i.costoManoObra))}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right font-semibold">
                      {CLP.format(Math.round(i.costoPorHectarea))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sinSuperficie.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-warning-tint px-4 py-3">
          <p className="text-base font-medium text-warning-text">
            {sinSuperficie.length} {sinSuperficie.length === 1 ? 'centro queda' : 'centros quedan'} fuera
          </p>
          <p className="mt-1 text-sm text-warning-text">
            No tienen hectáreas cargadas, y sin superficie no hay indicador por hectárea que calcular.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sinSuperficie.map((i) => <Chip key={i.id} tone="warning">{i.nombre}</Chip>)}
          </div>
        </div>
      )}

      <p className="mt-5 max-w-[70ch] text-2xs text-ink-faint">
        Por ahora el costo por hectárea suma sólo mano de obra, que es lo único que el sistema
        registra. Producción por hectárea e ingresos por unidad entrarán aquí cuando existan los
        módulos de cosecha y ventas.
      </p>
    </Pagina>
  )
}
