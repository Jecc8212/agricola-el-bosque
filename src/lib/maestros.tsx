import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { TipoTrabajador, Trabajador } from '@/lib/types'
import { CLAVE, leer, escribir, guardarEvidencia } from '@/lib/almacen'

/**
 * Un solo tipo de nodo sirve a los cinco catálogos. Todos son árboles editables
 * y lo único que cambia entre ellos es la profundidad permitida y qué campos
 * extra usan. Un motor, cinco maestros: si mañana aparece un sexto, no hay
 * código nuevo que escribir.
 */
/**
 * Etapa de la planta. No es una etiqueta: decide a qué lado de la contabilidad
 * va el gasto. En formación la planta es inversión —se capitaliza y se
 * amortiza—; adulta ya produce, y su costo es operacional.
 */
export type EtapaPlanta = 'FORMACION' | 'ADULTA'

export const ETAPA_LABEL: Record<EtapaPlanta, string> = {
  FORMACION: 'Formación · inversión',
  ADULTA: 'Adulta · producción',
}

/**
 * Una parametrización de modalidad con fecha de vigencia.
 *
 * El plan de cuentas cambia, las labores se reorganizan y los centros de costo
 * se renombran, pero lo que se imputó en un período cerrado no puede moverse:
 * un balance de 2026 que cambia porque en 2027 alguien editó una cuenta no es
 * un balance. Por eso la relación modalidad–cuenta no es un campo que se pisa,
 * sino una lista de tramos con fecha: se **agrega** uno nuevo y el anterior se
 * cierra el día antes, conservando lo que decía.
 */
export interface ParamModalidad {
  id: string
  /** Vigente desde, inclusive (YYYY-MM-DD). */
  desde: string
  /** Vigente hasta, inclusive. Sin esto, el tramo sigue abierto. */
  hasta?: string
  /** A qué cuenta del master imputa. Es lo mínimo que define un tramo. */
  cuentaId: string
  /**
   * Labor que la modalidad impone por sí sola. «Día nochero» ya dice qué se
   * hizo; «día agrícola» no, y ahí la elige quien pasa lista.
   */
  laborId?: string
  /** Centro de costo que la modalidad impone. Mismo criterio que la labor. */
  centroCostoId?: string
  /** Quién hizo el cambio y cuándo. Una parametrización sin autor no se audita. */
  creadoEn: string
  creadoPor: string
}

export interface Nodo {
  id: string
  nombre: string
  codigo?: string
  /**
   * Modalidades: qué parte del día se paga. Es un factor sobre la remuneración
   * diaria — 1 día completo, 0.75 tres cuartos, 0.5 media jornada, 0 nada—, no
   * un número libre: son las únicas fracciones con las que se liquida.
   */
  factor?: number
  /**
   * Modalidades: a qué cuenta imputaba antes de que existieran las vigencias.
   * Se conserva sólo para migrar lo ya guardado — la fuente de verdad es
   * `vigencias`, y nada nuevo debería leer este campo.
   * @deprecated
   */
  cuentaId?: string
  /** Modalidades: la parametrización por tramos de fecha. Ver ParamModalidad. */
  vigencias?: ParamModalidad[]
  /** Labores: incentivo que se paga por hacer esta labor. */
  bono?: number
  /**
   * Labores: lo que se paga por **unidad** cuando la jornada es a trato.
   * Sin esto, «a trato» era una modalidad que pagaba igual que un día normal,
   * que es justo lo que el trato no es.
   */
  precio?: number
  /** Labores: en qué se mide el trato — bins, kilos, hileras, plantas. */
  unidad?: string
  /** Modalidades: la jornada se paga por producción, no por día. */
  porTrato?: boolean
  /**
   * Centros de costo: a qué campo y a qué temporada pertenecen.
   *
   * Un centro de costo no flota: es un pedazo de un campo durante una
   * temporada. Sin esas dos ataduras, «Cerezos» de 2025 y «Cerezos» de 2026
   * serían el mismo saco, y comparar un año contra otro no significaría nada.
   */
  campoId?: string
  temporadaId?: string
  /**
   * Centros de costo: las coordenadas agrícolas del CCE. La ficha del maestro
   * lo define como campo–especie–variedad–etapa, y sin ellas no hay forma de
   * separar la inversión (formación) de la producción (adulta), ni de calcular
   * un solo indicador por hectárea.
   */
  especieId?: string
  variedadId?: string
  etapa?: EtapaPlanta
  /** Superficie productiva. Es el divisor de casi todos los indicadores. */
  hectareas?: number
  /** Plantas en el cuartel, para la densidad de plantación. */
  plantas?: number
  /**
   * Cargos: agrícola o administrativo.
   *
   * No decide el sueldo —eso lo hace la clase del trabajador— sino para qué
   * sirve el cargo al agrupar: un informe de mano de obra directa no mezcla
   * podadores con administrativos.
   */
  tipo?: TipoTrabajador
  /**
   * Cargos y labores: qué equipo de protección exige.
   *
   * El mismo campo sirve a los dos porque la exigencia viene de ambos lados:
   * un cargo lleva su EPP permanente —el nochero, su linterna y su chaleco— y
   * una labor agrega el suyo del día: aplicar químicos exige respirador use
   * quien lo use.
   */
  eppIds?: string[]
  hijos: Nodo[]
}

