import { buscarNodo, vigenciaEn } from '@/lib/maestros'
import type { Maestros, ParamModalidad, RegistroAsistencia } from '@/lib/maestros'

/**
 * Lo que una modalidad impone: a qué cuenta va, y —si la modalidad lo define
 * por sí sola— con qué labor y en qué centro de costo.
 *
 * Los tres salen del tramo de vigencia que regía ese día, no del último
 * configurado. Esa distinción es la diferencia entre un ERP y una planilla.
 */
export interface Imputacion {
  cuentaId?: string
  laborId?: string
  centroCostoId?: string
  /** El tramo del que salieron. Queda en la tarja para poder auditarla. */
  vigenciaId?: string
}

const VACIA: Imputacion = {}

/** Lo que la modalidad manda en una fecha dada. */
export function imputacionDeModalidad(
  maestros: Maestros,
  modalidadId: string | undefined,
  fecha: string,
): Imputacion {
  if (!modalidadId) return VACIA
  const tramo = vigenciaEn(buscarNodo(maestros.modalidades, modalidadId), fecha)
  if (!tramo) return VACIA
  return {
    cuentaId: tramo.cuentaId || undefined,
    laborId: tramo.laborId || undefined,
    centroCostoId: tramo.centroCostoId || undefined,
    vigenciaId: tramo.id,
  }
}

/**
 * A qué cuenta quedó imputado un día ya registrado.
 *
 * Manda lo congelado en la tarja. Sólo si el registro es anterior a que
 * existieran las vigencias —no trae copia— se resuelve por su fecha, que es lo
 * que regía entonces. Nunca se usa «lo que dice la modalidad hoy»: eso es
 * justamente lo que haría que un cambio de plan de cuentas reescribiera el
 * pasado.
 */
export function imputacionDeRegistro(
  maestros: Maestros,
  r: Pick<RegistroAsistencia, 'cuentaId' | 'vigenciaId' | 'modalidadId' | 'fecha'>,
): Imputacion {
  if (r.cuentaId) return { cuentaId: r.cuentaId, vigenciaId: r.vigenciaId }
  return imputacionDeModalidad(maestros, r.modalidadId, r.fecha)
}

/** El tramo que rige hoy, para mostrarlo en los maestros. */
export function vigenciaHoy(
  maestros: Maestros,
  modalidadId: string,
): ParamModalidad | undefined {
  return vigenciaEn(
    buscarNodo(maestros.modalidades, modalidadId),
    new Date().toISOString().slice(0, 10),
  )
}
