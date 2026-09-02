import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { aplanar, rutaDe, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/**
 * La modalidad es la bisagra entre la asistencia y la contabilidad. Lleva dos
 * datos y ninguno es decorativo:
 *
 *   · el **factor**, cuánto suma esa jornada al día del trabajador. Una falta
 *     va en 0: queda registrada —hay que saber que faltó— pero no cuenta como
 *     día trabajado en la liquidación.
 *   · la **cuenta**, a qué nodo del master imputa. Sin ella el registro existe
 *     pero no llega a la contabilidad.
 */
export default function Modalidades() {
  const { maestros } = useMaestros()
  const cuentas = aplanar(maestros.cuentas)

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'numero', id: 'factor', etiqueta: 'Factor de día', valor: n?.factor ?? 1,
      paso: '0.5', min: '0',
      ayuda: 'Cuánto suma al día del trabajador: 1 día completo, 0.5 media jornada, 0 no cuenta (faltas y licencias).',
    },
    {
      tipo: 'select', id: 'cuentaId', etiqueta: 'Imputa a la cuenta', valor: n?.cuentaId ?? '',
      opciones: [
        { valor: '', etiqueta: cuentas.length ? 'Sin imputar' : 'Cargue el master de cuentas' },
        ...cuentas.map(({ nodo, nivel }) => ({
          valor: nodo.id,
          etiqueta: `${'— '.repeat(nivel)}${nodo.codigo ? `${nodo.codigo} ` : ''}${nodo.nombre}`,
        })),
      ],
    },
  ]

  return (
    <Pagina
      titulo="Modalidades"
      descripcion="Los tipos de jornada que se registran en asistencia, con subcategorías propias. Cada una declara cuánto suma al día del trabajador y a qué cuenta imputa. Las que suman cero —faltas, licencias, permisos sin goce— son las que se ofrecen al justificar una ausencia."
    >
      <EditorArbol
        catalogo="modalidades"
        singular="modalidad"
        femenino
        mostrarCodigo
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'DÍA E IMPUTACIÓN',
          render: (n) => {
            const factor = n.factor ?? 0
            const cuenta = rutaDe(maestros.cuentas, n.cuentaId)
            return (
              <div className="flex flex-col items-start gap-0.5">
                {factor > 0 ? (
                  <span className="num text-sm font-medium">
                    Suma {factor} {factor === 1 ? 'día' : 'días'}
                  </span>
                ) : (
                  <Chip tone="warning">No suma día</Chip>
                )}
                {cuenta ? (
                  <span className="text-2xs text-ink-faint">{cuenta}</span>
                ) : (
                  <Chip tone="warning">Sin imputar</Chip>
                )}
                {/* Sin marcas nuevas: que sume cero ya significa que es una
                    ausencia, y es lo que la usa el asistente de asistencia. */}
                {factor === 0 && <Chip tone="neutral">Sirve para justificar</Chip>}
              </div>
            )
          },
        }}
      />

      {cuentas.length === 0 && (
        <div className="mt-4 rounded-md border border-line bg-warning-tint px-3.5 py-3">
          <p className="text-base text-warning-text">
            Todavía no hay cuentas que enlazar. Carga primero el <strong>Master de cuentas</strong>{' '}
            y vuelve a editar cada modalidad para imputarla.
          </p>
        </div>
      )}
    </Pagina>
  )
}
