import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { borrarTodo } from '@/lib/almacen'

/**
 * Red de seguridad de toda la aplicación.
 *
 * Sin esto, cualquier fallo fuera del router —los proveedores, la puerta de
 * acceso, el login— deja **la pantalla en blanco y sin una sola pista**: ni un
 * mensaje, ni una salida. Quien lo sufre sólo puede decir «no carga».
 *
 * Aquí se muestra el error tal cual, y se ofrece la salida que casi siempre
 * resuelve: borrar lo guardado en este navegador. Es destructivo, así que se
 * dice con todas sus letras antes de hacerlo.
 */
interface Estado {
  error: Error | null
  detalle: string
}

export class Salvavidas extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null, detalle: '' }

  static getDerivedStateFromError(error: Error): Partial<Estado> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola para poder pegarlo tal cual al pedir ayuda.
    console.error('Fallo al arrancar el sistema:', error, info.componentStack)
    this.setState({ detalle: info.componentStack ?? '' })
  }

  borrarDatos = () => {
    try {
      borrarTodo()
    } catch {
      /* almacenamiento bloqueado */
    }
    location.reload()
  }

  render() {
    const { error, detalle } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
        <div className="w-full max-w-xl rounded-lg border border-line bg-surface p-6">
          <h1 className="text-xl font-semibold tracking-tight">El sistema no pudo abrir</h1>
          <p className="mt-2 text-base text-ink-faint">
            Algo falló al arrancar. Abajo está el motivo exacto; cópialo si necesitas ayuda.
          </p>

          <pre className="mono mt-4 max-h-40 overflow-auto rounded-sm bg-danger-tint px-3 py-2 text-sm text-danger-text">
            {error.message}
          </pre>

          {detalle && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-ink-faint">Ver detalle técnico</summary>
              <pre className="mono mt-2 max-h-48 overflow-auto rounded-sm bg-surface-sunken px-3 py-2 text-2xs text-ink-muted">
                {detalle.trim()}
              </pre>
            </details>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => location.reload()}
              className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-line-strong px-3 text-base font-medium transition-colors duration-150 hover:bg-surface-sunken"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={this.borrarDatos}
              className="inline-flex h-9 cursor-pointer items-center rounded-sm bg-danger px-3 text-base font-medium text-on-danger transition-colors duration-150 hover:bg-danger-hover"
            >
              Borrar los datos de este navegador y reiniciar
            </button>
          </div>

          <p className="mt-3 text-2xs text-ink-faint">
            Borrar elimina maestros, trabajadores, asistencia, jornadas y usuarios guardados en
            este equipo. No se puede deshacer.
          </p>
        </div>
      </div>
    )
  }
}
