/**
 * Las cuentas del deslizador (`RangeSlider`), sueltas para probarlas sin pintar
 * nada: dónde cae cada valor en la barra, a qué valor se pega el tirador y cuánto
 * se afina al alejarse de la barra.
 *
 * Todo se hace en dos espacios: el **valor** (lo que se elige: 14 %, 3
 * correcciones) y la **posición** (de 0 a 1 a lo largo de la barra). La curva
 * dice cómo se pasa de uno a otro: recta o logarítmica, para cuando unos pocos
 * valores enormes se comerían casi toda la barra.
 */

export type Curve = 'linear' | 'log'

/** La rejilla de valores que admite un deslizador, independiente de los datos. */
export type Grid = {
  min: number
  max: number
  /** De cuánto en cuánto: 1 para porcentajes y recuentos. */
  step: number
  curve: Curve
}

/** A partir de cuántos píxeles de la barra (en vertical) empieza el ajuste fino. */
export const FINE_FROM = 32
/** Lo más que se afina: a esa distancia o más, ocho píxeles de ratón mueven uno. */
export const MAX_ZOOM = 8
/** Radio del imán de los valores redondos, en píxeles de movimiento. */
const MAGNET_PX = 6
/**
 * El imán no tapa más de esta parte del hueco entre dos valores redondos: así,
 * en una barra estrecha, los de en medio se siguen pudiendo coger.
 */
const MAGNET_SHARE = 0.35
/**
 * El imán tampoco llega a más de esta parte de un paso: atrae al valor redondo
 * pero no se come a sus vecinos (con el 15 cerca, el 14 se sigue pudiendo coger).
 */
const MAGNET_STEPS = 0.6
/**
 * Para dejar un valor hace falta pasar algo más allá de la mitad del paso: si
 * no, un pulso que tiembla justo en la frontera saltaría entre dos números.
 */
const HOLD = 0.65

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value))

/** Los decimales del paso, para que `0.1 + 0.2` no se quede en `0.30000000000000004`. */
function decimalsOf(step: number): number {
  const text = String(step)

  return text.includes('.') ? (text.split('.')[1]?.length ?? 0) : 0
}

/** Dónde cae `value` en la barra, de 0 (inicio) a 1 (final). */
export function toPosition(value: number, grid: Grid): number {
  const span = grid.max - grid.min

  if (span <= 0) return 0
  const offset = clamp(value, grid.min, grid.max) - grid.min

  return grid.curve === 'log' ? Math.log1p(offset) / Math.log1p(span) : offset / span
}

/** El valor (sin redondear) que hay en una posición de la barra. */
export function fromPosition(position: number, grid: Grid): number {
  const span = grid.max - grid.min
  const at = clamp(position, 0, 1)

  return grid.min + (grid.curve === 'log' ? Math.expm1(at * Math.log1p(span)) : at * span)
}

/** El valor de la rejilla más cercano: múltiplo del paso desde el mínimo y dentro de los topes. */
export function onGrid(value: number, grid: Grid): number {
  if (!Number.isFinite(value)) return grid.min
  const steps = Math.round((value - grid.min) / grid.step)
  const snapped = clamp(grid.min + steps * grid.step, grid.min, grid.max)

  return Number(snapped.toFixed(decimalsOf(grid.step)))
}

/** 1, 2, 5, 10, 20, 25, 50, 100…: los pasos «redondos» que se le entienden a una persona. */
function niceUnits(limit: number): number[] {
  const units: number[] = []

  for (let power = 1; power <= limit * 10; power *= 10) {
    units.push(power, power * 2, power * 2.5, power * 5)
  }

  return units
}

/**
 * Los valores redondos a los que se pega el tirador: los extremos y, en la
 * recta, los múltiplos de un paso redondo que deje unas veinte paradas (0, 5,
 * 10… de 0 a 100); en la logarítmica, 1, 2, 5, 10, 20, 50…
 */
