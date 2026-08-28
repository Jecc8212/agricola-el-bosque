import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

/** Líneas reales del plan de cuentas de la empresa, no datos de relleno. */
const ASIENTO = [
  { codigo: '5111', cuenta: 'Mano de obra agrícola — Poda', cc: 'GRANEROS', debe: 4_812_400, haber: 0 },
  { codigo: '5112', cuenta: 'Mano de obra agrícola — Cosecha', cc: 'BUIN', debe: 9_140_650, haber: 0 },
  { codigo: '5121', cuenta: 'Sueldos ADM agrícola — Supervisión', cc: 'GENERAL', debe: 1_298_200, haber: 0 },
  { codigo: '2121', cuenta: 'Leyes sociales por pagar', cc: '—', debe: 0, haber: 2_640_310 },
  { codigo: '2124', cuenta: 'Impuesto único de 2ª categoría', cc: '—', debe: 0, haber: 187_940 },
  { codigo: '1311', cuenta: 'Anticipo remuneraciones Buin', cc: 'BUIN', debe: 0, haber: 1_450_000 },
  { codigo: '2131', cuenta: 'Remuneraciones por pagar', cc: 'BUIN', debe: 0, haber: 10_973_000 },
]

function Section({ n, title, note, children }: {
  n: string; title: string; note?: string; children: React.ReactNode
}) {
  return (
    <section className="border-t border-line py-10">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="mono text-2xs text-ink-disabled">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {note && <p className="mb-5 max-w-[68ch] text-base text-ink-faint">{note}</p>}
      {children}
    </section>
  )
}

