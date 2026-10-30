import { NavLink } from 'react-router-dom'
import { Marca } from '@/components/Marca'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'

type Seccion = { clave: string; titulo: string; items: Array<{ to: string; label: string }> }

/* Cuentas va arriba: es la espina dorsal de la que cuelga todo lo demás —la
   modalidad de asistencia imputa a una cuenta, y el cargo también. */
const SECCIONES: Seccion[] = [
  { clave: 'home', titulo: 'Inicio', items: [{ to: '/', label: 'Home' }] },
  {
    clave: 'cuentas',
    titulo: 'Contabilidad',
    items: [
      { to: '/cuentas', label: 'Master de cuentas' },
      { to: '/indicadores', label: 'Indicadores' },
    ],
  },
  {
    clave: 'pasar-lista',
    titulo: 'Jornada',
    items: [{ to: '/rrhh/tomar-asistencia', label: 'Tomar asistencia' }],
  },
  {
    clave: 'rrhh',
    titulo: 'Recursos humanos',
    items: [
      { to: '/rrhh/trabajadores', label: 'Trabajadores' },
      { to: '/rrhh/asistencia', label: 'Asistencia' },
      { to: '/rrhh/sueldos', label: 'Sueldos' },
    ],
  },
  {
    clave: 'maestros',
    titulo: 'Maestros',
    items: [
      { to: '/maestros/labores', label: 'Labores' },
      { to: '/maestros/especies', label: 'Especies y variedades' },
      { to: '/maestros/centros-costo', label: 'Centros de costo' },
      { to: '/maestros/campos', label: 'Campos' },
      { to: '/maestros/temporadas', label: 'Temporadas' },
      { to: '/maestros/modalidades', label: 'Modalidades' },
    ],
  },
  {
    clave: 'sistema',
    titulo: 'Configuración',
    items: [
      { to: '/sistema/usuarios', label: 'Usuarios y accesos' },
      { to: '/sistema/respaldo', label: 'Respaldo' },
      { to: '/sistema/design', label: 'Design system' },
    ],
  },
]

export function Sidebar({ onNavegar }: { onNavegar?: () => void }) {
  const { puedeVer } = useAuth()

  return (
    <div className="flex h-full flex-col bg-surface-sunken">
      <NavLink
        to="/" onClick={onNavegar}
        className="flex items-center gap-2.5 border-b border-line px-4 py-3.5"
      >
        <Marca className="h-8 w-8 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold leading-tight tracking-tight">
            Agrícola El Bosque
          </span>
          <span className="block text-2xs text-ink-faint">Sistema de gestión</span>
        </span>
      </NavLink>

      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-2 py-3">
        {SECCIONES.filter((s) => puedeVer(s.clave)).map((s) => (
          <div key={s.titulo} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-2xs font-semibold tracking-wide text-ink-faint">
              {s.titulo.toUpperCase()}
            </p>
            {s.items.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onNavegar}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-sm py-1.5 pl-3 pr-2',
                    'cursor-pointer text-base transition-colors duration-150 ease-out',
                    isActive
                      ? 'bg-primary-tint font-medium text-primary-text'
                      : 'text-ink-muted hover:bg-surface hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Barra de acento: el estado activo se lee de reojo. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors duration-150',
                        isActive ? 'bg-primary' : 'bg-transparent',
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}
