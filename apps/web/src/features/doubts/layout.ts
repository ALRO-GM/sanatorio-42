/**
 * Geometría del grafo, en unidades del `viewBox`.
 *
 * Ni los círculos están a distancias fijas ni las burbujas son iguales: cada
 * burbuja mide según las horas del proyecto, y cada círculo se abre lo que haga
 * falta para que quepan las suyas sin tocarse.
 */

/** Hueco mínimo entre dos burbujas del mismo círculo. */
const NODE_GAP = 12

/** Lo que sobresale la bandeja de un círculo por fuera de su burbuja más grande. */
const PLATE_PAD = 9

/** Arco que se deja libre al principio de cada círculo, para su etiqueta. */
const TAG_ARC = 58

const MARGIN = 10

export type Point = { x: number; y: number }

export type RingLayout = {
  /** Radio de la órbita en la que van las burbujas. `0` si es una sola, en el centro. */
  radius: number
  /** Radio exterior de la bandeja. */
  outer: number
  /** Ángulo en el que empieza el círculo: ahí va su etiqueta y de ahí arranca el relleno. */
  start: number
  /** Dónde va la etiqueta. */
  tag: Point
  /** Centro de cada burbuja, en el mismo orden en que se pidieron. */
  nodes: Point[]
}

export type Layout = {
  /** Lado del dibujo. */
  size: number
  center: number
  rings: RingLayout[]
}

/** Tamaño de la burbuja de un proyecto según sus horas estimadas. */
export function radiusFor(hours: number | null): number {
  // Sin dato, un tamaño medio. La raíz hace que lo que crezca con las horas sea
  // el área: un proyecto de 120 h ocupa unas cuatro veces lo que un módulo de
  // 6 h, que es lo que se quiere que salte a la vista, sin que el pequeño quede
  // ilegible.
  return hours === null ? 26 : 16 + 26 * Math.sqrt(Math.min(hours, 150) / 150)
}

/** Ángulo donde empieza un círculo: las doce, más un giro por cada círculo. */
const ringStart = (circle: number): number => -Math.PI / 2 + circle * 0.42

/**
 * Coloca los círculos y sus burbujas.
 *
 * @param rings `rings[i]` son los radios de las burbujas del círculo `i`.
 */
export function layoutOf(rings: readonly (readonly number[])[]): Layout {
  const measured: { radius: number; outer: number; sizes: readonly number[] }[] = []

  for (const sizes of rings) {
    const biggest = Math.max(0, ...sizes)
    const previous = measured.at(-1)
    const around = sizes.reduce((sum, size) => sum + 2 * size + NODE_GAP, TAG_ARC)
    // Un único proyecto en el primer círculo va en el centro, sin órbita.
    const alone = previous === undefined && sizes.length <= 1
    const radius = alone
      ? 0
      : Math.max(
          (previous?.outer ?? 0) + PLATE_PAD + biggest,
          around / (2 * Math.PI),
          biggest + NODE_GAP,
        )

    measured.push({ radius, outer: radius + biggest + PLATE_PAD, sizes })
  }

  const center = (measured.at(-1)?.outer ?? 0) + MARGIN
  const at = (radius: number, angle: number): Point => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  })

  return {
    size: center * 2,
    center,
    rings: measured.map(({ radius, outer, sizes }, circle) => {
      const start = ringStart(circle)

      if (radius === 0) {
        return { radius, outer, start, tag: at(0, 0), nodes: sizes.map(() => at(0, 0)) }
      }

      // Cada burbuja ocupa un arco proporcional a su tamaño, después del hueco
      // de la etiqueta; lo que sobre de la vuelta se reparte entre todas.
      const tagAngle = TAG_ARC / radius
      const needed = sizes.reduce((sum, size) => sum + 2 * size + NODE_GAP, 0)
      const scale = (2 * Math.PI - tagAngle) / (needed / radius)
      let angle = start + tagAngle / 2

      return {
        radius,
        outer,
        start,
        tag: at(radius, start),
        nodes: sizes.map((size) => {
          const share = ((2 * size + NODE_GAP) / radius) * scale
          const point = at(radius, angle + share / 2)

          angle += share

          return point
        }),
      }
    }),
  }
}
