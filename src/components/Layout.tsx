import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

interface SubItem { to: string; label: string; desc: string }

/** RRHH es un módulo con subcategorías: la tarja y las semillas viven dentro,
 *  no al lado. La jerarquía del menú refleja la del negocio. */
const RRHH_SUB: SubItem[] = [
  { to: '/rrhh/trabajadores', label: 'Trabajadores', desc: 'Ficha, cargo y datos bancarios' },
  { to: '/rrhh/tarja', label: 'Tarja', desc: 'Asistencia y labor por día' },
  { to: '/rrhh/semillas', label: 'Semillas', desc: 'Pack motivacional por desempeño' },
]

function ModuloRRHH() {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const disparador = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const activo = pathname.startsWith('/rrhh')

  // Al navegar, el menú se cierra solo.
  useEffect(() => setAbierto(false), [pathname])

  useEffect(() => {
    if (!abierto) return
    const alClick = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        disparador.current?.focus()
      }
    }
    document.addEventListener('mousedown', alClick)
    document.addEventListener('keydown', alTeclado)
    return () => {
      document.removeEventListener('mousedown', alClick)
      document.removeEventListener('keydown', alTeclado)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={disparador}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className={cn(
          'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-base font-medium',
          'transition-colors duration-150 ease-out',
          activo ? 'bg-primary-tint text-primary-text' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )}
      >
        RRHH
        <svg
          viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            aria-label="Submódulos de RRHH"
            /* Origen en el disparador, no en el centro: el menú crece desde
               donde se hizo clic. Nunca desde scale(0). */
            className="absolute left-0 top-full z-30 mt-1.5 w-64 origin-top-left rounded-md border border-line bg-surface-raised p-1 shadow-overlay"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : -2 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {RRHH_SUB.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                role="menuitem"
                className={({ isActive }) =>
                  cn(
                    'block cursor-pointer rounded-sm px-2.5 py-2 transition-colors duration-100',
                    isActive ? 'bg-primary-tint' : 'hover:bg-surface-sunken',
                  )
                }
              >
                <span className="block text-base font-medium">{s.label}</span>
                <span className="block text-2xs text-ink-faint">{s.desc}</span>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const enlaceSimple = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex h-8 items-center rounded-sm px-2.5 text-base font-medium transition-colors duration-150 ease-out',
    isActive ? 'bg-primary-tint text-primary-text' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  )

function SubNav() {
  return (
    <nav aria-label="Secciones de RRHH" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {RRHH_SUB.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) =>
              cn(
                'relative cursor-pointer px-3 py-2.5 text-base font-medium transition-colors duration-150 ease-out',
                isActive ? 'text-ink' : 'text-ink-faint hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {s.label}
                {isActive && (
                  <motion.span
                    layoutId="subnav-activo"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const [oscuro, setOscuro] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
  }, [oscuro])

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <NavLink to="/" className="shrink-0 truncate text-base font-semibold tracking-tight">
            Agrícola El Bosque
          </NavLink>

          <nav aria-label="Módulos" className="flex items-center gap-1">
            <ModuloRRHH />
            <NavLink to="/sistema/design" className={enlaceSimple}>
              <span className="hidden sm:inline">Design system</span>
              <span className="sm:hidden">Design</span>
            </NavLink>
          </nav>

          <button
            onClick={() => setOscuro((o) => !o)}
            className="ml-auto inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-sm border border-line-strong px-2.5 text-xs font-medium transition-colors duration-150 ease-out hover:bg-surface-sunken"
          >
            {oscuro ? 'Claro' : 'Oscuro'}
          </button>
        </div>
      </header>

      {pathname.startsWith('/rrhh') && <SubNav />}

      <main id="contenido" className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
