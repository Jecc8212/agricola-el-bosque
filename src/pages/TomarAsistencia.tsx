import { useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Pagina } from '@/components/Pagina'
import { ModalConfirmar } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { fecha as formatearFecha } from '@/lib/formato'
import { reducirFoto, pesoLegible } from '@/lib/imagen'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import { formatearRut } from '@/lib/rut'
import { nombreCompleto } from '@/lib/types'
import type { Trabajador } from '@/lib/types'

type Paso = 1 | 2 | 3 | 4

const PASOS: Array<{ n: Paso; titulo: string }> = [
  { n: 1, titulo: '¿Quién vino?' },
  { n: 2, titulo: 'Labor y EPP' },
  { n: 3, titulo: 'Revisar' },
  { n: 4, titulo: 'Foto de la firma' },
]

function Guia({ paso }: { paso: Paso }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {PASOS.map((p, i) => (
        <li key={p.n} className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm',
              p.n === paso && 'bg-primary-tint font-medium text-primary-text',
              p.n < paso && 'text-ink-faint',
              p.n > paso && 'text-ink-disabled',
            )}
          >
            <span className="num">{p.n < paso ? '✓' : p.n}</span>
            {p.titulo}
          </span>
          {i < PASOS.length - 1 && <span aria-hidden="true" className="text-ink-disabled">›</span>}
        </li>
      ))}
    </ol>
  )
}

/**
 * Pasar lista, guiado.
 *
 * Cuatro pasos en un orden que no es casual: primero quién vino —lo único que
 * se sabe al llegar—, después qué hace cada uno y si recibió su equipo, luego
 * una revisión completa, y al final la foto de la hoja firmada.
 *
 * La foto es el cierre y no un adorno: es lo que respalda ante la Mutual que el
 * EPP se entregó. Por eso, cuando se sube, la jornada queda **sellada**: quien
 * pasa lista ya no puede alterarla. Sólo quien administra el sistema puede
 * reabrirla desde Asistencia.
 */
