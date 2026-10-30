import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { buscarNodo, useMaestros } from '@/lib/maestros'
import { mesActual } from '@/lib/mes'
import { useAuth } from '@/lib/auth'
import { CLAVE, leer as leerDe, escribir } from '@/lib/almacen'

export const TODOS = 'TODOS'

interface Contexto {
  temporadaId: string
  campoId: string
  centroCostoId: string
  /** Mes en curso. Vive aquí y no en cada pantalla: el costo, la liquidación
   *  y los indicadores tienen que estar mirando siempre el mismo. */
  mes: string
  setTemporadaId: (v: string) => void
  setCampoId: (v: string) => void
  setCentroCostoId: (v: string) => void
  setMes: (v: string) => void
  /** Nombres ya resueltos, para no repetir la búsqueda en cada pantalla. */
  temporadaNombre: string
  campoNombre: string
  centroCostoNombre: string
  /** Verdadero cuando el campo lo impone el perfil y no se puede cambiar. */
  campoBloqueado: boolean
}

const Ctx = createContext<Contexto | null>(null)

/** Se recuerda entre sesiones: nadie quiere volver a elegir su campo cada vez
 *  que abre el sistema. Si el navegador lo bloquea, no pasa nada. */
function leer(): Record<string, string> {
  try {
    return leerDe<Record<string, string>>(CLAVE.contexto, {})
  } catch {
    return {}
  }
}

/**
 * Contexto de operación, no filtros de página. Temporada, campo y centro de
 * costo acotan todo el sistema a la vez, y los tres salen de maestros
 * editables: lo que se filtra es exactamente lo que la empresa cargó.
 */
export function ProveedorContexto({ children }: { children: ReactNode }) {
  const { maestros } = useMaestros()
  const { sesion } = useAuth()
  const guardado = leer()

  const [temporadaId, setTemporadaId] = useState(() => guardado.temporadaId ?? TODOS)
  const [campoId, setCampoIdEstado] = useState(() => guardado.campoId ?? TODOS)

  /* Un perfil acotado a un campo no elige: su campo manda sobre lo guardado. */
  const campoBloqueado = Boolean(sesion?.campoId)
  const campoEfectivo = sesion?.campoId ?? campoId
  const setCampoId = useCallback(
    (v: string) => {
      if (!campoBloqueado) setCampoIdEstado(v)
    },
    [campoBloqueado],
  )
  const [centroCostoId, setCentroCostoId] = useState(() => guardado.centroCostoId ?? TODOS)
  const [mes, setMes] = useState(() => guardado.mes ?? mesActual())

  useEffect(() => {
    try {
      escribir(CLAVE.contexto, { temporadaId, campoId, centroCostoId, mes })
    } catch {
      /* almacenamiento bloqueado */
    }
  }, [temporadaId, campoId, centroCostoId, mes])

  /* Si alguien borra del maestro el elemento que estaba seleccionado, el filtro
     vuelve a "todos" en vez de quedar apuntando a algo que ya no existe. */
  useEffect(() => {
    if (temporadaId !== TODOS && !buscarNodo(maestros.temporadas, temporadaId)) setTemporadaId(TODOS)
    if (campoId !== TODOS && !buscarNodo(maestros.campos, campoId)) setCampoIdEstado(TODOS)
    if (centroCostoId !== TODOS && !buscarNodo(maestros.centrosCosto, centroCostoId))
      setCentroCostoId(TODOS)
  }, [maestros, temporadaId, campoId, centroCostoId])

  const valor = useMemo<Contexto>(
    () => ({
      temporadaId, campoId: campoEfectivo, centroCostoId, mes,
      setTemporadaId, setCampoId, setCentroCostoId, setMes,
      temporadaNombre: buscarNodo(maestros.temporadas, temporadaId)?.nombre ?? 'Todas',
      campoNombre: buscarNodo(maestros.campos, campoEfectivo)?.nombre ?? 'Todos',
      centroCostoNombre: buscarNodo(maestros.centrosCosto, centroCostoId)?.nombre ?? 'Todos',
      campoBloqueado,
    }),
    [maestros, temporadaId, campoId, campoEfectivo, campoBloqueado, setCampoId, centroCostoId, mes],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useContextoOperacion() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContextoOperacion debe usarse dentro de ProveedorContexto')
  return c
}