function Swatch({ name, cls, hex }: { name: string; cls: string; hex: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn('h-12 rounded-sm border border-line', cls)} />
      <div className="flex flex-col">
        <span className="text-2xs font-medium">{name}</span>
        <span className="mono text-2xs text-ink-faint">{hex}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(false)
  const [modal, setModal] = useState(false)
  const [cuadrado, setCuadrado] = useState(true)
  const reduce = useReducedMotion()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const debe = ASIENTO.reduce((s, l) => s + l.debe, 0)
  const haber = ASIENTO.reduce((s, l) => s + l.haber, 0) - (cuadrado ? 0 : 340_000)
  const desvio = debe - haber

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="text-base font-semibold tracking-tight">Agrícola El Bosque</span>
            <span className="text-2xs text-ink-faint">Design system · v0.1</span>
          </div>
          <Button size="sm" onClick={() => setDark((d) => !d)}>
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <div className="py-12">
          <h1 className="max-w-[20ch] text-3xl font-semibold tracking-tight">
            Un instrumento de precisión, no una vitrina.
          </h1>
          <p className="mt-3 max-w-[68ch] text-lg text-ink-faint">
            Una persona va a mirar estas pantallas ocho horas al día para cuadrar asientos.
            Todo lo que sigue está subordinado a eso: densidad sobre aire, jerarquía por peso
            antes que por color, y color reservado para cuando algo <em>significa</em> algo.
          </p>
        </div>

        <Section
          n="01"
          title="Color"
          note="Tres familias y nada más. El verde es la empresa; el ocre pide atención sin alarmar; la cereza —el fruto de la casa— queda reservada para lo negativo y nunca se usa de adorno. Los neutros son cálidos, de papel: una agrícola no es un banco."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Bosque 600" cls="bg-bosque-600" hex="#395c4c" />
            <Swatch name="Bosque 300" cls="bg-bosque-300" hex="#93b3a0" />
            <Swatch name="Ocre 500" cls="bg-ocre-500" hex="#c08526" />
            <Swatch name="Ocre 300" cls="bg-ocre-300" hex="#e5bc66" />
            <Swatch name="Cereza 600" cls="bg-cereza-600" hex="#942f41" />
            <Swatch name="Papel 100" cls="bg-papel-100" hex="#f4f2ed" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip tone="success">Asiento cuadrado</Chip>
            <Chip tone="warning">Pendiente de cierre</Chip>
            <Chip tone="danger">Descuadre</Chip>
            <Chip tone="primary">Centro de costo</Chip>
            <Chip tone="neutral">Sin imputar</Chip>
          </div>
          <p className="mt-4 max-w-[68ch] text-sm text-ink-faint">
            Cada chip lleva texto además de color. Nadie debería depender del tono para
            entender el estado de un asiento.
          </p>
        </Section>

        <Section
          n="02"
          title="Tipografía"
          note="Fira Sans para lo que se lee, Fira Mono para lo que se coteja: códigos de cuenta, RUT, IDs. Las ligaduras van desactivadas, porque un código de cuenta no es prosa. Base de 14px: es una herramienta de escritorio."
        >
          <div className="space-y-3">
            {[
              ['3xl / 28', 'text-3xl', 'Costo por hectárea'],
              ['2xl / 22', 'text-2xl', 'Libro diario · julio 2026'],
              ['xl / 18', 'text-xl', 'Distribución de mano de obra'],
              ['base / 14', 'text-base', 'Texto de interfaz por defecto'],
              ['sm / 13', 'text-sm', 'Fila de tabla en densidad alta'],
              ['xs / 12', 'text-xs', 'CABECERA DE COLUMNA'],
            ].map(([label, cls, sample]) => (
              <div key={label} className="flex items-baseline gap-6 border-b border-line pb-3">
                <span className="mono w-20 shrink-0 text-2xs text-ink-disabled">{label}</span>
                <span className={cn(cls, 'font-medium tracking-tight')}>{sample}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-md border border-line bg-surface p-4">
            <p className="text-2xs font-medium text-ink-muted">CIFRAS TABULARES</p>
            <div className="num mt-2 space-y-0.5 text-lg">
              <div>{CLP.format(18_051_250)}</div>
              <div>{CLP.format(1_298_200)}</div>
              <div>{CLP.format(940_675)}</div>
            </div>
            <p className="mt-3 max-w-[62ch] text-sm text-ink-faint">
              Los dígitos ocupan el mismo ancho, así que las unidades se alinean solas en
              columna. En un sistema donde cada pantalla es una columna de montos, esto no
              es un detalle estético.
            </p>
          </div>
        </Section>

        <Section
          n="03"
          title="Debe y haber no son bueno y malo"
          note="La tentación es pintar el debe de verde y el haber de rojo. Es un error: son estructura contable, no juicio. El color se reserva para lo que sí tiene valencia — que el asiento cuadre o no cuadre. La distinción debe/haber se resuelve con posición y peso."
        >
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-2xs tracking-wide text-ink-faint">
                  <th className="px-3 py-2 text-left font-medium">CUENTA</th>
                  <th className="px-3 py-2 text-left font-medium">DETALLE</th>
                  <th className="px-3 py-2 text-left font-medium">CC</th>
                  <th className="px-3 py-2 text-right font-medium">DEBE</th>
                  <th className="px-3 py-2 text-right font-medium">HABER</th>
                </tr>
              </thead>
              <tbody>
                {ASIENTO.map((l) => (
                  <tr
                    key={l.codigo + l.cuenta}
                    className="border-b border-line last:border-0 transition-colors duration-100 hover:bg-surface-sunken"
                  >
                    <td className="mono px-3 py-1.5 text-ink-faint">{l.codigo}</td>
                    <td className="px-3 py-1.5">{l.cuenta}</td>
                    <td className="mono px-3 py-1.5 text-2xs text-ink-faint">{l.cc}</td>
                    <td className="num px-3 py-1.5 text-right font-medium">
                      {l.debe ? CLP.format(l.debe) : <span className="text-ink-disabled">—</span>}
                    </td>
                    <td className="num px-3 py-1.5 text-right font-medium">
                      {l.haber ? CLP.format(l.haber) : <span className="text-ink-disabled">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-surface-sunken text-base font-semibold">
                  <td className="px-3 py-2" colSpan={3}>Totales</td>
                  <td className="num px-3 py-2 text-right">{CLP.format(debe)}</td>
                  <td className="num px-3 py-2 text-right">{CLP.format(haber)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => setCuadrado((c) => !c)}>
              Simular {cuadrado ? 'descuadre' : 'cuadratura'}
            </Button>
            {/* Éste sí merece animación: es un cambio de estado que hay que notar. */}
            <div aria-live="polite" className="min-h-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={cuadrado ? 'ok' : 'err'}
                  initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -4 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {cuadrado ? (
                    <Chip tone="success">Cuadra al peso · desvío 0</Chip>
                  ) : (
                    <Chip tone="danger">Descuadre de {CLP.format(Math.abs(desvio))}</Chip>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Section>

        <Section
          n="04"
          title="Controles"
          note="Radios contenidos, alturas de 32px, y presión que responde: todo elemento presionable escala a 0.97 en 160ms. Es el detalle que hace que la interfaz se sienta viva sin animar nada."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Contabilizar</Button>
            <Button variant="secondary">Exportar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Revertir asiento</Button>
            <Button variant="primary" disabled>Deshabilitado</Button>
          </div>
          <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
            <Field label="Código de cuenta" placeholder="1101" hint="4 dígitos, plan financiero" />
            <Field label="Centro de costo" placeholder="SANTINA21" />
            <Field label="Monto" placeholder="0" error="El asiento no cuadra" />
            <Field label="Glosa" placeholder="Remuneraciones julio" />
          </div>
          <div className="mt-6">
            <Button variant="primary" onClick={() => setModal(true)}>Abrir modal</Button>
          </div>
        </Section>

        <Section
          n="05"
          title="Motion"
          note="La pregunta no es cómo animar, sino si animar. Lo que se ve cien veces al día no se anima nunca: navegar entre módulos, filtrar una tabla, abrir la paleta de comandos. Se anima lo ocasional y lo que comunica un cambio de estado."
        >
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-2xs tracking-wide text-ink-faint">
                  <th className="px-3 py-2 text-left font-medium">ELEMENTO</th>
                  <th className="px-3 py-2 text-left font-medium">DURACIÓN</th>
                  <th className="px-3 py-2 text-left font-medium">CURVA</th>
                </tr>
              </thead>
              <tbody className="[&_td]:px-3 [&_td]:py-1.5">
                {[
                  ['Presión de botón', '160ms', 'ease-out'],
                  ['Fila de tabla en hover', '100ms', 'ease'],
                  ['Tooltip', '150ms', 'ease-out'],
                  ['Dropdown, select', '180ms', 'ease-out'],
                  ['Modal', '240ms', 'ease-out'],
                  ['Drawer', '320ms', 'ease-drawer'],
                  ['Navegación entre módulos', 'ninguna', '—'],
                  ['Recarga de datos en tabla', 'ninguna', '—'],
                ].map(([el, dur, curve]) => (
                  <tr key={el} className="border-b border-line last:border-0">
                    <td>{el}</td>
                    <td className={cn('mono text-2xs', dur === 'ninguna' && 'text-ink-disabled')}>{dur}</td>
                    <td className="mono text-2xs text-ink-faint">{curve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[68ch] text-sm text-ink-faint">
            Ninguna animación pasa de 300ms y ninguna usa <span className="mono">ease-in</span>,
            que retrasa el movimiento justo en el instante en que la persona está mirando.
            Con <span className="mono">prefers-reduced-motion</span> se conservan opacidad y
            color, y desaparece todo desplazamiento.
          </p>
        </Section>
      </main>

      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              className="absolute inset-0 bg-papel-950/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModal(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Confirmar contabilización"
              className="relative w-full max-w-sm rounded-lg border border-line bg-surface-raised p-5 shadow-overlay"
              /* Nunca desde scale(0): nada en el mundo real aparece de la nada. */
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.98, y: 0 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              <h3 className="text-lg font-semibold tracking-tight">Contabilizar julio 2026</h3>
              <p className="mt-1.5 text-base text-ink-faint">
                Se generará un asiento de {ASIENTO.length} líneas por {CLP.format(debe)}.
                La operación queda registrada en la bitácora.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button onClick={() => setModal(false)}>Cancelar</Button>
                <Button variant="primary" onClick={() => setModal(false)}>Confirmar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
