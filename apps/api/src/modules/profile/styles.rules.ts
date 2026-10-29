/**
 * Con qué estilo se ve el expediente de cada persona cuando lo visita otra.
 *
 * Las listas son las de la web (`apps/web/src/themes/ids.ts`); un test
 * comprueba que no se separan. Aquí están para que nadie se ponga, con una
 * petición a mano, un estilo hecho para otra persona.
 */

/** Los estilos de todo el mundo. */
export const PUBLIC_STYLES = [
  'peer4u',
  'clinica',
  'terminal',
  'historial',
  'espacio',
  'libre',
] as const

/** Estilos hechos para alguien: solo sus dueñas los pueden usar. */
export const EXCLUSIVE_STYLES: Readonly<Record<string, readonly string[]>> = {
  bichota: ['acamelo'],
}

/** Lo que se guarda para decir «que cada cual lo vea con su estilo». */
export const NO_RECORD_STYLE = 'none'

/** `true` si ese estilo existe. */
export function isStyle(style: string): boolean {
  return (PUBLIC_STYLES as readonly string[]).includes(style) || style in EXCLUSIVE_STYLES
}

/** `true` si esa persona puede usar ese estilo. Los que no son exclusivos, cualquiera. */
export function canUseStyle(style: string, login: string): boolean {
  const owners = EXCLUSIVE_STYLES[style]

  return owners === undefined ? isStyle(style) : owners.includes(login)
}

/** El primer estilo hecho para esa persona, si tiene alguno. */
export function exclusiveStyleOf(login: string): string | null {
  return Object.entries(EXCLUSIVE_STYLES).find(([, owners]) => owners.includes(login))?.[0] ?? null
}

/**
 * El estilo con el que se ve su expediente, o `null` si cada cual lo ve con el
 * suyo. Sin elegir nada, quien tiene un estilo exclusivo lo enseña: para eso se
 * lo hicieron. Lo que se guardó y ya no vale (un estilo que se quitó, o que dejó
 * de ser suyo) cuenta como no elegido.
 */
export function recordStyleOf(login: string, stored: string | null): string | null {
  if (stored === NO_RECORD_STYLE) return null
  if (stored !== null && canUseStyle(stored, login)) return stored

  return exclusiveStyleOf(login)
}
