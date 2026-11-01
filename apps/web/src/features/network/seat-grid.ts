/**
 * La cuadrícula de pesos de los puestos del panel (`SeatWeightsPanel.tsx`,
 * `docs/asientos.md`): tres filas (delante, la suya, atrás) de siete puestos,
 * vistos desde un puesto norte; el centro es la propia persona.
 *
 * La API pesa cada pareja con la media de mirarla desde los dos puestos. Para
 * dos puestos que miran igual (a distancia par), lo que uno ve en una casilla
 * el otro lo ve girado media vuelta (delante ↔ atrás, izquierda ↔ derecha); a
 * distancia impar (enfrente) es la misma casilla. Por eso, de entrada, cambiar
 * una casilla cambia también su pareja: así el peso escrito es el que cuenta.
 */

export type Cell = { row: number; column: number }

export const ROWS = 3
export const COLUMNS = 7
/** Columna de la propia persona. */
export const CENTRE = 3
/** Fila de la propia persona. */
const OWN = 1

/** Lo más que pesa un puesto (`MAX_SEAT_WEIGHT` en la API). */
export const MAX_WEIGHT = 10

export const cellKey = (cell: Cell): string => `${String(cell.row)}:${String(cell.column)}`

export const isCentre = (cell: Cell): boolean => cell.row === OWN && cell.column === CENTRE

/** Si el puesto mira al revés que el del centro (a distancia impar). */
export const facesAway = (cell: Cell): boolean => Math.abs(cell.column - CENTRE) % 2 === 1

/** La casilla con la que va de pareja: la misma si mira al revés; si no, girada media vuelta. */
export function partnerOf(cell: Cell): Cell {
  return facesAway(cell) ? cell : { row: ROWS - 1 - cell.row, column: COLUMNS - 1 - cell.column }
}

/** La misma casilla al otro lado (izquierda ↔ derecha). */
const mirrorOf = (cell: Cell): Cell => ({ row: cell.row, column: COLUMNS - 1 - cell.column })

/** Opciones de lo que se cambia junto con cada casilla. */
export type Linking = { partner: boolean; mirror: boolean }

/** Las casillas que cambian al cambiar las elegidas, con lo que arrastran. Nunca el centro. */
export function reach(cells: readonly Cell[], linking: Linking): Cell[] {
  const found = new Map<string, Cell>()
  const queue = [...cells]

  for (let cell = queue.pop(); cell !== undefined; cell = queue.pop()) {
    const key = cellKey(cell)

    if (found.has(key) || isCentre(cell)) continue
    found.set(key, cell)
    if (linking.partner) queue.push(partnerOf(cell))
    if (linking.mirror) queue.push(mirrorOf(cell))
  }

  return [...found.values()]
}

/** Pone `value` (de 0 a `MAX_WEIGHT`, con dos decimales) en esas casillas. */
export function applyWeight(
  grid: readonly number[][],
  cells: readonly Cell[],
  value: number,
): number[][] {
  const clean = Math.round(Math.min(MAX_WEIGHT, Math.max(0, value)) * 100) / 100
  const keys = new Set(cells.filter((cell) => !isCentre(cell)).map(cellKey))

  return grid.map((row, at) =>
    row.map((current, column) => (keys.has(cellKey({ row: at, column })) ? clean : current)),
  )
}

/** Las casillas de una fila, sin el centro. */
export const rowCells = (row: number): Cell[] =>
  Array.from({ length: COLUMNS }, (_, column) => ({ row, column })).filter(
    (cell) => !isCentre(cell),
  )

/** Todas las casillas, sin el centro. */
export const allCells = (): Cell[] => Array.from({ length: ROWS }, (_, row) => rowCells(row)).flat()

/** `true` si dos cuadrículas pesan igual. */
export const sameGrid = (a: readonly number[][], b: readonly number[][]): boolean =>
  a.length === b.length &&
  a.every((row, at) => row.every((value, column) => value === b[at]?.[column]))
