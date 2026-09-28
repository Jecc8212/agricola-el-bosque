import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Marca } from '@/components/Marca'
import { Aparece } from '@/components/Aparece'
import { useAuth } from '@/lib/auth'
import { Chip } from '@/components/ui/Chip'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { cn } from '@/lib/cn'
import { CLP } from '@/lib/formato'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/** Días del mes con que se divide el sueldo. Es el divisor de la liquidación
 *  chilena: el sueldo mensual rinde 30 días, tenga el mes 28 o 31. */
const DIAS_MES = 30

interface Resumen {
  nodo: Nodo
  nivel: number
  /** El campo al que pertenece: es el encabezado de la tarjeta. */
  campo: string
  sueldos: number
  bonos: number
  total: number
  jornadas: number
  personas: number
  registros: number
}

/**
 * Home: cuánto cuesta cada centro de costo este mes.
 *
 * Un centro de costo es el resumen de todo lo que consume mantenerlo. Hoy el
 * sistema sabe de la mano de obra —los días registrados en asistencia, cada uno
 * valorizado con el sueldo de quien lo trabajó más el bono de la labor— porque
 * es lo único que hay módulo que lo alimente. Cuando existan insumos y
 * mantención, entran a esta misma tarjeta sin cambiarle la forma.
 */
