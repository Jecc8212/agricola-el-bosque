import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Trabajador } from '@/lib/types'

/**
 * Un solo tipo de nodo sirve a los cinco catálogos. Todos son árboles editables
 * y lo único que cambia entre ellos es la profundidad permitida y qué campos
 * extra usan. Un motor, cinco maestros: si mañana aparece un sexto, no hay
 * código nuevo que escribir.
 */
export interface Nodo {
  id: string
  nombre: string
  codigo?: string
  /** Modalidades: cuánto suma esta jornada al día del trabajador.
   *  Una falta va en 0 — está presente en el registro, pero no cuenta como día. */
  factor?: number
  /** Modalidades: a qué cuenta del master imputa. */
  cuentaId?: string
  /** Labores: incentivo que se paga por hacer esta labor. */
  bono?: number
  /**
   * Centros de costo: a qué campo y a qué temporada pertenecen.
   *
   * Un centro de costo no flota: es un pedazo de un campo durante una
   * temporada. Sin esas dos ataduras, «Cerezos» de 2025 y «Cerezos» de 2026
   * serían el mismo saco, y comparar un año contra otro no significaría nada.
   */
  campoId?: string
  temporadaId?: string
  hijos: Nodo[]
}

export type Catalogo =
  | 'cuentas' | 'centrosCosto' | 'campos' | 'temporadas' | 'modalidades' | 'labores'

export interface Maestros {
  cuentas: Nodo[]
  centrosCosto: Nodo[]
  campos: Nodo[]
  temporadas: Nodo[]
  modalidades: Nodo[]
  labores: Nodo[]
}

/** Un registro de asistencia es un día de una persona. La liquidación de sueldo
 *  se arma sumando estos, por eso la fecha es obligatoria y no derivada. */
export interface RegistroAsistencia {
  id: string
  rut: string
  fecha: string
  temporadaId: string
  modalidadId: string
  centroCostoId: string
  /** Qué se hizo ese día. Una persona puede hacer más de una labor. */
  laborIds: string[]
  /** Vino a trabajar. La modalidad lo refleja, pero se guarda explícito:
   *  es el dato que se marcó al pasar lista, no una deducción. */
  presente: boolean
  /** Firmó la entrega de su equipo de protección personal. */
  eppEntregado: boolean
  /** Jornada que lo cerró. Sin esto, el registro es suelto y editable. */
  jornadaId?: string
}

/**
 * Una jornada es el acta de un día en un campo: quién vino, qué hizo, si
 * recibió su EPP, y la foto de la hoja que firmaron.
 *
 * Se cierra una vez y no se reabre desde el campo. Es el documento que respalda
 * la entrega de EPP ante la Mutual, y un acta que se puede retocar después no
 * respalda nada. Sólo quien administra el sistema puede reabrirla.
 */
export interface Jornada {
  id: string
  campoId: string
  fecha: string
  temporadaId: string
  /** Cuándo y quién la cerró. */
  cerradaEn: string
  cerradaPor: string
  /** Foto de la hoja firmada, ya reducida. */
  fotoEpp?: string
  presentes: number
  ausentes: number
  /** Reabierta por quien administra. El acta y su foto se conservan: son la
   *  evidencia ante la Mutual, y borrarlas sería destruir el respaldo. */
  reabiertaEn?: string
  reabiertaPor?: string
}

export const PROFUNDIDAD: Record<Catalogo, number> = {
  cuentas: 9,       // los 9 niveles pedidos
  centrosCosto: 5,
  campos: 3,
  temporadas: 1,
  modalidades: 2,   // categoría y subcategoría
  labores: 3,       // labor, sublabor y detalle
}

export const NOMBRE_CATALOGO: Record<Catalogo, string> = {
  cuentas: 'Master de cuentas',
  centrosCosto: 'Centros de costo',
  campos: 'Campos',
  temporadas: 'Temporadas',
  modalidades: 'Modalidades',
  labores: 'Labores',
}

