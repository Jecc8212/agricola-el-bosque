import { EditorArbol } from '@/components/EditorArbol'
import { Pagina } from '@/components/Pagina'
import { Chip } from '@/components/ui/Chip'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { ETAPA_LABEL, aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import type { EtapaPlanta, Nodo } from '@/lib/maestros'

/**
 * El centro de costo es el eje del sistema, y las fichas lo definen con cuatro
 * coordenadas: **campo, especie, variedad y etapa de la planta**. Se le suman la
 * temporada —para poder comparar un año contra otro— y la superficie, que es el
 * divisor de casi todos los indicadores.
 *
 * La etapa no es una etiqueta: en formación la planta es inversión y su gasto se
 * capitaliza; adulta ya produce y su gasto es operacional. De ahí sale a qué
 * lado de la contabilidad va cada peso.
 */
export default function CentrosCosto() {
  const { maestros } = useMaestros()

  const opcionesDe = (lista: Nodo[], vacio: string) => [
    { valor: '', etiqueta: lista.length ? 'Sin asignar' : vacio },
    ...aplanar(lista).map(({ nodo, nivel }) => ({
      valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
    })),
  ]

  const camposExtra = (n?: Nodo): CampoForm[] => [
    { tipo: 'select', id: 'campoId', etiqueta: 'Campo', valor: n?.campoId ?? '',
      opciones: opcionesDe(maestros.campos, 'Cargue campos primero') },
    { tipo: 'select', id: 'especieId', etiqueta: 'Especie', valor: n?.especieId ?? '',
      opciones: opcionesDe(maestros.especies.map((e) => ({ ...e, hijos: [] })), 'Cargue especies primero') },
    { tipo: 'select', id: 'variedadId', etiqueta: 'Variedad', valor: n?.variedadId ?? '',
      opciones: [
        { valor: '', etiqueta: 'Sin variedad' },
        ...maestros.especies.flatMap((e) =>
          e.hijos.map((v) => ({ valor: v.id, etiqueta: `${e.nombre} · ${v.nombre}` })),
        ),
      ] },
    { tipo: 'select', id: 'etapa', etiqueta: 'Etapa de la planta', valor: n?.etapa ?? '',
      opciones: [
        { valor: '', etiqueta: 'Sin definir' },
        ...(['FORMACION', 'ADULTA'] as EtapaPlanta[]).map((e) => ({ valor: e, etiqueta: ETAPA_LABEL[e] })),
      ] },
    { tipo: 'select', id: 'temporadaId', etiqueta: 'Temporada agrícola', valor: n?.temporadaId ?? '',
      opciones: opcionesDe(maestros.temporadas, 'Cargue temporadas primero') },
    { tipo: 'numero', id: 'hectareas', etiqueta: 'Hectáreas productivas', valor: n?.hectareas ?? 0,
      paso: '0.01', min: '0',
      ayuda: 'El divisor de todos los indicadores por hectárea. Sin esto no hay KPI.' },
    { tipo: 'numero', id: 'plantas', etiqueta: 'Plantas', valor: n?.plantas ?? 0,
      paso: '1', min: '0', ayuda: 'Para la densidad de plantación (plantas ÷ hectárea).' },
  ]

  return (
    <Pagina
      titulo="Centros de costo"
      descripcion="El eje de todo: cada trabajador, cada día de asistencia y cada gasto cuelga de un centro de costo. Las fichas lo definen por campo, especie, variedad y etapa de la planta; la superficie es lo que permite comparar unos con otros."
    >
      <EditorArbol
        catalogo="centrosCosto"
        singular="centro de costo"
        mostrarCodigo
        codigoAutomatico
        camposExtra={camposExtra}
        columnaExtra={{
          titulo: 'COORDENADAS Y SUPERFICIE',
          render: (n) => {
            const campo = buscarNodo(maestros.campos, n.campoId)?.nombre
            const especie = buscarNodo(maestros.especies, n.especieId)?.nombre
            const variedad = buscarNodo(maestros.especies, n.variedadId)?.nombre
            const temporada = buscarNodo(maestros.temporadas, n.temporadaId)?.nombre
            return (
              <div className="flex flex-col items-start gap-1">
                <div className="flex flex-wrap items-center gap-1">
                  {campo ? <Chip tone="primary">{campo}</Chip> : <Chip tone="warning">Sin campo</Chip>}
                  {especie && <Chip tone="neutral">{especie}{variedad ? ` · ${variedad}` : ''}</Chip>}
                  {n.etapa && (
                    <Chip tone={n.etapa === 'FORMACION' ? 'warning' : 'success'}>
                      {n.etapa === 'FORMACION' ? 'Formación' : 'Adulta'}
                    </Chip>
                  )}
                  {temporada && <Chip tone="neutral">{temporada}</Chip>}
                </div>
                <span className="num text-2xs text-ink-faint">
                  {n.hectareas
                    ? `${n.hectareas.toLocaleString('es-CL')} ha`
                    : 'sin hectáreas'}
                  {n.plantas ? ` · ${n.plantas.toLocaleString('es-CL')} plantas` : ''}
                </span>
              </div>
            )
          },
        }}
        vacio={{
          titulo: 'Aún no hay centros de costo',
          texto: 'Agrega el primero con el botón de arriba. Cada uno se define por campo, especie, variedad y etapa, y su superficie alimenta todos los indicadores.',
        }}
      />
    </Pagina>
  )
}
