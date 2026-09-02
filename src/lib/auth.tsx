import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Control de acceso local.
 *
 * Hay que decirlo sin rodeos: esto **organiza el trabajo y deja registro de
 * quién entra a qué, pero no protege los datos**. Todo corre en el navegador de
 * quien lo usa, así que cualquiera con acceso al equipo puede leer el
 * almacenamiento local. La seguridad real llega cuando el sistema tenga
 * servidor. Mientras tanto: las claves no se guardan en texto plano, y cada
 * perfil ve sólo sus módulos.
 */
export type Rol = 'ADMINISTRADOR' | 'CONTABILIDAD' | 'JEFE'

export const ROL_NOMBRE: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador del sistema',
  CONTABILIDAD: 'Contabilidad y control',
  JEFE: 'Jefe de campo',
}

export const ROLES: Rol[] = ['ADMINISTRADOR', 'CONTABILIDAD', 'JEFE']

/** Rol de reserva. Es el de menos alcance a propósito: ante un dato que no se
 *  entiende, se concede lo mínimo, nunca lo máximo. */
const ROL_POR_DEFECTO: Rol = 'JEFE'

const esRol = (v: unknown): v is Rol => ROLES.includes(v as Rol)

/** Nombre legible que no se rompe con un rol que ya no existe. */
export const nombreRol = (rol: string) =>
  esRol(rol) ? ROL_NOMBRE[rol] : 'Rol desconocido'

/** Las secciones que se pueden conceder. El menú lateral se arma con esto. */
export const SECCIONES = [
  { clave: 'home', nombre: 'Home', detalle: 'Resumen de costos por centro' },
  { clave: 'cuentas', nombre: 'Cuentas', detalle: 'Master de cuentas de 9 niveles' },
  { clave: 'rrhh', nombre: 'Recursos humanos', detalle: 'Trabajadores, asistencia, tarja y semillas' },
  { clave: 'maestros', nombre: 'Maestros', detalle: 'Labores, centros de costo, campos, temporadas y modalidades' },
  { clave: 'sistema', nombre: 'Configuración', detalle: 'Usuarios, accesos y design system' },
] as const

/** Accesos que trae cada rol por defecto. Un usuario puede desviarse de ellos. */
export const PERMISOS: Record<Rol, string[]> = {
  ADMINISTRADOR: ['home', 'cuentas', 'rrhh', 'maestros', 'sistema'],
  CONTABILIDAD: ['home', 'cuentas', 'rrhh', 'maestros'],
  // El jefe de campo registra gente y días; no toca la contabilidad.
  JEFE: ['home', 'rrhh'],
}

export interface Usuario {
  usuario: string
  nombre: string
  rol: Rol
  hash: string
  /** Clave puesta por el administrador: obliga a cambiarla al entrar. */
  provisoria: boolean
  /** Accesos propios. Si no está, manda lo que trae el rol. */
  secciones?: string[]
  /**
   * Campo que administra. Si está, la persona sólo ve —y sólo puede pasar
   * lista de— ese campo: el filtro de campo queda fijo y no se puede cambiar.
   */
  campoId?: string
}

/**
 * Lo que ve realmente un usuario: sus accesos propios, o los de su rol.
 *
 * Nunca devuelve `undefined`. Un usuario guardado con un rol que ya no existe
 * —una versión anterior del sistema tenía otros, y comparten almacenamiento por
 * vivir en el mismo puerto— dejaba esta función en nada y tumbaba la pantalla
 * entera de usuarios al hacerle `.map`.
 */
export const seccionesDe = (u: Usuario): string[] =>
  u.secciones ?? PERMISOS[u.rol] ?? PERMISOS[ROL_POR_DEFECTO]

/**
 * Repara lo guardado antes de dejarlo entrar al sistema.
 *
 * Es el mismo criterio que usan los maestros al fusionar con la semilla: lo que
 * viene de una versión anterior se normaliza en vez de reventar. Un rol que ya
 * no existe baja al de menos alcance —quien administre puede corregirlo desde
 * la pantalla— y una cuenta sin nombre ni hash se descarta, porque no hay forma
 * de repararla ni de entrar con ella.
 */
