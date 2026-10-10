import { useState } from 'react'
import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { PanelVigencias } from '@/components/PanelVigencias'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { rutaDe, useMaestros, vigenciaEn } from '@/lib/maestros'
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
 * La modalidad dice **qué parte del día se paga** y **cómo se imputa**.
 *
 * El valor es un factor sobre la remuneración diaria: un día completo vale 1,
 * tres cuartos 0,75, media jornada 0,5 y una falta 0.
 *
 * La imputación —cuenta, y opcionalmente labor y centro de costo— no vive en
 * esta ficha sino en tramos con fecha, que se gestionan aparte. Cambiarla no
 * reescribe lo ya registrado: abre un tramo nuevo desde el día que se diga.
 */
export default function Modalidades() {
  const { maestros } = useMaestros()
  const [configurando, setConfigurando] = useState<Nodo | null>(null)
  const hoy = new Date().toISOString().slice(0, 10)

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
      ayuda: 'La cuenta, la labor y el centro de costo se configuran aparte, con fecha de vigencia.',
    },
  ]

  return (
    <Pagina
      titulo="Modalidades"
      descripcion="Qué parte del día se paga en cada tipo de jornada y cómo se imputa. El valor es un factor sobre la remuneración diaria: 1 es un día completo, 0,75 tres cuartos, 0,5 media jornada y 0 no se paga. Las de valor 0 son las que se ofrecen al justificar una ausencia. La imputación va por tramos de fecha, así que cambiarla hoy no altera lo registrado antes."
    >
      <EditorArbol
        catalogo="modalidades"
        singular="modalidad"
        femenino
        mostrarCodigo
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'VALOR E IMPUTACIÓN',
          render: (n) => {
            const factor = n.factor ?? 0
            const tramo = vigenciaEn(n, hoy)
            return (
              <div className="flex flex-col items-start gap-1">
                <span className="flex items-baseline gap-2">
                  <span className="num text-lg font-semibold tracking-tight">
                    {factor.toLocaleString('es-CL', { minimumFractionDigits: factor % 1 ? 2 : 0 })}
                  </span>
                  <span className="text-2xs text-ink-faint">
                    {ETIQUETA_VALOR[String(factor)] ?? 'valor propio'}
                  </span>
                  {n.porTrato && <Chip tone="primary">A trato</Chip>}
                </span>

                {tramo ? (
                  <div className="flex flex-col gap-0.5 text-2xs text-ink-faint">
                    <span>{rutaDe(maestros.cuentas, tramo.cuentaId) || 'cuenta eliminada'}</span>
                    {tramo.laborId && (
                      <span>Labor automática: {rutaDe(maestros.labores, tramo.laborId)}</span>
                    )}
                    {tramo.centroCostoId && (
                      <span>Centro: {rutaDe(maestros.centrosCosto, tramo.centroCostoId)}</span>
                    )}
                  </div>
                ) : (
                  <Chip tone="warning">Sin imputar</Chip>
                )}

                <Button size="sm" variant="ghost" onClick={() => setConfigurando(n)}>
                  {tramo ? 'Ver y cambiar parametrización' : 'Parametrizar'}
                  {(n.vigencias?.length ?? 0) > 1 && ` · ${n.vigencias!.length} tramos`}
                </Button>
              </div>
            )
          },
        }}
      />

      {configurando && (
        <PanelVigencias modalidad={configurando} onCerrar={() => setConfigurando(null)} />
      )}
    </Pagina>
  )
}
