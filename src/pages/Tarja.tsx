import { EnConstruccion } from '@/components/EnConstruccion'

export default function Tarja() {
  return (
    <EnConstruccion
      titulo="Tarja"
      resumen="La grilla mensual de trabajador × día: labor, centro de costo, hora de llegada y tipo de jornada. Reemplaza los cuatro formatos de tarja que hoy conviven, uno por campo."
      depende={[
        'Ficha de trabajador — ya disponible en Trabajadores',
        'Maestro de labores N6–N7',
        'Cuarteles y centros de costo por campo',
      ]}
    />
  )
}