export type Catalogo =
  | 'cuentas' | 'centrosCosto' | 'campos' | 'temporadas' | 'modalidades' | 'labores'
  | 'especies' | 'cargos' | 'epp'

export interface Maestros {
  cuentas: Nodo[]
  centrosCosto: Nodo[]
  campos: Nodo[]
  temporadas: Nodo[]
  modalidades: Nodo[]
  labores: Nodo[]
  /** Especie en el primer nivel, variedad en el segundo. */
  especies: Nodo[]
  /** Qué hace cada persona. Antes era una lista fija en el código. */
  cargos: Nodo[]
  /** Elementos de protección personal, para exigirlos por cargo y por labor. */
  epp: Nodo[]
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
  /**
   * Usaba correctamente su equipo de protección personal.
   *
   * No es lo mismo que habérselo entregado: la entrega es trimestral y se
   * controla como un movimiento de inventario. Esto es la verificación visual
   * del día, la que hace el jefe de campo al pasar lista.
   */
  eppUsado: boolean
  /**
   * Trato: cuántas unidades hizo ese día. El monto sale de multiplicarla por el
   * precio de la labor, y de ahí salen los días equivalentes para semana
   * corrida. En una jornada al día queda en cero y no se usa.
   */
  tratoCantidad?: number
  /** Jornada que lo cerró. Sin esto, el registro es suelto y editable. */
  jornadaId?: string
  /**
   * La cuenta a la que se imputó este día, congelada al registrarlo.
   *
   * Es redundante con la parametrización —se podría volver a resolver por
   * fecha— y esa redundancia es justo el punto: si mañana alguien corrige por
   * error un tramo de vigencia pasado, esto no se mueve. El histórico vive en
   * la tarja, no en la configuración.
   */
  cuentaId?: string
  /** Qué tramo de vigencia se aplicó. El rastro para auditar la imputación. */
  vigenciaId?: string
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
  /**
   * Identificador de la foto firmada de la **charla de seguridad**.
   *
   * Guarda el id, no la imagen: las evidencias viven en su propia clave. Si
   * la foto viajara dentro del acta, cada lectura de la lista de jornadas
   * arrastraría megabytes que nadie va a mirar, y al multiplicarse con
   * checklists e inspecciones el almacenamiento se llenaría en silencio.
   *
   * No es la hoja de entrega de EPP: esa pertenece a un registro de
   * inventario, con su propio ritmo trimestral.
   */
  evidenciaCharla?: string
  /** De qué trató la charla. Una foto sin tema respalda la mitad. */
  temaCharla?: string
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
  modalidades: 1,   // lista plana: una modalidad no tiene subcategorías
  labores: 3,       // labor, sublabor y detalle
  especies: 2,      // especie y variedad
  cargos: 1,        // lista plana: un cargo no tiene subcargos
  epp: 1,           // lista plana de elementos
}

