import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { CLP } from '@/lib/formato'
import type { Nodo } from '@/lib/maestros'

/**
 * Las labores del campo, con sublabores propias: una poda no es lo mismo que
 * una chapoda, y cada una puede pagar distinto. Por eso el bono vive en el nodo
 * y no en la labor padre — la sublabor puede tener el suyo.
 */
export default function Labores() {
  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'numero', id: 'bono', etiqueta: 'Bono', valor: n?.bono ?? 0,
      paso: '100', min: '0',
      ayuda: 'Incentivo que se paga por esta labor. Cada sublabor puede llevar el suyo.',
    },
  ]

  return (
    <Pagina
      titulo="Labores"
      descripcion="Lo que se hace en el campo, con sus sublabores. Cada labor —y cada sublabor— puede llevar su propio bono, y se elige al registrar la asistencia."
    >
      <EditorArbol
        catalogo="labores"
        singular="labor"
        femenino
        mostrarCodigo
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'BONO',
          render: (n) => {
            const bono = n.bono ?? 0
            return bono > 0 ? (
              <span className="num text-sm font-medium">{CLP.format(bono)}</span>
            ) : (
              <Chip tone="neutral">Sin bono</Chip>
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
