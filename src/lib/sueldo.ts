import type { Nodo, RegistroAsistencia } from '@/lib/maestros'
import type { Trabajador } from '@/lib/types'

/**
 * Cálculo de remuneración a partir de la asistencia.
 *
 * La regla del negocio: el sueldo base rinde **30 días**, tenga el mes 28 o 31.
 * De ahí sale el valor de la jornada diaria, y cada día registrado vale esa
 * jornada multiplicada por el factor de su modalidad.
 *
 * El tope de 30 no es un detalle: si en un mes de 31 días alguien trabaja los
 * 31, pagarle 31 jornadas le daría más de un sueldo completo por un mes normal.
 * Lo que excede el tope se paga aparte, como **día complementario**, para que se
 * vea en la liquidación en vez de esconderse dentro del sueldo base.
 */
export const TOPE_DIAS = 30

export interface Liquidacion {
  rut: string
  /** Suma de los factores de todas sus modalidades del mes. */
  diasTrabajados: number
  /** Los que caben dentro del tope. */
  diasBase: number
  /** Lo que excede el tope, pagado aparte. */
  diasComplementarios: number
  valorJornada: number
  sueldoBase: number
  complementario: number
  bonos: number
  /** Lo ganado a trato: cantidad por precio de la labor. */
  trato: number
  /** El trato convertido a jornadas, para la semana corrida. */
  diasEquivalentesTrato: number
  total: number
  /** Días con labor pero sin EPP firmado: su bono no se paga. */
  bonosPerdidosPorEpp: number
}

/**
 * El bono se gana trabajando **con** el equipo de protección puesto. Si no se
 * entregó el EPP, la labor se registra igual —hay que saber qué hizo— pero su
 * bono no se paga: es la palanca que hace que la entrega de EPP importe.
 */
function bonoDelDia(r: RegistroAsistencia, labores: Nodo[]): number {
  if (!r.presente || !r.eppEntregado) return 0
  return r.laborIds.reduce((s, id) => s + (buscar(labores, id)?.bono ?? 0), 0)
}

function buscar(lista: Nodo[], id: string | undefined): Nodo | undefined {
  if (!id) return undefined
  for (const n of lista) {
    if (n.id === id) return n
    const hallado = buscar(n.hijos, id)
    if (hallado) return hallado
  }
  return undefined
}

export function liquidar(
  trabajador: Trabajador,
  registros: RegistroAsistencia[],
  modalidades: Nodo[],
  labores: Nodo[],
  baseDias = TOPE_DIAS,
): Liquidacion {
  const suyos = registros.filter((r) => r.rut === trabajador.rut)

  /**
   * El trato se paga por lo producido, no por el día: cantidad × precio de la
   * labor. Un día a trato **no** suma jornada al sueldo base —si sumara, se
   * pagaría dos veces— pero sí aporta días equivalentes para la semana corrida,
   * que es como lo describe la ficha.
   */
  const trato = suyos.reduce((s, r) => {
    const m = buscar(modalidades, r.modalidadId)
    if (!m?.porTrato || !r.presente) return s
    const precio = r.laborIds.reduce((x, id) => Math.max(x, buscar(labores, id)?.precio ?? 0), 0)
    return s + precio * (r.tratoCantidad ?? 0)
  }, 0)

  const diasTrabajados = suyos.reduce((s, r) => {
    const m = buscar(modalidades, r.modalidadId)
    if (m?.porTrato) return s
    return s + (m?.factor ?? 0)
  }, 0)
  const diasBase = Math.min(diasTrabajados, baseDias)
  const diasComplementarios = Math.max(0, diasTrabajados - baseDias)

  const valorJornada = trabajador.sueldoBase / baseDias
  const bonos = suyos.reduce((s, r) => s + bonoDelDia(r, labores), 0)

  /* Lo que se perdió por no firmar el EPP: se muestra, no se descuenta a
     escondidas. Quien liquida tiene que poder explicarlo. */
  const bonosPerdidosPorEpp = suyos
    .filter((r) => r.presente && !r.eppEntregado)
    .reduce((s, r) => s + r.laborIds.reduce((x, id) => x + (buscar(labores, id)?.bono ?? 0), 0), 0)

  const sueldoBase = valorJornada * diasBase
  const complementario = valorJornada * diasComplementarios
  const diasEquivalentesTrato = valorJornada > 0 ? trato / valorJornada : 0

  return {
    rut: trabajador.rut,
    diasTrabajados, diasBase, diasComplementarios,
    valorJornada, sueldoBase, complementario, bonos, trato, diasEquivalentesTrato,
    total: sueldoBase + complementario + bonos + trato,
    bonosPerdidosPorEpp,
  }
}
