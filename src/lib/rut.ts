/** RUT chileno: dígito verificador por módulo 11. */
export function digitoVerificador(numero: number): string {
  let suma = 0
  let factor = 2
  for (const d of String(numero).split('').reverse()) {
    suma += Number(d) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

export function esRutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false
  const cuerpo = Number(limpio.slice(0, -1))
  return digitoVerificador(cuerpo) === limpio.slice(-1)
}

/** 12345678K → 12.345.678-K */
export function formatearRut(rut: string): string {
  const limpio = rut.replace(/[.\-\s]/g, '').toUpperCase()
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}
