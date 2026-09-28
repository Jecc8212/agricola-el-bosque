import { useMemo, useState } from 'react'
import { Field } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Chip'
import { Pagina } from '@/components/Pagina'
import { BarraDatos } from '@/components/BarraDatos'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { CLP } from '@/lib/formato'
import { etiquetaMes } from '@/lib/mes'
import { buscarNodo, useMaestros } from '@/lib/maestros'
import { TOPE_DIAS, liquidar } from '@/lib/sueldo'
import type { Fila } from '@/lib/planilla'
import { formatearRut } from '@/lib/rut'
import { CLASE_LABEL, nombreCompleto } from '@/lib/types'

const dias = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 2 })

/**
 * Sueldos: lo que se le paga a cada persona según lo que registró la asistencia.
 *
 * La regla que manda es el **tope de días**: el sueldo base rinde 30 días,
 * tenga el mes 28 o 31. Si alguien trabaja más días que el tope, lo que sobra
 * no se mete dentro del sueldo base —eso le pagaría de más y escondería el
 * motivo— sino que sale como **día complementario**, a la vista.
 */
export default function Sueldos() {
  const { maestros, asistencia, trabajadores } = useMaestros()
  const { campoId, centroCostoId, temporadaId, campoNombre, mes } = useContextoOperacion()
  const [busqueda, setBusqueda] = useState('')
  /** La base del cálculo es editable: es la fórmula, no una constante del código. */
  const [base, setBase] = useState(String(TOPE_DIAS))

  const baseDias = Math.max(1, Number(base) || TOPE_DIAS)

  const delMes = useMemo(
    () =>
      asistencia.filter((r) => {
        if (!r.fecha.startsWith(mes)) return false
        if (temporadaId !== TODOS && r.temporadaId !== temporadaId) return false
        if (centroCostoId !== TODOS && r.centroCostoId !== centroCostoId) return false
        return true
      }),
    [asistencia, mes, temporadaId, centroCostoId],
  )

  /* Sólo se liquida a quien tiene días en el mes: una nómina completa con
     ceros no dice nada y esconde a los que sí trabajaron. */
  const liquidaciones = useMemo(() => {
    const conDias = new Set(delMes.map((r) => r.rut))
    return trabajadores
      .filter((t) => campoId === TODOS || t.campoId === campoId)
      .filter((t) => conDias.has(t.rut))
      .map((t) => ({
        trabajador: t,
        liq: liquidar(t, delMes, maestros.modalidades, maestros.labores, baseDias),
      }))
      .filter(({ trabajador }) => {
        const q = busqueda.trim().toLowerCase()
        if (!q) return true
        return (
          nombreCompleto(trabajador).toLowerCase().includes(q) ||
          trabajador.rut.includes(q.replace(/[.\-\s]/g, ''))
        )
      })
      .sort((a, b) => b.liq.total - a.liq.total)
  }, [trabajadores, delMes, maestros, baseDias, campoId, busqueda])

  const total = liquidaciones.reduce((s, l) => s + l.liq.total, 0)
  const conComplementario = liquidaciones.filter((l) => l.liq.diasComplementarios > 0).length
  const perdidoPorEpp = liquidaciones.reduce((s, l) => s + l.liq.bonosPerdidosPorEpp, 0)

  const filasExcel: Fila[] = liquidaciones.map(({ trabajador: t, liq }) => ({
    RUT: formatearRut(t.rut),
    Trabajador: nombreCompleto(t),
    Tipo: CLASE_LABEL[t.clase ?? 'AGRICOLA'],
    'Centro de costo': buscarNodo(maestros.centrosCosto, t.centroCostoId)?.nombre ?? '',
    'Sueldo base contrato': t.sueldoBase,
    'Valor jornada': Math.round(liq.valorJornada),
    'Días trabajados': liq.diasTrabajados,
    'Días en base': liq.diasBase,
    'Días complementarios': liq.diasComplementarios,
    Sueldo: Math.round(liq.sueldoBase),
    Complementario: Math.round(liq.complementario),
    Trato: Math.round(liq.trato),
    'Días equivalentes trato': Number(liq.diasEquivalentesTrato.toFixed(2)),
    Bonos: Math.round(liq.bonos),
    Total: Math.round(liq.total),
  }))

  return (
    <Pagina
      titulo="Sueldos"
      descripcion={`Lo que se paga según la asistencia registrada. El sueldo base rinde ${baseDias} días: lo que exceda ese tope se paga como día complementario, aparte y a la vista.`}
    >
      <div className="mb-5">
        <BarraDatos
          titulo="Sueldos"
          nombreArchivo={`sueldos-${mes}`}
          subtitulo={`${etiquetaMes(mes)} · base de ${baseDias} días · ${campoId === TODOS ? 'todos los campos' : campoNombre}`}
          filas={filasExcel}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 sm:max-w-xs">
          <Field label="Buscar" placeholder="Nombre o RUT" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="w-44">
          {/* La fórmula, editable: el tope de 30 es la norma, pero quien liquida
              tiene que poder cambiarlo sin tocar el código. */}
          <Field
            label="Base del cálculo" type="number" min="1" max="31" value={base}
            hint="Días que rinde el sueldo base."
            onChange={(e) => setBase(e.target.value)}
          />
        </div>
      </div>

      <p className="mt-3 max-w-[70ch] rounded-md border border-line bg-surface px-3 py-2 text-2xs text-ink-faint">
        <strong className="text-ink-muted">Cómo se calcula:</strong> sueldo base ÷ {baseDias} =
        valor de la jornada. Cada día vale esa jornada por el valor de su modalidad. Los días
        sobre {baseDias} se pagan como complementarios. Las jornadas a trato se pagan por
        producción —cantidad × precio de la labor— y no suman jornada, para no pagarlas dos
        veces. Los bonos por labor sólo se pagan si se entregó el EPP.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-2xs tracking-wide text-ink-faint">TOTAL DEL MES</p>
          <p className="num text-2xl font-semibold tracking-tight">{CLP.format(Math.round(total))}</p>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-2xs tracking-wide text-ink-faint">A LIQUIDAR</p>
          <p className="num text-2xl font-semibold tracking-tight">{liquidaciones.length}</p>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-2xs tracking-wide text-ink-faint">CON DÍA COMPLEMENTARIO</p>
          <p className="num text-2xl font-semibold tracking-tight">{conComplementario}</p>
        </div>
        {perdidoPorEpp > 0 && (
          <div className="rounded-md border border-line bg-warning-tint px-4 py-3">
            <p className="text-2xs tracking-wide text-warning-text">BONOS NO PAGADOS · SIN EPP</p>
            <p className="num text-2xl font-semibold tracking-tight text-warning-text">
              {CLP.format(Math.round(perdidoPorEpp))}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">TRABAJADOR</th>
              <th className="px-3 py-2 text-left font-medium">TIPO</th>
              <th className="px-3 py-2 text-right font-medium">VALOR JORNADA</th>
              <th className="px-3 py-2 text-right font-medium">DÍAS</th>
              <th className="px-3 py-2 text-right font-medium">SUELDO</th>
              <th className="px-3 py-2 text-right font-medium">COMPLEMENTARIO</th>
              <th className="px-3 py-2 text-right font-medium">TRATO</th>
              <th className="px-3 py-2 text-right font-medium">BONOS</th>
              <th className="px-3 py-2 text-right font-medium">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {liquidaciones.map(({ trabajador: t, liq }) => (
              <tr key={t.rut} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <span className="block whitespace-nowrap font-medium">{nombreCompleto(t)}</span>
                  <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                </td>
                <td className="px-3 py-2">
                  <Chip tone={t.clase === 'PLANTA' ? 'neutral' : 'primary'}>
                    {t.clase === 'PLANTA' ? 'Planta' : 'Agrícola'}
                  </Chip>
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right text-ink-faint">
                  {CLP.format(Math.round(liq.valorJornada))}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">
                  {dias(liq.diasBase)}
                  {liq.diasComplementarios > 0 && (
                    <span className="block text-2xs text-primary-text">
                      +{dias(liq.diasComplementarios)} compl.
                    </span>
                  )}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">{CLP.format(Math.round(liq.sueldoBase))}</td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">
                  {liq.complementario > 0 ? (
                    <span className="text-primary-text">{CLP.format(Math.round(liq.complementario))}</span>
                  ) : (
                    <span className="text-ink-disabled">—</span>
                  )}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">
                  {liq.trato > 0 ? (
                    <>
                      {CLP.format(Math.round(liq.trato))}
                      <span className="block text-2xs text-ink-faint">
                        ≈ {dias(liq.diasEquivalentesTrato)} días equiv.
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-disabled">—</span>
                  )}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right">
                  {CLP.format(Math.round(liq.bonos))}
                  {liq.bonosPerdidosPorEpp > 0 && (
                    <span className="block text-2xs text-warning-text">
                      −{CLP.format(Math.round(liq.bonosPerdidosPorEpp))} sin EPP
                    </span>
                  )}
                </td>
                <td className="num whitespace-nowrap px-3 py-2 text-right font-semibold">
                  {CLP.format(Math.round(liq.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {liquidaciones.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-base font-medium">Sin días registrados en {etiquetaMes(mes)}</p>
            <p className="mx-auto mt-1 max-w-[54ch] text-sm text-ink-faint">
              El sueldo se calcula sobre la asistencia. Registra jornadas y aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </Pagina>
  )
}
