import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Pagina } from '@/components/Pagina'
import { BarraDatos } from '@/components/BarraDatos'
import { aIso, columnas as columnasDe, normalizar } from '@/lib/planilla'
import type { Fila } from '@/lib/planilla'
import { FormularioModal } from '@/components/ui/FormularioModal'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { Modal, ModalConfirmar } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { pesoLegible } from '@/lib/imagen'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { cn } from '@/lib/cn'
import { CLP, fecha as formatearFecha } from '@/lib/formato'
import { etiquetaMes } from '@/lib/mes'
import { aplanar, buscarNodo, rutaDe, useMaestros } from '@/lib/maestros'
import type { Nodo, RegistroAsistencia } from '@/lib/maestros'
import { imputacionDeModalidad, imputacionDeRegistro } from '@/lib/vigencia'
import { formatearRut } from '@/lib/rut'
import { nombreCompleto } from '@/lib/types'
import type { Trabajador } from '@/lib/types'

const opciones = (lista: Nodo[]) =>
  aplanar(lista).map(({ nodo, nivel }) => ({
    valor: nodo.id,
    etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
  }))

/**
 * Texto comparable: sin tildes, sin comas y con los espacios colapsados.
 *
 * La lista muestra «Silva Araya, Iván» y quien busca escribe eso mismo: sin
 * quitar la coma, el nombre que se ve en pantalla no encuentra a su propia
 * fila. Y en una nómina chilena, buscar «munoz» tiene que dar con Muñoz.
 */
const paraBuscar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.]/g, '').replace(/\s+/g, ' ').trim()

const control =
  'h-8 rounded-sm border border-line-strong bg-surface px-2 text-base text-ink transition-colors duration-150 ease-out placeholder:text-ink-disabled'

/** Etiqueta encima de cada control de la barra de registro. */
function Casilla({ label, children, ancho = '' }: { label: string; children: React.ReactNode; ancho?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', ancho)}>
      <span className="text-2xs font-medium tracking-wide text-ink-faint">{label}</span>
      {children}
    </div>
  )
}

/**
 * Buscador de trabajador que rellena el RUT solo.
 *
 * Se escribe el nombre y se elige de la lista; el RUT no se teclea nunca —es
 * justo el dato que se copia mal— sino que viene con la persona elegida.
 */
