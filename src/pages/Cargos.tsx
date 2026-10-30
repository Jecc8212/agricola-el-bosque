import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'
import { CLASE_LABEL } from '@/lib/types'

const TIPOS = [
  { valor: 'AGRICOLA', etiqueta: 'Agrícola — trabaja en el campo' },
  { valor: 'ADMINISTRATIVO', etiqueta: 'Administrativo — apoyo y supervisión' },
]

/**
 * Qué hace cada persona.
 *
 * Hasta ahora los cargos vivían escritos en el código, sin pantalla: no había
 * forma de agregar uno ni de corregir un nombre sin volver a publicar el
 * sistema. Y arrastraban una cuenta contable que no imputaba nada, heredada de
 * cuando no existía el plan de cuentas editable.
 *
 * Esa cuenta ya no está. **La imputación sale de la modalidad de cada día**, y
 * tener dos sitios que dicen a qué cuenta va el gasto es pedir una
 * contradicción. Lo que el cargo sí define es el equipo de protección que la
 * función exige, se haga la labor que se haga.
 */
export default function Cargos() {
  const { maestros } = useMaestros()
  const epp = aplanar(maestros.epp)

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'select', id: 'tipo', etiqueta: 'Tipo de cargo',
      valor: n?.tipo ?? 'AGRICOLA', opciones: TIPOS,
      ayuda: 'Sirve para agrupar en los informes. No decide cómo se le paga: eso lo define la ficha de cada persona.',
    },
    {
      tipo: 'casillas', id: 'eppIds', etiqueta: 'EPP que exige el cargo',
      valor: (n?.eppIds ?? []).join(','),
      opciones: epp.map(({ nodo }) => ({
        valor: nodo.id,
        etiqueta: `${nodo.codigo ? `${nodo.codigo} ` : ''}${nodo.nombre}`,
      })),
      ayuda: 'El equipo permanente de la función. La labor del día puede exigir más.',
    },
  ]

  return (
    <Pagina
      titulo="Cargos"
      descripcion="Qué función cumple cada persona y qué equipo de protección exige por desempeñarla. El cargo no define la cuenta contable: esa la define la modalidad de cada día."
    >
      <EditorArbol
        catalogo="cargos"
        singular="cargo"
        mostrarCodigo
        codigoAutomatico
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'TIPO Y EPP EXIGIDO',
          render: (n) => {
            const exigidos = (n.eppIds ?? [])
              .map((id) => buscarNodo(maestros.epp, id)?.nombre)
              .filter(Boolean)
            return (
              <div className="flex flex-col items-start gap-1">
                <Chip tone={n.tipo === 'ADMINISTRATIVO' ? 'neutral' : 'primary'}>
                  {n.tipo === 'ADMINISTRATIVO' ? 'Administrativo' : 'Agrícola'}
                </Chip>
                {exigidos.length > 0 ? (
                  <span className="text-2xs text-ink-faint">{exigidos.join(' · ')}</span>
                ) : (
                  <span className="text-2xs text-ink-disabled">Sin EPP exigido</span>
                )}
              </div>
            )
          },
        }}
      />

      <p className="mt-4 max-w-[70ch] text-2xs text-ink-faint">
        Agrícola o administrativo agrupa para los informes. Cómo se le paga a cada persona
        —{CLASE_LABEL.AGRICOLA.toLowerCase()} o {CLASE_LABEL.PLANTA.toLowerCase()}— se define en su
        ficha, no aquí: un administrativo puede estar contratado como trabajador de planta o no.
      </p>
    </Pagina>
  )
}
