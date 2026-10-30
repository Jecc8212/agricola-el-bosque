import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

/**
 * Los elementos de protección personal que la empresa entrega.
 *
 * Es una lista plana a propósito: un casco es un casco. Lo que da sentido a
 * este maestro es que los cargos y las labores apunten a él para decir qué
 * exigen, y que al pasar lista se pueda verificar contra esa exigencia en vez
 * de contra la memoria de quien mira.
 */
export default function Epp() {
  return (
    <Pagina
      titulo="Elementos de protección"
      descripcion="Lo que la empresa entrega y exige. Cada cargo declara el equipo que su función requiere de forma permanente, y cada labor el que exige el trabajo del día. Al pasar lista se verifica contra esa lista."
    >
      <EditorArbol
        catalogo="epp"
        singular="elemento"
        mostrarCodigo
        codigoAutomatico
        vacio={{
          titulo: 'Todavía no hay elementos cargados',
          texto: 'Carga el equipo que la empresa entrega. Después podrás exigirlo desde los cargos y las labores.',
        }}
      />
    </Pagina>
  )
}
