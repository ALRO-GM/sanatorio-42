/** El valor, o el test falla diciendo qué faltaba. */
export function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`no hay ${what}`)

  return value
}
