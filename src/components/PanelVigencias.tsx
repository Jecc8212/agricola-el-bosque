import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/lib/auth'
import { fecha as formatearFecha } from '@/lib/formato'
import { aplanar, rutaDe, useMaestros } from '@/lib/maestros'
import type { Nodo, ParamModalidad } from '@/lib/maestros'

const HOY = () => new Date().toISOString().slice(0, 10)

type Estado = 'vigente' | 'programado' | 'cerrado'

/** Un tramo con fecha futura todavía no rige, por mucho que sea el último. */
function estadoDe(t: ParamModalidad): Estado {
  const hoy = HOY()
  if (t.desde > hoy) return 'programado'
  return !t.hasta || hoy <= t.hasta ? 'vigente' : 'cerrado'
}

/** Etiqueta jerárquica para los selectores de árbol: «— — 5.1.01 Jornales». */
const etiqueta = (nodo: Nodo, nivel: number) =>
  `${'— '.repeat(nivel)}${nodo.codigo ? `${nodo.codigo} ` : ''}${nodo.nombre}`

/**
 * La parametrización de una modalidad a lo largo del tiempo.
 *
 * No se edita un tramo: se **agrega** uno nuevo desde una fecha, y el anterior
 * se cierra solo el día antes. Por eso aquí no hay botón de editar. Esa
 * ausencia es la garantía de que una tarja de 2026 siga imputada donde se
 * imputó aunque el plan de cuentas cambie en 2027.
 *
 * Todo ocurre dentro de un mismo diálogo que cambia de vista. Apilar modales
 * en este sistema dejaba cuadros fantasma y clics perdidos.
 */
