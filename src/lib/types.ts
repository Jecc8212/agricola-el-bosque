/** Los cuatro campos de la empresa. En Nubox están como empresas distintas;
 *  aquí son lo que realmente son: centros de costo del mismo negocio. */
export const CAMPOS = ['BUIN', 'CHUMACO', 'GRANEROS', 'LOS_LIRIOS', 'GENERAL'] as const
export type Campo = (typeof CAMPOS)[number]

export const CAMPO_LABEL: Record<Campo, string> = {
  BUIN: 'Buin',
  CHUMACO: 'Chumaco',
  GRANEROS: 'Graneros',
  LOS_LIRIOS: 'Los Lirios',
  GENERAL: 'General',
}

/** Agrícola imputa a costo directo de producción; administrativo a SUELDOS_ADM.
 *  Es la bifurcación que decide a qué cuenta va la remuneración. */
export type TipoTrabajador = 'AGRICOLA' | 'ADMINISTRATIVO'

export type EstadoTrabajador = 'ACTIVO' | 'FINIQUITADO' | 'LICENCIA'

/** Cada cargo apunta a una cuenta del plan financiero. Ése es el puente entre
 *  la ficha de personal y el asiento contable: nadie elige la cuenta a mano. */
export interface Cargo {
  codigo: string
  nombre: string
  tipo: TipoTrabajador
  cuenta: string
  cuentaNombre: string
}

export interface Trabajador {
  rut: string
  nombres: string
  apellidos: string
  cargo: string
  campo: Campo
  estado: EstadoTrabajador
  fechaIngreso: string
  sueldoBase: number
  banco?: string
  tipoCuenta?: 'CORRIENTE' | 'VISTA' | 'AHORRO'
  numeroCuenta?: string
  tallaBuzo?: string
  tallaCalzado?: number
}

export const nombreCompleto = (t: Trabajador) => `${t.nombres} ${t.apellidos}`