export default function Home() {
  const { maestros, asistencia, trabajadores, jornadas } = useMaestros()
  const { temporadaId, campoId, campoNombre, mes } = useContextoOperacion()
  const { sesion } = useAuth()

  /* Quien administra un campo entra a trabajar, no a mirar cifras: su portada
     es el botón de pasar lista, no el resumen de costos. */
  const esAdminDeCampo = Boolean(sesion?.campoId)
  const hoy = new Date().toISOString().slice(0, 10)
  const jornadaDeHoy = jornadas.find((j) => j.campoId === sesion?.campoId && j.fecha === hoy)

  const resumenes = useMemo<Resumen[]>(() => {
    const porRut = new Map(trabajadores.map((t) => [t.rut, t]))

    /* Un registro sólo suma si su modalidad dice que el día cuenta: la falta
       queda anotada, pero no cuesta un día de sueldo. */
    const delMes = asistencia.filter((r) => {
      if (!r.fecha.startsWith(mes)) return false
      if (temporadaId !== TODOS && r.temporadaId !== temporadaId) return false
      if (campoId !== TODOS && porRut.get(r.rut)?.campoId !== campoId) return false
      return true
    })

    return aplanar(maestros.centrosCosto).map(({ nodo, nivel }) => {
      /* La tarjeta de una categoría incluye a sus subcategorías: nadie quiere
         sumar a mano los cuarteles para saber lo que cuesta el campo. */
      const suyos = new Set([nodo.id, ...aplanar(nodo.hijos).map((f) => f.nodo.id)])
      const registros = delMes.filter((r) => suyos.has(r.centroCostoId))

      let sueldos = 0
      let bonos = 0
      let jornadas = 0
      const personas = new Set<string>()

      for (const r of registros) {
        const factor = buscarNodo(maestros.modalidades, r.modalidadId)?.factor ?? 0
        const persona = porRut.get(r.rut)
        jornadas += factor
        personas.add(r.rut)
        if (persona) sueldos += (persona.sueldoBase / DIAS_MES) * factor
        /* El bono se paga por trabajar **con el EPP puesto**: un día que no
           cuenta, o sin equipo entregado, no lo paga. Es la misma regla que
           usa la liquidación, y tienen que decir lo mismo. */
        if (factor > 0 && r.eppEntregado)
          for (const id of r.laborIds) bonos += buscarNodo(maestros.labores, id)?.bono ?? 0
      }

      return {
        nodo, nivel,
        campo: buscarNodo(maestros.campos, nodo.campoId)?.nombre ?? 'Sin campo',
        sueldos, bonos, total: sueldos + bonos,
        jornadas, personas: personas.size, registros: registros.length,
      }
    })
  }, [maestros, asistencia, trabajadores, mes, temporadaId, campoId])

  if (esAdminDeCampo) {
    return (
      <>
        <header className="relative overflow-hidden border-b border-line pb-6">
          <Marca
            decorativa
            className="pointer-events-none absolute -right-6 -top-10 h-48 w-48 text-primary opacity-[0.05]"
          />
          <div className="relative">
            <p className="text-2xs font-medium tracking-wide text-ink-faint">CAMPO</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">{campoNombre}</h1>
            <p className="mt-1 text-base text-ink-faint">
              Hola {sesion?.nombre}. Desde aquí se pasa la lista del día.
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <NavLink
            to="/rrhh/tomar-asistencia"
            className="flex flex-col justify-between rounded-lg border border-line bg-primary px-6 py-7 text-on-primary transition-colors duration-150 hover:bg-primary-hover"
          >
            <span className="text-2xl font-semibold tracking-tight">Tomar asistencia del campo</span>
            <span className="mt-2 text-base opacity-90">
              {jornadaDeHoy
                ? 'Hoy ya está cerrada. Puedes pasar lista de otro día.'
                : 'Quién vino, qué labor hace cada uno y la entrega de EPP.'}
            </span>
          </NavLink>

          <NavLink
            to="/rrhh/tomar-asistencia"
            className="flex flex-col justify-between rounded-lg border border-line bg-surface px-6 py-7 transition-colors duration-150 hover:bg-surface-sunken"
          >
            <span className="text-2xl font-semibold tracking-tight">Ver lo registrado</span>
            <span className="mt-2 text-base text-ink-faint">
              Las jornadas ya cerradas de {campoNombre}, con su foto de respaldo.
            </span>
          </NavLink>
        </div>

        {jornadaDeHoy && (
          <p className="mt-4 max-w-3xl rounded-md border border-line bg-surface px-4 py-3 text-base">
            <Chip tone="success">Hoy cerrada</Chip>{' '}
            <span className="ml-1">
              {jornadaDeHoy.presentes} presentes y {jornadaDeHoy.ausentes} ausentes.
            </span>
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <div>
      {maestros.centrosCosto.length === 0 ? (
        <div className="rounded-md border border-line bg-surface px-4 py-16 text-center">
          <p className="text-base font-medium">Aún no hay centros de costo</p>
          <p className="mx-auto mt-1 max-w-[54ch] text-sm text-ink-faint">
            Cada centro de costo tendrá aquí su tarjeta con lo que cuesta mantenerlo.
            Cárgalos primero en{' '}
            <NavLink to="/maestros/centros-costo" className="text-primary-text underline underline-offset-2">
              Maestros › Centros de costo
            </NavLink>.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resumenes.map((r, i) => (
              <Aparece key={r.nodo.id} retraso={i} className="h-full">
              <article
                className={cn(
                  'flex h-full flex-col rounded-xl border border-line bg-surface transition-shadow duration-200 hover:shadow-md',
                  // La subcategoría se hunde: se lee como parte de la de arriba,
                  // no como un centro de costo más.
                  r.nivel > 0 && 'bg-surface-sunken',
                )}
              >
                {/* El campo manda en la tarjeta: es la primera pregunta que se
                    hace quien mira estos números —«¿de qué campo hablamos?»—
                    antes incluso que el monto. */}
                <div className="border-b border-line px-4 py-3 text-center">
                  <h2 className="truncate text-xl font-semibold tracking-tight">{r.campo}</h2>
                  <p className="mt-1 truncate text-base font-semibold text-ink-muted">
                    {r.nodo.nombre}
                    {r.nodo.codigo && (
                      <span className="mono ml-1.5 text-2xs font-normal text-ink-faint">
                        {r.nodo.codigo}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="num text-2xl font-semibold tracking-tight">
                    {CLP.format(Math.round(r.total))}
                  </p>
                  <p className="text-2xs text-ink-faint">al mes</p>

                  <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-faint">Sueldos</dt>
                      <dd className="num font-medium">{CLP.format(Math.round(r.sueldos))}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-faint">Bonos por labor</dt>
                      <dd className="num font-medium">{CLP.format(Math.round(r.bonos))}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-ink-faint">Jornadas · personas</dt>
                      <dd className="num">
                        {r.jornadas.toLocaleString('es-CL', { maximumFractionDigits: 2 })} · {r.personas}
                      </dd>
                    </div>
                  </dl>

                  {r.registros === 0 && (
                    <p className="mt-3">
                      <Chip tone="neutral">Sin movimiento este mes</Chip>
                    </p>
                  )}
                </div>
              </article>
              </Aparece>
            ))}
          </div>

          <p className="mt-5 max-w-[70ch] text-2xs text-ink-faint">
            Por ahora la tarjeta sólo suma mano de obra, que es lo único que el sistema tiene de
            dónde calcular. Insumos, mantención y servicios entrarán aquí cuando exista el módulo
            que los registre.
          </p>
        </>
      )}
    </div>
    </>
  )
}
