import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { TEMPORADAS, mesesDeTemporada } from '@/lib/temporada'
import type { Temporada } from '@/lib/temporada'
import type { Campo } from '@/lib/types'

export type CampoSeleccion = Campo | 'TODOS'

interface Contexto {
  temporada: Temporada
  mes: string
  campo: CampoSeleccion
  setTemporada: (t: Temporada) => void
  setMes: (m: string) => void
  setCampo: (c: CampoSeleccion) => void
}

const ContextoOperacion = createContext<Contexto | null>(null)
const CLAVE = 'aeb.contexto'

/** Se recuerda entre sesiones: nadie quiere volver a elegir su campo y su mes
 *  cada vez que abre el sistema. Si el navegador lo bloquea, no pasa nada. */
function leerGuardado(): Partial<Contexto> {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}')
  } catch {
    return {}
  }
}

function guardar(v: { temporada: string; mes: string; campo: string }) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(v))
  } catch {
    /* modo privado o almacenamiento bloqueado: seguimos igual */
  }
}

export function ProveedorContexto({ children }: { children: ReactNode }) {
  const guardado = leerGuardado()
  const temporadaInicial = (
    TEMPORADAS.includes(guardado.temporada as Temporada)
      ? guardado.temporada
      : TEMPORADAS[TEMPORADAS.length - 1]
  ) as Temporada

  const [temporada, setTemporadaEstado] = useState<Temporada>(temporadaInicial)
  const [mes, setMesEstado] = useState<string>(() => {
    const meses = mesesDeTemporada(temporadaInicial)
    const valido = meses.some((m) => m.valor === guardado.mes)
    return valido ? (guardado.mes as string) : meses[0].valor
  })
  const [campo, setCampoEstado] = useState<CampoSeleccion>(
    (guardado.campo as CampoSeleccion) ?? 'TODOS',
  )

  /** Al cambiar de temporada, el mes elegido deja de existir: se reencuadra
   *  al mismo mes de la nueva temporada en vez de quedar en un estado inválido. */
  const setTemporada = useCallback(
    (t: Temporada) => {
      setTemporadaEstado(t)
      setMesEstado((mesActual) => {
        const posicion = mesesDeTemporada(temporada).findIndex((m) => m.valor === mesActual)
        const meses = mesesDeTemporada(t)
        const nuevo = meses[posicion >= 0 ? posicion : 0].valor
        guardar({ temporada: t, mes: nuevo, campo })
        return nuevo
      })
    },
    [temporada, campo],
  )

  const setMes = useCallback(
    (m: string) => {
      setMesEstado(m)
      guardar({ temporada, mes: m, campo })
    },
    [temporada, campo],
  )

  const setCampo = useCallback(
    (c: CampoSeleccion) => {
      setCampoEstado(c)
      guardar({ temporada, mes, campo: c })
    },
    [temporada, mes],
  )

  const valor = useMemo(
    () => ({ temporada, mes, campo, setTemporada, setMes, setCampo }),
    [temporada, mes, campo, setTemporada, setMes, setCampo],
  )

  return <ContextoOperacion.Provider value={valor}>{children}</ContextoOperacion.Provider>
}

export function useContextoOperacion() {
  const c = useContext(ContextoOperacion)
  if (!c) throw new Error('useContextoOperacion debe usarse dentro de ProveedorContexto')
  return c
}
