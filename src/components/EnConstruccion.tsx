interface Props {
  titulo: string
  resumen: string
  depende: string[]
}

/** Placeholder honesto: dice qué falta y de qué depende, en vez de fingir
 *  una pantalla con datos que no existen. */
export function EnConstruccion({ titulo, resumen, depende }: Props) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-base text-ink-faint">{resumen}</p>

      <div className="mt-6 rounded-md border border-line bg-surface p-4">
        <p className="text-2xs font-medium tracking-wide text-ink-faint">AÚN NO CONSTRUIDO</p>
        <p className="mt-2 text-base">Depende de:</p>
        <ul className="mt-2 space-y-1.5">
          {depende.map((d) => (
            <li key={d} className="flex gap-2 text-sm text-ink-muted">
              <span aria-hidden="true" className="text-ink-disabled">—</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