export function PanelVigencias({ modalidad, onCerrar }: { modalidad: Nodo; onCerrar: () => void }) {
  const { maestros, agregarVigencia, eliminarVigencia } = useMaestros()
  const { sesion } = useAuth()

  const [vista, setVista] = useState<'lista' | 'nueva' | 'borrar'>('lista')
  const [error, setError] = useState('')
  const [desde, setDesde] = useState(HOY)
  const [cuentaId, setCuentaId] = useState('')
  const [laborId, setLaborId] = useState('')
  const [centroCostoId, setCentroCostoId] = useState('')

  /* Se relee del maestro en vez de usar la prop: tras agregar un tramo, la
     prop viene del render anterior y la lista se vería desactualizada. */
  const actual = maestros.modalidades.find((m) => m.id === modalidad.id) ?? modalidad
  const tramos = [...(actual.vigencias ?? [])].sort((a, b) => b.desde.localeCompare(a.desde))
  const ultimo = tramos[0]
  /* El que rige hoy, que es el que alguien espera ver al abrir el formulario,
     aunque exista otro programado para más adelante. */
  const enVigor = tramos.find((t) => estadoDe(t) === 'vigente') ?? ultimo

  const cuentas = aplanar(maestros.cuentas)
  const labores = aplanar(maestros.labores)
  const centros = aplanar(maestros.centrosCosto)

  const control =
    'h-8 w-full rounded-sm border border-line-strong bg-surface px-2 text-base text-ink'

  function abrirNueva() {
    /* Se parte desde lo que rige hoy: un cambio suele tocar un solo dato, y
       volver a elegir los tres invita a equivocarse en los otros dos. */
    setDesde(HOY())
    setCuentaId(enVigor?.cuentaId ?? '')
    setLaborId(enVigor?.laborId ?? '')
    setCentroCostoId(enVigor?.centroCostoId ?? '')
    setError('')
    setVista('nueva')
  }

  function guardar() {
    if (!desde) return setError('Falta la fecha desde la que rige.')
    if (!cuentaId) return setError('Falta la cuenta contable. Es lo mínimo que define un tramo.')
    agregarVigencia(actual.id, {
      desde,
      cuentaId,
      laborId: laborId || undefined,
      centroCostoId: centroCostoId || undefined,
      creadoPor: sesion?.usuario ?? 'desconocido',
    })
    setVista('lista')
  }

  /* ── Vista: nuevo tramo ──────────────────────────────────────────────── */
  if (vista === 'nueva') {
    const yaExiste = tramos.some((t) => t.desde === desde)
    return (
      <Modal
        titulo="Nueva parametrización"
        descripcion={`Regirá para «${actual.nombre}» desde la fecha que elijas. Lo anterior se conserva.`}
        ancho="max-w-lg"
        onCerrar={onCerrar}
        pie={
          <>
            <Button onClick={() => setVista('lista')}>Volver</Button>
            <Button variant="primary" onClick={guardar}>Agregar tramo</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="v-desde" className="text-2xs font-medium tracking-wide text-ink-muted">
              VIGENTE DESDE <span className="font-normal normal-case text-ink-faint">obligatorio</span>
            </label>
            <input id="v-desde" type="date" className={control} value={desde}
              onChange={(e) => { setDesde(e.target.value); setError('') }} />
            {enVigor && desde > enVigor.desde && (
              <p className="text-2xs text-ink-faint">
                El tramo vigente se cerrará el día anterior. Lo registrado hasta ahí no cambia.
              </p>
            )}
            {yaExiste && (
              <p className="text-2xs text-warning-text">
                Ya hay un tramo que empieza ese día: se reemplazará.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="v-cuenta" className="text-2xs font-medium tracking-wide text-ink-muted">
              CUENTA CONTABLE <span className="font-normal normal-case text-ink-faint">obligatorio</span>
            </label>
            <select id="v-cuenta" className={`${control} cursor-pointer`} value={cuentaId}
              onChange={(e) => { setCuentaId(e.target.value); setError('') }}>
              <option value="">{cuentas.length ? 'Selecciona…' : 'Carga primero el master de cuentas'}</option>
              {cuentas.map(({ nodo, nivel }) => (
                <option key={nodo.id} value={nodo.id}>{etiqueta(nodo, nivel)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="v-labor" className="text-2xs font-medium tracking-wide text-ink-muted">
              LABOR AUTOMÁTICA
            </label>
            <select id="v-labor" className={`${control} cursor-pointer`} value={laborId}
              onChange={(e) => setLaborId(e.target.value)}>
              <option value="">Ninguna — la elige quien pasa lista</option>
              {labores.map(({ nodo, nivel }) => (
                <option key={nodo.id} value={nodo.id}>{etiqueta(nodo, nivel)}</option>
              ))}
            </select>
            <p className="text-2xs text-ink-faint">
              Si la pones, queda registrada como labor en la tarja y se puede informar aparte.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="v-centro" className="text-2xs font-medium tracking-wide text-ink-muted">
              CENTRO DE COSTO AUTOMÁTICO
            </label>
            <select id="v-centro" className={`${control} cursor-pointer`} value={centroCostoId}
              onChange={(e) => setCentroCostoId(e.target.value)}>
              <option value="">Ninguno — lo elige quien pasa lista</option>
              {centros.map(({ nodo, nivel }) => (
                <option key={nodo.id} value={nodo.id}>{etiqueta(nodo, nivel)}</option>
              ))}
            </select>
          </div>

          {error && (
            <p role="alert" className="rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
              {error}
            </p>
          )}
        </div>
      </Modal>
    )
  }

  /* ── Vista: deshacer el último ───────────────────────────────────────── */
  if (vista === 'borrar' && ultimo) {
    return (
      <Modal
        titulo="Deshacer el último tramo"
        descripcion={`Se quitará el tramo que empieza el ${formatearFecha(ultimo.desde)} y volverá a regir el anterior. Los tramos más antiguos no se tocan.`}
        onCerrar={onCerrar}
        pie={
          <>
            <Button onClick={() => setVista('lista')}>Volver</Button>
            <Button variant="danger" onClick={() => { eliminarVigencia(actual.id, ultimo.id); setVista('lista') }}>
              Deshacer
            </Button>
          </>
        }
      />
    )
  }

  /* ── Vista: historial ────────────────────────────────────────────────── */
  return (
    <Modal
      titulo={`Parametrización de «${actual.nombre}»`}
      descripcion="Cada tramo rige desde su fecha. Cambiar algo abre un tramo nuevo y no altera lo ya imputado."
      ancho="max-w-2xl"
      onCerrar={onCerrar}
      pie={
        <>
          {ultimo && <Button variant="ghost" onClick={() => setVista('borrar')}>Deshacer el último</Button>}
          <Button onClick={onCerrar}>Cerrar</Button>
          <Button variant="primary" onClick={abrirNueva}>Nueva parametrización</Button>
        </>
      }
    >
      {tramos.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-base font-medium">Esta modalidad todavía no imputa a ninguna cuenta</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-ink-faint">
            Agrega una parametrización con la fecha desde la que rige.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 pb-2">
          {tramos.map((t) => (
            <Tramo key={t.id} t={t} estado={estadoDe(t)} maestros={maestros} />
          ))}
        </ul>
      )}
    </Modal>
  )
}

function Tramo({
  t, estado, maestros,
}: {
  t: ParamModalidad; estado: Estado; maestros: ReturnType<typeof useMaestros>['maestros']
}) {
  const labor = t.laborId ? rutaDe(maestros.labores, t.laborId) : ''
  const centro = t.centroCostoId ? rutaDe(maestros.centrosCosto, t.centroCostoId) : ''
  return (
    <li className="rounded-md border border-line bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold tracking-tight">
          Desde {formatearFecha(t.desde)}
        </span>
        <span className="text-2xs text-ink-faint">
          {t.hasta ? `hasta ${formatearFecha(t.hasta)}` : 'sin término'}
        </span>
        {estado === 'vigente' && <Chip tone="success">Vigente</Chip>}
        {estado === 'programado' && <Chip tone="primary">Empieza más adelante</Chip>}
      </div>
      <dl className="mt-1.5 flex flex-col gap-0.5 text-2xs">
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-ink-faint">Cuenta</dt>
          <dd>{rutaDe(maestros.cuentas, t.cuentaId) || <span className="text-danger-text">cuenta eliminada</span>}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-ink-faint">Labor automática</dt>
          <dd>{labor || <span className="text-ink-disabled">ninguna</span>}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-ink-faint">Centro de costo</dt>
          <dd>{centro || <span className="text-ink-disabled">ninguno</span>}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-2xs text-ink-disabled">
        Registrado por {t.creadoPor} el {formatearFecha(t.creadoEn.slice(0, 10))}
      </p>
    </li>
  )
}