export default function TomarAsistencia() {
  const navegar = useNavigate()
  const { sesion } = useAuth()
  const { maestros, trabajadores, jornadas, cerrarJornada } = useMaestros()
  const { temporadaId, campoId, campoNombre } = useContextoOperacion()

  const [paso, setPaso] = useState<Paso>(1)
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  /** Motivo de cada ausencia: rut → id de la modalidad que la justifica. */
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [labores, setLabores] = useState<Record<string, string[]>>({})
  /** Centro de costo del día, por persona. Arranca del de su ficha. */
  const [centros, setCentros] = useState<Record<string, string>>({})
  const [epp, setEpp] = useState<Set<string>>(new Set())
  const [foto, setFoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [listo, setListo] = useState<{ presentes: number; ausentes: number } | null>(null)
  const archivoFoto = useRef<HTMLInputElement>(null)

  /* El campo sale del perfil; si la persona no está acotada, del filtro. */
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
  /* Sólo los centros del campo de la jornada: los de otro campo no pintan nada
     en esta lista, y ofrecerlos sólo invita a imputar mal el día. */
  const opCentros = aplanar(maestros.centrosCosto).filter(
    ({ nodo }) => !nodo.campoId || nodo.campoId === campoDeLaJornada,
  )
  /* Las que suman cero son las que sirven para justificar: falta justificada,
     injustificada, licencia, permiso sin goce. No hace falta marcarlas. */
  const motivosDeAusencia = aplanar(maestros.modalidades).filter((f) => (f.nodo.factor ?? 0) === 0)
  const temporadaDeLaJornada = temporadaId !== TODOS ? temporadaId : (maestros.temporadas[0]?.id ?? '')

  const yaCerrada = jornadas.find(
    (j) => j.campoId === campoDeLaJornada && j.fecha === fecha && !j.reabiertaEn,
  )
  const vinieron = nomina.filter((t) => presentes.has(t.rut))

  /* Nada de esto se puede improvisar en el campo: si falta, hay que decirlo
     antes de que alguien pase media hora pasando lista para nada. */
  const faltan: string[] = []
  if (!campoDeLaJornada) faltan.push('Su perfil no tiene un campo asignado, y el filtro de campo está en «todos».')
  if (motivosDeAusencia.length === 0)
    faltan.push('No hay ninguna modalidad que sirva para justificar una falta. Cree al menos una con factor 0 en Maestros › Modalidades.')
  if (!temporadaDeLaJornada) faltan.push('No hay temporadas cargadas.')
  if (nomina.length === 0 && campoDeLaJornada) faltan.push(`No hay trabajadores activos en ${nombreDelCampo}.`)

  /**
   * Alterna sobre el estado anterior, no sobre el que había al dibujar.
   *
   * Leyendo el conjunto de la clausura, dos marcas seguidas se pisan: la
   * segunda parte del mismo estado viejo y borra la primera. Pasando lista a
   * una cuadrilla se marca rápido, uno tras otro, así que esto no es teórico.
   */
  const alternar = (poner: Dispatch<SetStateAction<Set<string>>>, rut: string) => {
    poner((prev) => {
      const copia = new Set(prev)
      if (copia.has(rut)) copia.delete(rut)
      else copia.add(rut)
      return copia
    })
  }

  /** Al marcar a alguien presente, su motivo de falta deja de tener sentido. */
  function marcarPresencia(rut: string, presente: boolean) {
    setPresentes((prev) => {
      const copia = new Set(prev)
      if (presente) copia.add(rut)
      else copia.delete(rut)
      return copia
    })
    if (presente) setMotivos((m) => { const { [rut]: _, ...resto } = m; return resto })
  }

  const ausentes = nomina.filter((t) => !presentes.has(t.rut))
  /* No se avanza dejando faltas sin explicar: es el dato que decide si el día
     se paga o no, y nadie va a acordarse mañana. */
  const sinMotivo = ausentes.filter((t) => !motivos[t.rut])
  /** La modalidad de quien vino sale de su ficha, no de esta pantalla. */
  const modalidadDe = (t: Trabajador) =>
    buscarNodo(maestros.modalidades, t.modalidadId) ??
    aplanar(maestros.modalidades).find((f) => (f.nodo.factor ?? 0) > 0)?.nodo
  const sinModalidad = vinieron.filter((t) => !t.modalidadId)
  /** El de la ficha, salvo que se haya cambiado para este día. */
  const centroDe = (t: Trabajador) => centros[t.rut] ?? t.centroCostoId ?? ''
  const sinCentro = vinieron.filter((t) => !centroDe(t))

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
        campoId: campoDeLaJornada,
        fecha,
        temporadaId: temporadaDeLaJornada,
        cerradaEn: new Date().toISOString(),
        cerradaPor: sesion?.usuario ?? '',
        fotoEpp: foto,
      },
      nomina.map((t) => {
        const presente = presentes.has(t.rut)
        return {
          rut: t.rut,
          fecha,
          temporadaId: temporadaDeLaJornada,
          // Quien vino hereda la modalidad de su ficha; quien no, el motivo que
          // eligió quien pasó lista.
          modalidadId: presente ? (modalidadDe(t)?.id ?? '') : motivos[t.rut],
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

  /* ── Pantalla de cierre ────────────────────────────────────────────────*/
  if (listo) {
    return (
      <Pagina titulo="Jornada cerrada" descripcion={`${nombreDelCampo} · ${formatearFecha(fecha)}`}>
        <div className="max-w-xl rounded-md border border-line bg-surface p-5">
          <Chip tone="success">Enviada</Chip>
          <p className="mt-3 text-base">
            Quedaron registrados <strong>{listo.presentes} presentes</strong> y{' '}
            <strong>{listo.ausentes} ausentes</strong>, con la foto de la hoja firmada.
          </p>
          <p className="mt-2 text-sm text-ink-faint">
            La jornada quedó sellada: desde aquí ya no se puede modificar. Si hay que corregir
            algo, tiene que pedirlo a quien administra el sistema.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => navegar('/')}>Volver al inicio</Button>
            <Button
              onClick={() => {
                setListo(null); setPaso(1); setPresentes(new Set()); setLabores({})
                setEpp(new Set()); setFoto(null)
              }}
            >
              Pasar lista de otro día
            </Button>
          </div>
        </div>
      </Pagina>
    )
  }

  return (
    <Pagina
      titulo="Tomar asistencia"
      descripcion={`${nombreDelCampo} · ${nomina.length} ${nomina.length === 1 ? 'trabajador' : 'trabajadores'} en la nómina`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Guia paso={paso} />
        <label className="flex items-center gap-2 text-2xs font-medium tracking-wide text-ink-faint">
          FECHA
          <input
            type="date" value={fecha} disabled={paso > 1}
            onChange={(e) => setFecha(e.target.value)}
            className="h-8 rounded-sm border border-line-strong bg-surface px-2 text-base text-ink disabled:text-ink-faint"
          />
        </label>
      </div>

      {faltan.length > 0 ? (
        <div className="mt-5 max-w-2xl rounded-md border border-line bg-warning-tint px-4 py-3">
          <p className="text-base font-medium text-warning-text">No se puede pasar lista todavía</p>
          <ul className="mt-2 flex flex-col gap-1">
            {faltan.map((f) => (
              <li key={f} className="text-sm text-warning-text">— {f}</li>
            ))}
          </ul>
        </div>
      ) : yaCerrada && paso === 1 ? (
        <div className="mt-5 max-w-2xl rounded-md border border-line bg-warning-tint px-4 py-3">
          <p className="text-base font-medium text-warning-text">
            La jornada de {formatearFecha(fecha)} ya está cerrada
          </p>
          <p className="mt-1 text-sm text-warning-text">
            Se cerró con {yaCerrada.presentes} presentes y {yaCerrada.ausentes} ausentes. Elige otra
            fecha, o pide a quien administra el sistema que la reabra.
          </p>
        </div>
      ) : (
        <>
          {/* ── Paso 1: quién vino ──────────────────────────────────────*/}
          {paso === 1 && (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button onClick={() => { setPresentes(new Set(nomina.map((t) => t.rut))); setMotivos({}) }}>
                  Vinieron todos
                </Button>
                <Button onClick={() => setPresentes(new Set())}>No vino nadie</Button>
                <span aria-live="polite" className="text-2xs text-ink-faint">
                  {presentes.size} de {nomina.length} vinieron
                </span>
              </div>

              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                {nomina.map((t) => {
                  const presente = presentes.has(t.rut)
                  return (
                    <li key={t.rut} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium">{nombreCompleto(t)}</span>
                        <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                      </span>

                      {/* Dos botones y no un interruptor: en el campo se marca
                          rápido y con el dedo, y hay que ver el estado sin
                          interpretarlo. */}
                      <span className="flex shrink-0 overflow-hidden rounded-sm border border-line-strong">
                        <button
                          type="button" onClick={() => marcarPresencia(t.rut, true)}
                          aria-pressed={presente}
                          className={cn(
                            'cursor-pointer px-3 py-1.5 text-base transition-colors duration-100',
                            presente ? 'bg-primary font-medium text-on-primary' : 'hover:bg-surface-sunken',
                          )}
                        >
                          Vino
                        </button>
                        <button
                          type="button" onClick={() => marcarPresencia(t.rut, false)}
                          aria-pressed={!presente}
                          className={cn(
                            'cursor-pointer border-l border-line-strong px-3 py-1.5 text-base transition-colors duration-100',
                            !presente ? 'bg-warning font-medium text-ink-invert' : 'hover:bg-surface-sunken',
                          )}
                        >
                          No vino
                        </button>
                      </span>

                      {/* El motivo aparece sólo donde hace falta: quien vino no
                          tiene nada que justificar. */}
                      {!presente && (
                        <select
                          aria-label={`Motivo de la falta de ${nombreCompleto(t)}`}
                          value={motivos[t.rut] ?? ''}
                          onChange={(e) => setMotivos((m) => ({ ...m, [t.rut]: e.target.value }))}
                          className={cn(
                            'h-8 w-52 shrink-0 cursor-pointer rounded-sm border bg-surface px-2 text-base',
                            motivos[t.rut] ? 'border-line-strong' : 'border-danger text-danger-text',
                          )}
                        >
                          <option value="">¿Justificada o no?</option>
                          {motivosDeAusencia.map(({ nodo, nivel }) => (
                            <option key={nodo.id} value={nodo.id}>
                              {`${'— '.repeat(nivel)}${nodo.codigo ? `${nodo.codigo} · ` : ''}${nodo.nombre}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  )
                })}
              </ul>

              {sinMotivo.length > 0 && (
                <p role="alert" className="mt-3 rounded-md bg-warning-tint px-3 py-2 text-sm text-warning-text">
                  Falta decir si la ausencia es justificada o no en{' '}
                  {sinMotivo.length === 1
                    ? nombreCompleto(sinMotivo[0])
                    : `${sinMotivo.length} personas`}.
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  variant="primary"
                  disabled={sinMotivo.length > 0}
                  onClick={() => { setPaso(2); setError('') }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* ── Paso 2: labor y EPP ─────────────────────────────────────*/}
          {paso === 2 && (
            <div className="mt-5">
              {vinieron.length === 0 ? (
                <p className="rounded-md border border-line bg-surface px-4 py-8 text-center text-base">
                  No marcaste a nadie como presente. Vuelve atrás si fue un error.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-line bg-surface">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
                        <th className="px-3 py-2 text-left font-medium">TRABAJADOR</th>
                        <th className="px-3 py-2 text-left font-medium">RUT</th>
                        <th className="px-3 py-2 text-left font-medium">MODALIDAD</th>
                        <th className="px-3 py-2 text-left font-medium">CENTRO DE COSTO</th>
                        <th className="px-3 py-2 text-left font-medium">LABOR — UNA O VARIAS</th>
                        <th className="w-40 px-3 py-2 text-left font-medium">¿SE ENTREGÓ EPP?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vinieron.map((t) => (
                        <tr key={t.rut} className="border-b border-line last:border-0">
                          <td className="px-3 py-2 font-medium">{nombreCompleto(t)}</td>
                          <td className="mono whitespace-nowrap px-3 py-2 text-ink-faint">{formatearRut(t.rut)}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {t.modalidadId ? (
                              <span className="text-ink-muted">{modalidadDe(t)?.nombre}</span>
                            ) : (
                              <Chip tone="warning">Sin asignar · {modalidadDe(t)?.nombre}</Chip>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {/* Viene de la ficha, pero se puede cambiar: hay
                                días en que la cuadrilla se manda a otro cuartel. */}
                            <select
                              aria-label={`Centro de costo de ${nombreCompleto(t)}`}
                              value={centroDe(t)}
                              onChange={(e) => setCentros((c) => ({ ...c, [t.rut]: e.target.value }))}
                              className={cn(
                                'h-8 w-44 cursor-pointer rounded-sm border bg-surface px-2 text-base',
                                centroDe(t) ? 'border-line-strong' : 'border-warning',
                              )}
                            >
                              <option value="">
                                {opCentros.length ? 'Sin asignar' : 'Sin centros cargados'}
                              </option>
                              {opCentros.map(({ nodo, nivel }) => (
                                <option key={nodo.id} value={nodo.id}>
                                  {`${'— '.repeat(nivel)}${nodo.nombre}`}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            {/* Selección múltiple: un día puede tener más de una
                                labor, y separarlas en dos registros mentiría
                                sobre los días trabajados. */}
                            <select
                              multiple
                              size={Math.min(4, Math.max(2, opLabores.length))}
                              value={labores[t.rut] ?? []}
                              onChange={(e) =>
                                setLabores((l) => ({
                                  ...l,
                                  [t.rut]: [...e.target.selectedOptions].map((o) => o.value),
                                }))
                              }
                              className="w-full cursor-pointer rounded-sm border border-line-strong bg-surface px-2 py-1 text-base"
                            >
                              {opLabores.map(({ nodo, nivel }) => (
                                <option key={nodo.id} value={nodo.id}>
                                  {`${'— '.repeat(nivel)}${nodo.nombre}`}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => alternar(setEpp, t.rut)}
                              aria-pressed={epp.has(t.rut)}
                              className="cursor-pointer"
                            >
                              <Chip tone={epp.has(t.rut) ? 'success' : 'neutral'}>
                                {epp.has(t.rut) ? 'Sí, entregado' : 'No'}
                              </Chip>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-2 text-2xs text-ink-faint">
                La modalidad y el centro de costo salen de la ficha de cada trabajador; el centro
                se puede cambiar sólo para este día.
                {sinCentro.length > 0 &&
                  ` ${sinCentro.length} sin centro de costo: su jornada no llegará a ningún costo.`}
                {sinModalidad.length > 0 &&
                  ` ${sinModalidad.length} ${sinModalidad.length === 1 ? 'persona no la tiene asignada y usará' : 'personas no la tienen asignada y usarán'} «${modalidadDe(sinModalidad[0])?.nombre}»: conviene corregir su ficha en Trabajadores.`}
              </p>

              <div className="mt-4 flex justify-between gap-2">
                <Button onClick={() => setPaso(1)}>Atrás</Button>
                <Button variant="primary" onClick={() => setPaso(3)}>Siguiente</Button>
              </div>
            </div>
          )}

          {/* ── Paso 3: revisar ─────────────────────────────────────────*/}
          {paso === 3 && (
            <div className="mt-5">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="text-2xs tracking-wide text-ink-faint">PRESENTES</p>
                  <p className="num text-2xl font-semibold">{vinieron.length}</p>
                </div>
                <div className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="text-2xs tracking-wide text-ink-faint">AUSENTES</p>
                  <p className="num text-2xl font-semibold">{nomina.length - vinieron.length}</p>
                </div>
                <div className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="text-2xs tracking-wide text-ink-faint">CON EPP</p>
                  <p className="num text-2xl font-semibold">{vinieron.filter((t) => epp.has(t.rut)).length}</p>
                </div>
                <div className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="text-2xs tracking-wide text-ink-faint">SIN CENTRO</p>
                  <p className="num text-2xl font-semibold">{sinCentro.length}</p>
                </div>
                <div className="rounded-md border border-line bg-surface px-4 py-3">
                  <p className="text-2xs tracking-wide text-ink-faint">SIN LABOR</p>
                  <p className="num text-2xl font-semibold">
                    {vinieron.filter((t) => (labores[t.rut] ?? []).length === 0).length}
                  </p>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
                {nomina.map((t) => {
                  const presente = presentes.has(t.rut)
                  const suyas = (labores[t.rut] ?? [])
                    .map((id) => buscarNodo(maestros.labores, id)?.nombre)
                    .filter(Boolean)
                  return (
                    <li key={t.rut} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-medium">{nombreCompleto(t)}</span>
                        <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Chip tone={presente ? 'success' : 'warning'}>
                          {presente
                            ? 'Vino'
                            : buscarNodo(maestros.modalidades, motivos[t.rut])?.nombre ?? 'No vino'}
                        </Chip>
                        {presente && (
                          <>
                            <Chip tone="neutral">{modalidadDe(t)?.nombre}</Chip>
                            {centroDe(t) ? (
                              <Chip tone="neutral">
                                {buscarNodo(maestros.centrosCosto, centroDe(t))?.nombre}
                              </Chip>
                            ) : (
                              <Chip tone="warning">Sin centro</Chip>
                            )}
                            {suyas.length > 0 ? (
                              <Chip tone="primary">{suyas.join(' + ')}</Chip>
                            ) : (
                              <Chip tone="warning">Sin labor</Chip>
                            )}
                            <Chip tone={epp.has(t.rut) ? 'success' : 'neutral'}>
                              {epp.has(t.rut) ? 'EPP entregado' : 'Sin EPP'}
                            </Chip>
                          </>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex justify-between gap-2">
                <Button onClick={() => setPaso(2)}>Atrás</Button>
                <Button variant="primary" onClick={() => setPaso(4)}>Está todo correcto</Button>
              </div>
            </div>
          )}

          {/* ── Paso 4: foto ────────────────────────────────────────────*/}
          {paso === 4 && (
            <div className="mt-5 max-w-2xl">
              <div className="rounded-md border border-line bg-surface p-5">
                <h2 className="text-lg font-semibold tracking-tight">Foto de la hoja firmada</h2>
                <p className="mt-1 text-base text-ink-faint">
                  Saca una foto de la hoja donde los trabajadores firmaron la entrega de su EPP.
                  Es el respaldo ante la Mutual, y lo que cierra la jornada.
                </p>

                {/* `capture` abre la cámara directo en el teléfono, que es donde
                    se usa esto; en un computador ofrece elegir archivo. */}
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
                  <div className="mt-4">
                    <img
                      src={foto} alt="Hoja de entrega de EPP firmada"
                      className="max-h-80 w-full rounded-sm border border-line object-contain"
                    />
                    <p className="mt-2 text-2xs text-ink-faint">Foto lista · {pesoLegible(foto)}</p>
                    <Button className="mt-2" onClick={() => archivoFoto.current?.click()}>
                      Cambiar la foto
                    </Button>
                  </div>
                ) : (
                  <Button variant="primary" className="mt-4 h-11 px-5" onClick={() => archivoFoto.current?.click()}>
                    Sacar o subir la foto
                  </Button>
                )}

                {error && (
                  <p role="alert" className="mt-3 rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-between gap-2">
                <Button onClick={() => setPaso(3)}>Atrás</Button>
                <Button variant="primary" disabled={!foto} onClick={() => setConfirmando(true)}>
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
          descripcion={`${nombreDelCampo} · ${formatearFecha(fecha)} · ${vinieron.length} presentes y ${nomina.length - vinieron.length} ausentes. Una vez enviada no podrás modificarla: sólo quien administra el sistema puede reabrirla.`}
          confirmar="Sí, enviar"
          tono="primary"
          onCerrar={() => setConfirmando(false)}
          onConfirmar={finalizar}
        />
      )}
    </Pagina>
  )
}
