/**
 * La vista isométrica del grafo: el plano de `layout.ts` visto desde delante y
 * algo desde arriba, con cada círculo convertido en una bandeja con grosor.
 *
 * Un punto del plano `(x, y)` a una altura `z` cae en pantalla en
 * `(x, origen + (y - centro) · TILT - z)`: lo ancho no cambia, lo profundo se
 * aplasta y lo alto sube. Los círculos pasan a ser elipses.
 *
 * Las bandejas van encajadas una dentro de otra y pueden estar a alturas
 * distintas, así que una puede tapar a su vecina. Para que se tapen bien cada
 * una se pinta en dos mitades: la de atrás (su cara de arriba y la pared de
 * dentro) antes que lo que tiene dentro, y la de delante (cara de arriba y
 * pared de fuera) después.
 */

import type { Layout } from './layout'

/** Cuánto se aplasta lo profundo: 1 sería visto desde arriba; 0, de canto. */
export const TILT = 0.66

/** Hueco de arriba, para lo que sobresale: la bandeja levantada y sus burbujas. */
const PAD_TOP = 78
const PAD_BOTTOM = 14

/** Trozos en los que se parte media vuelta al dibujar una elipse. */
const STEPS = 28

export type Iso = {
  width: number
  height: number
  /** Dónde cae en pantalla un punto del plano a esa altura. */
  point: (x: number, y: number, z: number) => { x: number; y: number }
  /** Media bandeja (de `inner` a `outer`) a esa altura: la cara de arriba. */
  top: (outer: number, inner: number, z: number, half: Half) => string
  /** El borde de fuera de media bandeja: una línea, sin cerrar. */
  rim: (radius: number, z: number, half: Half) => string
  /** La pared: la de fuera en la mitad de delante, la de dentro en la de atrás. */
  wall: (radius: number, z: number, half: Half) => string
  /**
   * La parte de la cara de arriba que cubre esa fracción de la vuelta desde
   * `start`, solo en esa mitad. Es el relleno de lo que se lleva completado.
   */
  sector: (
    outer: number,
    inner: number,
    z: number,
    start: number,
    fraction: number,
    half: Half,
  ) => string
}

export type Half = 'back' | 'front'

/** Con el eje `y` hacia abajo, lo de delante son los ángulos de 0 a π. */
const RANGE: Record<Half, [number, number]> = { front: [0, Math.PI], back: [Math.PI, 2 * Math.PI] }

/**
 * Lo que la mitad de delante se mete en la de atrás, en radianes. Dos formas
 * del mismo color que solo se tocan dejan ver una raya fina donde se juntan;
 * solapándolas un poco, la de delante tapa la junta.
 */
const OVERLAP = 0.04

/** El tramo de una mitad, con el solape si es la de delante. */
const spanOf = (half: Half): [number, number] =>
  half === 'front' ? [-OVERLAP, Math.PI + OVERLAP] : RANGE.back

export function isoOf(layout: Layout): Iso {
  const { center, size } = layout
  const origin = PAD_TOP + center * TILT

  const point = (x: number, y: number, z: number): { x: number; y: number } => ({
    x,
    y: origin + (y - center) * TILT - z,
  })

  /** Puntos de un arco de la elipse de ese radio y altura, entre dos ángulos. */
  const arc = (radius: number, z: number, from: number, to: number): string => {
    const steps = Math.max(2, Math.ceil((Math.abs(to - from) / Math.PI) * STEPS))
    const points: string[] = []

    for (let step = 0; step <= steps; step += 1) {
      const angle = from + ((to - from) * step) / steps
      const at = point(center + radius * Math.cos(angle), center + radius * Math.sin(angle), z)

      points.push(`${at.x.toFixed(1)} ${at.y.toFixed(1)}`)
    }

    return points.join(' L ')
  }

  const band = (outer: number, inner: number, z: number, from: number, to: number): string =>
    inner > 0
      ? `M ${arc(outer, z, from, to)} L ${arc(inner, z, to, from)} Z`
      : // Sin hueco: el arco y, de vuelta, el centro.
        `M ${arc(outer, z, from, to)} L ${point(center, center, z).x.toFixed(1)} ${point(center, center, z).y.toFixed(1)} Z`

  return {
    width: size,
    height: PAD_TOP + size * TILT + PAD_BOTTOM,
    point,

    top: (outer, inner, z, half) => band(outer, inner, z, ...spanOf(half)),

    rim: (radius, z, half) => `M ${arc(radius, z, ...RANGE[half])}`,

    wall: (radius, z, half) => {
      const [from, to] = RANGE[half]

      return `M ${arc(radius, z, from, to)} L ${arc(radius, 0, to, from)} Z`
    },

    sector: (outer, inner, z, start, fraction, half) => {
      const sweep = Math.min(1, Math.max(0, fraction)) * 2 * Math.PI
      const end = start + sweep
      // Se trocea por donde cambia de mitad (cada π) y se queda con lo de esta.
      const cuts = [start]

      for (let cut = Math.ceil(start / Math.PI) * Math.PI; cut < end; cut += Math.PI) {
        if (cut > start) cuts.push(cut)
      }
      cuts.push(end)

      const parts: string[] = []

      for (let index = 0; index + 1 < cuts.length; index += 1) {
        const from = cuts[index] ?? start
        const to = cuts[index + 1] ?? end
        const front = Math.sin((from + to) / 2) >= 0

        if (to - from > 1e-6 && front === (half === 'front')) {
          // Delante, cada trozo se alarga un poco sobre la junta, sin salirse
          // de lo que de verdad está relleno.
          const pad = half === 'front' ? OVERLAP : 0

          parts.push(band(outer, inner, z, Math.max(start, from - pad), Math.min(end, to + pad)))
        }
      }

      return parts.join(' ')
    },
  }
}