let contador = 0
export const nuevoId = () =>
  `n${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

const nodo = (nombre: string, extra: Partial<Nodo> = {}): Nodo => ({
  id: nuevoId(),
  nombre,
  hijos: [],
  ...extra,
})

/* ── Ids estables de los campos sembrados ──────────────────────────────────
   Fijos a propósito: sin ellos no habría forma de migrar las fichas de personal
   que ya existen, ni de reconocerlas si alguien renombra un campo.          */
export const CAMPO_ID = {
  BUIN: 'campo-buin',
  GRANEROS: 'campo-graneros',
  LOS_LIRIOS: 'campo-los-lirios',
  CHUMACO: 'campo-chumaco',
  LOCAL_CENTRAL: 'campo-local-central',
  OTROS: 'campo-otros',
} as const

/* ── Semilla ────────────────────────────────────────────────────────────────
   Los campos vienen con los cinco reales de la empresa más "Otros", y se
   pueden editar o ampliar. Los centros de costo van VACÍOS a propósito: los
   carga la empresa, no los inventa el sistema.                              */
function semilla(): Maestros {
  return {
    cuentas: [
      nodo('Activo', { codigo: '1' }),
      nodo('Pasivo', { codigo: '2' }),
      nodo('Costos', { codigo: '5' }),
      nodo('Ingresos', { codigo: '4' }),
    ],
    centrosCosto: [],
    campos: [
      { id: CAMPO_ID.BUIN, nombre: 'Buin', hijos: [] },
      { id: CAMPO_ID.GRANEROS, nombre: 'Graneros', hijos: [] },
      { id: CAMPO_ID.LOS_LIRIOS, nombre: 'Los Lirios', hijos: [] },
      { id: CAMPO_ID.CHUMACO, nombre: 'Chumaco', hijos: [] },
      { id: CAMPO_ID.LOCAL_CENTRAL, nombre: 'Local Central', hijos: [] },
      { id: CAMPO_ID.OTROS, nombre: 'Otros', hijos: [] },
    ],
    temporadas: [nodo('2024–2025'), nodo('2025–2026'), nodo('2026–2027')],
    /* La modalidad es la forma de pago de la jornada: al día, a trato, domingo
       a trato. El factor es lo que la conecta con el día trabajado: una falta
       queda registrada —hay que saber que faltó— pero suma 0 al mes. */
    modalidades: [
      nodo('Al día', { factor: 1, codigo: 'AD' }),
      nodo('A trato', { factor: 1, codigo: 'AT' }),
      nodo('Domingo a trato', { factor: 1, codigo: 'DT' }),
      nodo('Media jornada', { factor: 0.5, codigo: 'MJ' }),
      nodo('Vacaciones', { factor: 1, codigo: 'V' }),
      nodo('Licencia médica', { factor: 0, codigo: 'LM' }),
      nodo('Permiso sin goce', { factor: 0, codigo: 'PS' }),
      nodo('Falta justificada', { factor: 0, codigo: 'FJ' }),
      nodo('Falta injustificada', { factor: 0, codigo: 'FI' }),
    ],
    /* Las labores admiten sublabores: una poda no es lo mismo que una chapoda,
       y cada una puede llevar su propio bono. Los montos van en cero porque las
       tarifas las pone quien las conoce, no el sistema. */
    labores: [
      nodo('Poda', { bono: 0 }),
      nodo('Cosecha', { bono: 0 }),
      nodo('Desbrote', { bono: 0 }),
      nodo('Raleo', { bono: 0 }),
      nodo('Fertilización', { bono: 0 }),
      nodo('Aplicaciones químicas', { bono: 0 }),
    ],
  }
}

/* ── Operaciones inmutables sobre el árbol ─────────────────────────────────*/

function mapear(lista: Nodo[], id: string, fn: (n: Nodo) => Nodo): Nodo[] {
  return lista.map((n) => (n.id === id ? fn(n) : { ...n, hijos: mapear(n.hijos, id, fn) }))
}

function quitar(lista: Nodo[], id: string): Nodo[] {
  return lista.filter((n) => n.id !== id).map((n) => ({ ...n, hijos: quitar(n.hijos, id) }))
}

function insertarEn(lista: Nodo[], padreId: string | null, hijo: Nodo): Nodo[] {
  if (padreId === null) return [...lista, hijo]
  return mapear(lista, padreId, (n) => ({ ...n, hijos: [...n.hijos, hijo] }))
}

/** Mueve un nodo entre sus hermanos. El orden lo decide quien usa el sistema,
 *  no el orden en que se le ocurrió crearlos. */
function moverEntreHermanos(lista: Nodo[], id: string, delta: number): Nodo[] {
  const i = lista.findIndex((n) => n.id === id)
  if (i !== -1) {
    const destino = i + delta
    if (destino < 0 || destino >= lista.length) return lista
    const copia = [...lista]
    ;[copia[i], copia[destino]] = [copia[destino], copia[i]]
    return copia
  }
  return lista.map((n) => ({ ...n, hijos: moverEntreHermanos(n.hijos, id, delta) }))
}

/** Nombres escritos a mano se comparan sin tildes ni mayúsculas: una planilla
 *  que dice «cerezos buin» debe reconocer al «Cerezos Buin» que ya existe. */
const comparable = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function aplanar(
  lista: Nodo[],
  nivel = 0,
  ruta: string[] = [],
): Array<{ nodo: Nodo; nivel: number; ruta: string[] }> {
  return lista.flatMap((n) => [
    { nodo: n, nivel, ruta },
    ...aplanar(n.hijos, nivel + 1, [...ruta, n.nombre]),
  ])
}

export function buscarNodo(lista: Nodo[], id: string | undefined): Nodo | undefined {
  if (!id) return undefined
  for (const n of lista) {
    if (n.id === id) return n
    const encontrado = buscarNodo(n.hijos, id)
    if (encontrado) return encontrado
  }
  return undefined
}

/** Ruta legible: "Costos › Operacional › Mano de obra". */
export function rutaDe(lista: Nodo[], id: string | undefined): string {
  if (!id) return ''
  const fila = aplanar(lista).find((f) => f.nodo.id === id)
  return fila ? [...fila.ruta, fila.nodo.nombre].join(' › ') : ''
}

/* ── Contexto ──────────────────────────────────────────────────────────────*/

interface Api {
  maestros: Maestros
  asistencia: RegistroAsistencia[]
  trabajadores: Trabajador[]
  guardarTrabajador: (t: Trabajador, rutOriginal?: string) => void
  eliminarTrabajador: (rut: string) => void
  agregar: (c: Catalogo, padreId: string | null, nombre: string, extra?: Partial<Nodo>) => void
  /** Inserta ramas completas de una planilla. Devuelve cuántos nodos creó. */
  importarRamas: (c: Catalogo, ramas: Array<{ camino: string[]; codigo?: string }>) => number
  actualizar: (c: Catalogo, id: string, cambios: Partial<Nodo>) => void
  eliminar: (c: Catalogo, id: string) => void
  mover: (c: Catalogo, id: string, delta: number) => void
  jornadas: Jornada[]
  /** Cierra el acta del día y deja sus registros sellados. */
  cerrarJornada: (
    jornada: Omit<Jornada, 'id' | 'presentes' | 'ausentes'>,
    registros: Array<Omit<RegistroAsistencia, 'id' | 'jornadaId'>>,
  ) => Jornada
  reabrirJornada: (id: string, porQuien: string) => void
  agregarAsistencia: (r: Omit<RegistroAsistencia, 'id'>) => void
  actualizarAsistencia: (id: string, cambios: Partial<RegistroAsistencia>) => void
  eliminarAsistencia: (id: string) => void
  restaurarMaestros: () => void
}

const Ctx = createContext<Api | null>(null)
const CLAVE_M = 'aeb.maestros'
const CLAVE_A = 'aeb.asistencia'
const CLAVE_T = 'aeb.trabajadores'
const CLAVE_J = 'aeb.jornadas'

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* modo privado o almacenamiento bloqueado: seguimos igual */
  }
}

/**
 * Lo guardado se fusiona con la semilla en vez de reemplazarla.
 *
 * Sin esto, cualquier catálogo que se agregue más adelante llega como
 * `undefined` para quien ya venía usando el sistema, y la pantalla que lo lee
 * se cae. Así, el próximo catálogo entra solo, sin romper a nadie.
 */
function fusionar(guardado: Partial<Maestros>): Maestros {
  const base = semilla()
  const salida = { ...base }
  for (const c of Object.keys(base) as Catalogo[]) {
    const v = guardado[c]
    // Un array vacío es una decisión del usuario y se respeta; undefined no.
    if (Array.isArray(v)) salida[c] = v
  }
  return salida
}

export function ProveedorMaestros({ children }: { children: ReactNode }) {
  const [maestros, setMaestros] = useState<Maestros>(() => fusionar(leer(CLAVE_M, {})))
  /* Los registros de versiones anteriores traían una sola labor y no sabían de
     presencia ni de EPP: se normalizan al leerlos, para que ninguna pantalla
     tropiece con un `undefined`. */
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>(() =>
    leer<Array<RegistroAsistencia & { laborId?: string }>>(CLAVE_A, []).map((r) => ({
      ...r,
      laborIds: r.laborIds ?? (r.laborId ? [r.laborId] : []),
      presente: r.presente ?? true,
      eppEntregado: r.eppEntregado ?? false,
    })),
  )
  const [jornadas, setJornadas] = useState<Jornada[]>(() => leer(CLAVE_J, []))

  /* La nómina arranca vacía: el personal lo carga la empresa, no lo inventa el
     sistema. */
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(() => leer(CLAVE_T, []))

  useEffect(() => escribir(CLAVE_M, maestros), [maestros])
  useEffect(() => escribir(CLAVE_A, asistencia), [asistencia])
  useEffect(() => escribir(CLAVE_T, trabajadores), [trabajadores])
  useEffect(() => escribir(CLAVE_J, jornadas), [jornadas])

  /** Alta y edición en una sola operación: si el RUT ya está, reemplaza. El
   *  RUT original se pasa aparte porque la edición puede corregirlo. */
  const guardarTrabajador = useCallback((t: Trabajador, rutOriginal?: string) => {
    setTrabajadores((lista) => {
      const clave = rutOriginal ?? t.rut
      const i = lista.findIndex((x) => x.rut === clave)
      if (i === -1) return [t, ...lista]
      const copia = [...lista]
      copia[i] = t
      return copia
    })
  }, [])

  const eliminarTrabajador = useCallback((rut: string) => {
    setTrabajadores((lista) => lista.filter((t) => t.rut !== rut))
    // Su asistencia deja de tener sujeto: se va con él.
    setAsistencia((a) => a.filter((r) => r.rut !== rut))
  }, [])

  const agregar = useCallback(
    (c: Catalogo, padreId: string | null, nombre: string, extra?: Partial<Nodo>) => {
      setMaestros((m) => ({ ...m, [c]: insertarEn(m[c], padreId, nodo(nombre, extra)) }))
    },
    [],
  )

  const actualizar = useCallback((c: Catalogo, id: string, cambios: Partial<Nodo>) => {
    setMaestros((m) => ({ ...m, [c]: mapear(m[c], id, (n) => ({ ...n, ...cambios })) }))
  }, [])

  const eliminar = useCallback((c: Catalogo, id: string) => {
    setMaestros((m) => ({ ...m, [c]: quitar(m[c], id) }))
  }, [])

  /**
   * Importar ramas completas de una planilla.
   *
   * Vive en el store y no en la pantalla porque tiene que **verse a sí mismo
   * mientras construye**: dentro de una misma carga, la segunda fila reutiliza
   * la rama que creó la primera. Con llamadas sueltas a `agregar` eso no pasa
   * —el estado aún no se ha actualizado— y cada fila duplicaría sus padres.
   *
   * No borra nada: lo que ya existe se reutiliza. Subir dos veces la misma
   * planilla deja el mismo árbol.
   */
  const importarRamas = useCallback(
    (c: Catalogo, ramas: Array<{ camino: string[]; codigo?: string }>) => {
      const lista: Nodo[] = structuredClone(maestros[c])
      let creados = 0

      for (const { camino, codigo } of ramas) {
        let nivel = lista
        camino.forEach((nombre, i) => {
          let nodoNivel = nivel.find((n) => comparable(n.nombre) === comparable(nombre))
          if (!nodoNivel) {
            nodoNivel = { id: nuevoId(), nombre, hijos: [] }
            // El código identifica el registro, así que va en la hoja de la
            // rama, no en las categorías que la contienen.
            if (codigo && i === camino.length - 1) nodoNivel.codigo = codigo
            nivel.push(nodoNivel)
            creados++
          }
          nivel = nodoNivel.hijos
        })
      }

      if (creados > 0) setMaestros((m) => ({ ...m, [c]: lista }))
      return creados
    },
    [maestros],
  )

  const mover = useCallback((c: Catalogo, id: string, delta: number) => {
    setMaestros((m) => ({ ...m, [c]: moverEntreHermanos(m[c], id, delta) }))
  }, [])

  /**
   * Cierra la jornada en un solo movimiento: crea el acta y sus registros
   * juntos. Si se hicieran por separado, un fallo a medias dejaría registros
   * huérfanos apuntando a un acta que no existe.
   *
   * Reemplaza lo que ya hubiera de ese campo y ese día: volver a pasar lista
   * corrige el día, no lo duplica.
   */
  const cerrarJornada = useCallback(
    (
      datos: Omit<Jornada, 'id' | 'presentes' | 'ausentes'>,
      registros: Array<Omit<RegistroAsistencia, 'id' | 'jornadaId'>>,
    ) => {
      const jornada: Jornada = {
        ...datos,
        id: nuevoId(),
        presentes: registros.filter((r) => r.presente).length,
        ausentes: registros.filter((r) => !r.presente).length,
      }
      const ruts = new Set(registros.map((r) => r.rut))
      setAsistencia((a) => [
        ...registros.map((r) => ({ ...r, id: nuevoId(), jornadaId: jornada.id })),
        ...a.filter((r) => !(r.fecha === datos.fecha && ruts.has(r.rut))),
      ])
      /* Las actas reabiertas se conservan como historial: son la prueba de que
         ese día se cerró antes y con qué foto. Sólo se reemplaza un acta
         todavía vigente, que en la práctica no ocurre porque el asistente
         bloquea los días ya cerrados. */
      setJornadas((j) => [
        jornada,
        ...j.filter((x) => x.reabiertaEn || !(x.campoId === datos.campoId && x.fecha === datos.fecha)),
      ])
      return jornada
    },
    [],
  )

  /**
   * Devuelve los registros a editables, pero **no borra el acta**.
   *
   * La foto de la hoja firmada es la evidencia de que el EPP se entregó ese
   * día: eliminarla al corregir un dato sería destruir el respaldo ante la
   * Mutual. El acta queda marcada como reabierta, con quién y cuándo, que es
   * justo lo que una auditoría necesita ver.
   */
  const reabrirJornada = useCallback((id: string, porQuien: string) => {
    setJornadas((j) =>
      j.map((x) =>
        x.id === id ? { ...x, reabiertaEn: new Date().toISOString(), reabiertaPor: porQuien } : x,
      ),
    )
    setAsistencia((a) => a.map((r) => (r.jornadaId === id ? { ...r, jornadaId: undefined } : r)))
  }, [])

  const agregarAsistencia = useCallback((r: Omit<RegistroAsistencia, 'id'>) => {
    setAsistencia((a) => [{ ...r, id: nuevoId() }, ...a])
  }, [])

  const actualizarAsistencia = useCallback((id: string, cambios: Partial<RegistroAsistencia>) => {
    setAsistencia((a) => a.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
  }, [])

  const eliminarAsistencia = useCallback((id: string) => {
    setAsistencia((a) => a.filter((r) => r.id !== id))
  }, [])

  const restaurarMaestros = useCallback(() => setMaestros(semilla()), [])

  const api = useMemo(
    () => ({
      maestros, asistencia, trabajadores, jornadas, cerrarJornada, reabrirJornada,
      agregar, actualizar, eliminar, mover, importarRamas,
      guardarTrabajador, eliminarTrabajador,
      agregarAsistencia, actualizarAsistencia, eliminarAsistencia, restaurarMaestros,
    }),
    [maestros, asistencia, trabajadores, jornadas, cerrarJornada, reabrirJornada,
     agregar, actualizar, eliminar, mover, importarRamas,
     guardarTrabajador, eliminarTrabajador,
     agregarAsistencia, actualizarAsistencia, eliminarAsistencia, restaurarMaestros],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useMaestros() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useMaestros debe usarse dentro de ProveedorMaestros')
  return c
}
