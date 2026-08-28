import type { Cargo } from '@/lib/types'

/** Cuentas tomadas del plan de cuentas de la empresa (ficha de Costos). */
export const CARGOS: Cargo[] = [
  { codigo: 'COSECHERO',    nombre: 'Cosechero',              tipo: 'AGRICOLA',       cuenta: '5112', cuentaNombre: 'Mano de obra agrícola — Cosecha' },
  { codigo: 'PODADOR',      nombre: 'Podador',                tipo: 'AGRICOLA',       cuenta: '5111', cuentaNombre: 'Mano de obra agrícola — Poda' },
  { codigo: 'APLICADOR',    nombre: 'Aplicador',              tipo: 'AGRICOLA',       cuenta: '5113', cuentaNombre: 'Mano de obra agrícola — Aplicaciones químicas' },
  { codigo: 'FERTILIZADOR', nombre: 'Fertilizador',           tipo: 'AGRICOLA',       cuenta: '5114', cuentaNombre: 'Mano de obra agrícola — Fertilización' },
  { codigo: 'DESBROTADOR',  nombre: 'Desbrotador',            tipo: 'AGRICOLA',       cuenta: '5115', cuentaNombre: 'Mano de obra agrícola — Desbrote' },
  { codigo: 'TRACTORISTA',  nombre: 'Tractorista',            tipo: 'AGRICOLA',       cuenta: '5116', cuentaNombre: 'Servicios agrícolas — Mecanizados' },
  { codigo: 'SUPERVISOR',   nombre: 'Supervisor de campo',    tipo: 'ADMINISTRATIVO', cuenta: '5121', cuentaNombre: 'Sueldos ADM agrícola — Supervisión general' },
  { codigo: 'ADMIN',        nombre: 'Administrativo',         tipo: 'ADMINISTRATIVO', cuenta: '5121', cuentaNombre: 'Sueldos ADM agrícola — Supervisión general' },
  { codigo: 'NOCHERO',      nombre: 'Nochero',                tipo: 'ADMINISTRATIVO', cuenta: '5142', cuentaNombre: 'Mano de obra NAD — Nochero' },
]

export const CARGO_POR_CODIGO = new Map(CARGOS.map((c) => [c.codigo, c]))
