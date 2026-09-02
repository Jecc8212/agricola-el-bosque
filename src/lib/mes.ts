/**
 * Helpers de mes calendario. La temporada agrícola dejó de ser un enum del
 * código para pasar a ser un maestro editable, así que aquí sólo queda lo que
 * de verdad es del calendario: el período de liquidación de sueldo.
 */
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const mesActual = () => {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`
}

export const etiquetaMes = (valor: string) => {
  const [anio, mes] = valor.split('-').map(Number)
  return `${MESES[mes - 1]} ${anio}`
}

/** Dos años hacia atrás y uno hacia adelante: cubre el cierre de la temporada
 *  pasada y la carga anticipada de la próxima, sin volverse una lista infinita. */
export function mesesDisponibles(): string[] {
  const h = new Date()
  const salida: string[] = []
  for (let i = -24; i <= 12; i++) {
    const d = new Date(h.getFullYear(), h.getMonth() + i, 1)
    salida.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return salida.reverse()
}

/** Último día del mes 'YYYY-MM', para comparar contra fechas ISO. */
export function finDeMes(valor: string): string {
  const [anio, mes] = valor.split('-').map(Number)
  return `${valor}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`
}

/** Los días de un mes, con su inicial para la cabecera de la grilla. */
export function diasDelMes(valor: string) {
  const [anio, mes] = valor.split('-').map(Number)
  const total = new Date(anio, mes, 0).getDate()
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(anio, mes - 1, i + 1)
    const dow = d.getDay()
    return {
      fecha: `${valor}-${String(i + 1).padStart(2, '0')}`,
      numero: i + 1,
      inicial: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dow],
      finDeSemana: dow === 0 || dow === 6,
    }
  })
}
