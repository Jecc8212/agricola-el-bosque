import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { SinAcceso } from '@/components/SinAcceso'
import { useAuth } from '@/lib/auth'

/* Cada módulo viaja en su propio archivo: quien entra a ver la asistencia no
   paga la contabilidad, ni el especimen del design system. */
const Home = lazy(() => import('@/pages/Home'))
const PlanCuentas = lazy(() => import('@/pages/PlanCuentas'))
const Trabajadores = lazy(() => import('@/pages/Trabajadores'))
const Asistencia = lazy(() => import('@/pages/Asistencia'))
const TomarAsistencia = lazy(() => import('@/pages/TomarAsistencia'))
const Tarja = lazy(() => import('@/pages/Tarja'))
const Semillas = lazy(() => import('@/pages/Semillas'))
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
      { path: 'rrhh/tomar-asistencia', element: pagina(TomarAsistencia, 'rrhh') },
      { path: 'rrhh/tarja', element: pagina(Tarja, 'rrhh') },
      { path: 'rrhh/semillas', element: pagina(Semillas, 'rrhh') },

      { path: 'maestros/labores', element: pagina(Labores, 'maestros') },
      { path: 'maestros/centros-costo', element: pagina(CentrosCosto, 'maestros') },
      { path: 'maestros/campos', element: pagina(Campos, 'maestros') },
      { path: 'maestros/temporadas', element: pagina(Temporadas, 'maestros') },
      { path: 'maestros/modalidades', element: pagina(Modalidades, 'maestros') },

      { path: 'sistema/usuarios', element: pagina(Usuarios, 'sistema') },
      { path: 'sistema/design', element: pagina(DesignSystem, 'sistema') },
    ],
  },
])
