/**
 * Cuánto mide cada puesto para que el clúster quepa a lo ancho
 * (`docs/asientos.md`, «Clústeres grandes»).
 *
 * Los de Madrid caben de sobra a tamaño real; los de París (13 × 23, y hasta
 * 20 × 30 en el simulado) no: sin esto, había que deslizar el plano de lado
 * para verlo entero. Ahora los puestos se encogen hasta caber, con tres
 * formas según lo que quede:
 *
 * - `faces`: con la cara de quien está sentado (de `FACES_FROM` px para arriba);
 * - `initials`: la inicial, sin foto (de `INITIALS_FROM` px);
 * - `dots`: solo el color del puesto, como un punto (hasta `MIN_SEAT` px).
 *
 * Por debajo de `MIN_SEAT` no se encoge más: el plano vuelve a deslizarse de
 * lado. Con «100 %» (`fit: false`) se ve a tamaño real, con caras, y se desliza.
 */

export type Density = 'faces' | 'initials' | 'dots'

export type SeatFit = {
  /** Lado de cada puesto, en px. */
  size: number
  /** Hueco entre puestos de una fila, en px. */
  gap: number
  density: Density
  /** Si a tamaño real no cabe: solo entonces tiene sentido ofrecer «Ajustar» y «100 %». */
  overflows: boolean
}

/** Tamaño real de un puesto: el de siempre, y un poco menos en el móvil. */
export const FULL_SEAT = 48
export const FULL_SEAT_NARROW = 40
/** Ancho de caja por debajo del cual se usa `FULL_SEAT_NARROW` (el móvil). */
const NARROW = 520

const FACES_FROM = 28
const INITIALS_FROM = 18
export const MIN_SEAT = 8

/** Lo que ocupa la columna con el número de fila, más su margen. */
export const ROW_LABEL = 30

/** El hueco entre puestos va en proporción al puesto (9 px con 48). */
const gapFor = (size: number): number => Math.max(2, Math.round(size * 0.19))

function densityOf(size: number): Density {
  if (size >= FACES_FROM) return 'faces'
  if (size >= INITIALS_FROM) return 'initials'

  return 'dots'
}

/** El tamaño real en una caja de ese ancho (en el móvil, algo menor). */
function fullSeat(width: number | null): number {
  return width !== null && width > 0 && width <= NARROW ? FULL_SEAT_NARROW : FULL_SEAT
}

/**
 * El tamaño de los puestos para `columns` puestos por fila en una caja de
 * `width` px. Sin medida todavía (`null`, o el primer pintado), tamaño real.
 */
export function fitSeats(width: number | null, columns: number, fit = true): SeatFit {
  const full = fullSeat(width)
  const fullGap = gapFor(full)
  const fullWidth = ROW_LABEL + columns * full + Math.max(0, columns - 1) * fullGap
  const overflows = width !== null && width > 0 && fullWidth > width

  if (!fit || !overflows) {
    return { size: full, gap: fullGap, density: 'faces', overflows }
  }

  // n·s + (n−1)·0,19·s ≤ ancho − etiqueta, y se redondea hacia abajo.
  const room = width - ROW_LABEL
  const size = Math.max(MIN_SEAT, Math.floor(room / (columns + 0.19 * (columns - 1))))
  let gap = gapFor(size)

  // El redondeo del hueco puede pasarse por un píxel o dos: se recorta.
  while (gap > 1 && columns * size + (columns - 1) * gap > room) gap -= 1

  return { size, gap, density: densityOf(size), overflows }
}
