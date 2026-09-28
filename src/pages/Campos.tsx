import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

export default function Campos() {
  return (
    <Pagina
      titulo="Campos"
      descripcion="Los campos de la empresa, editables y ampliables. La ficha de cada trabajador apunta a uno de estos por id, así que renombrar un campo no rompe ninguna ficha."
    >
      <EditorArbol catalogo="campos" singular="campo" mostrarCodigo codigoAutomatico />
    </Pagina>
  )
}
