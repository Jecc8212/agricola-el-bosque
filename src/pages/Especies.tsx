import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

/**
 * Especies y variedades: dos niveles, especie arriba y variedad debajo.
 *
 * Sale del maestro agrícola de las fichas, donde el centro de costo se define
 * como campo–especie–variedad–etapa. Sin esto, «Duraznos Poblet Buin» y
 * «Nogales Chandler Chumaco» serían el mismo saco.
 */
export default function Especies() {
  return (
    <Pagina
      titulo="Especies y variedades"
      descripcion="Qué se cultiva y de qué variedad. Es una de las cuatro coordenadas del centro de costo, junto con el campo y la etapa de la planta: sin ella no se puede comparar el rendimiento de un duraznero contra el de un nogal."
    >
      <EditorArbol
        catalogo="especies"
        singular="especie"
        femenino
        mostrarCodigo
        codigoAutomatico
        vacio={{
          titulo: 'Sin especies',
          texto: 'Agrega la primera con el botón de arriba. Cada especie admite sus variedades como subcategorías.',
        }}
      />
    </Pagina>
  )
}
