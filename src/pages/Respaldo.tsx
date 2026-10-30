import { useRef, useState } from 'react'
import { Pagina } from '@/components/Pagina'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ModalConfirmar } from '@/components/ui/Modal'
import { exportarTodo, importarTodo, pesoGuardado } from '@/lib/almacen'

const MB = 1024 * 1024
/** Lo que un navegador suele admitir antes de empezar a fallar. */
const TECHO_APROXIMADO = 5 * MB

const legible = (b: number) =>
  b < 1024 ? `${b} B` : b < MB ? `${(b / 1024).toFixed(0)} KB` : `${(b / MB).toFixed(1)} MB`

/**
 * Respaldar y restaurar.
 *
 * Mientras los datos vivan en el navegador, esta pantalla es lo único que los
 * protege: basta cambiar de equipo, limpiar los datos del sitio o que el
 * sistema operativo haga limpieza para perderlo todo sin aviso previo.
 *
 * Es además el puente hacia el servidor: el día que los datos se muden, lo que
 * se sube es exactamente este archivo.
 */
export default function Respaldo() {
  const [peso, setPeso] = useState(pesoGuardado)
  const [aviso, setAviso] = useState('')
  const [porRestaurar, setPorRestaurar] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const lleno = peso.bytes / TECHO_APROXIMADO
  const apretado = lleno > 0.7

  function descargar() {
    const hoy = new Date().toISOString().slice(0, 10)
    const url = URL.createObjectURL(new Blob([exportarTodo()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `siga-respaldo-${hoy}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAviso('Respaldo descargado. Guárdalo fuera de este equipo.')
  }

  async function elegir(f: File) {
    setAviso('')
    try {
      setPorRestaurar(await f.text())
    } catch {
      setAviso('No se pudo leer el archivo.')
    }
  }

  function restaurar() {
    if (!porRestaurar) return
    const r = importarTodo(porRestaurar)
    setPorRestaurar(null)
    if (!r.ok) return setAviso(r.mensaje)
    /* Recargar es la forma honesta de aplicarlo: media aplicación con los
       datos viejos en memoria y media con los nuevos sería peor. */
    window.location.reload()
  }

  return (
    <Pagina
      titulo="Respaldo"
      descripcion="Mientras el sistema guarde la información en este navegador, el respaldo es lo único que la protege. Descárgalo seguido y guárdalo fuera de este equipo."
    >
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold tracking-tight">Cuánto hay guardado</h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="flex items-baseline gap-2">
            <span className="num text-2xl font-semibold tracking-tight">{legible(peso.bytes)}</span>
            <span className="text-2xs text-ink-faint">de unos {legible(TECHO_APROXIMADO)} disponibles</span>
          </span>
          <span className="text-sm text-ink-faint">
            {peso.evidencias} {peso.evidencias === 1 ? 'evidencia' : 'evidencias'} guardadas
          </span>
          {apretado && <Chip tone="warning">Se está llenando</Chip>}
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={apretado ? 'h-full bg-warning' : 'h-full bg-primary'}
            style={{ width: `${Math.min(100, lleno * 100).toFixed(1)}%` }}
          />
        </div>

        {apretado && (
          <p className="mt-3 rounded-sm bg-warning-tint px-3 py-2 text-sm text-warning-text">
            Cuando se llena, el navegador deja de guardar <strong>sin avisar</strong>. Descarga un
            respaldo antes de seguir cargando evidencias.
          </p>
        )}

        <Button className="mt-4" onClick={() => setPeso(pesoGuardado())}>Volver a medir</Button>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-md border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold tracking-tight">Descargar un respaldo</h2>
          <p className="mt-1.5 text-sm text-ink-faint">
            Un archivo con todo: maestros, personal, asistencia, jornadas, evidencias y usuarios.
          </p>
          <Button variant="primary" className="mt-4" onClick={descargar}>
            Descargar respaldo
          </Button>
        </section>

        <section className="rounded-md border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold tracking-tight">Restaurar</h2>
          <p className="mt-1.5 text-sm text-ink-faint">
            Reemplaza todo lo que hay ahora por lo del archivo. No se fusiona.
          </p>
          <input
            ref={archivo} type="file" accept="application/json,.json" className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void elegir(f)
            }}
          />
          <Button className="mt-4" onClick={() => archivo.current?.click()}>
            Elegir archivo de respaldo
          </Button>
        </section>
      </div>

      {aviso && (
        <p role="status" className="mt-4 rounded-sm bg-primary-tint px-3 py-2 text-sm text-primary-text">
          {aviso}
        </p>
      )}

      {porRestaurar && (
        <ModalConfirmar
          titulo="¿Restaurar este respaldo?"
          descripcion="Se reemplazará todo lo que hay ahora: maestros, personal, asistencia y evidencias. Lo actual no se puede recuperar después, salvo que tengas otro respaldo."
          confirmar="Restaurar"
          onCerrar={() => setPorRestaurar(null)}
          onConfirmar={restaurar}
        />
      )}
    </Pagina>
  )
}
