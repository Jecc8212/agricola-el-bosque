import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { CARGO_POR_CODIGO } from '@/data/cargos'
import { TRABAJADORES } from '@/data/trabajadores'
import { cn } from '@/lib/cn'
import { CLP, antiguedad, fecha } from '@/lib/formato'
import { formatearRut } from '@/lib/rut'
import { useDialogo } from '@/lib/useDialogo'
import { useContextoOperacion } from '@/lib/contexto'
import { finDeMes, etiquetaTemporada } from '@/lib/temporada'
import { CAMPO_LABEL, nombreCompleto } from '@/lib/types'
import type { EstadoTrabajador, Trabajador } from '@/lib/types'

const ESTADO_TONO: Record<EstadoTrabajador, 'success' | 'warning' | 'neutral'> = {
  ACTIVO: 'success',
  LICENCIA: 'warning',
  FINIQUITADO: 'neutral',
}
const ESTADO_LABEL: Record<EstadoTrabajador, string> = {
  ACTIVO: 'Activo',
  LICENCIA: 'Licencia',
  FINIQUITADO: 'Finiquitado',
}

function Metrica({ label, valor, nota }: { label: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3.5 py-3">
      <p className="text-2xs font-medium tracking-wide text-ink-faint">{label}</p>
      <p className="num mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
      {nota && <p className="mt-0.5 text-2xs text-ink-faint">{nota}</p>}
    </div>
  )
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-medium tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-base">{children}</dd>
    </div>
  )
}

function FichaTrabajador({ t, onCerrar }: { t: Trabajador; onCerrar: () => void }) {
  const reduce = useReducedMotion()
  const cargo = CARGO_POR_CODIGO.get(t.cargo)
  const panel = useDialogo(true, onCerrar)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <motion.div
        className="absolute inset-0 bg-papel-950/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCerrar}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${nombreCompleto(t)}`}
        ref={panel as React.RefObject<HTMLElement>}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface-raised"
        initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{nombreCompleto(t)}</h2>
            <p className="mono mt-0.5 text-sm text-ink-faint">{formatearRut(t.rut)}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onCerrar} aria-label="Cerrar ficha">
            Cerrar
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={ESTADO_TONO[t.estado]}>{ESTADO_LABEL[t.estado]}</Chip>
            <Chip tone="primary">{CAMPO_LABEL[t.campo]}</Chip>
            <Chip tone="neutral">{cargo?.tipo === 'AGRICOLA' ? 'Agrícola' : 'Administrativo'}</Chip>
          </div>

          {/* El vínculo cargo → cuenta es lo que evita que alguien elija la
              cuenta a mano al contabilizar. Se muestra explícito. */}
          <section className="mt-5 rounded-md border border-line bg-surface p-3.5">
            <p className="text-2xs font-medium tracking-wide text-ink-faint">IMPUTACIÓN CONTABLE</p>
            <p className="mt-1.5 text-base font-medium">{cargo?.nombre}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="mono rounded-xs bg-primary-tint px-1.5 py-0.5 text-sm font-medium text-primary-text">
                {cargo?.cuenta}
              </span>
              <span className="text-sm text-ink-faint">{cargo?.cuentaNombre}</span>
            </div>
            <p className="mt-2.5 text-2xs text-ink-faint">
              La cuenta la determina el cargo. No se elige al contabilizar.
            </p>
          </section>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <Dato label="SUELDO BASE">
              <span className="num font-medium">{CLP.format(t.sueldoBase)}</span>
            </Dato>
            <Dato label="INGRESO">
              {fecha(t.fechaIngreso)}
              <span className="block text-2xs text-ink-faint">{antiguedad(t.fechaIngreso)}</span>
            </Dato>
            <Dato label="BANCO">{t.banco ?? '—'}</Dato>
            <Dato label="CUENTA">
              <span className="mono text-sm">{t.numeroCuenta ?? '—'}</span>
              <span className="block text-2xs text-ink-faint">{t.tipoCuenta ?? ''}</span>
            </Dato>
            <Dato label="TALLA BUZO">{t.tallaBuzo ?? '—'}</Dato>
            <Dato label="CALZADO">{t.tallaCalzado ?? '—'}</Dato>
          </dl>

          <p className="mt-6 text-2xs text-ink-faint">
            Las tallas alimentan la matriz de EPP por cargo. Sin ellas, la entrega de
            equipo no se puede firmar.
          </p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button onClick={onCerrar}>Cerrar</Button>
          <Button variant="primary">Editar ficha</Button>
        </footer>
      </motion.aside>
    </div>
  )
}

