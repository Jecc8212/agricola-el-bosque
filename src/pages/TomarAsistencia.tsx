import { useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ModalConfirmar } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { CLP, fecha as formatearFecha } from '@/lib/formato'
import { reducirFoto, pesoLegible } from '@/lib/imagen'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import { formatearRut } from '@/lib/rut'
import { nombreCompleto } from '@/lib/types'
import type { Trabajador } from '@/lib/types'

type Paso = 1 | 2 | 3 | 4

const PASOS: Array<{ n: Paso; titulo: string; ayuda: string }> = [
  { n: 1, titulo: 'Asistencia', ayuda: 'Quién vino a trabajar hoy' },
  { n: 2, titulo: 'Labor y EPP', ayuda: 'Qué hace cada uno y su equipo' },
  { n: 3, titulo: 'Revisar', ayuda: 'Confirmar antes de cerrar' },
  { n: 4, titulo: 'Firma', ayuda: 'Foto de la hoja firmada' },
]

/* ── Piezas de interfaz ────────────────────────────────────────────────────
   Superficies claras, bordes finos y mucho aire: en el campo se mira esto con
   sol de frente y con una mano, así que lo que importa es que cada estado se
   distinga sin leer.                                                       */

function Progreso({ paso }: { paso: Paso }) {
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {PASOS.map((p, i) => {
        const hecho = p.n < paso
        const actual = p.n === paso
        return (
          <li key={p.n} className="flex items-center gap-1">
            <span
              className={cn(
                'flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3 transition-colors duration-200',
                actual && 'bg-surface shadow-xs ring-1 ring-line',
              )}
            >
              <span
                className={cn(
                  'num grid h-6 w-6 shrink-0 place-items-center rounded-full text-2xs font-semibold',
                  hecho && 'bg-primary text-on-primary',
                  actual && 'bg-ink text-ink-invert',
                  !hecho && !actual && 'bg-surface-sunken text-ink-disabled',
                )}
              >
                {hecho ? '✓' : p.n}
              </span>
              <span
                className={cn(
                  'text-sm',
                  actual ? 'font-medium text-ink' : hecho ? 'text-ink-muted' : 'text-ink-disabled',
                )}
              >
                {p.titulo}
              </span>
            </span>
            {i < PASOS.length - 1 && (
              <span aria-hidden="true" className="h-px w-4 bg-line" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Interruptor de dos posiciones: se lee de un vistazo y se toca con el pulgar. */
function Segmentado({
  valor, onCambio, izquierda, derecha, tonoIzquierda = 'primary',
}: {
  valor: boolean
  onCambio: (v: boolean) => void
  izquierda: string
  derecha: string
  tonoIzquierda?: 'primary' | 'neutral'
}) {
  return (
    <span className="inline-flex shrink-0 rounded-lg bg-surface-sunken p-0.5">
      {[true, false].map((v) => {
        const activo = valor === v
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onCambio(v)}
            aria-pressed={activo}
            className={cn(
              'cursor-pointer rounded-md px-3.5 py-1.5 text-sm transition-all duration-150',
              activo
                ? v
                  ? tonoIzquierda === 'primary'
                    ? 'bg-primary font-medium text-on-primary shadow-xs'
                    : 'bg-surface font-medium text-ink shadow-xs'
                  : 'bg-surface font-medium text-ink shadow-xs'
                : 'text-ink-faint hover:text-ink',
            )}
          >
            {v ? izquierda : derecha}
          </button>
        )
      })}
    </span>
  )
}

function Tarjeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface', className)}>{children}</div>
  )
}

function Dato({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: 'aviso' }) {
  return (
    <div className="flex-1 px-4 py-3">
      <p className="text-2xs tracking-wide text-ink-faint">{etiqueta}</p>
      <p className={cn('num mt-0.5 text-xl font-semibold tracking-tight', tono === 'aviso' && 'text-warning-text')}>
        {valor}
      </p>
    </div>
  )
}

/**
 * Pasar lista, guiado en cuatro pasos.
 *
 * El orden no es casual: primero quién vino —lo único que se sabe al llegar—,
 * después qué hace cada uno y si recibió su equipo, luego una revisión completa,
 * y al final la foto de la hoja firmada.
 *
 * La foto es el cierre y no un adorno: respalda ante la Mutual que el EPP se
 * entregó. Por eso, cuando se sube, la jornada queda **sellada**.
 */
export default function TomarAsistencia() {
  const navegar = useNavigate()
  const { sesion, puedeVer } = useAuth()
  const { maestros, trabajadores, jornadas, cerrarJornada } = useMaestros()
  const { temporadaId, campoId, campoNombre } = useContextoOperacion()

  const [paso, setPaso] = useState<Paso>(1)
  const [fecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [labores, setLabores] = useState<Record<string, string[]>>({})
  const [modalidades, setModalidades] = useState<Record<string, string>>({})
  const [centros, setCentros] = useState<Record<string, string>>({})
  const [epp, setEpp] = useState<Set<string>>(new Set())
  const [foto, setFoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [listo, setListo] = useState<{ presentes: number; ausentes: number } | null>(null)
  const archivoFoto = useRef<HTMLInputElement>(null)

  /* La temporada la fija quien administra. El jefe de campo pasa lista y nada
     más: si pudiera cambiarla, un mes entero podría acabar en la temporada
     equivocada sin que nadie lo note hasta el cierre. */
  const puedeElegirTemporada = puedeVer('rrhh')
  const [temporadaElegida, setTemporadaElegida] = useState(() =>
    temporadaId !== TODOS ? temporadaId : (maestros.temporadas[0]?.id ?? ''),
  )
  const temporadaDeLaJornada = puedeElegirTemporada ? temporadaElegida : (temporadaId !== TODOS ? temporadaId : (maestros.temporadas[0]?.id ?? ''))

  const campoDeLaJornada = sesion?.campoId ?? (campoId !== TODOS ? campoId : '')
  const nombreDelCampo = buscarNodo(maestros.campos, campoDeLaJornada)?.nombre ?? campoNombre

  const nomina = useMemo(
    () =>
      trabajadores
        .filter((t) => t.estado !== 'FINIQUITADO' && t.campoId === campoDeLaJornada)
        .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es')),
    [trabajadores, campoDeLaJornada],
  )

  const opLabores = aplanar(maestros.labores)
  const opModalidades = aplanar(maestros.modalidades).filter((f) => (f.nodo.factor ?? 0) > 0)
  const motivosDeAusencia = aplanar(maestros.modalidades).filter((f) => (f.nodo.factor ?? 0) === 0)
  const opCentros = aplanar(maestros.centrosCosto).filter(
    ({ nodo }) => !nodo.campoId || nodo.campoId === campoDeLaJornada,
  )

  const yaCerrada = jornadas.find(
    (j) => j.campoId === campoDeLaJornada && j.fecha === fecha && !j.reabiertaEn,
  )

  const faltan: string[] = []
  if (!campoDeLaJornada) faltan.push('Su perfil no tiene un campo asignado, y el filtro de campo está en «todos».')
  if (motivosDeAusencia.length === 0) faltan.push('No hay ninguna modalidad de valor 0 para justificar faltas (Maestros › Modalidades).')
  if (opModalidades.length === 0) faltan.push('No hay modalidades de pago cargadas.')
  if (!temporadaDeLaJornada) faltan.push('No hay temporadas cargadas.')
  if (nomina.length === 0 && campoDeLaJornada) faltan.push(`No hay trabajadores activos en ${nombreDelCampo}.`)

  const alternar = (poner: Dispatch<SetStateAction<Set<string>>>, rut: string) => {
    poner((prev) => {
      const copia = new Set(prev)
      if (copia.has(rut)) copia.delete(rut)
      else copia.add(rut)
      return copia
    })
  }

  function marcarPresencia(rut: string, presente: boolean) {
    setPresentes((prev) => {
      const copia = new Set(prev)
      if (presente) copia.add(rut)
      else copia.delete(rut)
      return copia
    })
    if (presente) setMotivos((m) => { const { [rut]: _, ...resto } = m; return resto })
  }

  const vinieron = nomina.filter((t) => presentes.has(t.rut))
  const ausentes = nomina.filter((t) => !presentes.has(t.rut))
  const sinMotivo = ausentes.filter((t) => !motivos[t.rut])

  /* Todo lo que se puede heredar de la ficha se hereda: quien pasa lista sólo
     corrige las excepciones del día. */
  const modalidadDe = (t: Trabajador) =>
    modalidades[t.rut] ?? t.modalidadId ?? opModalidades[0]?.nodo.id ?? ''
  const centroDe = (t: Trabajador) => centros[t.rut] ?? t.centroCostoId ?? ''
  const sinCentro = vinieron.filter((t) => !centroDe(t))

  /** El bono de la labor sólo se paga con el EPP firmado. */
  const bonoDe = (t: Trabajador) =>
    (labores[t.rut] ?? []).reduce((s, id) => s + (buscarNodo(maestros.labores, id)?.bono ?? 0), 0)
  const bonoEnRiesgo = vinieron
    .filter((t) => !epp.has(t.rut))
    .reduce((s, t) => s + bonoDe(t), 0)

  async function elegirFoto(archivo: File) {
    setError('')
    try {
      setFoto(await reducirFoto(archivo))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la foto.')
    }
  }

  function finalizar() {
    if (!foto) return setError('Falta la foto de la hoja firmada.')
    const jornada = cerrarJornada(
      {
        campoId: campoDeLaJornada, fecha, temporadaId: temporadaDeLaJornada,
        cerradaEn: new Date().toISOString(), cerradaPor: sesion?.usuario ?? '', fotoEpp: foto,
      },
      nomina.map((t) => {
        const presente = presentes.has(t.rut)
        return {
          rut: t.rut, fecha, temporadaId: temporadaDeLaJornada,
          modalidadId: presente ? modalidadDe(t) : motivos[t.rut],
          centroCostoId: centroDe(t),
          laborIds: presente ? (labores[t.rut] ?? []) : [],
          presente,
          eppEntregado: presente && epp.has(t.rut),
        }
      }),
    )
    setConfirmando(false)
    setListo({ presentes: jornada.presentes, ausentes: jornada.ausentes })
  }

  const control =
    'h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-base text-ink transition-colors duration-150'

  /* ── Cierre ────────────────────────────────────────────────────────────*/
  if (listo) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Tarjeta className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-tint text-2xl text-primary-text">
            ✓
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Jornada enviada</h1>
          <p className="mt-1 text-base text-ink-faint">
            {nombreDelCampo} · {formatearFecha(fecha)}
          </p>
          <p className="mt-5 text-base">
            <strong>{listo.presentes} presentes</strong> y <strong>{listo.ausentes} ausentes</strong>,
            con la foto de la hoja firmada.
          </p>
          <p className="mt-2 text-sm text-ink-faint">
            Quedó sellada: desde aquí ya no se puede modificar. Si hay que corregir algo, pídelo a
            quien administra el sistema.
          </p>
          <Button variant="primary" className="mt-6 h-10 w-full" onClick={() => navegar('/')}>
            Volver al inicio
          </Button>
        </Tarjeta>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Cabecera: qué campo, qué día, y en qué paso vamos. */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tomar asistencia</h1>
          <p className="mt-1 text-base text-ink-faint">
            {nombreDelCampo} · {formatearFecha(fecha)} ·{' '}
            {nomina.length} {nomina.length === 1 ? 'persona' : 'personas'} en la nómina
          </p>
        </div>

        <label className="flex items-center gap-2 text-2xs font-medium tracking-wide text-ink-faint">
          TEMPORADA
          {puedeElegirTemporada ? (
            <select
              value={temporadaElegida} onChange={(e) => setTemporadaElegida(e.target.value)}
              className={cn(control, 'cursor-pointer font-medium')}
            >
              {aplanar(maestros.temporadas).map(({ nodo }) => (
                <option key={nodo.id} value={nodo.id}>{nodo.nombre}</option>
              ))}
            </select>
          ) : (
            /* Para el jefe de campo es un dato, no un control. */
            <span className={cn(control, 'flex items-center bg-surface-sunken font-medium text-ink-muted')}>
              {buscarNodo(maestros.temporadas, temporadaDeLaJornada)?.nombre ?? 'Sin temporada'}
            </span>
          )}
        </label>
      </header>

      <div className="mt-5"><Progreso paso={paso} /></div>

      {faltan.length > 0 ? (
        <Tarjeta className="mt-5 bg-warning-tint p-5">
          <p className="text-base font-medium text-warning-text">No se puede pasar lista todavía</p>
          <ul className="mt-2 flex flex-col gap-1">
            {faltan.map((f) => <li key={f} className="text-sm text-warning-text">— {f}</li>)}
          </ul>
        </Tarjeta>
      ) : yaCerrada ? (
        <Tarjeta className="mt-5 bg-warning-tint p-5">
          <p className="text-base font-medium text-warning-text">
            La jornada de hoy ya está cerrada
          </p>
          <p className="mt-1 text-sm text-warning-text">
            Se cerró con {yaCerrada.presentes} presentes y {yaCerrada.ausentes} ausentes. Si hay que
            corregirla, pídelo a quien administra el sistema.
          </p>
        </Tarjeta>
      ) : (
        <>
          {/* ── Paso 1 ────────────────────────────────────────────────── */}
          {paso === 1 && (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-faint">
                  <strong className="num text-ink">{presentes.size}</strong> de {nomina.length} vinieron
                </p>
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => { setPresentes(new Set(nomina.map((t) => t.rut))); setMotivos({}) }}>
                    Vinieron todos
                  </Button>
                  <Button size="sm" onClick={() => setPresentes(new Set())}>No vino nadie</Button>
                </span>
              </div>

              <Tarjeta className="divide-y divide-line overflow-hidden">
                {nomina.map((t) => {
                  const presente = presentes.has(t.rut)
                  return (
                    <div key={t.rut} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium">{nombreCompleto(t)}</span>
                        <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                      </span>

                      <Segmentado
                        valor={presente} onCambio={(v) => marcarPresencia(t.rut, v)}
                        izquierda="Vino" derecha="No vino"
                      />

                      {!presente && (
                        <select
                          aria-label={`Motivo de la falta de ${nombreCompleto(t)}`}
                          value={motivos[t.rut] ?? ''}
                          onChange={(e) => setMotivos((m) => ({ ...m, [t.rut]: e.target.value }))}
                          className={cn(
                            control, 'w-full cursor-pointer sm:w-56',
                            !motivos[t.rut] && 'border-danger text-danger-text',
                          )}
                        >
                          <option value="">¿Justificada o no?</option>
                          {motivosDeAusencia.map(({ nodo }) => (
                            <option key={nodo.id} value={nodo.id}>
                              {nodo.codigo ? `${nodo.codigo} · ` : ''}{nodo.nombre}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )
                })}
              </Tarjeta>

              {sinMotivo.length > 0 && (
                <p role="alert" className="mt-3 rounded-lg bg-warning-tint px-3 py-2 text-sm text-warning-text">
                  Falta decir si la ausencia es justificada o no en{' '}
                  {sinMotivo.length === 1 ? nombreCompleto(sinMotivo[0]) : `${sinMotivo.length} personas`}.
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="primary" className="h-10 px-5" disabled={sinMotivo.length > 0}
                  onClick={() => { setPaso(2); setError('') }}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* ── Paso 2 ────────────────────────────────────────────────── */}
          {paso === 2 && (
            <div className="mt-5">
              {vinieron.length === 0 ? (
                <Tarjeta className="px-4 py-10 text-center">
                  <p className="text-base">No marcaste a nadie como presente.</p>
                </Tarjeta>
              ) : (
                <div className="flex flex-col gap-3">
                  {vinieron.map((t) => {
                    const tieneEpp = epp.has(t.rut)
                    const bono = bonoDe(t)
                    return (
                      <Tarjeta key={t.rut} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-base font-medium">{nombreCompleto(t)}</span>
                            <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                          </span>
                          <span className="flex flex-col items-end gap-1">
                            <span className="text-2xs tracking-wide text-ink-faint">¿SE ENTREGÓ EPP?</span>
                            <Segmentado
                              valor={tieneEpp} onCambio={() => alternar(setEpp, t.rut)}
                              izquierda="Sí" derecha="No"
                            />
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <label className="flex flex-col gap-1">
                            <span className="text-2xs tracking-wide text-ink-faint">MODALIDAD</span>
                            <select
                              value={modalidadDe(t)}
                              onChange={(e) => setModalidades((m) => ({ ...m, [t.rut]: e.target.value }))}
                              className={cn(control, 'w-full cursor-pointer')}
                            >
                              {opModalidades.map(({ nodo }) => (
                                <option key={nodo.id} value={nodo.id}>
                                  {nodo.nombre} · {nodo.factor ?? 0}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="flex flex-col gap-1">
                            <span className="text-2xs tracking-wide text-ink-faint">CENTRO DE COSTO</span>
                            <select
                              value={centroDe(t)}
                              onChange={(e) => setCentros((c) => ({ ...c, [t.rut]: e.target.value }))}
                              className={cn(control, 'w-full cursor-pointer', !centroDe(t) && 'border-warning')}
                            >
                              <option value="">{opCentros.length ? 'Sin asignar' : 'Sin centros cargados'}</option>
                              {opCentros.map(({ nodo, nivel }) => (
                                <option key={nodo.id} value={nodo.id}>
                                  {`${'— '.repeat(nivel)}${nodo.nombre}`}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="flex flex-col gap-1">
                            <span className="text-2xs tracking-wide text-ink-faint">
                              LABOR Y SUBLABOR
                            </span>
                            {/* Desplegables normales, uno por labor. La lista
                                múltiple obligaba a saber que se marca con Ctrl,
                                y en el campo eso no lo sabe nadie. */}
                            {[...(labores[t.rut] ?? []), ''].map((elegida, indice) => (
                              <select
                                key={indice}
                                aria-label={`Labor ${indice + 1} de ${nombreCompleto(t)}`}
                                value={elegida}
                                onChange={(e) =>
                                  setLabores((l) => {
                                    const suyas = [...(l[t.rut] ?? [])]
                                    if (e.target.value) suyas[indice] = e.target.value
                                    else suyas.splice(indice, 1)
                                    return { ...l, [t.rut]: suyas.filter(Boolean) }
                                  })
                                }
                                className={cn(control, 'w-full cursor-pointer')}
                              >
                                <option value="">
                                  {indice === 0 ? 'Sin labor' : '+ agregar otra labor'}
                                </option>
                                {opLabores.map(({ nodo, nivel }) => (
                                  <option key={nodo.id} value={nodo.id}>
                                    {`${'\u00a0\u00a0'.repeat(nivel)}${nodo.nombre}`}
                                    {(nodo.bono ?? 0) > 0 ? ` · ${CLP.format(nodo.bono ?? 0)}` : ''}
                                  </option>
                                ))}
                              </select>
                            ))}
                          </div>
                        </div>

                        {/* El bono es la palanca que hace que el EPP importe: se
                            dice aquí, no en la liquidación de fin de mes. */}
                        {bono > 0 && (
                          <p className={cn(
                            'mt-2.5 rounded-lg px-3 py-1.5 text-sm',
                            tieneEpp ? 'bg-primary-tint text-primary-text' : 'bg-warning-tint text-warning-text',
                          )}>
                            {tieneEpp
                              ? `Bono por labor: ${CLP.format(bono)}`
                              : `Sin EPP no se paga el bono de ${CLP.format(bono)}`}
                          </p>
                        )}
                      </Tarjeta>
                    )
                  })}
                </div>
              )}

              <div className="mt-4 flex justify-between gap-2">
                <Button className="h-10 px-5" onClick={() => setPaso(1)}>Atrás</Button>
                <Button variant="primary" className="h-10 px-5" onClick={() => setPaso(3)}>Siguiente</Button>
              </div>
            </div>
          )}

          {/* ── Paso 3 ────────────────────────────────────────────────── */}
          {paso === 3 && (
            <div className="mt-5">
              <Tarjeta className="flex flex-wrap divide-x divide-line">
                <Dato etiqueta="VINIERON" valor={String(vinieron.length)} />
                <Dato etiqueta="NO VINIERON" valor={String(ausentes.length)} />
                <Dato etiqueta="CON EPP" valor={String(vinieron.filter((t) => epp.has(t.rut)).length)} />
                {bonoEnRiesgo > 0 && (
                  <Dato etiqueta="BONO NO PAGADO" valor={CLP.format(bonoEnRiesgo)} tono="aviso" />
                )}
                {sinCentro.length > 0 && (
                  <Dato etiqueta="SIN CENTRO" valor={String(sinCentro.length)} tono="aviso" />
                )}
              </Tarjeta>

              <Tarjeta className="mt-3 divide-y divide-line overflow-hidden">
                {nomina.map((t) => {
                  const presente = presentes.has(t.rut)
                  const suyas = (labores[t.rut] ?? [])
                    .map((id) => buscarNodo(maestros.labores, id)?.nombre)
                    .filter(Boolean)
                  return (
                    <div key={t.rut} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium">{nombreCompleto(t)}</span>
                        <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-2xs">
                        {presente ? (
                          <>
                            <span className="rounded-md bg-primary-tint px-2 py-1 font-medium text-primary-text">
                              {buscarNodo(maestros.modalidades, modalidadDe(t))?.nombre}
                            </span>
                            {suyas.length > 0 ? (
                              <span className="rounded-md bg-surface-sunken px-2 py-1 text-ink-muted">
                                {suyas.join(' + ')}
                              </span>
                            ) : (
                              <span className="rounded-md bg-warning-tint px-2 py-1 text-warning-text">Sin labor</span>
                            )}
                            <span className={cn(
                              'rounded-md px-2 py-1',
                              epp.has(t.rut) ? 'bg-surface-sunken text-ink-muted' : 'bg-warning-tint text-warning-text',
                            )}>
                              {epp.has(t.rut) ? 'EPP entregado' : 'Sin EPP'}
                            </span>
                          </>
                        ) : (
                          <span className="rounded-md bg-warning-tint px-2 py-1 text-warning-text">
                            {buscarNodo(maestros.modalidades, motivos[t.rut])?.nombre ?? 'No vino'}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </Tarjeta>

              <div className="mt-4 flex justify-between gap-2">
                <Button className="h-10 px-5" onClick={() => setPaso(2)}>Atrás</Button>
                <Button variant="primary" className="h-10 px-5" onClick={() => setPaso(4)}>
                  Está todo correcto
                </Button>
              </div>
            </div>
          )}

          {/* ── Paso 4 ────────────────────────────────────────────────── */}
          {paso === 4 && (
            <div className="mt-5">
              <Tarjeta className="p-6">
                <h2 className="text-lg font-semibold tracking-tight">Foto de la hoja firmada</h2>
                <p className="mt-1 max-w-[60ch] text-base text-ink-faint">
                  Saca una foto de la hoja donde los trabajadores firmaron la entrega de su EPP.
                  Es el respaldo ante la Mutual, y lo que cierra la jornada.
                </p>

                <input
                  ref={archivoFoto} type="file" accept="image/*" capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void elegirFoto(f)
                  }}
                />

                {foto ? (
                  <div className="mt-5">
                    <img src={foto} alt="Hoja de entrega de EPP firmada"
                      className="max-h-80 w-full rounded-lg border border-line object-contain" />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-2xs text-ink-faint">Foto lista · {pesoLegible(foto)}</span>
                      <Button size="sm" onClick={() => archivoFoto.current?.click()}>Cambiar</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => archivoFoto.current?.click()}
                    className="mt-5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-sunken/50 px-6 py-10 transition-colors duration-150 hover:bg-surface-sunken"
                  >
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-faint" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                      <circle cx="12" cy="12.5" r="3.5" />
                    </svg>
                    <span className="text-base font-medium">Sacar o subir la foto</span>
                    <span className="text-2xs text-ink-faint">Se reduce sola antes de guardarse</span>
                  </button>
                )}

                {error && (
                  <p role="alert" className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-text">
                    {error}
                  </p>
                )}
              </Tarjeta>

              <div className="mt-4 flex justify-between gap-2">
                <Button className="h-10 px-5" onClick={() => setPaso(3)}>Atrás</Button>
                <Button variant="primary" className="h-10 px-5" disabled={!foto}
                  onClick={() => setConfirmando(true)}>
                  Enviar y cerrar la jornada
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmando && (
        <ModalConfirmar
          titulo="¿Enviar y cerrar la jornada?"
          descripcion={`${nombreDelCampo} · ${formatearFecha(fecha)} · ${vinieron.length} presentes y ${ausentes.length} ausentes. Una vez enviada no podrás modificarla: sólo quien administra el sistema puede reabrirla.`}
          confirmar="Sí, enviar"
          tono="primary"
          onCerrar={() => setConfirmando(false)}
          onConfirmar={finalizar}
        />
      )}
    </div>
  )
}
