import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { FormularioModal } from '@/components/ui/FormularioModal'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { ModalConfirmar } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { BarraDatos } from '@/components/BarraDatos'
import { columnas as columnasDe } from '@/lib/planilla'
import type { Fila } from '@/lib/planilla'
import { PROFUNDIDAD, aplanar, useMaestros } from '@/lib/maestros'
import type { Catalogo, Nodo } from '@/lib/maestros'

const ARRIBA = 'm18 15-6-6-6 6'
const ABAJO = 'm6 9 6 6 6-6'
const MAS = 'M12 5v14M5 12h14'
const LAPIZ = 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'
const BASURA = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'

function BotonIcono({
  onClick, etiqueta, d, disabled, tono,
}: {
  onClick: () => void; etiqueta: string; d: string; disabled?: boolean; tono?: 'danger'
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      aria-label={etiqueta} title={etiqueta}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm',
        'transition-colors duration-150 ease-out disabled:cursor-default disabled:opacity-25',
        tono === 'danger'
          ? 'text-ink-faint hover:bg-danger-tint hover:text-danger-text'
          : 'text-ink-faint hover:bg-surface-sunken hover:text-ink',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  )
}

/**
 * Propone el siguiente código de la rama: 01, 02, 03… y dentro de «02», 02.01.
 *
 * Se calcula sobre los hermanos, no sobre el total, para que el código diga
 * dónde está el registro. Es una **propuesta**: el campo queda editable, porque
 * hay catálogos —las cuentas contables, sin ir más lejos— donde el código lo
 * manda el plan y no el orden de creación.
 */
function siguienteCodigo(hermanos: Nodo[], padre: Nodo | null): string {
  const prefijo = padre?.codigo?.trim() ? `${padre.codigo.trim()}.` : ''
  const usados = hermanos
    .map((h) => Number(h.codigo?.trim().split('.').pop()))
    .filter((n) => Number.isFinite(n) && n > 0)
  const siguiente = (usados.length > 0 ? Math.max(...usados) : 0) + 1
  return `${prefijo}${String(siguiente).padStart(2, '0')}`
}

interface Props {
  catalogo: Catalogo
  /** "cuenta", "centro de costo": se usa en los títulos de los diálogos. */
  singular: string
  /** Concordancia: «Nueva cuenta» vs «Nuevo centro de costo». */
  femenino?: boolean
  mostrarCodigo?: boolean
  /** Propone el código al crear. Se sigue pudiendo escribir a mano. */
  codigoAutomatico?: boolean
  /** Campos extra del formulario, más allá de nombre y código. */
  camposExtra?: (n?: Nodo) => CampoForm[]
  /** Cómo se leen esos campos extra en la tabla. */
  columnaExtra?: { titulo: string; render: (n: Nodo) => ReactNode }
  vacio?: { titulo: string; texto: string }
}

/**
 * El editor que hace editable a cualquier maestro: crear, renombrar, anidar
 * subcategorías hasta la profundidad del catálogo, reordenar entre hermanos y
 * eliminar. Todo dentro de la página, sin salir a otra pantalla.
 */