export default function Trabajadores() {
  const { temporada, mes, campo } = useContextoOperacion()
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<string>('ACTIVO')
  const [seleccionado, setSeleccionado] = useState<Trabajador | null>(null)
  const cerrarFicha = useCallback(() => setSeleccionado(null), [])

  /* El contexto de la cabecera acota la nómina antes que cualquier filtro de
     esta página: sólo quien ya había ingresado al cierre del mes seleccionado,
     y sólo el campo elegido. */
  const enContexto = useMemo(() => {
    const corte = finDeMes(mes)
    return TRABAJADORES.filter(
      (t) => (campo === 'TODOS' || t.campo === campo) && t.fechaIngreso <= corte,
    )
  }, [campo, mes])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase().replace(/[.\-\s]/g, '')
    return enContexto.filter((t) => {
      if (estado !== 'TODOS' && t.estado !== estado) return false
      if (!q) return true
      return (
        nombreCompleto(t).toLowerCase().includes(busqueda.trim().toLowerCase()) ||
        t.rut.toLowerCase().includes(q)
      )
    })
  }, [busqueda, enContexto, estado])

  const activos = enContexto.filter((t) => t.estado === 'ACTIVO')
  const masaSalarial = activos.reduce((s, t) => s + t.sueldoBase, 0)
  const agricolas = activos.filter((t) => CARGO_POR_CODIGO.get(t.cargo)?.tipo === 'AGRICOLA').length
  const alcance = campo === 'TODOS' ? 'los cuatro campos' : CAMPO_LABEL[campo]

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trabajadores</h1>
          <p className="mt-1 max-w-[64ch] text-base text-ink-faint">
            La ficha de personal es el origen de todo lo demás: el cargo define la cuenta,
            el campo define el centro de costo y las tallas habilitan la entrega de EPP.
          </p>
        </div>
        <Button variant="primary">Nuevo trabajador</Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica label="DOTACIÓN ACTIVA" valor={String(activos.length)} nota={`de ${enContexto.length} en el contexto`} />
        <Metrica label="AGRÍCOLAS" valor={String(agricolas)} nota={`${activos.length - agricolas} administrativos`} />
        <Metrica label="MASA SALARIAL BASE" valor={CLP.format(masaSalarial)} nota="mensual, sin leyes sociales" />
        <Metrica
          label="ALCANCE"
          valor={campo === 'TODOS' ? '4 campos' : CAMPO_LABEL[campo]}
          nota={`temporada ${etiquetaTemporada(temporada)}`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field
            label="Buscar"
            placeholder="Nombre o RUT"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select label="ESTADO" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="ACTIVO">Activos</option>
          <option value="LICENCIA">En licencia</option>
          <option value="FINIQUITADO">Finiquitados</option>
          <option value="TODOS">Todos</option>
        </Select>
      </div>

      <p aria-live="polite" className="mt-3 text-2xs text-ink-faint">
        {filtrados.length} {filtrados.length === 1 ? 'trabajador' : 'trabajadores'} · {alcance} ·
        con ingreso hasta el cierre del mes seleccionado
      </p>

      <div className="mt-2 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-line text-2xs tracking-wide text-ink-faint">
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">RUT</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">NOMBRE</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">CARGO</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">CUENTA</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">CAMPO</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">INGRESO</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">SUELDO BASE</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => {
              const cargo = CARGO_POR_CODIGO.get(t.cargo)
              return (
                <tr
                  key={t.rut}
                  tabIndex={0}
                  onClick={() => setSeleccionado(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSeleccionado(t)
                    }
                  }}
                  className={cn(
                    'cursor-pointer border-b border-line last:border-0',
                    'transition-colors duration-100 hover:bg-surface-sunken focus-visible:bg-surface-sunken',
                  )}
                >
                  <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">{formatearRut(t.rut)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">{nombreCompleto(t)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">{cargo?.nombre}</td>
                  <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">{cargo?.cuenta}</td>
                  <td className="px-3 py-1.5">{CAMPO_LABEL[t.campo]}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-ink-faint">{fecha(t.fechaIngreso)}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-right font-medium">{CLP.format(t.sueldoBase)}</td>
                  <td className="px-3 py-1.5">
                    <Chip tone={ESTADO_TONO[t.estado]}>{ESTADO_LABEL[t.estado]}</Chip>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-base font-medium">Sin resultados</p>
            <p className="mt-1 text-sm text-ink-faint">
              Ningún trabajador coincide. Revisa también el contexto de la cabecera:
              temporada, mes y campo acotan la nómina antes que estos filtros.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => {
                  setBusqueda('')
                  setEstado('TODOS')
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {seleccionado && (
          <FichaTrabajador t={seleccionado} onCerrar={cerrarFicha} />
        )}
      </AnimatePresence>
    </>
  )
}
