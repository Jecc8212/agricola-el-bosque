import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Sidebar } from '@/components/Sidebar'
import { BarraFiltros } from '@/components/BarraFiltros'
import { Marca } from '@/components/Marca'
import { nombreRol, useAuth } from '@/lib/auth'

/** Rutas donde la franja de filtros no pinta nada. */
const SIN_FILTROS = new Set(['/sistema/usuarios'])

export function Layout() {
  const { pathname } = useLocation()
  const [oscuro, setOscuro] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const reduce = useReducedMotion()
  const { sesion, salir } = useAuth()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
  }, [oscuro])

  useEffect(() => setMenuAbierto(false), [pathname])

  useEffect(() => {
    if (!menuAbierto) return
    const alTeclado = (e: KeyboardEvent) => e.key === 'Escape' && setMenuAbierto(false)
    document.addEventListener('keydown', alTeclado)
    return () => document.removeEventListener('keydown', alTeclado)
  }, [menuAbierto])

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Saltar al contenido
      </a>

      {/* Escritorio: barra lateral fija. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line lg:block">
        <Sidebar />
      </aside>

      {/* Móvil: la misma barra, como cajón. */}
      <AnimatePresence>
        {menuAbierto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-papel-950/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuAbierto(false)}
            />
            <motion.div
              className="relative h-full w-72 max-w-[85vw] border-r border-line"
              initial={{ x: reduce ? 0 : '-100%', opacity: reduce ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduce ? 0 : '-100%', opacity: reduce ? 0 : 1 }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            >
              <Sidebar onNavegar={() => setMenuAbierto(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-sm sm:px-6">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <span className="flex items-center gap-2 lg:hidden">
            <Marca className="h-6 w-6 text-primary" />
            <span className="text-base font-semibold tracking-tight">Agrícola El Bosque</span>
          </span>

          <button
            onClick={() => setOscuro((o) => !o)}
            className="ml-auto inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-sm border border-line-strong px-2.5 text-xs font-medium transition-colors duration-150 ease-out hover:bg-surface-sunken"
          >
            {oscuro ? 'Claro' : 'Oscuro'}
          </button>

          {sesion && (
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-medium leading-tight">{sesion.nombre}</span>
                <span className="block text-2xs leading-tight text-ink-faint">{nombreRol(sesion.rol)}</span>
              </span>
              <button
                onClick={salir}
                className="inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-sm border border-line-strong px-2.5 text-xs font-medium transition-colors duration-150 ease-out hover:bg-surface-sunken"
              >
                Salir
              </button>
            </div>
          )}
        </header>

        {/* Home resume todos los centros y Usuarios no depende del contexto:
            en esas dos el filtro no acota nada y sólo ocupa sitio. */}
        {!SIN_FILTROS.has(pathname) && <BarraFiltros />}

        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
