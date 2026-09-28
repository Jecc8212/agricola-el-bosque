import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { aplanar, rutaDe, useMaestros } from '@/lib/maestros'
import type { Nodo } from '@/lib/maestros'

/** Las únicas fracciones con las que se liquida una jornada. */
const VALORES = [
  { valor: '1', etiqueta: '1 · día completo' },
  { valor: '0.75', etiqueta: '0,75 · tres cuartos de día' },
  { valor: '0.5', etiqueta: '0,5 · medio día' },
  { valor: '0', etiqueta: '0 · no se paga' },
]

const ETIQUETA_VALOR: Record<string, string> = {
  '1': 'Día completo',
  '0.75': 'Tres cuartos',
  '0.5': 'Medio día',
  '0': 'No se paga',
}

/**
 * La modalidad dice **qué parte del día se paga**.
 *
 * Su valor es un factor sobre la remuneración diaria, no un número libre: un
 * día completo vale 1, tres cuartos 0,75, media jornada 0,5, y una falta 0. De
 * ahí sale directo lo que se le liquida a cada persona.
 */
export default function Modalidades() {
  const { maestros } = useMaestros()
  const cuentas = aplanar(maestros.cuentas)

  const camposExtra = (n?: Nodo): CampoForm[] => [
    {
      tipo: 'select', id: 'factor', etiqueta: 'Valor de la jornada',
      valor: String(n?.factor ?? 1),
      opciones: VALORES,
    },
    {
      tipo: 'select', id: 'porTrato', etiqueta: '¿Se paga a trato?',
      valor: n?.porTrato ? 'si' : 'no',
      opciones: [
        { valor: 'no', etiqueta: 'No — se paga por día' },
        { valor: 'si', etiqueta: 'Sí — se paga por producción' },
      ],
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
      descripcion="Qué parte del día se paga en cada tipo de jornada. El valor es un factor sobre la remuneración diaria: 1 es un día completo, 0,75 tres cuartos, 0,5 media jornada y 0 no se paga. Las de valor 0 son las que se ofrecen al justificar una ausencia."
    >
      <EditorArbol
        catalogo="modalidades"
        singular="modalidad"
        femenino
        mostrarCodigo
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'VALOR',
          render: (n) => {
            const factor = n.factor ?? 0
            const cuenta = rutaDe(maestros.cuentas, n.cuentaId)
            return (
              <div className="flex flex-col items-start gap-0.5">
                <span className="flex items-baseline gap-2">
                  <span className="num text-lg font-semibold tracking-tight">
                    {factor.toLocaleString('es-CL', { minimumFractionDigits: factor % 1 ? 2 : 0 })}
                  </span>
                  <span className="text-2xs text-ink-faint">
                    {ETIQUETA_VALOR[String(factor)] ?? 'valor propio'}
                  </span>
                </span>
                {n.porTrato && <Chip tone="primary">A trato · por producción</Chip>}
                {cuenta ? (
                  <span className="text-2xs text-ink-faint">{cuenta}</span>
                ) : (
                  <Chip tone="warning">Sin imputar</Chip>
                )}
              </div>
            )
          },
        }}
      />
    </Pagina>
  )
}
