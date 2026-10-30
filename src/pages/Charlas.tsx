import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/**
 * Las charlas de seguridad que se dan antes de empezar.
 *
 * Hay de dos clases y la diferencia importa: las **obligatorias** se exigen
 * todos los días pase lo que pase, y las **de labor** aparecen sólo cuando ese
 * día alguien hace el trabajo que las activa. Una charla de motosierra en un
 * día de cosecha a mano no es rigor, es ruido — y el ruido es lo que hace que
 * la gente deje de leer las charlas.
 */
export default function Charlas() {
  const { maestros } = useMaestros()
  const labores = aplanar(maestros.labores)

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'select', id: 'obligatoria', etiqueta: '¿Se exige todos los días?',
      valor: n?.obligatoria ? 'si' : 'no',
      opciones: [
        { valor: 'no', etiqueta: 'No — sólo cuando la activa una labor' },
        { valor: 'si', etiqueta: 'Sí — obligatoria, todos los días' },
      ],
    },
    {
      tipo: 'casillas', id: 'laborIds', etiqueta: 'Labores que la activan',
      valor: (n?.laborIds ?? []).join(','),
      opciones: labores.map(({ nodo, nivel }) => ({
        valor: nodo.id,
        etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
      })),
      ayuda: 'Si la charla es obligatoria, se da igual aunque no marques ninguna.',
    },
    {
      tipo: 'texto', id: 'guion', etiqueta: 'Guion para quien la da',
      valor: n?.guion ?? '',
      placeholder: 'Los puntos que hay que decir',
      ayuda: 'Sin esto, lo que se dice queda en lo que alguien recuerde esa mañana.',
    },
  ]

  return (
    <Pagina
      titulo="Charlas de seguridad"
      descripcion="Lo que se habla antes de empezar la jornada. Unas son obligatorias todos los días; otras aparecen solas cuando ese día se asigna la labor que las activa."
    >
      <EditorArbol
        catalogo="charlas"
        singular="charla"
        femenino
        mostrarCodigo
        codigoAutomatico
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'CUÁNDO SE DA',
          render: (n) => {
            const activan = (n.laborIds ?? [])
              .map((id) => buscarNodo(maestros.labores, id)?.nombre)
              .filter(Boolean)
            return (
              <div className="flex flex-col items-start gap-1">
                {n.obligatoria ? (
                  <Chip tone="primary">Todos los días</Chip>
                ) : activan.length > 0 ? (
                  <Chip tone="neutral">Según la labor</Chip>
                ) : (
                  <Chip tone="warning">Nunca aparecerá</Chip>
                )}
                {activan.length > 0 && (
                  <span className="text-2xs text-ink-faint">{activan.join(' · ')}</span>
                )}
                {n.guion && (
                  <span className="max-w-[46ch] truncate text-2xs text-ink-disabled">{n.guion}</span>
                )}
              </div>
            )
          },
        }}
      />
    </Pagina>
  )
}
