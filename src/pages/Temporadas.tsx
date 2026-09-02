import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

export default function Temporadas() {
  return (
    <Pagina
      titulo="Temporadas agrícolas"
      descripcion="La temporada no calza con el año calendario, y cada empresa la escribe a su manera. Por eso es un maestro editable y no una lista fija en el código."
    >
      <EditorArbol catalogo="temporadas" singular="temporada" femenino />
    </Pagina>
  )
}
