/**
 * Orden de una tabla por varias columnas, con prioridades.
 *
 * Cada clic en una cabecera la pone la primera en mandar; las que se pulsaron
 * antes deciden los empates, en el orden en que se pulsaron. Si se ordena por
 * nivel y después por correcciones, quienes tienen las mismas correcciones
 * salen ordenados por nivel.
 */

export type SortDir = 'asc' | 'desc'

/** Una columna del orden. La primera de la lista es la que más manda. */
export type SortKey = { id: string; dir: SortDir }

export type SortValue = number | string | null | undefined

/**
 * El orden después de pulsar la cabecera `id`. Si ya era la que más mandaba,
 * cambia de sentido; si no, pasa a mandar con su sentido de entrada (de mayor a
 * menor en los números, de la A a la Z en los textos) y las demás quedan detrás.
 */
export function pressColumn(order: readonly SortKey[], id: string, first: SortDir): SortKey[] {
  const [top] = order

  if (top?.id === id) {
    return [{ id, dir: top.dir === 'asc' ? 'desc' : 'asc' }, ...order.slice(1)]
  }

  return [{ id, dir: first }, ...order.filter((key) => key.id !== id)]
}

/** Compara dos valores: lo vacío siempre al final, los textos sin tildes ni mayúsculas. */
function compare(a: SortValue, b: SortValue, dir: SortDir): number {
  const emptyA = a === null || a === undefined || a === ''
  const emptyB = b === null || b === undefined || b === ''

  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1

  const sign = dir === 'asc' ? 1 : -1

  if (typeof a === 'number' && typeof b === 'number') return (a - b) * sign

  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' }) * sign
}

/**
 * Las filas ordenadas. Las que empatan en todas las columnas del orden se
 * quedan como venían.
 *
 * @param valueOf El valor de una fila en una columna.
 */
export function sortRows<T>(
  rows: readonly T[],
  order: readonly SortKey[],
  valueOf: (row: T, column: string) => SortValue,
): T[] {
  if (order.length === 0) return [...rows]

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const { id, dir } of order) {
        const result = compare(valueOf(a.row, id), valueOf(b.row, id), dir)

        if (result !== 0) return result
      }

      return a.index - b.index
    })
    .map(({ row }) => row)
}

/** El valor por el que se ordena una celda de texto: el número si lo es, si no el texto. */
export function cellValue(cell: string | number | null | undefined): SortValue {
  if (cell === null || cell === undefined || cell === '') return null
  if (typeof cell === 'number') return cell

  const number = Number(cell.replace(',', '.'))

  return Number.isFinite(number) ? number : cell
}
