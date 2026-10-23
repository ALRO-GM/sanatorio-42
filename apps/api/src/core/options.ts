/**
 * Dependencias opcionales de los servicios (`now`, `log`, `random`…).
 *
 * Con `exactOptionalPropertyTypes` no se puede pasar `undefined` en una clave
 * opcional, así que cada sitio hacía `...(deps.x === undefined ? {} : { x: deps.x })`
 * por cada una. `given` quita las claves sin valor de una vez.
 */

/** Las claves con valor; las `undefined` desaparecen. */
export function given<T extends object>(
  options: T,
): { [K in keyof T]-?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]-?: Exclude<T[K], undefined>
  }
}

/** Un reloj inyectable: los tests lo fijan; en producción es `Date.now`. */
export type Clock = { now?: () => number }

/** Un registro inyectable: los tests lo callan; en producción escribe en stderr. */
export type Logger = { log?: (message: string) => void }

/** El reloj de unas opciones, con `Date.now` si no se inyectó otro. */
export const clockOf = (options: Clock): (() => number) => options.now ?? Date.now

/** El registro de unas opciones; sin él, no se escribe nada. */
export const loggerOf = (options: Logger): ((message: string) => void) =>
  options.log ?? (() => undefined)
