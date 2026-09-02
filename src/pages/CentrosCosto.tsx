import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/**
 * El centro de costo es el eje del sistema: todo lo que cuesta plata termina
 * colgando de uno. Por eso no basta con su nombre — se pide a qué **campo**
 * pertenece y de qué **temporada** es, que son las dos coordenadas con las que
 * después se compara un año contra otro.
 */
export default function CentrosCosto() {
  const { maestros } = useMaestros()

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'select', id: 'campoId', etiqueta: 'Campo al que pertenece',
      valor: n?.campoId ?? '',
      opciones: [
        { valor: '', etiqueta: 'Sin campo' },
        ...aplanar(maestros.campos).map(({ nodo, nivel }) => ({
          valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
        })),
      ],
    },
    {
      tipo: 'select', id: 'temporadaId', etiqueta: 'Temporada agrícola',
      valor: n?.temporadaId ?? '',
      opciones: [
        {
          valor: '',
          etiqueta: maestros.temporadas.length ? 'Sin temporada' : 'Cargue temporadas primero',
        },
        ...aplanar(maestros.temporadas).map(({ nodo, nivel }) => ({
          valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
        })),
      ],
    },
  ]

  return (
    <Pagina
      titulo="Centros de costo"
      descripcion="El eje de todo: cada trabajador, cada día de asistencia y cada gasto cuelga de un centro de costo. Este maestro nace vacío a propósito —los define la empresa, no el sistema— y lo que cargues acá aparece de inmediato en el filtro de la cabecera."
    >
      <EditorArbol
        catalogo="centrosCosto"
        singular="centro de costo"
        mostrarCodigo
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'CAMPO Y TEMPORADA',
          render: (n) => {
            const campo = buscarNodo(maestros.campos, n.campoId)?.nombre
            const temporada = buscarNodo(maestros.temporadas, n.temporadaId)?.nombre
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                {campo ? <Chip tone="primary">{campo}</Chip> : <Chip tone="warning">Sin campo</Chip>}
                {temporada ? (
                  <Chip tone="neutral">{temporada}</Chip>
                ) : (
                  <Chip tone="warning">Sin temporada</Chip>
                )}
              </div>
            )
          },
        }}
        vacio={{
          titulo: 'Aún no hay centros de costo',
          texto: 'Agrega el primero con el botón de arriba. Cada uno se asocia a un campo y a una temporada, admite subcategorías hasta cinco niveles, y aparece en el filtro de la cabecera.',
        }}
      />
    </Pagina>
  )
}
