import { aplanar, buscarNodo } from '@/lib/maestros'
import type { Maestros, Nodo } from '@/lib/maestros'
import type { Trabajador } from '@/lib/types'

/**
 * Qué equipo de protección se le exige hoy a una persona.
 *
 * La exigencia viene de dos lados y hay que sumarlos, no elegir uno: el
 * **cargo** aporta el equipo permanente de la función —el nochero y su chaleco
 * reflectante, lo haga lo que haga— y la **labor del día** aporta el suyo
 * propio. Aplicar químicos exige respirador aunque lo haga un administrativo
 * que ningún día lo necesita.
 *
 * Sin esta suma, el Sí/No de la tarja queda en manos de lo que recuerde quien
 * mira, que es justo lo que un control de EPP debería evitar.
 */
export function eppExigido(
  maestros: Maestros,
  trabajador: Pick<Trabajador, 'cargo'>,
  laborIds: string[],
): Nodo[] {
  const ids = new Set<string>()
  for (const id of buscarNodo(maestros.cargos, trabajador.cargo)?.eppIds ?? []) ids.add(id)
  for (const labor of laborIds) {
    for (const id of buscarNodo(maestros.labores, labor)?.eppIds ?? []) ids.add(id)
  }
  return [...ids].map((id) => buscarNodo(maestros.epp, id)).filter((n): n is Nodo => Boolean(n))
}

/** De dónde sale la exigencia, para poder explicarla en pantalla. */
export function origenDelEpp(
  maestros: Maestros,
  trabajador: Pick<Trabajador, 'cargo'>,
  laborIds: string[],
  eppId: string,
): 'cargo' | 'labor' | 'ambos' {
  const porCargo = (buscarNodo(maestros.cargos, trabajador.cargo)?.eppIds ?? []).includes(eppId)
  const porLabor = laborIds.some((l) =>
    (buscarNodo(maestros.labores, l)?.eppIds ?? []).includes(eppId),
  )
  return porCargo && porLabor ? 'ambos' : porCargo ? 'cargo' : 'labor'
}

/**
 * Las charlas que corresponden a una jornada.
 *
 * Dos clases, y la diferencia es lo que hace que el sistema se use: las
 * **obligatorias** van siempre, y las **de labor** sólo aparecen si ese día
 * alguien hace el trabajo que las activa. Mostrar la charla de motosierra en
 * un día de cosecha a mano no es rigor sino ruido, y el ruido es lo que lleva
 * a que nadie lea ninguna.
 */
export function charlasDelDia(
  maestros: Maestros,
  laborIdsDelDia: string[],
): { obligatorias: Nodo[]; porLabor: Nodo[] } {
  const asignadas = new Set(laborIdsDelDia)
  const todas = aplanar(maestros.charlas).map((f) => f.nodo)
  return {
    obligatorias: todas.filter((c) => c.obligatoria),
    porLabor: todas.filter(
      (c) => !c.obligatoria && (c.laborIds ?? []).some((l) => asignadas.has(l)),
    ),
  }
}

/** Los riesgos a los que expone el trabajo asignado ese día. */
export function riesgosDelDia(maestros: Maestros, laborIdsDelDia: string[]): Nodo[] {
  const ids = new Set<string>()
  for (const labor of laborIdsDelDia) {
    for (const id of buscarNodo(maestros.labores, labor)?.riesgoIds ?? []) ids.add(id)
  }
  return [...ids].map((id) => buscarNodo(maestros.riesgos, id)).filter((n): n is Nodo => Boolean(n))
}
