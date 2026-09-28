import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { Pagina } from '@/components/Pagina'
import { BarraDatos } from '@/components/BarraDatos'
import { aIso, columnas as columnasDe, normalizar } from '@/lib/planilla'
import type { Fila } from '@/lib/planilla'
import { FormularioModal } from '@/components/ui/FormularioModal'
import type { CampoForm } from '@/components/ui/FormularioModal'
import { ModalConfirmar } from '@/components/ui/Modal'
import { CARGOS, CARGO_POR_CODIGO } from '@/data/cargos'
import { cn } from '@/lib/cn'
import { CLP, antiguedad, fecha } from '@/lib/formato'
import { esRutValido, formatearRut } from '@/lib/rut'
import { useDialogo } from '@/lib/useDialogo'
import { TODOS, useContextoOperacion } from '@/lib/contexto'
import { aplanar, buscarNodo, useMaestros } from '@/lib/maestros'
import { CLASE_LABEL, nombreCompleto } from '@/lib/types'
import type { ClaseTrabajador, EstadoTrabajador, Trabajador } from '@/lib/types'

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

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-medium tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-base">{children}</dd>
    </div>
  )
}

function FichaTrabajador({
  t, onCerrar, onEditar, onEliminar, campoDeFicha,
}: {
  t: Trabajador
  onCerrar: () => void
  onEditar: () => void
  onEliminar: () => void
  campoDeFicha?: string
}) {
  const reduce = useReducedMotion()
  const cargo = CARGO_POR_CODIGO.get(t.cargo)
  const panel = useDialogo(true, onCerrar)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <motion.div
        className="absolute inset-0 bg-papel-950/60"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCerrar}
      />
      <motion.aside
        role="dialog" aria-modal="true" aria-label={`Ficha de ${nombreCompleto(t)}`}
        ref={panel as React.RefObject<HTMLElement>} tabIndex={-1}
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
          <Button size="sm" variant="ghost" onClick={onCerrar} aria-label="Cerrar ficha">Cerrar</Button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={ESTADO_TONO[t.estado]}>{ESTADO_LABEL[t.estado]}</Chip>
            <Chip tone="primary">{campoDeFicha ?? 'Campo eliminado'}</Chip>
          </div>

          {/* El vínculo cargo → cuenta es lo que evita que alguien elija la
              cuenta a mano al contabilizar. Se muestra explícito. */}
          <section className="mt-5 rounded-md border border-line bg-surface p-3.5">
            <p className="text-2xs font-medium tracking-wide text-ink-faint">IMPUTACIÓN CONTABLE</p>
            <p className="mt-1.5 text-base font-medium">{cargo?.nombre ?? 'Cargo desconocido'}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="mono rounded-xs bg-primary-tint px-1.5 py-0.5 text-sm font-medium text-primary-text">
                {cargo?.cuenta ?? '—'}
              </span>
              <span className="text-sm text-ink-faint">{cargo?.cuentaNombre ?? ''}</span>
            </div>
          </section>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <Dato label="SUELDO BASE"><span className="num font-medium">{CLP.format(t.sueldoBase)}</span></Dato>
            <Dato label="INGRESO">
              {fecha(t.fechaIngreso)}
              <span className="block text-2xs text-ink-faint">{antiguedad(t.fechaIngreso)}</span>
            </Dato>
            <Dato label="BANCO">{t.banco || '—'}</Dato>
            <Dato label="CUENTA">
              <span className="mono text-sm">{t.numeroCuenta || '—'}</span>
              <span className="block text-2xs text-ink-faint">{t.tipoCuenta ?? ''}</span>
            </Dato>
            <Dato label="TALLA BUZO">{t.tallaBuzo || '—'}</Dato>
            <Dato label="CALZADO">{t.tallaCalzado || '—'}</Dato>
          </dl>
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-3.5">
          <Button variant="ghost" onClick={onEliminar}>Eliminar</Button>
          <Button className="ml-auto" onClick={onCerrar}>Cerrar</Button>
          <Button variant="primary" onClick={onEditar}>Editar ficha</Button>
        </footer>
      </motion.aside>
    </div>
  )
}

