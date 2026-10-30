import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export type CampoForm =
  | { tipo: 'texto'; id: string; etiqueta: string; valor?: string; requerido?: boolean; placeholder?: string; ayuda?: string }
  | { tipo: 'numero'; id: string; etiqueta: string; valor?: number; paso?: string; min?: string; ayuda?: string }
  | { tipo: 'fecha'; id: string; etiqueta: string; valor?: string; requerido?: boolean; ayuda?: string }
  | {
      tipo: 'select'; id: string; etiqueta: string; valor?: string; requerido?: boolean; ayuda?: string
      opciones: Array<{ valor: string; etiqueta: string }>
    }
  /**
   * Varias opciones a la vez, como casillas.
   *
   * El valor viaja como texto separado por comas porque el formulario entero
   * trabaja con texto; quien lo recibe lo parte. Se usan casillas y no una
   * lista múltiple porque marcar con Ctrl es un saber que no todo el mundo
   * tiene, y en una ficha de EPP equivocarse significa no exigir un guante.
   */
  | {
      tipo: 'casillas'; id: string; etiqueta: string; valor?: string; ayuda?: string
      opciones: Array<{ valor: string; etiqueta: string }>
    }

/**
 * Formulario en modal a partir de una lista de campos. Existe para que los
 * maestros y la asistencia no repitan el mismo formulario con seis
 * maquetaciones ligeramente distintas.
 *
 * Guardar pide confirmación en un segundo paso **dentro del mismo modal**, no
 * en otro encima: dos diálogos apilados fue exactamente el fallo que dejaba
 * cuadros fantasma y clics perdidos. Aquí sólo cambia el contenido, y «Volver»
 * devuelve el formulario con todo lo escrito intacto.
 */
export function FormularioModal({
  titulo, descripcion, campos, confirmar = 'Guardar', mensajeConfirmacion,
  tituloConfirmacion, onGuardar, onCerrar,
}: {
  titulo: string
  descripcion?: string
  campos: CampoForm[]
  confirmar?: string
  /** Qué se pregunta antes de aplicar. Sin esto, se guarda de una. */
  mensajeConfirmacion?: string
  /** Encabezado de ese paso. Por defecto, el verbo del botón. */
  tituloConfirmacion?: string
  onGuardar: (valores: Record<string, string>) => void
  onCerrar: () => void
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.id, String(c.valor ?? '')])),
  )
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  function enviar() {
    const falta = campos.find(
      (c) => 'requerido' in c && c.requerido && !valores[c.id]?.trim(),
    )
    if (falta) {
      setError(`Falta completar «${falta.etiqueta}».`)
      return
    }
    if (mensajeConfirmacion && !confirmando) {
      setConfirmando(true)
      return
    }
    onGuardar(valores)
  }

  const set = (id: string, v: string) => {
    setValores((x) => ({ ...x, [id]: v }))
    setError('')
  }

  const clases =
    'h-8 w-full rounded-sm border border-line-strong bg-surface px-2 text-base text-ink transition-colors duration-150 ease-out placeholder:text-ink-disabled'

  if (confirmando) {
    return (
      <Modal
        titulo={tituloConfirmacion ?? `¿${confirmar}?`}
        descripcion={mensajeConfirmacion}
        onCerrar={onCerrar}
        pie={
          <>
            <Button onClick={() => setConfirmando(false)}>Volver</Button>
            <Button variant="primary" onClick={enviar}>Sí, {confirmar.toLowerCase()}</Button>
          </>
        }
      />
    )
  }

  return (
    <Modal
      titulo={titulo}
      descripcion={descripcion}
      onCerrar={onCerrar}
      pie={
        <>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button variant="primary" onClick={enviar}>{confirmar}</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
        className="flex flex-col gap-3"
      >
        {campos.map((c) => (
          <div key={c.id} className="flex flex-col gap-1">
            <label htmlFor={`f-${c.id}`} className="text-2xs font-medium tracking-wide text-ink-muted">
              {c.etiqueta.toUpperCase()}
              {'requerido' in c && c.requerido && (
                <span className="ml-1 font-normal normal-case text-ink-faint">obligatorio</span>
              )}
            </label>

            {c.tipo === 'casillas' ? (
              <div className="flex flex-col gap-1.5 rounded-sm border border-line-strong bg-surface p-2.5">
                {c.opciones.length === 0 && (
                  <span className="text-2xs text-ink-faint">No hay opciones cargadas todavía.</span>
                )}
                {c.opciones.map((o) => {
                  const marcadas = (valores[c.id] ?? '').split(',').filter(Boolean)
                  const puesta = marcadas.includes(o.valor)
                  return (
                    <label key={o.valor} className="flex cursor-pointer items-center gap-2 text-base">
                      <input
                        type="checkbox" checked={puesta}
                        onChange={() =>
                          set(
                            c.id,
                            (puesta ? marcadas.filter((m) => m !== o.valor) : [...marcadas, o.valor])
                              .join(','),
                          )
                        }
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      {o.etiqueta}
                    </label>
                  )
                })}
              </div>
            ) : c.tipo === 'select' ? (
              <select
                id={`f-${c.id}`} className={`${clases} cursor-pointer`}
                value={valores[c.id]} onChange={(e) => set(c.id, e.target.value)}
              >
                {c.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </select>
            ) : (
              <input
                id={`f-${c.id}`} className={clases}
                type={c.tipo === 'texto' ? 'text' : c.tipo}
                placeholder={'placeholder' in c ? c.placeholder : undefined}
                step={c.tipo === 'numero' ? c.paso : undefined}
                min={c.tipo === 'numero' ? c.min : undefined}
                value={valores[c.id]} onChange={(e) => set(c.id, e.target.value)}
              />
            )}

            {c.ayuda && <p className="text-2xs text-ink-faint">{c.ayuda}</p>}
          </div>
        ))}

        {error && (
          <p role="alert" className="rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
            {error}
          </p>
        )}
        {/* Enter envía: sin esto el formulario obliga a soltar el teclado. */}
        <button type="submit" className="sr-only">Guardar</button>
      </form>
    </Modal>
  )
}
