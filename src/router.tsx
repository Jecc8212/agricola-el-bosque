import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SinAcceso } from '@/components/SinAcceso'
import { useAuth } from '@/lib/auth'
const Cargos = lazy(() => import('@/pages/Cargos'))
const Epp = lazy(() => import('@/pages/Epp'))
const Respaldo = lazy(() => import('@/pages/Respaldo'))

/* Cada módulo viaja en su propio archivo: quien entra a ver la asistencia no
   paga la contabilidad, ni el especimen del design system. */
const Home = lazy(() => import('@/pages/Home'))
const PlanCuentas = lazy(() => import('@/pages/PlanCuentas'))
const Trabajadores = lazy(() => import('@/pages/Trabajadores'))
const Asistencia = lazy(() => import('@/pages/Asistencia'))
const Sueldos = lazy(() => import('@/pages/Sueldos'))
const Indicadores = lazy(() => import('@/pages/Indicadores'))
const Especies = lazy(() => import('@/pages/Especies'))
const TomarAsistencia = lazy(() => import('@/pages/TomarAsistencia'))
const Labores = lazy(() => import('@/pages/Labores'))
const CentrosCosto = lazy(() => import('@/pages/CentrosCosto'))
const Campos = lazy(() => import('@/pages/Campos'))
const Temporadas = lazy(() => import('@/pages/Temporadas'))
const Modalidades = lazy(() => import('@/pages/Modalidades'))
const Usuarios = lazy(() => import('@/pages/Usuarios'))
const DesignSystem = lazy(() => import('@/pages/DesignSystem'))

/** Ocultar el enlace del menú no es control de acceso: la ruta también cierra. */
function Protegido({ seccion, children }: { seccion: string; children: React.ReactNode }) {
  const { puedeVer } = useAuth()
  if (!puedeVer(seccion)) return <SinAcceso seccion={seccion} />
  return <>{children}</>
}

const pagina = (C: ComponentType, seccion: string) => (
  <Protegido seccion={seccion}>
    <Suspense fallback={<p className="text-base text-ink-faint">Cargando módulo…</p>}>
      <C />
    </Suspense>
  </Protegido>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // Lo primero tras el login es el resumen de costos.
      { index: true, element: pagina(Home, 'home') },

      { path: 'cuentas', element: pagina(PlanCuentas, 'cuentas') },

      { path: 'rrhh', element: <Navigate to="/rrhh/trabajadores" replace /> },
      { path: 'rrhh/trabajadores', element: pagina(Trabajadores, 'rrhh') },
      { path: 'rrhh/asistencia', element: pagina(Asistencia, 'rrhh') },
      { path: 'rrhh/sueldos', element: pagina(Sueldos, 'rrhh') },
      { path: 'indicadores', element: pagina(Indicadores, 'cuentas') },
      { path: 'rrhh/tomar-asistencia', element: pagina(TomarAsistencia, 'pasar-lista') },

      { path: 'maestros/cargos', element: pagina(Cargos, 'maestros') },
      { path: 'maestros/epp', element: pagina(Epp, 'maestros') },
      { path: 'maestros/labores', element: pagina(Labores, 'maestros') },
      { path: 'maestros/especies', element: pagina(Especies, 'maestros') },
      { path: 'maestros/centros-costo', element: pagina(CentrosCosto, 'maestros') },
      { path: 'maestros/campos', element: pagina(Campos, 'maestros') },
      { path: 'maestros/temporadas', element: pagina(Temporadas, 'maestros') },
      { path: 'maestros/modalidades', element: pagina(Modalidades, 'maestros') },

      { path: 'sistema/usuarios', element: pagina(Usuarios, 'sistema') },
      { path: 'sistema/respaldo', element: pagina(Respaldo, 'sistema') },
      { path: 'sistema/design', element: pagina(DesignSystem, 'sistema') },
    ],
  },
])
