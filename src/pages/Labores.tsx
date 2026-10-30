import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { CLP } from '@/lib/formato'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/**
 * Las labores del campo, con sublabores propias: una poda no es lo mismo que
 * una chapoda, y cada una puede pagar distinto. Por eso el bono vive en el nodo
 * y no en la labor padre — la sublabor puede tener el suyo.
 */
export default function Labores() {
  const { maestros } = useMaestros()
  const riesgos = aplanar(maestros.riesgos)
  const epp = aplanar(maestros.epp)

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'numero', id: 'bono', etiqueta: 'Bono', valor: n?.bono ?? 0,
      paso: '100', min: '0',
      ayuda: 'Incentivo que se paga por esta labor. Cada sublabor puede llevar el suyo.',
    },
    {
      tipo: 'numero', id: 'precio', etiqueta: 'Precio por unidad (a trato)', valor: n?.precio ?? 0,
      paso: '10', min: '0',
      ayuda: 'Lo que se paga por cada unidad cuando la jornada se paga a trato.',
    },
    {
      tipo: 'texto', id: 'unidad', etiqueta: 'Unidad del trato', valor: n?.unidad ?? '',
      placeholder: 'bin, kilo, planta, hilera…',
    },
    {
      tipo: 'casillas', id: 'riesgoIds', etiqueta: 'A qué riesgos expone',
      valor: (n?.riesgoIds ?? []).join(','),
      opciones: riesgos.map(({ nodo, nivel }) => ({
        valor: nodo.id,
        etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
      })),
      ayuda: 'De aquí sale qué charla corresponde y por qué se exige cierto equipo.',
    },
    {
      tipo: 'casillas', id: 'eppIds', etiqueta: 'EPP que exige la labor',
      valor: (n?.eppIds ?? []).join(','),
      opciones: epp.map(({ nodo }) => ({
        valor: nodo.id,
        etiqueta: `${nodo.codigo ? `${nodo.codigo} ` : ''}${nodo.nombre}`,
      })),
      ayuda: 'Se suma al que ya exige el cargo. Aplicar químicos pide respirador lo haga quien lo haga.',
    },
  ]

  return (
    <Pagina
      titulo="Labores"
      descripcion="Lo que se hace en el campo, con sus sublabores. Cada labor —y cada sublabor— lleva su bono y, si se paga a trato, su precio por unidad. Se eligen al registrar la asistencia."
    >
      <EditorArbol
        catalogo="labores"
        singular="labor"
        femenino
        mostrarCodigo
        codigoAutomatico
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'BONO, TRATO Y PREVENCIÓN',
          render: (n) => {
            const bono = n.bono ?? 0
            const precio = n.precio ?? 0
            return (
              <div className="flex flex-col items-start gap-0.5">
                {bono > 0 ? (
                  <span className="num text-sm font-medium">{CLP.format(bono)} de bono</span>
                ) : (
                  <Chip tone="neutral">Sin bono</Chip>
                )}
                {precio > 0 ? (
                  <span className="num text-2xs text-primary-text">
                    {CLP.format(precio)} por {n.unidad || 'unidad'}
                  </span>
                ) : (
                  <span className="text-2xs text-ink-disabled">sin precio a trato</span>
                )}
                {(() => {
                  const expone = (n.riesgoIds ?? [])
                    .map((id) => buscarNodo(maestros.riesgos, id)?.nombre)
                    .filter(Boolean)
                  const exige = (n.eppIds ?? [])
                    .map((id) => buscarNodo(maestros.epp, id)?.nombre)
                    .filter(Boolean)
                  if (expone.length === 0 && exige.length === 0) return null
                  return (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {expone.length > 0 && (
                        <span className="text-2xs text-warning-text">Riesgos: {expone.join(' · ')}</span>
                      )}
                      {exige.length > 0 && (
                        <span className="text-2xs text-ink-faint">Exige: {exige.join(' · ')}</span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          },
        }}
        vacio={{
          titulo: 'Sin labores',
          texto: 'Agrega la primera con el botón de arriba. Cada labor admite sublabores hasta tres niveles, y cada una puede llevar su propio bono.',
        }}
      />
    </Pagina>
  )
}
