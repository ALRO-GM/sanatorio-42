/**
 * Las fechas a mano del filtro de la Red (`NetworkPage`): cuándo lo escrito ya
 * es una fecha que se puede pedir.
 */

/** El primer año con correcciones en 42: antes no hay nada que pedir. */
const FIRST_YEAR = 2013

/**
 * Si una fecha escrita a mano (`YYYY-MM-DD`, o vacía: sin ese límite) ya se
 * puede pedir. Al teclear el año, el campo de fecha da por buena cada cifra
 * (0002, 0020, 0202…): con esas fechas el grafo salía vacío y la vuelta a la
 * vista de partida cambiaba lo escrito por un periodo fijo (#114 del buzón).
 */
function usableDay(value: string, now = Date.now()): boolean {
  if (value === '') return true
  const at = Date.parse(value)

  // Que exista: el 31 de febrero se lo tragaría `Date.parse` como el 3 de marzo.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(at) ||
    new Date(at).toISOString().slice(0, 10) !== value
  ) {
    return false
  }
  const year = Number(value.slice(0, 4))

  return year >= FIRST_YEAR && year <= new Date(now).getUTCFullYear() + 1
}

/** Si las dos fechas escritas a mano ya se pueden pedir: cada una válida y en orden. */
export function usableDates(from: string, to: string, now = Date.now()): boolean {
  return usableDay(from, now) && usableDay(to, now) && (from === '' || to === '' || from <= to)
}
