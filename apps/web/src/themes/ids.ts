/**
 * Qué estilos hay y cuáles son de alguien en concreto, sin las hojas de estilos
 * ni las letras: así lo puede leer también la API (lo comprueba un test suyo),
 * que es quien no deja poner un estilo exclusivo a otra persona.
 */

/** Los estilos que puede elegir cualquiera, en el orden del selector. */
export const PUBLIC_STYLES = ['clinica', 'terminal', 'historial', 'espacio', 'libre'] as const

/**
 * Estilos hechos para una persona: solo los ven en el selector sus dueñas, y
 * quien visita su expediente lo ve con él. Para dar uno nuevo, se añade aquí con
 * sus logins (y en `modules/profile/styles.rules.ts` de la API).
 */
export const EXCLUSIVE_STYLES: Readonly<Record<string, readonly string[]>> = {
  // Pedido por acamelo en el buzón: negro, rosa, fucsia y oro, y leopardo.
  bichota: ['acamelo'],
}

/** `true` si esa persona puede usar ese estilo. Los que no son exclusivos, cualquiera. */
export function canUseStyle(style: string, login: string): boolean {
  const owners = EXCLUSIVE_STYLES[style]

  return owners === undefined || owners.includes(login)
}
