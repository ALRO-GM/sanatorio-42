/**
 * Dos utilidades que comparten el cliente de 42 y su regulador de ritmo.
 */

/** Lee una cabecera como entero. `undefined` si no está o no es un número. */
export function readInt(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name)

  if (raw === null || raw.trim() === '') {
    return undefined
  }

  const parsed = Number(raw)

  return Number.isNaN(parsed) ? undefined : parsed
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
