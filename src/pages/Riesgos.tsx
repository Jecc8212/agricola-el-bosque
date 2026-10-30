import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

/**
 * A qué expone cada trabajo.
 *
 * Es el maestro de prevención, y vive aparte de las labores a propósito: el
 * mismo riesgo —caída al mismo nivel, exposición a ruido— aparece en labores
 * muy distintas, y describirlo una vez permite después preguntar «¿cuántas de
 * nuestras labores exponen a químicos?» sin recorrerlas a mano.
 *
 * Admite dos niveles: la familia del riesgo y el riesgo concreto.
 */
export default function Riesgos() {
  return (
    <Pagina
      titulo="Riesgos y prevención"
      descripcion="A qué expone cada trabajo. Las labores apuntan a estos riesgos, y de ahí sale qué equipo exigir y qué charla corresponde. La empresa lo ajusta a su matriz real; lo cargado es un punto de partida."
    >
      <EditorArbol
        catalogo="riesgos"
        singular="riesgo"
        mostrarCodigo
        codigoAutomatico
        vacio={{
          titulo: 'Todavía no hay riesgos cargados',
          texto: 'Agrupa por familia —mecánicos, químicos, físicos— y dentro los riesgos concretos.',
        }}
      />
    </Pagina>
  )
}