export const NOMBRE_CATALOGO: Record<Catalogo, string> = {
  cuentas: 'Master de cuentas',
  centrosCosto: 'Centros de costo',
  campos: 'Campos',
  temporadas: 'Temporadas',
  modalidades: 'Modalidades',
  labores: 'Labores',
  especies: 'Especies y variedades',
  cargos: 'Cargos',
  epp: 'Elementos de protección',
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

/* ── Elementos de protección ───────────────────────────────────────────────
   Ids fijos para poder exigirlos desde los cargos y las labores sin que un
   renombre rompa la exigencia.                                             */
export const EPP_ID = {
  CASCO: 'epp-casco',
  GUANTES: 'epp-guantes',
  BOTAS: 'epp-botas',
  ANTIPARRAS: 'epp-antiparras',
  AUDITIVO: 'epp-auditivo',
  RESPIRADOR: 'epp-respirador',
  CHALECO: 'epp-chaleco',
  TRAJE: 'epp-traje',
} as const

/* ── Cargos ────────────────────────────────────────────────────────────────
   Eran una lista fija en el código, sin pantalla ni forma de administrarlos.
   Los ids se conservan derivados de los códigos antiguos para que las fichas
   de personal ya cargadas sigan apuntando a su cargo tras la migración.

   Y no traen cuenta contable: la imputación sale de la modalidad de cada día,
   y tener dos sitios que dicen a qué cuenta va el gasto es pedir una
   contradicción.                                                           */
export const CARGO_ID = {
  COSECHERO: 'cargo-cosechero',
  PODADOR: 'cargo-podador',
  APLICADOR: 'cargo-aplicador',
  FERTILIZADOR: 'cargo-fertilizador',
  DESBROTADOR: 'cargo-desbrotador',
  TRACTORISTA: 'cargo-tractorista',
  SUPERVISOR: 'cargo-supervisor',
  ADMIN: 'cargo-admin',
  NOCHERO: 'cargo-nochero',
} as const

/** Del código antiguo al id del maestro, para migrar las fichas guardadas. */
export const CARGO_ANTIGUO: Record<string, string> = {
  COSECHERO: CARGO_ID.COSECHERO,
  PODADOR: CARGO_ID.PODADOR,
  APLICADOR: CARGO_ID.APLICADOR,
  FERTILIZADOR: CARGO_ID.FERTILIZADOR,
  DESBROTADOR: CARGO_ID.DESBROTADOR,
  TRACTORISTA: CARGO_ID.TRACTORISTA,
  SUPERVISOR: CARGO_ID.SUPERVISOR,
  ADMIN: CARGO_ID.ADMIN,
  NOCHERO: CARGO_ID.NOCHERO,
}

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
      { id: CAMPO_ID.BUIN, nombre: 'Buin', codigo: '01', hijos: [] },
      { id: CAMPO_ID.GRANEROS, nombre: 'Graneros', codigo: '02', hijos: [] },
      { id: CAMPO_ID.LOS_LIRIOS, nombre: 'Los Lirios', codigo: '03', hijos: [] },
      { id: CAMPO_ID.CHUMACO, nombre: 'Chumaco', codigo: '04', hijos: [] },
      { id: CAMPO_ID.LOCAL_CENTRAL, nombre: 'Local Central', codigo: '05', hijos: [] },
      { id: CAMPO_ID.OTROS, nombre: 'Otros', codigo: '06', hijos: [] },
    ],
    temporadas: [nodo('2024–2025'), nodo('2025–2026'), nodo('2026–2027')],
    /* La modalidad es la forma de pago de la jornada: al día, a trato, domingo
       a trato. El factor es lo que la conecta con el día trabajado: una falta
       queda registrada —hay que saber que faltó— pero suma 0 al mes. */
    modalidades: [
      nodo('Al día', { factor: 1, codigo: 'AD' }),
      nodo('A trato', { factor: 1, codigo: 'AT', porTrato: true }),
      nodo('Domingo a trato', { factor: 1, codigo: 'DT', porTrato: true }),
      nodo('Tres cuartos de jornada', { factor: 0.75, codigo: 'TC' }),
      nodo('Media jornada', { factor: 0.5, codigo: 'MJ' }),
      nodo('Vacaciones', { factor: 1, codigo: 'V' }),
      nodo('Licencia médica', { factor: 0, codigo: 'LM' }),
      nodo('Permiso sin goce', { factor: 0, codigo: 'PS' }),
      nodo('Falta justificada', { factor: 0, codigo: 'FJ' }),
      nodo('Falta injustificada', { factor: 0, codigo: 'FI' }),
    ],
    /* Las labores admiten sublabores: una poda no es lo mismo que una chapoda,
       y cada una puede llevar su propio bono y su propio precio por unidad. Los
       montos van en cero porque las tarifas las pone quien las conoce. */
    labores: [
      nodo('Poda', { codigo: '01', bono: 0, precio: 0, unidad: 'planta' }),
      nodo('Cosecha', { codigo: '02', bono: 0, precio: 0, unidad: 'bin' }),
      nodo('Desbrote', { codigo: '03', bono: 0, precio: 0, unidad: 'planta' }),
      nodo('Raleo', { codigo: '04', bono: 0, precio: 0, unidad: 'planta' }),
      nodo('Fertilización', { codigo: '05', bono: 0, precio: 0, unidad: 'hilera' }),
      nodo('Aplicaciones químicas', { codigo: '06', bono: 0, precio: 0, unidad: 'hectárea' }),
    ],
    /* El equipo de protección más común. La empresa lo amplía según lo que
       entregue de verdad. */
    epp: [
      { id: EPP_ID.CASCO, nombre: 'Casco', codigo: '01', hijos: [] },
      { id: EPP_ID.GUANTES, nombre: 'Guantes', codigo: '02', hijos: [] },
      { id: EPP_ID.BOTAS, nombre: 'Botas de seguridad', codigo: '03', hijos: [] },
      { id: EPP_ID.ANTIPARRAS, nombre: 'Antiparras', codigo: '04', hijos: [] },
      { id: EPP_ID.AUDITIVO, nombre: 'Protector auditivo', codigo: '05', hijos: [] },
      { id: EPP_ID.RESPIRADOR, nombre: 'Respirador', codigo: '06', hijos: [] },
      { id: EPP_ID.CHALECO, nombre: 'Chaleco reflectante', codigo: '07', hijos: [] },
      { id: EPP_ID.TRAJE, nombre: 'Traje de aplicación', codigo: '08', hijos: [] },
    ],
    /* Los nueve cargos que estaban escritos en el código, ahora editables y
       con el equipo que cada uno exige por el solo hecho de desempeñarlo. */
    cargos: [
      { id: CARGO_ID.COSECHERO, nombre: 'Cosechero', codigo: '01', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.GUANTES, EPP_ID.BOTAS], hijos: [] },
      { id: CARGO_ID.PODADOR, nombre: 'Podador', codigo: '02', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.CASCO, EPP_ID.GUANTES, EPP_ID.BOTAS, EPP_ID.ANTIPARRAS], hijos: [] },
      { id: CARGO_ID.APLICADOR, nombre: 'Aplicador', codigo: '03', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.TRAJE, EPP_ID.RESPIRADOR, EPP_ID.GUANTES, EPP_ID.BOTAS, EPP_ID.ANTIPARRAS], hijos: [] },
      { id: CARGO_ID.FERTILIZADOR, nombre: 'Fertilizador', codigo: '04', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.GUANTES, EPP_ID.BOTAS, EPP_ID.RESPIRADOR], hijos: [] },
      { id: CARGO_ID.DESBROTADOR, nombre: 'Desbrotador', codigo: '05', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.GUANTES, EPP_ID.BOTAS], hijos: [] },
      { id: CARGO_ID.TRACTORISTA, nombre: 'Tractorista', codigo: '06', tipo: 'AGRICOLA',
        eppIds: [EPP_ID.CASCO, EPP_ID.AUDITIVO, EPP_ID.BOTAS, EPP_ID.CHALECO], hijos: [] },
      { id: CARGO_ID.SUPERVISOR, nombre: 'Supervisor de campo', codigo: '07', tipo: 'ADMINISTRATIVO',
        eppIds: [EPP_ID.CASCO, EPP_ID.BOTAS, EPP_ID.CHALECO], hijos: [] },
      { id: CARGO_ID.ADMIN, nombre: 'Administrativo', codigo: '08', tipo: 'ADMINISTRATIVO',
        eppIds: [], hijos: [] },
      { id: CARGO_ID.NOCHERO, nombre: 'Nochero', codigo: '09', tipo: 'ADMINISTRATIVO',
        eppIds: [EPP_ID.CHALECO, EPP_ID.BOTAS], hijos: [] },
    ],
    /* Especies y variedades salen de las fichas del maestro agrícola. Van sólo
       las dos que aparecen en los ejemplos; el resto lo carga la empresa. */
    especies: [
      { id: nuevoId(), nombre: 'Duraznos', codigo: '01',
        hijos: [{ id: nuevoId(), nombre: 'Poblet', codigo: '01.01', hijos: [] }] },
      { id: nuevoId(), nombre: 'Nogales', codigo: '02',
        hijos: [{ id: nuevoId(), nombre: 'Chandler', codigo: '02.01', hijos: [] }] },
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

/**
 * El tramo de parametrización que regía en esa fecha.
 *
 * Las fechas van en ISO (YYYY-MM-DD), así que compararlas como texto ordena
 * igual que como fechas y evita arrastrar husos horarios a una decisión
 * contable. Si hubiera más de un tramo aplicable —no debería, pero un maestro
 * editado a mano puede solaparse—, gana el que empieza más tarde.
 */
export function vigenciaEn(
  modalidad: Nodo | undefined,
  fecha: string,
): ParamModalidad | undefined {
  const tramos = modalidad?.vigencias
  if (!tramos?.length) return undefined
  return tramos
    .filter((v) => v.desde <= fecha && (!v.hasta || fecha <= v.hasta))
    .sort((a, b) => b.desde.localeCompare(a.desde))[0]
}

/** El día anterior en ISO, sin pasar por la zona horaria local. */
export function diaAnterior(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d) - 86400000).toISOString().slice(0, 10)
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
  /** Rellena los códigos que falten, en orden. Devuelve cuántos puso. */
  numerarCatalogo: (c: Catalogo) => number
  actualizar: (c: Catalogo, id: string, cambios: Partial<Nodo>) => void
  eliminar: (c: Catalogo, id: string) => void
  mover: (c: Catalogo, id: string, delta: number) => void
  /** Abre un tramo nuevo de parametrización y cierra el que estaba abierto. */
  agregarVigencia: (modalidadId: string, datos: Omit<ParamModalidad, 'id' | 'creadoEn'>) => void
  /** Deshace el último tramo y reabre el anterior. Sólo el último. */
  eliminarVigencia: (modalidadId: string, vigenciaId: string) => void
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