export default function Trabajadores() {
  const { campoId, campoNombre } = useContextoOperacion()
  const { maestros, trabajadores, guardarTrabajador, eliminarTrabajador } = useMaestros()
  const nombreCampo = (id: string) => buscarNodo(maestros.campos, id)?.nombre
  /* Sólo las que suman día: una falta no es forma de pagarle a nadie. */
  const modalidadesDePago = aplanar(maestros.modalidades).filter((f) => (f.nodo.factor ?? 0) > 0)

  /**
   * Los centros de costo del campo elegido. Un centro pertenece a un campo, así
   * que ofrecer los de Graneros a alguien de Buin sólo invita a equivocarse.
   * Los que no declaran campo se ofrecen siempre: puede ser un centro común.
   */
  const centrosDe = (campoDeLaFicha: string) =>
    aplanar(maestros.centrosCosto).filter(
      ({ nodo }) => !nodo.campoId || nodo.campoId === campoDeLaFicha,
    )

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<string>('ACTIVO')
  const [seleccionado, setSeleccionado] = useState<Trabajador | null>(null)
  const [editando, setEditando] = useState<Trabajador | null | undefined>(undefined)
  const [borrando, setBorrando] = useState<Trabajador | null>(null)
  const [errorAlta, setErrorAlta] = useState('')
  const cerrarFicha = useCallback(() => setSeleccionado(null), [])

  const enContexto = useMemo(
    () => trabajadores.filter((t) => campoId === TODOS || t.campoId === campoId),
    [trabajadores, campoId],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const rutBuscado = q.replace(/[.\-\s]/g, '')
    return enContexto.filter((t) => {
      if (estado !== 'TODOS' && t.estado !== estado) return false
      if (!q) return true
      return nombreCompleto(t).toLowerCase().includes(q) || t.rut.includes(rutBuscado)
    })
  }, [busqueda, enContexto, estado])

  function camposFicha(t?: Trabajador): CampoForm[] {
    return [
      { tipo: 'texto', id: 'rut', etiqueta: 'RUT', valor: t ? formatearRut(t.rut) : '', requerido: true, placeholder: '12.345.678-5' },
      { tipo: 'texto', id: 'nombres', etiqueta: 'Nombres', valor: t?.nombres ?? '', requerido: true },
      { tipo: 'texto', id: 'apellidos', etiqueta: 'Apellidos', valor: t?.apellidos ?? '', requerido: true },
      { tipo: 'select', id: 'cargo', etiqueta: 'Cargo', valor: t?.cargo ?? CARGOS[0].codigo, requerido: true,
        opciones: CARGOS.map((c) => ({ valor: c.codigo, etiqueta: `${c.nombre} · cuenta ${c.cuenta}` })) },
      { tipo: 'select', id: 'campoId', etiqueta: 'Campo', valor: t?.campoId ?? maestros.campos[0]?.id ?? '', requerido: true,
        opciones: aplanar(maestros.campos).map(({ nodo, nivel }) => ({
          valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
        })) },
      /* Agrícola o de planta: cambia por completo cómo se le liquida, así que
         se pregunta al crear la ficha y no después. */
      { tipo: 'select', id: 'clase', etiqueta: 'Tipo de trabajador', requerido: true,
        valor: t?.clase ?? 'AGRICOLA',
        opciones: (['AGRICOLA', 'PLANTA'] as ClaseTrabajador[]).map((c) => ({
          valor: c, etiqueta: CLASE_LABEL[c],
        })) },
      { tipo: 'select', id: 'centroCostoId', etiqueta: 'Centro de costo',
        valor: t?.centroCostoId ?? '',
        opciones: (() => {
          const suyos = centrosDe(t?.campoId ?? maestros.campos[0]?.id ?? '')
          return [
            { valor: '', etiqueta: suyos.length ? 'Sin asignar' : 'Cargue centros de costo primero' },
            ...suyos.map(({ nodo, nivel }) => ({
              valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
            })),
          ]
        })() },
      /* La modalidad es del contrato, no del día: se fija acá y al pasar lista
         cada quien la hereda sin que nadie la escriba cada mañana. */
      { tipo: 'select', id: 'modalidadId', etiqueta: 'Modalidad de pago',
        valor: t?.modalidadId ?? modalidadesDePago[0]?.nodo.id ?? '',
        opciones: modalidadesDePago.length
          ? modalidadesDePago.map(({ nodo, nivel }) => ({
              valor: nodo.id, etiqueta: `${'— '.repeat(nivel)}${nodo.nombre}`,
            }))
          : [{ valor: '', etiqueta: 'Cargue modalidades en Maestros' }] },
      { tipo: 'select', id: 'estado', etiqueta: 'Estado', valor: t?.estado ?? 'ACTIVO', requerido: true,
        opciones: (['ACTIVO', 'LICENCIA', 'FINIQUITADO'] as EstadoTrabajador[]).map((e) => ({ valor: e, etiqueta: ESTADO_LABEL[e] })) },
      { tipo: 'fecha', id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', valor: t?.fechaIngreso ?? '', requerido: true },
      { tipo: 'numero', id: 'sueldoBase', etiqueta: 'Sueldo base', valor: t?.sueldoBase ?? 0, paso: '1000', min: '0',
        ayuda: 'Mensual. De aquí sale el costo por día del centro de costo.' },
      { tipo: 'texto', id: 'banco', etiqueta: 'Banco', valor: t?.banco ?? '' },
      { tipo: 'select', id: 'tipoCuenta', etiqueta: 'Tipo de cuenta', valor: t?.tipoCuenta ?? 'CORRIENTE',
        opciones: [
          { valor: 'CORRIENTE', etiqueta: 'Corriente' },
          { valor: 'VISTA', etiqueta: 'Vista' },
          { valor: 'AHORRO', etiqueta: 'Ahorro' },
        ] },
      { tipo: 'texto', id: 'numeroCuenta', etiqueta: 'Número de cuenta', valor: t?.numeroCuenta ?? '' },
      { tipo: 'texto', id: 'tallaBuzo', etiqueta: 'Talla de buzo', valor: t?.tallaBuzo ?? '', placeholder: 'S, M, L, XL' },
      { tipo: 'numero', id: 'tallaCalzado', etiqueta: 'Talla de calzado', valor: t?.tallaCalzado ?? 0, paso: '1', min: '0' },
    ]
  }

  function alGuardar(v: Record<string, string>, original?: Trabajador) {
    const rutLimpio = v.rut.replace(/[.\-\s]/g, '').toUpperCase()
    if (!esRutValido(rutLimpio)) return setErrorAlta('El RUT no es válido: revisa el dígito verificador')
    if (trabajadores.some((t) => t.rut === rutLimpio && t.rut !== original?.rut))
      return setErrorAlta('Ya existe un trabajador con ese RUT')

    guardarTrabajador(
      {
        rut: rutLimpio,
        nombres: v.nombres.trim(),
        apellidos: v.apellidos.trim(),
        cargo: v.cargo,
        campoId: v.campoId,
        modalidadId: v.modalidadId || undefined,
        centroCostoId: v.centroCostoId || undefined,
        clase: (v.clase as ClaseTrabajador) || 'AGRICOLA',
        estado: v.estado as EstadoTrabajador,
        fechaIngreso: v.fechaIngreso,
        sueldoBase: Number(v.sueldoBase) || 0,
        banco: v.banco.trim() || undefined,
        tipoCuenta: (v.tipoCuenta || undefined) as Trabajador['tipoCuenta'],
        numeroCuenta: v.numeroCuenta.trim() || undefined,
        tallaBuzo: v.tallaBuzo.trim() || undefined,
        tallaCalzado: Number(v.tallaCalzado) || undefined,
      },
      original?.rut,
    )
    setEditando(undefined)
    setSeleccionado(null)
    setErrorAlta('')
  }

  /* Los encabezados de la exportación y de la plantilla son los mismos: lo que
     se baja se puede volver a subir sin traducir nada. */
  const filasExcel: Fila[] = filtrados.map((t) => ({
    RUT: formatearRut(t.rut),
    Nombres: t.nombres,
    Apellidos: t.apellidos,
    Tipo: CLASE_LABEL[t.clase ?? 'AGRICOLA'],
    Cargo: CARGO_POR_CODIGO.get(t.cargo)?.nombre ?? t.cargo,
    Campo: nombreCampo(t.campoId) ?? '',
    'Centro de costo': buscarNodo(maestros.centrosCosto, t.centroCostoId)?.nombre ?? '',
    Modalidad: buscarNodo(maestros.modalidades, t.modalidadId)?.nombre ?? '',
    Estado: ESTADO_LABEL[t.estado],
    'Fecha de ingreso': t.fechaIngreso,
    'Sueldo base': t.sueldoBase,
    Banco: t.banco ?? '',
    'Tipo de cuenta': t.tipoCuenta ?? '',
    'Número de cuenta': t.numeroCuenta ?? '',
    'Talla de buzo': t.tallaBuzo ?? '',
    'Talla de calzado': t.tallaCalzado ?? '',
  }))

  const plantilla: Fila[] = [{
    RUT: '12.345.678-5',
    Nombres: 'María Elena',
    Apellidos: 'Rojas Pérez',
    Tipo: CLASE_LABEL.AGRICOLA,
    Cargo: CARGOS[0].nombre,
    Campo: maestros.campos[0]?.nombre ?? 'Buin',
    'Centro de costo': maestros.centrosCosto[0]?.nombre ?? '',
    Modalidad: modalidadesDePago[0]?.nodo.nombre ?? 'Al día',
    Estado: 'Activo',
    'Fecha de ingreso': '2026-03-01',
    'Sueldo base': 550000,
    Banco: 'Banco Estado',
    'Tipo de cuenta': 'Corriente',
    'Número de cuenta': '12345678',
    'Talla de buzo': 'M',
    'Talla de calzado': 38,
  }]

  /**
   * Importación tolerante con lo que se escribe a mano: cargo, campo y estado
   * se buscan por nombre normalizado —sin tildes ni mayúsculas— y la fecha
   * acepta tanto ISO como dd-mm-aaaa. Lo que no calza se informa por fila, en
   * vez de descartar la carga entera en silencio.
   */
  function importarNomina(filas: Record<string, unknown>[]): string {
    if (filas.length === 0) throw new Error('La planilla está vacía.')
    const porCargo = new Map(CARGOS.map((c) => [normalizar(c.nombre), c.codigo]))
    const porCampo = new Map(
      aplanar(maestros.campos).map(({ nodo }) => [normalizar(nodo.nombre), nodo.id]),
    )
    const porCentro = new Map(
      aplanar(maestros.centrosCosto).map(({ nodo }) => [normalizar(nodo.nombre), nodo.id]),
    )
    const porModalidad = new Map(
      modalidadesDePago.map(({ nodo }) => [normalizar(nodo.nombre), nodo.id]),
    )
    const porEstado = new Map(
      (Object.entries(ESTADO_LABEL) as Array<[EstadoTrabajador, string]>)
        .map(([k, v]) => [normalizar(v), k]),
    )

    const problemas: string[] = []
    let cargados = 0

    filas.forEach((f, i) => {
      const col = columnasDe(f)
      const linea = i + 2 // la 1 es el encabezado
      const rut = String(col('RUT') ?? '').replace(/[.\-\s]/g, '').toUpperCase()
      if (!esRutValido(rut)) return problemas.push(`Fila ${linea}: RUT inválido`)

      const cargo = porCargo.get(normalizar(col('Cargo')))
      if (!cargo) return problemas.push(`Fila ${linea}: cargo «${String(col('Cargo'))}» no existe`)

      const campoId = porCampo.get(normalizar(col('Campo')))
      if (!campoId) return problemas.push(`Fila ${linea}: campo «${String(col('Campo'))}» no existe`)

      const fechaIngreso = aIso(col('Fecha de ingreso'))
      if (!fechaIngreso) return problemas.push(`Fila ${linea}: fecha de ingreso ilegible`)

      guardarTrabajador({
        rut,
        nombres: String(col('Nombres') ?? '').trim(),
        apellidos: String(col('Apellidos') ?? '').trim(),
        cargo,
        campoId,
        // Sin modalidad la ficha entra igual: se ve como «sin asignar» y se
        // corrige desde la pantalla, en vez de rechazar la carga entera.
        modalidadId: porModalidad.get(normalizar(col('Modalidad'))),
        clase: normalizar(col('Tipo')).includes('planta') ? 'PLANTA' : 'AGRICOLA',
        centroCostoId: porCentro.get(normalizar(col('Centro de costo'))),
        estado: porEstado.get(normalizar(col('Estado'))) ?? 'ACTIVO',
        fechaIngreso,
        sueldoBase: Number(col('Sueldo base')) || 0,
        banco: String(col('Banco') ?? '').trim() || undefined,
        tipoCuenta: (normalizar(col('Tipo de cuenta')).toUpperCase() || undefined) as Trabajador['tipoCuenta'],
        numeroCuenta: String(col('Número de cuenta') ?? '').trim() || undefined,
        tallaBuzo: String(col('Talla de buzo') ?? '').trim() || undefined,
        tallaCalzado: Number(col('Talla de calzado')) || undefined,
      })
      cargados++
    })

    if (problemas.length > 0)
      throw new Error(`${cargados} fichas cargadas. Sin cargar: ${problemas.slice(0, 4).join(' · ')}${problemas.length > 4 ? ` y ${problemas.length - 4} más` : ''}`)
    return `${cargados} fichas cargadas desde la planilla.`
  }

  return (
    <Pagina
      titulo="Trabajadores"
      descripcion="La ficha de personal: el cargo define la cuenta contable, el campo define dónde trabaja, y el sueldo base es lo que alimenta el costo por día de cada centro de costo."
      acciones={<Button variant="primary" onClick={() => setEditando(null)}>Nuevo trabajador</Button>}
    >
      <div className="mb-5">
        <BarraDatos
          titulo="Trabajadores"
          nombreArchivo="trabajadores"
          subtitulo={`${filtrados.length} fichas · ${campoId === TODOS ? 'todos los campos' : campoNombre}`}
          filas={filasExcel}
          plantilla={plantilla}
          onImportar={importarNomina}
        />
      </div>
      {errorAlta && (
        <p role="alert" className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger-text">
          {errorAlta}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 sm:max-w-xs">
          <Field label="Buscar" placeholder="Nombre o RUT" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <Select label="ESTADO" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="ACTIVO">Activos</option>
          <option value="LICENCIA">En licencia</option>
          <option value="FINIQUITADO">Finiquitados</option>
          <option value="TODOS">Todos</option>
        </Select>
      </div>

      <p aria-live="polite" className="mt-3 text-2xs text-ink-faint">
        {filtrados.length} {filtrados.length === 1 ? 'trabajador' : 'trabajadores'} ·{' '}
        {campoId === TODOS ? 'todos los campos' : campoNombre}
      </p>

      <div className="mt-2 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">RUT</th>
              <th className="px-3 py-2 text-left font-medium">NOMBRE</th>
              <th className="px-3 py-2 text-left font-medium">TIPO</th>
              <th className="px-3 py-2 text-left font-medium">CARGO</th>
              <th className="px-3 py-2 text-left font-medium">CUENTA</th>
              <th className="px-3 py-2 text-left font-medium">CAMPO</th>
              <th className="px-3 py-2 text-left font-medium">CENTRO DE COSTO</th>
              <th className="px-3 py-2 text-left font-medium">MODALIDAD</th>
              <th className="px-3 py-2 text-left font-medium">INGRESO</th>
              <th className="px-3 py-2 text-right font-medium">SUELDO BASE</th>
              <th className="px-3 py-2 text-left font-medium">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => {
              const cargo = CARGO_POR_CODIGO.get(t.cargo)
              return (
                <tr
                  key={t.rut} tabIndex={0} onClick={() => setSeleccionado(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSeleccionado(t) }
                  }}
                  className={cn(
                    'cursor-pointer border-b border-line last:border-0',
                    'transition-colors duration-100 hover:bg-surface-sunken focus-visible:bg-surface-sunken',
                  )}
                >
                  <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">{formatearRut(t.rut)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">{nombreCompleto(t)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <Chip tone={t.clase === 'PLANTA' ? 'neutral' : 'primary'}>
                      {t.clase === 'PLANTA' ? 'Planta' : 'Agrícola'}
                    </Chip>
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">{cargo?.nombre ?? '—'}</td>
                  <td className="mono whitespace-nowrap px-3 py-1.5 text-ink-faint">{cargo?.cuenta ?? '—'}</td>
                  <td className="px-3 py-1.5">
                    {nombreCampo(t.campoId) ?? <span className="text-warning-text">Campo eliminado</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {buscarNodo(maestros.centrosCosto, t.centroCostoId)?.nombre ?? (
                      <span className="text-warning-text">Sin asignar</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    {buscarNodo(maestros.modalidades, t.modalidadId)?.nombre ?? (
                      <span className="text-warning-text">Sin asignar</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-ink-faint">{fecha(t.fechaIngreso)}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-right font-medium">{CLP.format(t.sueldoBase)}</td>
                  <td className="px-3 py-1.5"><Chip tone={ESTADO_TONO[t.estado]}>{ESTADO_LABEL[t.estado]}</Chip></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-base font-medium">
              {trabajadores.length === 0 ? 'Todavía no hay personal cargado' : 'Sin resultados'}
            </p>
            <p className="mx-auto mt-1 max-w-[54ch] text-sm text-ink-faint">
              {trabajadores.length === 0
                ? 'Agrega la primera ficha con el botón de arriba. De aquí salen la asistencia y el costo de cada centro de costo.'
                : 'Ningún trabajador coincide. Revisa también el filtro de campo de la cabecera.'}
            </p>
          </div>
        )}
      </div>

      {editando !== undefined && (
        <FormularioModal
          titulo={editando ? `Editar ficha de ${nombreCompleto(editando)}` : 'Nuevo trabajador'}
          campos={camposFicha(editando ?? undefined)}
          confirmar={editando ? 'Guardar' : 'Crear'}
          tituloConfirmacion={editando ? '¿Guardar la ficha?' : '¿Crear el trabajador?'}
          mensajeConfirmacion={
            editando
              ? `Se guardarán los cambios de la ficha de ${nombreCompleto(editando)}.`
              : 'Se creará una ficha nueva de personal.'
          }
          onCerrar={() => setEditando(undefined)}
          onGuardar={(v) => alGuardar(v, editando ?? undefined)}
        />
      )}
      {borrando && (
        <ModalConfirmar
          titulo={`Eliminar a ${nombreCompleto(borrando)}`}
          descripcion="Se eliminarán también sus registros de asistencia."
          onCerrar={() => setBorrando(null)}
          onConfirmar={() => { eliminarTrabajador(borrando.rut); setBorrando(null); setSeleccionado(null) }}
        />
      )}

      <AnimatePresence>
        {seleccionado && (
          <FichaTrabajador
            t={seleccionado}
            onCerrar={cerrarFicha}
            onEditar={() => setEditando(seleccionado)}
            onEliminar={() => setBorrando(seleccionado)}
            campoDeFicha={nombreCampo(seleccionado.campoId)}
          />
        )}
      </AnimatePresence>
    </Pagina>
  )
}
