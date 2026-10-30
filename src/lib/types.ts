/**
 * El campo de un trabajador apunta al maestro editable por id, no por nombre.
 * Si mañana «Buin» pasa a llamarse otra cosa, la ficha lo sigue; y si la empresa
 * agrega un campo nuevo, no hay que tocar el código.
 */
export type TipoTrabajador = 'AGRICOLA' | 'ADMINISTRATIVO'

/**
 * Agrícola o de planta. Decide cómo se le calcula el sueldo: al agrícola se le
 * paga por día trabajado con tope de 30, al de planta por mes corrido.
 */
export type ClaseTrabajador = 'AGRICOLA' | 'PLANTA'

export const CLASE_LABEL: Record<ClaseTrabajador, string> = {
  AGRICOLA: 'Trabajador agrícola',
  PLANTA: 'Trabajador de planta',
}
export type EstadoTrabajador = 'ACTIVO' | 'FINIQUITADO' | 'LICENCIA'

export interface Trabajador {
  rut: string
  nombres: string
  apellidos: string
  /** Id de un nodo del maestro de cargos. Antes era un código de texto. */
  cargo: string
  /** Id de un nodo del maestro de campos. */
  campoId: string
  /**
   * Cómo se le paga la jornada: al día, a trato, domingo a trato. La asigna
   * quien administra el sistema, no se elige cada mañana. Al pasar lista, quien
   * vino la hereda de aquí sin que nadie la escriba.
   */
  modalidadId?: string
  /**
   * Centro de costo al que carga su sueldo. Es lo que hace que el costo de la
   * persona llegue al lugar que lo consume, y no a un saco general.
   */
  centroCostoId?: string
  /** Agrícola o de planta: cambia por completo el cálculo del sueldo. */
  clase?: ClaseTrabajador
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
