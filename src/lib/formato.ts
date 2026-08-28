export const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export const fecha = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export const antiguedad = (iso: string, hoy = new Date()) => {
  const d = new Date(`${iso}T00:00:00`)
  const meses = (hoy.getFullYear() - d.getFullYear()) * 12 + (hoy.getMonth() - d.getMonth())
  const a = Math.floor(meses / 12)
  const m = meses % 12
  if (a === 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`
  if (m === 0) return `${a} ${a === 1 ? 'año' : 'años'}`
  return `${a} a ${m} m`
}
