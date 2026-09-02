/**
 * Excel y PDF, cargados bajo demanda.
 *
 * SheetJS pesa ~700 KB y jsPDF otro tanto: se cargan sólo cuando alguien
 * exporta o importa de verdad, para no cobrárselo a quien abre el sistema a
 * mirar una tabla. Por eso todo aquí es asíncrono.
 */
let cacheXlsx: Promise<typeof import('xlsx')> | null = null
const cargarXlsx = () => (cacheXlsx ??= import('xlsx'))

export type Fila = Record<string, string | number>

/* ── Excel ────────────────────────────────────────────────────────────────*/

/** Descarga una hoja a partir de filas de objetos. */
export async function exportarExcel(filas: Fila[], nombreHoja: string, archivo: string) {
  const XLSX = await cargarXlsx()
  const hoja = XLSX.utils.json_to_sheet(filas)

  // Ancho por columna según el contenido más largo, con tope: una planilla con
  // columnas de 3 caracteres es tan incómoda como una de 200.
  const cabeceras = Object.keys(filas[0] ?? {})
  hoja['!cols'] = cabeceras.map((c) => ({
    wch: Math.min(42, Math.max(c.length + 2, ...filas.map((f) => String(f[c] ?? '').length + 2))),
  }))

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31))
  XLSX.writeFile(libro, archivo)
}

/**
 * Lee la primera hoja de un archivo y devuelve filas como objetos.
 *
 * El CSV se lee como **texto**, no como bytes crudos. Leído en crudo, la
 * librería adivina la codificación y acierta con Latin-1: «Código» llegaba como
 * «CÃ³digo» y la columna dejaba de existir para el importador. Cualquier
 * planilla con tildes —y en español las hay siempre— entraba corrupta.
 */
export async function importarExcel(archivo: File): Promise<Record<string, unknown>[]> {
  const XLSX = await cargarXlsx()
  const esTexto = /\.(csv|txt)$/i.test(archivo.name) || archivo.type.startsWith('text/')

  // cellDates evita que las fechas lleguen como número de serie de Excel.
  const libro = esTexto
    ? XLSX.read(await archivo.text(), { type: 'string', cellDates: true })
    : XLSX.read(await archivo.arrayBuffer(), { cellDates: true })

  const primera = libro.SheetNames[0]
  if (!primera) throw new Error('El archivo no tiene ninguna hoja.')
  return XLSX.utils.sheet_to_json(libro.Sheets[primera], { defval: '' })
}

/**
 * Busca columnas por nombre sin exigir que coincida carácter a carácter.
 *
 * «Código», «CODIGO» y «codigo» son la misma columna, y quien rellena una
 * plantilla en Excel escribe cualquiera de las tres. Es también la última red
 * si alguna herramienta vuelve a maltratar la codificación del encabezado.
 */
export function columnas(fila: Record<string, unknown>) {
  const mapa = new Map<string, unknown>()
  for (const [k, v] of Object.entries(fila)) mapa.set(normalizar(k), v)
  return (nombre: string) => mapa.get(normalizar(nombre))
}

/* ── PDF ──────────────────────────────────────────────────────────────────*/

/** Descarga una tabla en PDF, apaisada: estas tablas son anchas. */
export async function exportarPdf(
  titulo: string,
  subtitulo: string,
  filas: Fila[],
  archivo: string,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const cabeceras = Object.keys(filas[0] ?? {})

  doc.setFontSize(14)
  doc.text(titulo, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(subtitulo, 40, 56)

  autoTable(doc, {
    startY: 72,
    head: [cabeceras],
    body: filas.map((f) => cabeceras.map((c) => String(f[c] ?? ''))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [57, 92, 76], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 245, 240] },
    margin: { left: 40, right: 40 },
  })

  doc.save(archivo)
}

/* ── Utilidades de cotejo ─────────────────────────────────────────────────*/

/**
 * Normaliza para comparar textos escritos a mano: sin tildes, sin mayúsculas,
 * sin espacios de más y con todos los guiones unificados.
 *
 * Lo último importa: las temporadas se muestran como «2026–2027» con guion
 * largo, pero nadie lo escribe así en una planilla. Sin esto, toda importación
 * con «2026-2027» se rechazaría por un carácter invisible.
 */
export function normalizar(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // marcas de tilde ya separadas por NFD
    .replace(/[\u2010-\u2015\u2212]/g, '-')  // guiones largos y el signo menos
    .replace(/\s+/g, ' ')
}

/** Acepta fechas como Date, como ISO o como dd-mm-aaaa. */
export function aIso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