export function roundStops(grid: Grid): number[] {
  const span = grid.max - grid.min
  const stops = new Set([grid.min, grid.max])

  if (span <= 0) return [grid.min]
  if (grid.curve === 'log') {
    for (let power = 1; power <= grid.max; power *= 10) {
      for (const unit of [power, power * 2, power * 5]) {
        if (unit > grid.min && unit < grid.max) stops.add(unit)
      }
    }
  } else {
    const unit =
      niceUnits(span).find((candidate) => candidate >= span / 20 && candidate >= grid.step) ??
      grid.step
    const first = Math.ceil(grid.min / unit) * unit

    for (let value = first; value < grid.max; value += unit) stops.add(onGrid(value, grid))
  }

  return [...stops].sort((a, b) => a - b)
}

/**
 * Cuánto se mueve el tirador por cada píxel de ratón, según lo lejos que esté
 * el puntero de la barra: entero cerca de ella y, más allá de `FINE_FROM`, en
 * proporción inversa a la distancia (el doble de lejos, la mitad de rápido),
 * hasta `1 / MAX_ZOOM`. Es el «scrubbing» de los deslizadores de iOS.
 */
export function fineFactor(distance: number): number {
  const away = Math.abs(distance)

  return away <= FINE_FROM ? 1 : Math.max(1 / MAX_ZOOM, FINE_FROM / away)
}

/**
 * El radio del imán, en posición de la barra (de 0 a 1): `MAGNET_PX` píxeles
 * de movimiento, menos con el ajuste fino (se mueve más despacio, así que el
 * imán abarca menos valores) y nunca más de un tercio del hueco entre paradas.
 */
export function magnetRadius(
  width: number,
  factor: number,
  stops: readonly number[],
  grid: Grid,
): number {
  if (width <= 0) return 0
  const positions = stops.map((stop) => toPosition(stop, grid))
  const gaps = positions.slice(1).map((position, index) => position - (positions[index] ?? 0))
  const gap = Math.min(1, ...gaps.filter((size) => size > 0))

  return Math.min((MAGNET_PX * factor) / width, gap * MAGNET_SHARE)
}

/**
 * El valor que toca para una posición de la barra, sin temblar:
 *
 * 1. Cerca de un valor redondo (dentro de `radius` en la barra y de
 *    `MAGNET_STEPS` pasos), ese valor. Si ya estaba pegado a uno, sigue pegado
 *    hasta salir de un radio la mitad mayor.
 * 2. Si no, el valor de la rejilla más cercano; pero si el de antes sigue a
 *    menos de `HOLD` pasos, se queda el de antes.
 *
 * @param current El valor que enseña ahora el tirador, o `null` al empezar.
 */
export function settle(
  position: number,
  current: number | null,
  grid: Grid,
  stops: readonly number[],
  radius: number,
): number {
  const at = clamp(position, 0, 1)
  const raw = fromPosition(at, grid)
  const near = (stop: number, reach: number): boolean =>
    Math.abs(toPosition(stop, grid) - at) <= radius * reach &&
    Math.abs(raw - stop) <= grid.step * MAGNET_STEPS * reach

  if (current !== null && stops.includes(current) && near(current, 1.5)) return current
  let best: number | null = null

  for (const stop of stops) {
    if (near(stop, 1) && (best === null || Math.abs(raw - stop) < Math.abs(raw - best))) {
      best = stop
    }
  }
  if (best !== null) return best
  if (current !== null && Math.abs(raw - current) < grid.step * HOLD) return current

  return onGrid(raw, grid)
}

/**
 * Lee lo que alguien escribe a mano («14», «14,5», « 14 % »): el número en la
 * rejilla, o `null` si no hay número.
 */
export function parseTyped(text: string, grid: Grid): number | null {
  const cleaned = text.replace(/[\s%]/gu, '').replace(',', '.')

  if (cleaned === '') return null
  const value = Number(cleaned)

  return Number.isFinite(value) ? onGrid(value, grid) : null
}
