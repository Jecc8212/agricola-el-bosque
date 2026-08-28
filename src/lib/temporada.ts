/**
 * La temporada agrícola no calza con el año calendario: arranca en mayo y
 * termina en abril del año siguiente. Las fichas de la empresa la escriben
 * "Temporada 2026–2027".
 *
 * Si en Agrícola El Bosque la temporada parte en otro mes, se cambia acá y
 * el resto del sistema se acomoda solo.
 */
export const MES_INICIO_TEMPORADA = 5 // mayo

export const TEMPORADAS = ['2024-2025', '2025-2026', '2026-2027'] as const
export type Temporada = (typeof TEMPORADAS)[number]

export const etiquetaTemporada = (t: Temporada) => t.replace('-', '–')

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export interface MesTemporada {
  valor: string // '2026-07'
  label: string // 'Julio 2026'
}

/** Los 12 meses de una temporada, en orden productivo (mayo → abril). */
export function mesesDeTemporada(t: Temporada): MesTemporada[] {
  const [inicio] = t.split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const indice = MES_INICIO_TEMPORADA - 1 + i
    const anio = inicio + Math.floor(indice / 12)
    const mes = (indice % 12) + 1
    return {
      valor: `${anio}-${String(mes).padStart(2, '0')}`,
      label: `${MESES[mes - 1]} ${anio}`,
    }
  })
}

/** Temporada a la que pertenece una fecha ISO. */
export function temporadaDe(iso: string): string {
  const [anio, mes] = iso.split('-').map(Number)
  const inicio = mes >= MES_INICIO_TEMPORADA ? anio : anio - 1
  return `${inicio}-${inicio + 1}`
}

/** Último día del mes 'YYYY-MM', para comparar contra fechas ISO. */
export function finDeMes(valor: string): string {
  const [anio, mes] = valor.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return `${valor}-${String(ultimo).padStart(2, '0')}`
}
