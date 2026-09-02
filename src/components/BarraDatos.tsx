import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { exportarExcel, exportarPdf, importarExcel } from '@/lib/planilla'
import type { Fila } from '@/lib/planilla'

/**
 * Los botones de datos de una pantalla: exportar lo que se ve, bajar una
 * planilla de ejemplo y cargar información desde Excel.
 *
 * La plantilla existe para que nadie adivine los encabezados: se baja, se
 * rellena y se sube. Es la diferencia entre una carga que entra a la primera y
 * una tarde entera peleando con nombres de columna.
 */
export function BarraDatos({
  titulo, nombreArchivo, filas, subtitulo, plantilla, onImportar,
}: {
  titulo: string
  /** Sin extensión: se le agrega .xlsx o .pdf. */
  nombreArchivo: string
  filas: Fila[]
  subtitulo?: string
  /** Fila de ejemplo con los encabezados que espera la importación. */
  plantilla?: Fila[]
  onImportar?: (filas: Record<string, unknown>[]) => Promise<string> | string
}) {
  const archivo = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<{ texto: string; malo: boolean } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const sinDatos = filas.length === 0

  async function conAviso(fn: () => Promise<string>) {
    setOcupado(true)
    try {
      setAviso({ texto: await fn(), malo: false })
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : String(e), malo: true })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {plantilla && (
          <Button
            disabled={ocupado}
            onClick={() =>
              conAviso(async () => {
                await exportarExcel(plantilla, 'Plantilla', `plantilla-${nombreArchivo}.xlsx`)
                return 'Plantilla descargada. Rellénala sin cambiar los encabezados.'
              })
            }
          >
            Plantilla de ejemplo
          </Button>
        )}

        {onImportar && (
          <>
            <Button disabled={ocupado} onClick={() => archivo.current?.click()}>
              Importar Excel
            </Button>
            <input
              ref={archivo} type="file" accept=".xlsx,.xls,.csv" className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                void conAviso(async () => onImportar(await importarExcel(f)))
              }}
            />
          </>
        )}

        <Button
          disabled={ocupado || sinDatos}
          title={sinDatos ? 'No hay nada que exportar' : undefined}
          onClick={() =>
            conAviso(async () => {
              await exportarExcel(filas, titulo, `${nombreArchivo}.xlsx`)
              return `${filas.length} filas exportadas a Excel.`
            })
          }
        >
          Exportar Excel
        </Button>

        <Button
          disabled={ocupado || sinDatos}
          title={sinDatos ? 'No hay nada que exportar' : undefined}
          onClick={() =>
            conAviso(async () => {
              await exportarPdf(titulo, subtitulo ?? '', filas, `${nombreArchivo}.pdf`)
              return `${filas.length} filas exportadas a PDF.`
            })
          }
        >
          Exportar PDF
        </Button>
      </div>

      {aviso && (
        <p
          role="status"
          className={`rounded-sm px-2 py-1.5 text-sm ${
            aviso.malo ? 'bg-danger-tint text-danger-text' : 'bg-primary-tint text-primary-text'
          }`}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  )
}
