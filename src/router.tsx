import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Trabajadores from '@/pages/Trabajadores'
import Tarja from '@/pages/Tarja'
import Semillas from '@/pages/Semillas'
import DesignSystem from '@/pages/DesignSystem'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/rrhh/trabajadores" replace /> },
      // RRHH es el módulo padre; tarja y semillas cuelgan de él.
      { path: 'rrhh', element: <Navigate to="/rrhh/trabajadores" replace /> },
      { path: 'rrhh/trabajadores', element: <Trabajadores /> },
      { path: 'rrhh/tarja', element: <Tarja /> },
      { path: 'rrhh/semillas', element: <Semillas /> },
      { path: 'sistema/design', element: <DesignSystem /> },
    ],
  },
])
