import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProveedorMaestros } from '@/lib/maestros'
import { ProveedorContexto } from '@/lib/contexto'
import { ProveedorAuth } from '@/lib/auth'
import { Puerta } from '@/Puerta'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Los maestros van por fuera: el contexto de filtros se apoya en ellos
        para resolver nombres y descartar selecciones ya eliminadas. */}
    <ProveedorMaestros>
      <ProveedorAuth>
        <ProveedorContexto>
          <Puerta />
        </ProveedorContexto>
      </ProveedorAuth>
    </ProveedorMaestros>
  </StrictMode>,
)
