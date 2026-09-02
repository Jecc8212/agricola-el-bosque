import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'

export default function PlanCuentas() {
  return (
    <Pagina
      titulo="Master de cuentas"
      descripcion="La espina dorsal del sistema: hasta nueve niveles con las subcategorías que necesites. Cada modalidad de asistencia imputa a una de estas cuentas, y por ahí la asistencia entra a la contabilidad sin que nadie elija la cuenta a mano."
    >
      <EditorArbol
        catalogo="cuentas"
        singular="cuenta"
        femenino
        mostrarCodigo
        vacio={{
          titulo: 'Sin cuentas',
          texto: 'Crea la primera con el botón de arriba. Cada cuenta admite subcategorías hasta nueve niveles.',
        }}
      />
    </Pagina>
  )
}