function sanearUsuarios(crudo: unknown): Usuario[] {
  if (!Array.isArray(crudo)) return []
  return crudo.flatMap((x): Usuario[] => {
    const u = x as Partial<Usuario>
    if (typeof u?.usuario !== 'string' || typeof u.hash !== 'string') return []
    return [{
      usuario: u.usuario,
      nombre: typeof u.nombre === 'string' && u.nombre.trim() ? u.nombre : u.usuario,
      campoId: typeof u.campoId === 'string' && u.campoId ? u.campoId : undefined,
      rol: esRol(u.rol) ? u.rol : ROL_POR_DEFECTO,
      hash: u.hash,
      provisoria: u.provisoria !== false,
      // Sólo se conservan accesos que sigan siendo una lista de textos; las
      // secciones que ya no existen simplemente no coinciden con nada.
      secciones: Array.isArray(u.secciones)
        ? u.secciones.filter((s): s is string => typeof s === 'string')
        : undefined,
    }]
  })
}

/** La primera cuenta, para poder entrar. Nace provisoria: se cambia al entrar. */
const PRIMER_ADMIN = { usuario: 'admin', clave: 'Admin2026', nombre: 'Administrador', rol: 'ADMINISTRADOR' as Rol }

/**
 * `crypto.subtle` sólo existe en contexto seguro: https o localhost. Abierto por
 * IP de la red —que es justo como se abriría desde otro equipo de la oficina—
 * no existe, y sin este aviso el sistema se quedaba colgado en «Cargando…» sin
 * decir por qué.
 */
export const hayCripto = typeof crypto !== 'undefined' && !!crypto.subtle

/** SHA-256. No es seguridad real sin servidor, pero evita el texto plano. */
export async function hashear(clave: string): Promise<string> {
  if (!hayCripto) throw new Error('SIN_CRIPTO')
  const datos = new TextEncoder().encode(`aeb::${clave}`)
  const buffer = await crypto.subtle.digest('SHA-256', datos)
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface Api {
  /** Si el navegador no ofrece cripto, el módulo de acceso no puede operar. */
  fallo: string | null
  sesion: Usuario | null
  usuarios: Usuario[]
  listo: boolean
  entrar: (usuario: string, clave: string) => Promise<{ ok: boolean; error?: string }>
  salir: () => void
  cambiarClave: (actual: string, nueva: string) => Promise<{ ok: boolean; error?: string }>
  puedeVer: (seccion: string) => boolean
  crearUsuario: (datos: Omit<Usuario, 'hash' | 'provisoria'>, clave: string) => Promise<{ ok: boolean; error?: string }>
  actualizarUsuario: (usuario: string, cambios: Partial<Usuario>) => { ok: boolean; error?: string }
  eliminarUsuario: (usuario: string) => { ok: boolean; error?: string }
  restablecerClave: (usuario: string, clave: string) => Promise<{ ok: boolean; error?: string }>
}

const Ctx = createContext<Api | null>(null)
const CLAVE_U = 'aeb.usuarios'
const CLAVE_S = 'aeb.sesion'

function leer<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : def
  } catch {
    return def
  }
}

