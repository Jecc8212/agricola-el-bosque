/** Une clases condicionales. Tres líneas en vez de una dependencia. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
