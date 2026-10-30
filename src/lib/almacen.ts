/**
 * El único punto por donde SIGA toca el almacenamiento.
 *
 * Hoy escribe en el navegador. Mañana, cuando los datos vivan en un servidor,
 * lo que cambia es **este archivo** y nada más: ninguna pantalla sabe dónde se
 * guardan las cosas, sólo pide leer y escribir por clave.
 *
 * Esa es toda la preparación que hace falta para mudarse a una base de datos,
 * y por eso conviene que nadie llame a `localStorage` directamente. Si aparece
 * una llamada suelta por ahí, el día de la mudanza se queda atrás en silencio.
 */

/** Todas las claves del sistema, en un solo sitio. */
export const CLAVE = {
  maestros: 'aeb.maestros',
  asistencia: 'aeb.asistencia',
  trabajadores: 'aeb.trabajadores',
  jornadas: 'aeb.jornadas',
  usuarios: 'aeb.usuarios',
  sesion: 'aeb.sesion',
  contexto: 'aeb.contexto',
  tareas: 'aeb.tareas',
  incidencias: 'aeb.incidencias',
} as const

export type Clave = (typeof CLAVE)[keyof typeof CLAVE]

/** Prefijo de las evidencias. Van aparte, una clave por archivo. */
const PREFIJO_EVIDENCIA = 'aeb.ev.'

/**
 * Lee un valor guardado.
 *
 * Devuelve el valor por defecto ante cualquier problema —modo privado, datos
 * corruptos, almacenamiento bloqueado— en vez de propagar el error. Un maestro
 * que no se puede leer deja la pantalla vacía; una excepción la deja en blanco.
 */
export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

/**
 * Guarda un valor.
 *
 * Devuelve si lo consiguió. El almacenamiento del navegador tiene un techo y,
 * al llenarse, falla: quien guarde algo que pueda pesar —una evidencia— tiene
 * que mirar este valor en vez de suponer que se guardó.
 */
export function escribir(clave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

export function borrar(clave: string) {
  try {
    localStorage.removeItem(clave)
  } catch {
    /* nada que hacer */
  }
}

/* ── Evidencias ────────────────────────────────────────────────────────────
   Las fotos y documentos NO viven dentro del registro que los referencia.

   Antes la foto del acta se guardaba dentro de la jornada, convertida en
   texto. Con una foto diaria funcionaba; con charlas, checklists e
   inspecciones se multiplica, y entonces cada lectura de la lista de jornadas
   arrastra megabytes que nadie va a mirar. Aquí cada evidencia tiene su propia
   clave y el registro guarda sólo su identificador.                        */

let contadorEv = 0
const nuevoIdEvidencia = () =>
  `ev${Date.now().toString(36)}${(contadorEv++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * Guarda una evidencia y devuelve su identificador, o `null` si no cupo.
 *
 * Quien la guarda **debe** mirar el resultado: devolver `null` significa que el
 * almacenamiento se llenó, y seguir como si nada dejaría un registro apuntando
 * a una evidencia que no existe.
 */
export function guardarEvidencia(contenido: string): string | null {
  const id = nuevoIdEvidencia()
  return escribir(PREFIJO_EVIDENCIA + id, contenido) ? id : null
}

export function leerEvidencia(id: string | undefined): string | null {
  if (!id) return null
  return leer<string | null>(PREFIJO_EVIDENCIA + id, null)
}

export function borrarEvidencia(id: string | undefined) {
  if (id) borrar(PREFIJO_EVIDENCIA + id)
}

/* ── Respaldo completo ─────────────────────────────────────────────────────*/

/**
 * Todo lo que SIGA guarda, en un archivo.
 *
 * Mientras los datos vivan en el navegador, esto es lo único que los protege:
 * basta cambiar de equipo, limpiar los datos del sitio o que el sistema
 * operativo decida hacer limpieza para perderlo todo sin aviso.
 */
export function exportarTodo(): string {
  const datos: Record<string, unknown> = {}
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('aeb.')) datos[k] = localStorage.getItem(k)
    }
  } catch {
    /* almacenamiento bloqueado: se devuelve lo que se alcanzó a leer */
  }
  return JSON.stringify(
    { version: 1, exportadoEn: new Date().toISOString(), datos },
    null,
    2,
  )
}

/**
 * Restaura un respaldo. Reemplaza lo que haya: no fusiona.
 *
 * Fusionar dos estados de un sistema de gestión produce mezclas que nadie
 * pidió —medio mes de una persona y medio de otra— así que es todo o nada.
 */
export function importarTodo(json: string): { ok: boolean; mensaje: string } {
  let paquete: { version?: number; datos?: Record<string, string> }
  try {
    paquete = JSON.parse(json)
  } catch {
    return { ok: false, mensaje: 'El archivo no es un respaldo válido.' }
  }
  if (!paquete?.datos || typeof paquete.datos !== 'object')
    return { ok: false, mensaje: 'El archivo no tiene datos de SIGA.' }

  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('aeb.')) localStorage.removeItem(k)
    }
    for (const [k, v] of Object.entries(paquete.datos)) {
      if (k.startsWith('aeb.') && typeof v === 'string') localStorage.setItem(k, v)
    }
  } catch {
    return { ok: false, mensaje: 'No se pudo escribir: el almacenamiento está lleno o bloqueado.' }
  }
  return { ok: true, mensaje: 'Respaldo restaurado. Se recargará la página.' }
}

/** Borra todo lo de SIGA. Lo usa el salvavidas cuando no hay otra salida. */
export function borrarTodo() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('aeb.')) localStorage.removeItem(k)
    }
  } catch {
    /* nada que hacer */
  }
}

/** Cuánto ocupa lo guardado, para avisar antes de que falle. */
export function pesoGuardado(): { bytes: number; evidencias: number } {
  let bytes = 0
  let evidencias = 0
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('aeb.')) continue
      bytes += (localStorage.getItem(k) ?? '').length + k.length
      if (k.startsWith(PREFIJO_EVIDENCIA)) evidencias++
    }
  } catch {
    /* nada que hacer */
  }
  return { bytes, evidencias }
}