function escribir(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* almacenamiento bloqueado */
  }
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sesion, setSesion] = useState<Usuario | null>(null)
  const [listo, setListo] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  // Sembrar la primera cuenta necesita hashear, que es asíncrono: hay un
  // instante sin datos y por eso existe `listo`.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        let lista = sanearUsuarios(leer<unknown>(CLAVE_U, []))
        // Si el saneado cambió algo, se persiste: así el arreglo es de una vez
        // y no se rehace en cada arranque.
        if (lista.length > 0) escribir(CLAVE_U, lista)
        if (lista.length === 0) {
          lista = [{
            usuario: PRIMER_ADMIN.usuario,
            nombre: PRIMER_ADMIN.nombre,
            rol: PRIMER_ADMIN.rol,
            hash: await hashear(PRIMER_ADMIN.clave),
            provisoria: true,
          }]
          escribir(CLAVE_U, lista)
        }
        if (!vivo) return
        setUsuarios(lista)
        const guardada = leer<string | null>(CLAVE_S, null)
        setSesion(lista.find((u) => u.usuario === guardada) ?? null)
      } catch (e) {
        if (!vivo) return
        setFallo(
          e instanceof Error && e.message === 'SIN_CRIPTO'
            ? 'Este navegador no permite cifrar contraseñas porque la página no se abrió de forma segura. Ábrela en http://localhost:5180 (no por la IP de la red).'
            : 'No se pudo preparar el control de acceso.',
        )
      } finally {
        // Pase lo que pase, se deja de esperar: colgado en «Cargando…» no se
        // puede ni diagnosticar el problema.
        if (vivo) setListo(true)
      }
    })()
    return () => { vivo = false }
  }, [])

  const persistir = useCallback((lista: Usuario[]) => {
    setUsuarios(lista)
    escribir(CLAVE_U, lista)
  }, [])

  const entrar = useCallback(
    async (usuario: string, clave: string) => {
      const u = usuarios.find((x) => x.usuario === usuario.trim().toLowerCase())
      // Mismo mensaje para usuario inexistente y clave errada: decir cuál de
      // los dos falló le regala al que prueba la mitad de la respuesta.
      if (!u) return { ok: false, error: 'Usuario o contraseña incorrectos' }
      if ((await hashear(clave)) !== u.hash) return { ok: false, error: 'Usuario o contraseña incorrectos' }
      setSesion(u)
      escribir(CLAVE_S, u.usuario)
      return { ok: true }
    },
    [usuarios],
  )

  const salir = useCallback(() => {
    setSesion(null)
    escribir(CLAVE_S, null)
  }, [])

  const cambiarClave = useCallback(
    async (actual: string, nueva: string) => {
      if (!sesion) return { ok: false, error: 'No hay sesión activa' }
      if ((await hashear(actual)) !== sesion.hash)
        return { ok: false, error: 'La contraseña actual no coincide' }
      if (nueva.length < 8) return { ok: false, error: 'La nueva debe tener al menos 8 caracteres' }
      if (nueva === actual) return { ok: false, error: 'La nueva debe ser distinta de la actual' }

      const actualizado: Usuario = { ...sesion, hash: await hashear(nueva), provisoria: false }
      persistir(usuarios.map((u) => (u.usuario === sesion.usuario ? actualizado : u)))
      setSesion(actualizado)
      return { ok: true }
    },
    [sesion, usuarios, persistir],
  )

  const puedeVer = useCallback(
    (seccion: string) => (sesion ? seccionesDe(sesion).includes(seccion) : false),
    [sesion],
  )

  /* Nadie debe poder dejar el sistema sin quien administre usuarios: si el
     cambio deja cero cuentas con acceso a Configuración, se rechaza. */
  const quedaAlgunAdministrador = (lista: Usuario[]) =>
    lista.some((u) => seccionesDe(u).includes('sistema'))

  const crearUsuario = useCallback(
    async (datos: Omit<Usuario, 'hash' | 'provisoria'>, clave: string) => {
      const nombreUsuario = datos.usuario.trim().toLowerCase()
      if (!/^[a-z0-9._-]{3,20}$/.test(nombreUsuario))
        return { ok: false, error: 'El usuario admite 3 a 20 caracteres: letras, números, punto, guion o guion bajo' }
      if (usuarios.some((u) => u.usuario === nombreUsuario))
        return { ok: false, error: 'Ya existe un usuario con ese nombre' }
      if (clave.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' }

      persistir([...usuarios, { ...datos, usuario: nombreUsuario, hash: await hashear(clave), provisoria: true }])
      return { ok: true }
    },
    [usuarios, persistir],
  )

  const actualizarUsuario = useCallback(
    (usuario: string, cambios: Partial<Usuario>) => {
      const lista = usuarios.map((u) => (u.usuario === usuario ? { ...u, ...cambios } : u))
      if (!quedaAlgunAdministrador(lista))
        return { ok: false, error: 'Debe quedar al menos una cuenta con acceso a Configuración' }
      persistir(lista)
      if (sesion?.usuario === usuario) setSesion(lista.find((u) => u.usuario === usuario) ?? null)
      return { ok: true }
    },
    [usuarios, persistir, sesion],
  )

  const eliminarUsuario = useCallback(
    (usuario: string) => {
      if (sesion?.usuario === usuario) return { ok: false, error: 'No puede eliminar su propia cuenta' }
      const lista = usuarios.filter((u) => u.usuario !== usuario)
      if (!quedaAlgunAdministrador(lista))
        return { ok: false, error: 'Debe quedar al menos una cuenta con acceso a Configuración' }
      persistir(lista)
      return { ok: true }
    },
    [usuarios, persistir, sesion],
  )

  /** La clave que pone el administrador nace provisoria: la persona la cambia al entrar. */
  const restablecerClave = useCallback(
    async (usuario: string, clave: string) => {
      if (clave.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' }
      const hash = await hashear(clave)
      persistir(usuarios.map((u) => (u.usuario === usuario ? { ...u, hash, provisoria: true } : u)))
      return { ok: true }
    },
    [usuarios, persistir],
  )

  const api = useMemo(
    () => ({
      fallo, sesion, usuarios, listo, entrar, salir, cambiarClave, puedeVer,
      crearUsuario, actualizarUsuario, eliminarUsuario, restablecerClave,
    }),
    [fallo, sesion, usuarios, listo, entrar, salir, cambiarClave, puedeVer,
     crearUsuario, actualizarUsuario, eliminarUsuario, restablecerClave],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth debe usarse dentro de ProveedorAuth')
  return c
}
