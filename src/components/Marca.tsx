/**
 * Marca de la empresa: un árbol sobre el surco.
 *
 * Va dibujada, no como archivo de imagen: así toma el color del tema —hereda
 * `currentColor`— y se ve nítida a cualquier tamaño, sin pedir una descarga
 * más al abrir el sistema.
 */
export function Marca({
  className, decorativa = false,
}: {
  className?: string
  /**
   * Cuando es puro adorno —la marca de agua del Home, por ejemplo— se oculta a
   * los lectores de pantalla. Si no, repetiría el nombre de la empresa que ya
   * está a un palmo, en la barra lateral.
   *
   * Va como prop y no como `aria-hidden` suelto porque TypeScript **no valida
   * los atributos con guion** en un componente propio: se descartaba en
   * silencio y parecía puesto.
   */
  decorativa?: boolean
}) {
  const accesibilidad = decorativa
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': 'Agrícola El Bosque' } as const)

  return (
    <svg
      viewBox="0 0 32 32" className={className} {...accesibilidad}
      fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    >
      {/* Copa: tres alturas, como un árbol de fruta bien podado. */}
      <path d="M16 4.5 9.5 13h3.2L7.5 20.5h17L19.3 13h3.2L16 4.5Z" fill="currentColor" fillOpacity="0.14" />
      {/* Tronco. */}
      <path d="M16 20.5v4" />
      {/* Surcos del campo. */}
      <path d="M4 27h24M7.5 30h17" strokeOpacity="0.55" />
    </svg>
  )
}
