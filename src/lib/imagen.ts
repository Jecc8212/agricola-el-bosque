/**
 * Reduce una foto antes de guardarla.
 *
 * La foto de la hoja firmada sale del teléfono con 3 a 6 MB, y todo el sistema
 * vive hoy en el almacenamiento del navegador, que ronda los 5 MB **en total**.
 * Sin reducir, la primera jornada llenaría la cuota y las siguientes fallarían
 * al guardar. A 1600 px de lado largo la firma se lee perfectamente y el
 * archivo baja a unos 200-400 KB.
 */
const LADO_MAXIMO = 1600
const CALIDAD = 0.72

export async function reducirFoto(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const datos = lienzo.toDataURL('image/jpeg', CALIDAD)
  // Aviso temprano: más vale decirlo aquí que fallar al escribir el acta.
  if (datos.length > 1_400_000)
    throw new Error('La foto sigue siendo demasiado pesada. Prueba con una toma más cerrada.')
  return datos
}

export const pesoLegible = (dataUrl: string) => {
  const bytes = Math.round((dataUrl.length * 3) / 4)
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}
