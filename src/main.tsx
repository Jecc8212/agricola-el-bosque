import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Salvavidas } from '@/components/Salvavidas'
import { ProveedorMaestros } from '@/lib/maestros'
import { ProveedorContexto } from '@/lib/contexto'
import { ProveedorAuth } from '@/lib/auth'
import { Puerta } from '@/Puerta'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envuelve a todo, proveedores incluidos: un fallo ahí dentro daba
        pantalla en blanco sin explicación ni salida. */}
    <Salvavidas>
      {/* Los maestros van por fuera: el contexto de filtros se apoya en ellos
          para resolver nombres y descartar selecciones ya eliminadas. */}
      <ProveedorMaestros>
        <ProveedorAuth>
          <ProveedorContexto>
            <Puerta />
          </ProveedorContexto>
        </ProveedorAuth>
      </ProveedorMaestros>
    </Salvavidas>
  </StrictMode>,
)