/**
 * Lo que ya estaba guardado tenía la cuenta pegada a la modalidad, sin fecha.
 * Se convierte en un primer tramo que arranca «desde siempre», porque eso es
 * exactamente lo que significaba: regía para todo lo registrado hasta hoy.
 * Sin esta conversión, las modalidades que ya existen quedarían sin imputar y
 * la asistencia histórica perdería su cuenta.
 */
function migrarVigencias(m: Maestros): Maestros {
  let cambio = false
  const modalidades = m.modalidades.map((n) => {
    if (n.vigencias?.length || !n.cuentaId) return n
    cambio = true
    return {
      ...n,
      vigencias: [{
        id: nuevoId(),
        desde: '1900-01-01',
        cuentaId: n.cuentaId,
        creadoEn: new Date().toISOString(),
        creadoPor: 'migración automática',
      }],
    }
  })
  return cambio ? { ...m, modalidades } : m
}

export function ProveedorMaestros({ children }: { children: ReactNode }) {
  const [maestros, setMaestros] = useState<Maestros>(() => migrarVigencias(fusionar(leer(CLAVE.maestros, {}))))
  /* Los registros de versiones anteriores traían una sola labor y no sabían de
     presencia ni de EPP: se normalizan al leerlos, para que ninguna pantalla
     tropiece con un `undefined`. */
  const [asistencia, setAsistencia] = useState<RegistroAsistencia[]>(() =>
    leer<Array<RegistroAsistencia & { laborId?: string; eppEntregado?: boolean }>>(
      CLAVE.asistencia,
      [],
    ).map((r) => ({
      ...r,
      laborIds: r.laborIds ?? (r.laborId ? [r.laborId] : []),
      presente: r.presente ?? true,
      /* Lo registrado antes marcaba la entrega del EPP. Se arrastra el valor
         porque es la misma casilla, pero conviene saber que en esos días
         significaba otra cosa. */
      eppUsado: r.eppUsado ?? r.eppEntregado ?? false,
    })),
  )
  /**
   * Las actas guardadas traían la imagen dentro, primero como `fotoEpp` y
   * luego como `fotoCharla`. Al leerlas se mueve a su propia clave y el acta
   * queda con el identificador. Se hace una sola vez: después ya vienen con
   * `evidenciaCharla` y no entra en este camino.
   */
  const [jornadas, setJornadas] = useState<Jornada[]>(() =>
    leer<Array<Jornada & { fotoEpp?: string; fotoCharla?: string }>>(CLAVE.jornadas, []).map(
      (j) => {
        if (j.evidenciaCharla) return j
        const imagen = j.fotoCharla ?? j.fotoEpp
        if (!imagen) return j
        const { fotoCharla: _f, fotoEpp: _e, ...resto } = j
        /* Si la evidencia no cupo, el acta conserva la imagen donde estaba:
           perder el respaldo ante la Mutual por una migración sería peor que
           dejarlo dónde está. */
        const id = guardarEvidencia(imagen)
        return id ? { ...resto, evidenciaCharla: id } : j
      },
    ),
  )

  /**
   * La nómina arranca vacía: el personal lo carga la empresa, no lo inventa el
   * sistema.
   *
   * Las fichas guardadas antes traían el cargo como un código de texto
   * —`PODADOR`— porque los cargos vivían en el código. Ahora apuntan al
   * maestro por identificador, igual que ya hacían con el campo, así que
   * renombrar un cargo deja de romper nada.
   */
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>(() =>
    leer<Trabajador[]>(CLAVE.trabajadores, []).map((t) =>
      CARGO_ANTIGUO[t.cargo] ? { ...t, cargo: CARGO_ANTIGUO[t.cargo] } : t,
    ),
  )

  useEffect(() => { escribir(CLAVE.maestros, maestros) }, [maestros])
  useEffect(() => { escribir(CLAVE.asistencia, asistencia) }, [asistencia])
  useEffect(() => { escribir(CLAVE.trabajadores, trabajadores) }, [trabajadores])
  useEffect(() => { escribir(CLAVE.jornadas, jornadas) }, [jornadas])

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

  /**
   * Pone código a lo que no lo tiene, siguiendo el orden en que está el árbol:
   * 01, 02, 03… y dentro de «02», 02.01.
   *
   * Respeta los códigos ya escritos —alguien pudo haberlos puesto a mano por un
   * motivo— y sólo rellena los huecos. Va en el store porque tiene que recorrer
   * el árbol entero de una vez, viendo a los padres antes que a los hijos.
   */
  const numerarCatalogo = useCallback(
    (c: Catalogo) => {
      let puestos = 0
      const numerar = (lista: Nodo[], prefijo: string): Nodo[] =>
        lista.map((n, i) => {
          const codigo = n.codigo?.trim() || `${prefijo}${String(i + 1).padStart(2, '0')}`
          if (!n.codigo?.trim()) puestos++
          return { ...n, codigo, hijos: numerar(n.hijos, `${codigo}.`) }
        })

      const numerado = numerar(maestros[c], '')
      if (puestos > 0) setMaestros((m) => ({ ...m, [c]: numerado }))
      return puestos
    },
    [maestros],
  )

  const mover = useCallback((c: Catalogo, id: string, delta: number) => {
    setMaestros((m) => ({ ...m, [c]: moverEntreHermanos(m[c], id, delta) }))
  }, [])

  /**
   * Agrega un tramo de parametrización.
   *
   * No pisa el anterior: lo **cierra** el día antes de que empiece el nuevo.
   * Ese es todo el mecanismo que hace que cambiar la cuenta hoy no mueva lo
   * imputado el año pasado. Un tramo que empieza el mismo día que otro sí lo
   * reemplaza: es una corrección de algo escrito hace un momento, no historia.
   */
  const agregarVigencia = useCallback(
    (modalidadId: string, datos: Omit<ParamModalidad, 'id' | 'creadoEn'>) => {
      setMaestros((m) => ({
        ...m,
        modalidades: mapear(m.modalidades, modalidadId, (n) => {
          const otras = (n.vigencias ?? []).filter((v) => v.desde !== datos.desde)

          /* Cualquier tramo que todavía cubriera el día de inicio se corta ahí,
             tenga o no fecha de término. Antes sólo se cerraban los abiertos, y
             un tramo ya cerrado más allá de esa fecha quedaba solapado con el
             nuevo: dos parametrizaciones distintas rigiendo el mismo día. */
          const previas = otras.map((v) =>
            v.desde < datos.desde && (!v.hasta || v.hasta >= datos.desde)
              ? { ...v, hasta: diaAnterior(datos.desde) }
              : v,
          )

          /* Si ya hay un tramo posterior, el nuevo termina el día antes: la
             línea de tiempo queda partida sin huecos y sin superposiciones. */
          const siguiente = previas
            .filter((v) => v.desde > datos.desde)
            .sort((a, b) => a.desde.localeCompare(b.desde))[0]
          const tramo: ParamModalidad = {
            ...datos,
            hasta: datos.hasta ?? (siguiente ? diaAnterior(siguiente.desde) : undefined),
            id: nuevoId(),
            creadoEn: new Date().toISOString(),
          }

          return {
            ...n,
            vigencias: [...previas, tramo].sort((a, b) => a.desde.localeCompare(b.desde)),
          }
        }),
      }))
    },
    [],
  )

  /**
   * Borra el último tramo y reabre el que cerró.
   *
   * Sólo el último, y sólo reabre si el cierre lo había puesto este mismo
   * tramo: una fecha de término escrita a mano es una decisión de alguien y no
   * se deshace sola. Los tramos anteriores no se tocan nunca — son el
   * histórico, y poder borrarlos sería lo mismo que no tenerlo.
   */
  const eliminarVigencia = useCallback((modalidadId: string, vigenciaId: string) => {
    setMaestros((m) => ({
      ...m,
      modalidades: mapear(m.modalidades, modalidadId, (n) => {
        const tramos = [...(n.vigencias ?? [])].sort((a, b) => a.desde.localeCompare(b.desde))
        const ultimo = tramos.at(-1)
        if (!ultimo || ultimo.id !== vigenciaId) return n
        const resto = tramos.slice(0, -1)
        const previo = resto.at(-1)
        if (previo && previo.hasta === diaAnterior(ultimo.desde)) {
          resto[resto.length - 1] = { ...previo, hasta: undefined }
        }
        return { ...n, vigencias: resto }
      }),
    }))
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
      agregar, actualizar, eliminar, mover, importarRamas, numerarCatalogo,
      agregarVigencia, eliminarVigencia,
      guardarTrabajador, eliminarTrabajador,
      agregarAsistencia, actualizarAsistencia, eliminarAsistencia, restaurarMaestros,
    }),
    [maestros, asistencia, trabajadores, jornadas, cerrarJornada, reabrirJornada,
     agregar, actualizar, eliminar, mover, importarRamas, numerarCatalogo,
     agregarVigencia, eliminarVigencia,
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