function BuscadorTrabajador({
  personas, seleccionado, onSeleccionar,
}: {
  personas: Trabajador[]
  seleccionado: Trabajador | null
  onSeleccionar: (t: Trabajador | null) => void
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const cerrarTimer = useRef<number | undefined>(undefined)

  const coincidencias = useMemo(() => {
    const q = paraBuscar(texto)
    if (!q) return personas.slice(0, 8)
    return personas
      .filter(
        (t) =>
          paraBuscar(nombreCompleto(t)).includes(q) ||
          paraBuscar(`${t.apellidos} ${t.nombres}`).includes(q) ||
          t.rut.includes(q.replace(/[-\s]/g, '')),
      )
      .slice(0, 8)
  }, [personas, texto])

  function elegir(t: Trabajador) {
    onSeleccionar(t)
    setTexto('')
    setAbierto(false)
  }

  if (seleccionado) {
    return (
      <div className={cn(control, 'flex items-center justify-between gap-2')}>
        <span className="truncate font-medium">{nombreCompleto(seleccionado)}</span>
        <button
          type="button"
          onClick={() => onSeleccionar(null)}
          aria-label="Cambiar de trabajador"
          className="shrink-0 cursor-pointer text-2xs text-primary-text underline underline-offset-2"
        >
          cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className={cn(control, 'w-full')}
        placeholder="Escribe el nombre…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        /* El blur se aplaza: sin esto, el clic en una opción llega después de
           que la lista ya se cerró y no selecciona nada. */
        onBlur={() => {
          cerrarTimer.current = window.setTimeout(() => setAbierto(false), 120)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAbierto(false)
          if (e.key === 'Enter' && coincidencias.length > 0) {
            e.preventDefault()
            elegir(coincidencias[0])
          }
        }}
      />
      {abierto && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-64 w-72 overflow-y-auto rounded-md border border-line bg-surface-raised p-1 shadow-overlay">
          {coincidencias.map((t) => (
            <li key={t.rut}>
              <button
                type="button"
                onMouseDown={() => window.clearTimeout(cerrarTimer.current)}
                onClick={() => elegir(t)}
                className="block w-full cursor-pointer rounded-sm px-2 py-1.5 text-left transition-colors duration-100 hover:bg-surface-sunken"
              >
                <span className="block text-base">{t.apellidos}, {t.nombres}</span>
                <span className="mono block text-2xs text-ink-faint">{formatearRut(t.rut)}</span>
              </button>
            </li>
          ))}
          {coincidencias.length === 0 && (
            <li className="px-2 py-3 text-center text-sm text-ink-faint">Ningún trabajador coincide</li>
          )}
        </ul>
      )}
    </div>
  )
}

/**
 * Asistencia: una categoría propia, separada de la ficha de personal.
 *
 * Cada registro es un día de una persona, y de ahí sale la liquidación. Lo que
 * lo convierte en algo más que una lista es la modalidad: ella decide **si el
 * día cuenta** —una falta no suma— y **a qué cuenta imputa**. La labor dice qué
 * se hizo, y trae su bono.
 */
export default function Asistencia() {
  const {
    maestros, asistencia, trabajadores, jornadas, reabrirJornada,
    agregarAsistencia, actualizarAsistencia, eliminarAsistencia,
  } = useMaestros()
  const { sesion, puedeVer } = useAuth()
  /* Reabrir un acta es deshacer un respaldo ante la Mutual: sólo quien
     administra el sistema. Al jefe de campo ni se le ofrece. */
  const puedeReabrir = puedeVer('sistema')
  /**
   * Las actas se filtran aparte de los registros, y arrancan en **el día de
   * hoy**. Un mes cargado son treinta y tantas tarjetas: mostrarlas todas de
   * entrada llena la pantalla de historia justo cuando lo que se busca es lo
   * de hoy.
   */
  const [modoActa, setModoActa] = useState<'dia' | 'mes'>('dia')
  const [diaActa, setDiaActa] = useState(() => new Date().toISOString().slice(0, 10))
  const [viendoFoto, setViendoFoto] = useState<string | null>(null)
  const [reabriendo, setReabriendo] = useState<string | null>(null)
  const { temporadaId, campoId, centroCostoId, mes } = useContextoOperacion()

  const [editando, setEditando] = useState<RegistroAsistencia | null>(null)
  const [borrando, setBorrando] = useState<RegistroAsistencia | null>(null)
  /* La barra de registro no es un formulario en modal, así que su confirmación
     va aparte: se guarda lo que se va a crear y se pregunta antes de aplicar. */
  const [porConfirmar, setPorConfirmar] = useState<Omit<RegistroAsistencia, 'id'> | null>(null)

  /* Barra de registro: se llena de izquierda a derecha y se vacía al agregar. */
  const hoy = new Date().toISOString().slice(0, 10)
  const [fechaNueva, setFechaNueva] = useState(hoy)
  const [persona, setPersona] = useState<Trabajador | null>(null)
  const [laborNueva, setLaborNueva] = useState('')
  const [modalidadNueva, setModalidadNueva] = useState('')
  const [centroNuevo, setCentroNuevo] = useState('')
  const [error, setError] = useState('')

  const opModalidades = opciones(maestros.modalidades)
  const opLabores = opciones(maestros.labores)
  const opTemporadas = opciones(maestros.temporadas)
  const opCentros = opciones(maestros.centrosCosto)
  const faltanMaestros = opTemporadas.length === 0 || opModalidades.length === 0

  const modalidadDe = (id: string) => buscarNodo(maestros.modalidades, id)
  const laborDe = (id: string) => buscarNodo(maestros.labores, id)
  /** Varias labores en un día se leen juntas, con la suma de sus bonos. */
  const laboresDe = (ids: string[]) => ids.map(laborDe).filter(Boolean) as Nodo[]
  const personaDe = (rut: string) => trabajadores.find((t) => t.rut === rut)

  /** El buscador respeta el filtro de campo: si estás en Buin, no propone gente
   *  de Graneros. */
  const elegibles = useMemo(
    () =>
      trabajadores.filter((t) => campoId === TODOS || t.campoId === campoId).sort((a, b) =>
        `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'),
      ),
    [trabajadores, campoId],
  )

  /* La temporada sale del filtro de arriba; si está en «todas», la primera del
     maestro. El orden del maestro lo defines tú, así que la predeterminada
     también. */
  const temporadaParaRegistrar =
    temporadaId !== TODOS ? temporadaId : (maestros.temporadas[0]?.id ?? '')

  const jornadasDelMes = useMemo(
    () =>
      jornadas
        .filter((j) => {
          if (campoId !== TODOS && j.campoId !== campoId) return false
          return modoActa === 'dia' ? j.fecha === diaActa : j.fecha.startsWith(mes)
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [jornadas, mes, campoId, modoActa, diaActa],
  )

  /** Para saber si el vacío es «no hay nada» o «no hay nada ese día». */
  const actasEnElMes = useMemo(
    () =>
      jornadas.filter(
        (j) => j.fecha.startsWith(mes) && (campoId === TODOS || j.campoId === campoId),
      ).length,
    [jornadas, mes, campoId],
  )

  const registros = useMemo(
    () =>
      asistencia
        .filter((r) => {
          if (!r.fecha.startsWith(mes)) return false
          if (temporadaId !== TODOS && r.temporadaId !== temporadaId) return false
          if (centroCostoId !== TODOS && r.centroCostoId !== centroCostoId) return false
          if (campoId !== TODOS && personaDe(r.rut)?.campoId !== campoId) return false
          return true
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [asistencia, mes, temporadaId, centroCostoId, campoId],
  )

  function agregar() {
    if (!persona) return setError('Busca y elige un trabajador.')
    if (!modalidadNueva) return setError('Falta la modalidad.')
    if (!temporadaParaRegistrar) return setError('No hay temporadas cargadas en el maestro.')
    /* La misma regla que en la toma de asistencia: si la modalidad trae labor
       o centro, mandan ellos, y la cuenta queda congelada en el registro. */
    const regla = imputacionDeModalidad(maestros, modalidadNueva, fechaNueva)
    const laborIds = regla.laborId
      ? [regla.laborId, ...(laborNueva && laborNueva !== regla.laborId ? [laborNueva] : [])]
      : laborNueva ? [laborNueva] : []
    setPorConfirmar({
      rut: persona.rut,
      fecha: fechaNueva,
      temporadaId: temporadaParaRegistrar,
      modalidadId: modalidadNueva,
      laborIds,
      presente: true,
      eppEntregado: false,
      centroCostoId: regla.centroCostoId ?? centroNuevo,
      cuentaId: regla.cuentaId,
      vigenciaId: regla.vigenciaId,
    })
    setError('')
  }

  function confirmarAlta() {
    if (!porConfirmar) return
    agregarAsistencia(porConfirmar)
    setPorConfirmar(null)
    // Se conservan fecha, labor y modalidad: cargar una cuadrilla es repetir lo
    // mismo cambiando sólo la persona.
    setPersona(null)
    setCentroNuevo('')
  }

  function camposDe(r: RegistroAsistencia): CampoForm[] {
    return [
      { tipo: 'fecha', id: 'fecha', etiqueta: 'Fecha', valor: r.fecha, requerido: true },
      {
        tipo: 'select', id: 'temporadaId', etiqueta: 'Temporada agrícola', requerido: true,
        valor: r.temporadaId, opciones: opTemporadas,
      },
      {
        tipo: 'select', id: 'laborId', etiqueta: 'Labor', valor: r.laborIds[0] ?? '',
        opciones: [{ valor: '', etiqueta: opLabores.length ? 'Sin labor' : 'Aún no hay labores' }, ...opLabores],
      },
      {
        tipo: 'select', id: 'modalidadId', etiqueta: 'Modalidad', requerido: true,
        valor: r.modalidadId, opciones: [{ valor: '', etiqueta: 'Selecciona…' }, ...opModalidades],
      },
      {
        tipo: 'select', id: 'centroCostoId', etiqueta: 'Centro de costo', valor: r.centroCostoId,
        opciones: [
          { valor: '', etiqueta: opCentros.length ? 'Sin centro de costo' : 'Aún no hay centros' },
          ...opCentros,
        ],
      },
    ]
  }

  const filasExcel: Fila[] = registros.map((r) => {
    const p = personaDe(r.rut)
    const m = modalidadDe(r.modalidadId)
    return {
      RUT: formatearRut(r.rut),
      Trabajador: p ? nombreCompleto(p) : '',
      Fecha: r.fecha,
      Temporada: buscarNodo(maestros.temporadas, r.temporadaId)?.nombre ?? '',
      Labor: laboresDe(r.laborIds).map((l) => l.nombre).join(' + '),
      Modalidad: m?.nombre ?? '',
      'Centro de costo': buscarNodo(maestros.centrosCosto, r.centroCostoId)?.nombre ?? '',
      /* La cuenta del día, tal como quedó imputada: es lo que permite informar
         cuánto costó una labor sin rehacer el cálculo a mano. */
      Cuenta: rutaDe(maestros.cuentas, imputacionDeRegistro(maestros, r).cuentaId),
      'Suma día': m?.factor ?? 0,
    }
  })

  const plantilla: Fila[] = [{
    RUT: '12.345.678-5',
    Trabajador: '(se ignora: manda el RUT)',
    Fecha: `${mes}-01`,
    Temporada: maestros.temporadas[0]?.nombre ?? '',
    Labor: maestros.labores[0]?.nombre ?? '',
    Modalidad: maestros.modalidades[0]?.nombre ?? '',
    'Centro de costo': maestros.centrosCosto[0]?.nombre ?? '',
    'Suma día': '(se calcula solo)',
  }]

  /**
   * La persona se identifica por RUT, no por nombre: dos personas pueden
   * llamarse igual, y el nombre se escribe de mil maneras. La columna
   * «Trabajador» de la plantilla es sólo para que quien la rellena se ubique.
   */
  function importarDias(filas: Record<string, unknown>[]): string {
    if (filas.length === 0) throw new Error('La planilla está vacía.')
    const indice = (lista: Nodo[]) =>
      new Map(aplanar(lista).map(({ nodo }) => [normalizar(nodo.nombre), nodo.id]))
    const iTemp = indice(maestros.temporadas)
    const iModa = indice(maestros.modalidades)
    const iLabor = indice(maestros.labores)
    const iCentro = indice(maestros.centrosCosto)
    const ruts = new Set(trabajadores.map((t) => t.rut))

    const problemas: string[] = []
    let cargados = 0

    filas.forEach((f, i) => {
      const col = columnasDe(f)
      const linea = i + 2
      const rut = String(col('RUT') ?? '').replace(/[.\-\s]/g, '').toUpperCase()
      if (!ruts.has(rut)) return problemas.push(`Fila ${linea}: el RUT ${rut || '(vacío)'} no está en la nómina`)

      const fecha = aIso(col('Fecha'))
      if (!fecha) return problemas.push(`Fila ${linea}: fecha ilegible`)

      const temporadaFila = iTemp.get(normalizar(col('Temporada')))
      if (!temporadaFila) return problemas.push(`Fila ${linea}: temporada «${String(col('Temporada'))}» no existe`)

      const modalidadFila = iModa.get(normalizar(col('Modalidad')))
      if (!modalidadFila) return problemas.push(`Fila ${linea}: modalidad «${String(col('Modalidad'))}» no existe`)

      const laborTexto = String(col('Labor') ?? '').trim()
      const laborFila = laborTexto ? iLabor.get(normalizar(laborTexto)) : ''
      if (laborTexto && !laborFila) return problemas.push(`Fila ${linea}: labor «${laborTexto}» no existe`)

      const centroTexto = String(col('Centro de costo') ?? '').trim()
      const centroFila = centroTexto ? iCentro.get(normalizar(centroTexto)) : ''
      if (centroTexto && !centroFila) return problemas.push(`Fila ${linea}: centro «${centroTexto}» no existe`)

      agregarAsistencia({
        rut, fecha, temporadaId: temporadaFila, modalidadId: modalidadFila,
        laborIds: laborFila ? [laborFila] : [], presente: true, eppEntregado: false,
        centroCostoId: centroFila ?? '',
      })
      cargados++
    })

    if (problemas.length > 0)
      throw new Error(`${cargados} días cargados. Sin cargar: ${problemas.slice(0, 4).join(' · ')}${problemas.length > 4 ? ` y ${problemas.length - 4} más` : ''}`)
    return `${cargados} días cargados desde la planilla.`
  }

  return (
    <Pagina
      titulo="Asistencia"
      descripcion="Un registro por día y por persona. La modalidad decide si el día cuenta para la liquidación y a qué cuenta imputa; la labor dice qué se hizo y trae su bono."
    >
      {/* Las actas cerradas van arriba: son el documento del día, y lo que
          alguien viene a buscar cuando pregunta «¿se entregó el EPP?». */}
      {actasEnElMes > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-2xs font-semibold tracking-wide text-ink-muted">
              JORNADAS CERRADAS
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-lg bg-surface-sunken p-0.5">
                {(['dia', 'mes'] as const).map((m) => (
                  <button
                    key={m} type="button" onClick={() => setModoActa(m)}
                    aria-pressed={modoActa === m}
                    className={cn(
                      'cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150',
                      modoActa === m
                        ? 'bg-surface font-medium text-ink shadow-xs'
                        : 'text-ink-faint hover:text-ink',
                    )}
                  >
                    {m === 'dia' ? 'Por día' : 'Por mes'}
                  </button>
                ))}
              </span>

              {modoActa === 'dia' ? (
                <input
                  type="date" aria-label="Día de las actas" value={diaActa}
                  onChange={(e) => setDiaActa(e.target.value)}
                  className={cn(control, 'w-40')}
                />
              ) : (
                <span className="text-sm text-ink-faint">{etiquetaMes(mes)}</span>
              )}

              <span aria-live="polite" className="text-2xs text-ink-faint">
                {jornadasDelMes.length} de {actasEnElMes} en el mes
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {jornadasDelMes.map((j) => (
              <div key={j.id} className="rounded-md border border-line bg-surface p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium">
                      {buscarNodo(maestros.campos, j.campoId)?.nombre ?? 'Campo eliminado'}
                    </span>
                    <span className="block text-2xs text-ink-faint">{formatearFecha(j.fecha)}</span>
                  </span>
                  <Chip tone={j.reabiertaEn ? 'warning' : 'success'}>
                    {j.reabiertaEn ? 'Reabierta' : 'Cerrada'}
                  </Chip>
                </div>
                <p className="num mt-2 text-sm">
                  {j.presentes} presentes · {j.ausentes} ausentes
                </p>
                <p className="mt-0.5 text-2xs text-ink-faint">
                  cerrada por {j.cerradaPor} · {new Date(j.cerradaEn).toLocaleString('es-CL')}
                </p>
                {j.reabiertaEn && (
                  <p className="mt-0.5 text-2xs text-warning-text">
                    reabierta por {j.reabiertaPor} · {new Date(j.reabiertaEn).toLocaleString('es-CL')}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {j.fotoEpp ? (
                    <Button size="sm" onClick={() => setViendoFoto(j.fotoEpp ?? null)}>
                      Ver hoja firmada
                    </Button>
                  ) : (
                    <Chip tone="warning">Sin foto</Chip>
                  )}
                  {puedeReabrir && !j.reabiertaEn && (
                    <Button size="sm" variant="ghost" onClick={() => setReabriendo(j.id)}>
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {jornadasDelMes.length === 0 && (
            <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-faint">
              {modoActa === 'dia'
                ? `Sin jornada cerrada el ${formatearFecha(diaActa)}. Cambia el día, o mira el mes completo.`
                : `Sin jornadas cerradas en ${etiquetaMes(mes)}.`}
            </p>
          )}
        </div>
      )}

      <div className="mb-5">
        <BarraDatos
          titulo="Asistencia"
          nombreArchivo={`asistencia-${mes}`}
          subtitulo={`${registros.length} registros · ${etiquetaMes(mes)}`}
          filas={filasExcel}
          plantilla={plantilla}
          onImportar={importarDias}
        />
      </div>

      {faltanMaestros ? (
        <div className="rounded-md border border-line bg-warning-tint px-3.5 py-3">
          <p className="text-base text-warning-text">
            Para registrar asistencia hacen falta al menos una <strong>temporada</strong> y una{' '}
            <strong>modalidad</strong> en los maestros.
          </p>
        </div>
      ) : (
        /* La barra de registro va de lado: se completa de izquierda a derecha
           y se agrega sin salir de la pantalla ni abrir un diálogo. */
        <div className="rounded-md border border-line bg-surface px-3.5 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <Casilla label="FECHA" ancho="w-36 shrink-0">
              <input type="date" value={fechaNueva} onChange={(e) => setFechaNueva(e.target.value)}
                className={cn(control, 'w-full')} />
            </Casilla>

            {/* Los tres campos elásticos se reparten lo que sobra: así la barra
                cabe en una línea sin fijar anchos que se pelean entre sí. */}
            <Casilla label="TRABAJADOR" ancho="flex-1 basis-48">
              <BuscadorTrabajador
                personas={elegibles} seleccionado={persona}
                onSeleccionar={(t) => {
                  setPersona(t)
                  // La ficha manda: se rellena con lo suyo y se puede cambiar.
                  if (t) {
                    setCentroNuevo(t.centroCostoId ?? '')
                    if (t.modalidadId) setModalidadNueva(t.modalidadId)
                  }
                  setError('')
                }}
              />
            </Casilla>

            <Casilla label="RUT" ancho="w-28 shrink-0">
              {/* Se rellena solo con la persona elegida: no se teclea nunca. */}
              <input readOnly tabIndex={-1} value={persona ? formatearRut(persona.rut) : ''}
                placeholder="automático"
                className={cn(control, 'mono w-full bg-surface-sunken text-ink-faint')} />
            </Casilla>

            <Casilla label="LABOR" ancho="flex-1 basis-36">
              <select value={laborNueva} onChange={(e) => setLaborNueva(e.target.value)}
                className={cn(control, 'w-full cursor-pointer')}>
                <option value="">{opLabores.length ? 'Sin labor' : 'Aún no hay labores'}</option>
                {opLabores.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </Casilla>

            <Casilla label="CENTRO DE COSTO" ancho="flex-1 basis-36">
              <select value={centroNuevo} onChange={(e) => setCentroNuevo(e.target.value)}
                className={cn(control, 'w-full cursor-pointer')}>
                <option value="">{opCentros.length ? 'Sin asignar' : 'Sin centros cargados'}</option>
                {opCentros.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </Casilla>

            <Casilla label="MODALIDAD" ancho="flex-1 basis-36">
              <select value={modalidadNueva} onChange={(e) => { setModalidadNueva(e.target.value); setError('') }}
                className={cn(control, 'w-full cursor-pointer')}>
                <option value="">Selecciona…</option>
                {opModalidades.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
              </select>
            </Casilla>

            <Button variant="primary" className="shrink-0" onClick={agregar}>Agregar</Button>
          </div>

          {error && (
            <p role="alert" className="mt-2.5 text-sm text-danger-text">{error}</p>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-4 text-2xs text-ink-faint">
        {registros.length} {registros.length === 1 ? 'registro' : 'registros'} · {etiquetaMes(mes)}
      </p>

      <div className="mt-2 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[940px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">TRABAJADOR</th>
              <th className="px-3 py-2 text-left font-medium">RUT</th>
              <th className="px-3 py-2 text-left font-medium">FECHA</th>
              <th className="px-3 py-2 text-left font-medium">LABOR</th>
              <th className="px-3 py-2 text-left font-medium">MODALIDAD</th>
              <th className="px-3 py-2 text-left font-medium">DÍA</th>
              <th className="px-3 py-2 text-left font-medium">IMPUTA A</th>
              <th className="w-28 px-3 py-2 text-right font-medium">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => {
              const p = personaDe(r.rut)
              const m = modalidadDe(r.modalidadId)
              const ls = laboresDe(r.laborIds)
              const factor = m?.factor ?? 0
              /* La cuenta que se muestra es la que quedó imputada ese día, no
               la que la modalidad diga ahora: cambiar el plan de cuentas no
               puede reescribir lo que ya se registró. */
            const cuenta = rutaDe(maestros.cuentas, imputacionDeRegistro(maestros, r).cuentaId)
              return (
                <tr key={r.id} className="border-b border-line last:border-0 transition-colors duration-100 hover:bg-surface-sunken/50">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                    {p ? `${p.apellidos}, ${p.nombres}` : 'Trabajador no encontrado'}
                  </td>
                  <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">{formatearRut(r.rut)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-ink-faint">{formatearFecha(r.fecha)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {ls.length > 0 ? (
                      <span className="flex items-baseline gap-2">
                        {ls.map((l) => l.nombre).join(' + ')}
                        {ls.some((l) => (l.bono ?? 0) > 0) && (
                          <span className="num text-2xs text-primary-text">
                            +{CLP.format(ls.reduce((s, l) => s + (l.bono ?? 0), 0))}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-disabled">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {m?.nombre ?? <span className="text-warning-text">Modalidad eliminada</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    {factor > 0 ? (
                      <span className="num text-sm font-medium">{factor}</span>
                    ) : (
                      <Chip tone="warning">No suma</Chip>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {cuenta ? (
                      <span className="text-2xs text-ink-faint">{cuenta}</span>
                    ) : (
                      <Chip tone="warning">Sin imputar</Chip>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-1">
                      {r.jornadaId ? (
                        <Chip tone="neutral">En jornada cerrada</Chip>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => setEditando(r)}>Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setBorrando(r)}>Borrar</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {registros.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-base font-medium">Sin registros en {etiquetaMes(mes)}</p>
            <p className="mx-auto mt-1 max-w-[54ch] text-sm text-ink-faint">
              Registra el primer día con la barra de arriba. Revisa también los filtros de la
              cabecera: acotan antes que esta pantalla.
            </p>
          </div>
        )}
      </div>

      {editando && (
        <FormularioModal
          titulo="Editar registro"
          descripcion={personaDe(editando.rut) ? nombreCompleto(personaDe(editando.rut)!) : editando.rut}
          campos={camposDe(editando)}
          tituloConfirmacion="¿Guardar los cambios?"
          mensajeConfirmacion="Se guardarán los cambios de este día registrado."
          onCerrar={() => setEditando(null)}
          onGuardar={(v) => {
            /* Corregir un registro sí recalcula su imputación: es una decisión
               explícita sobre ese día, no un cambio de configuración
               arrastrándose hacia atrás. */
            const regla = imputacionDeModalidad(maestros, v.modalidadId, v.fecha)
            const laborIds = regla.laborId
              ? [regla.laborId, ...(v.laborId && v.laborId !== regla.laborId ? [v.laborId] : [])]
              : v.laborId ? [v.laborId] : []
            actualizarAsistencia(editando.id, {
              fecha: v.fecha, temporadaId: v.temporadaId,
              laborIds,
              modalidadId: v.modalidadId,
              centroCostoId: regla.centroCostoId ?? v.centroCostoId,
              cuentaId: regla.cuentaId,
              vigenciaId: regla.vigenciaId,
            })
            setEditando(null)
          }}
        />
      )}
      {viendoFoto && (
        <Modal
          titulo="Hoja de entrega de EPP firmada"
          descripcion={`Respaldo ante la Mutual · ${pesoLegible(viendoFoto)}`}
          ancho="max-w-3xl"
          onCerrar={() => setViendoFoto(null)}
          pie={<Button onClick={() => setViendoFoto(null)}>Cerrar</Button>}
        >
          <img src={viendoFoto} alt="Hoja de entrega de EPP firmada" className="w-full rounded-sm border border-line" />
        </Modal>
      )}
      {reabriendo && (
        <ModalConfirmar
          titulo="¿Reabrir esta jornada?"
          descripcion="Sus registros vuelven a ser editables. El acta y su foto se conservan como evidencia, y queda anotado que usted la reabrió."
          confirmar="Sí, reabrir"
          onCerrar={() => setReabriendo(null)}
          onConfirmar={() => { reabrirJornada(reabriendo, sesion?.usuario ?? ''); setReabriendo(null) }}
        />
      )}
      {porConfirmar && (
        <ModalConfirmar
          titulo="¿Registrar este día?"
          descripcion={`${persona ? nombreCompleto(persona) : ''} · ${formatearFecha(porConfirmar.fecha)} · ${modalidadDe(porConfirmar.modalidadId)?.nombre ?? ''}${porConfirmar.laborIds.length ? ` · ${laboresDe(porConfirmar.laborIds).map((l) => l.nombre).join(' + ')}` : ''}`}
          confirmar="Sí, registrar"
          tono="primary"
          onCerrar={() => setPorConfirmar(null)}
          onConfirmar={confirmarAlta}
        />
      )}
      {borrando && (
        <ModalConfirmar
          titulo="Eliminar registro"
          descripcion={`${personaDe(borrando.rut) ? nombreCompleto(personaDe(borrando.rut)!) : borrando.rut} · ${formatearFecha(borrando.fecha)}`}
          onCerrar={() => setBorrando(null)}
          onConfirmar={() => {
            eliminarAsistencia(borrando.id)
            setBorrando(null)
          }}
        />
      )}
    </Pagina>
  )
}