export function EditorArbol({
  catalogo, singular, femenino = false, mostrarCodigo = false, codigoAutomatico = false,
  camposExtra, columnaExtra, vacio,
}: Props) {
  const { maestros, agregar, actualizar, eliminar, mover, importarRamas, numerarCatalogo } = useMaestros()
  const lista = maestros[catalogo]
  const filas = aplanar(lista)
  const maxNivel = PROFUNDIDAD[catalogo]
  const un = femenino ? 'Nueva' : 'Nuevo'
  const sinCodigo = filas.filter(({ nodo }) => !nodo.codigo?.trim()).length
  const del = femenino ? 'de la' : 'del'

  const [creando, setCreando] = useState<{ padre: Nodo | null } | null>(null)
  const [editando, setEditando] = useState<Nodo | null>(null)
  const [borrando, setBorrando] = useState<Nodo | null>(null)
  const [avisoNumerar, setAvisoNumerar] = useState('')

  function camposDe(n?: Nodo, padre?: Nodo | null): CampoForm[] {
    const base: CampoForm[] = [
      { tipo: 'texto', id: 'nombre', etiqueta: 'Nombre', valor: n?.nombre ?? '', requerido: true,
        placeholder: `Nombre ${del} ${singular}` },
    ]
    if (mostrarCodigo) {
      /* Al crear se propone el siguiente de la rama; al editar se respeta el
         que ya tiene, que alguien pudo haber puesto a mano. */
      const propuesto =
        codigoAutomatico && !n
          ? siguienteCodigo(padre ? padre.hijos : lista, padre ?? null)
          : ''
      base.push({
        tipo: 'texto', id: 'codigo', etiqueta: 'Código',
        valor: n?.codigo ?? propuesto,
        placeholder: codigoAutomatico ? 'Se propone solo' : 'Opcional',
        ayuda: codigoAutomatico && !n ? 'Propuesto según la rama. Puedes cambiarlo.' : undefined,
      })
    }
    /* Una subcategoría nace dentro de su padre: hereda sus ataduras en vez de
       obligar a repetirlas, y se pueden cambiar si hace falta. */
    return [...base, ...(camposExtra?.(n ?? padre ?? undefined) ?? [])]
  }

  /** Sólo se tocan las claves que el formulario realmente mostró: así un
   *  catálogo sin código no borra el código de otro que sí lo usa. */
  function cambiosDe(v: Record<string, string>): Partial<Nodo> {
    const cambios: Partial<Nodo> = { nombre: v.nombre.trim() }
    if (mostrarCodigo) cambios.codigo = v.codigo.trim() || undefined
    if ('factor' in v) cambios.factor = Number(v.factor) || 0
    if ('cuentaId' in v) cambios.cuentaId = v.cuentaId || undefined
    if ('bono' in v) cambios.bono = Number(v.bono) || 0
    if ('campoId' in v) cambios.campoId = v.campoId || undefined
    if ('temporadaId' in v) cambios.temporadaId = v.temporadaId || undefined
    if ('especieId' in v) cambios.especieId = v.especieId || undefined
    if ('variedadId' in v) cambios.variedadId = v.variedadId || undefined
    if ('etapa' in v) cambios.etapa = (v.etapa || undefined) as Nodo['etapa']
    if ('hectareas' in v) cambios.hectareas = Number(v.hectareas) || undefined
    if ('plantas' in v) cambios.plantas = Number(v.plantas) || undefined
    if ('precio' in v) cambios.precio = Number(v.precio) || 0
    if ('unidad' in v) cambios.unidad = v.unidad.trim() || undefined
    if ('porTrato' in v) cambios.porTrato = v.porTrato === 'si'
    return cambios
  }

  /**
   * El árbol viaja en columnas de nivel, no anidado: una planilla no sabe
   * anidar. Cada fila trae su rama completa —Nivel 1, Nivel 2, …— y de ahí se
   * reconstruye la jerarquía al importar.
   */
  const filasExcel: Fila[] = filas.map(({ nodo: n, nivel, ruta }) => {
    const fila: Fila = {}
    const rama = [...ruta, n.nombre]
    for (let i = 0; i < maxNivel; i++) fila[`Nivel ${i + 1}`] = rama[i] ?? ''
    if (mostrarCodigo) fila['Código'] = n.codigo ?? ''
    fila.Nivel = nivel + 1
    return fila
  })

  const plantilla: Fila[] = (() => {
    const base: Fila = {}
    for (let i = 0; i < maxNivel; i++) {
      base[`Nivel ${i + 1}`] = i === 0 ? `Ejemplo de ${singular}` : i === 1 ? 'Ejemplo de subcategoría' : ''
    }
    if (mostrarCodigo) base['Código'] = '001'
    return [base]
  })()

  /**
   * Importar no borra: agrega lo que falta. Una rama que ya existe se reutiliza
   * en vez de duplicarse, así que subir dos veces la misma planilla deja el
   * mismo árbol —y una planilla corregida sólo suma lo nuevo.
   */
  function importarArbol(filasCrudas: Record<string, unknown>[]): string {
    if (filasCrudas.length === 0) throw new Error('La planilla está vacía.')
    const columnas = Array.from({ length: maxNivel }, (_, i) => `Nivel ${i + 1}`)
    const primera = columnasDe(filasCrudas[0])
    if (!columnas.some((c) => primera(c) !== undefined))
      throw new Error(`La planilla debe traer columnas «Nivel 1»…«Nivel ${maxNivel}». Baja la plantilla de ejemplo.`)

    const ramas = filasCrudas
      .map((f) => {
        const col = columnasDe(f)
        return {
          camino: columnas.map((c) => String(col(c) ?? '').trim()).filter(Boolean),
          codigo: mostrarCodigo ? String(col('Código') ?? '').trim() || undefined : undefined,
        }
      })
      .filter((r) => r.camino.length > 0)

    const creados = importarRamas(catalogo, ramas)
    if (creados === 0) return 'La planilla no traía nada nuevo: el árbol ya la contenía.'
    return `${creados} ${creados === 1 ? 'registro creado' : 'registros creados'} desde la planilla.`
  }

  return (
    <div>
      <div className="mb-4">
        <BarraDatos
          titulo={singular}
          nombreArchivo={catalogo}
          subtitulo={`${filas.length} registros · hasta ${maxNivel} niveles`}
          filas={filasExcel}
          plantilla={plantilla}
          onImportar={importarArbol}
        />
      </div>

      {/* El botón de crear va arriba: es lo primero que se busca. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xs text-ink-faint">
          {filas.length} {filas.length === 1 ? 'registro' : 'registros'}
          {maxNivel > 1 && ` · hasta ${maxNivel} niveles`} · el orden lo defines tú
        </p>
        {/* Los registros creados antes de que existiera el código quedan sin
            él; esto los numera de una vez en vez de obligar a editarlos uno a
            uno. Sólo rellena huecos: lo escrito a mano se respeta. */}
        {codigoAutomatico && sinCodigo > 0 && (
          <Button
            onClick={() => {
              const n = numerarCatalogo(catalogo)
              setAvisoNumerar(`${n} ${n === 1 ? 'registro numerado' : 'registros numerados'}.`)
            }}
          >
            Numerar los {sinCodigo} sin código
          </Button>
        )}
        <Button variant="primary" onClick={() => setCreando({ padre: null })}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={MAS} /></svg>
          Agregar {singular}
        </Button>
      </div>

      {avisoNumerar && (
        <p role="status" className="mb-3 rounded-sm bg-primary-tint px-2 py-1.5 text-sm text-primary-text">
          {avisoNumerar}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
              {/* Un catálogo plano no tiene jerarquía que mostrar: la columna
                  de nivel sólo repetiría «N1» en todas las filas. */}
              {maxNivel > 1 && <th className="w-14 px-3 py-2 text-left font-medium">NIVEL</th>}
              {mostrarCodigo && <th className="w-28 px-3 py-2 text-left font-medium">CÓDIGO</th>}
              <th className="px-3 py-2 text-left font-medium">NOMBRE</th>
              {columnaExtra && (
                <th className="px-3 py-2 text-left font-medium">{columnaExtra.titulo}</th>
              )}
              <th className="w-44 px-3 py-2 text-right font-medium">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ nodo: n, nivel }, i) => {
              /* Sólo las raíces conocen a sus hermanos por posición; en niveles
                 hondos basta con saber que hay alguien arriba o abajo. */
              const hermanos = nivel === 0 ? lista : null
              const pos = hermanos ? hermanos.findIndex((h) => h.id === n.id) : -1
              return (
                <tr key={n.id} className="border-b border-line last:border-0 transition-colors duration-100 hover:bg-surface-sunken/50">
                  {maxNivel > 1 && (
                    <td className="mono whitespace-nowrap px-3 py-1.5 text-2xs text-ink-disabled">
                      N{nivel + 1}
                    </td>
                  )}
                  {mostrarCodigo && (
                    <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">
                      {n.codigo || <span className="text-ink-disabled">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-1.5">
                    {/* La categoría manda: grande y centrada en la columna. La
                        subcategoría cuelga a la izquierda, sangrada y más chica,
                        para que la jerarquía se lea de un vistazo sin contar
                        guiones. */}
                    <div
                      className={cn('flex items-center', nivel === 0 && 'justify-center')}
                      style={nivel > 0 ? { paddingLeft: `${nivel * 26}px` } : undefined}
                    >
                      {nivel > 0 && <span aria-hidden="true" className="mr-2 text-ink-disabled">└</span>}
                      <span className={cn(
                        nivel === 0 && 'text-lg font-semibold tracking-tight',
                        nivel === 1 && 'text-base font-medium text-ink-muted',
                        nivel >= 2 && 'text-sm text-ink-faint',
                      )}>
                        {n.nombre}
                      </span>
                    </div>
                  </td>
                  {columnaExtra && <td className="px-3 py-1.5">{columnaExtra.render(n)}</td>}
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <BotonIcono d={ARRIBA} etiqueta={`Subir ${n.nombre}`}
                        onClick={() => mover(catalogo, n.id, -1)}
                        disabled={hermanos ? pos === 0 : i === 0} />
                      <BotonIcono d={ABAJO} etiqueta={`Bajar ${n.nombre}`}
                        onClick={() => mover(catalogo, n.id, 1)}
                        disabled={hermanos ? pos === hermanos.length - 1 : false} />
                      {maxNivel > 1 && (
                        <BotonIcono d={MAS}
                          etiqueta={nivel + 1 >= maxNivel ? `Máximo ${maxNivel} niveles` : `Agregar subcategoría en ${n.nombre}`}
                          onClick={() => setCreando({ padre: n })} disabled={nivel + 1 >= maxNivel} />
                      )}
                      <BotonIcono d={LAPIZ} etiqueta={`Editar ${n.nombre}`} onClick={() => setEditando(n)} />
                      <BotonIcono d={BASURA} etiqueta={`Eliminar ${n.nombre}`} tono="danger"
                        onClick={() => setBorrando(n)} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filas.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-base font-medium">{vacio?.titulo ?? 'Todavía no hay nada aquí'}</p>
            <p className="mx-auto mt-1 max-w-[52ch] text-sm text-ink-faint">
              {vacio?.texto ?? `Crea ${femenino ? 'la primera' : 'el primer'} ${singular} con el botón de arriba.`}
            </p>
          </div>
        )}
      </div>

        {creando && (
          <FormularioModal
            key="crear"
            titulo={creando.padre ? `Nueva subcategoría de «${creando.padre.nombre}»` : `${un} ${singular}`}
            campos={camposDe(undefined, creando.padre)}
            confirmar="Crear"
            tituloConfirmacion={creando.padre ? '¿Crear la subcategoría?' : `¿Crear ${femenino ? 'la' : 'el'} ${singular}?`}
            mensajeConfirmacion={
              creando.padre
                ? `Se agregará una subcategoría dentro de «${creando.padre.nombre}».`
                : `Se agregará ${femenino ? 'una nueva' : 'un nuevo'} ${singular} en el primer nivel.`
            }
            onCerrar={() => setCreando(null)}
            onGuardar={(v) => {
              agregar(catalogo, creando.padre?.id ?? null, v.nombre.trim(), cambiosDe(v))
              setCreando(null)
            }}
          />
        )}
        {editando && (
          <FormularioModal
            key="editar"
            titulo={`Editar «${editando.nombre}»`}
            campos={camposDe(editando)}
            tituloConfirmacion="¿Guardar los cambios?"
            mensajeConfirmacion={`Se guardarán los cambios de «${editando.nombre}».`}
            onCerrar={() => setEditando(null)}
            onGuardar={(v) => {
              actualizar(catalogo, editando.id, cambiosDe(v))
              setEditando(null)
            }}
          />
        )}
        {borrando && (
          <ModalConfirmar
            key="borrar"
            titulo={`Eliminar «${borrando.nombre}»`}
            descripcion={(() => {
              const n = aplanar(borrando.hijos).length
              if (n === 0) return 'Esta acción no se puede deshacer.'
              return `Se eliminará también ${n === 1 ? 'su subcategoría' : `sus ${n} subcategorías`}.`
            })()}
            onCerrar={() => setBorrando(null)}
            onConfirmar={() => {
              eliminar(catalogo, borrando.id)
              setBorrando(null)
            }}
          />
        )}
    </div>
  )
}
