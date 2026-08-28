import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ProveedorContexto } from '@/lib/contexto'
import { router } from '@/router'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorContexto>
      <RouterProvider router={router} />
    </ProveedorContexto>
  </StrictMode>,
)
