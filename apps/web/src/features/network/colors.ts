/**
 * De qué color se pinta cada persona del grafo, según lo que se quiera mirar.
 */

import type { NetworkNode } from '@sanatorio/contracts'

export const COLOR_MODES = [
  'community',
  'endogamy',
  'failsGiven',
  'failsReceived',
  'cohort',
  'balance',
  'origin',
  'campus',
] as const

export type ColorMode = (typeof COLOR_MODES)[number]

/** Tonos de las comunidades mayores. De la décima en adelante, gris. */
const COMMUNITY_HUES = [186, 28, 262, 138, 340, 48, 212, 96, 300, 12]

// El grafo se pinta siempre sobre fondo oscuro (`--stage-bg`): los colores van
// vivos y claros, que es lo que se distingue ahí.
const OTHER = 'hsl(200 12% 68%)'

/**
 * Parte de suspensos a partir de la cual alguien ya sale en rojo del todo. En
 * los datos reales se aprueba más del 90 %: con una escala hasta la mitad todo
 * el mundo saldría verde.
 */
const STRICTEST = 0.25

/** Verde → ámbar → rojo, para un valor de 0 a 1. */
function heat(value: number): string {
  const clamped = Math.max(0, Math.min(1, value))

  return `hsl(${Math.round(150 - 150 * clamped)} 88% ${Math.round(58 + 4 * clamped)}%)`
}

/** Los modos que pintan un porcentaje con el degradado, y por tanto tienen escala. */
export const SCALE_MODES = ['endogamy', 'failsGiven', 'failsReceived'] as const

export type ScaleMode = (typeof SCALE_MODES)[number]

export const isScaleMode = (mode: ColorMode): mode is ScaleMode =>
  (SCALE_MODES as readonly ColorMode[]).includes(mode)

/**
 * Entre qué porcentajes se reparte el degradado: por debajo de `min` todo es
 * verde y por encima de `max` todo es rojo. Estrechar el tramo es lo que deja
 * ver diferencias cuando casi todo el mundo cae en la misma zona.
 */
export type Scale = { min: number; max: number }

/** La escala de fábrica de cada modo. */
export const DEFAULT_SCALES: Record<ScaleMode, Scale> = {
  endogamy: { min: 0, max: 100 },
  failsGiven: { min: 0, max: STRICTEST * 100 },
  failsReceived: { min: 0, max: STRICTEST * 100 },
}

/** El porcentaje (0 a 100) que pinta ese modo para una persona, o `null` si no hay dato. */
export function valueOf(node: NetworkNode, mode: ScaleMode): number | null {
  switch (mode) {
    case 'endogamy':
      return node.endogamy
    case 'failsGiven':
      return node.givenPassRate === null ? null : (1 - node.givenPassRate) * 100
    case 'failsReceived':
      return node.receivedPassRate === null ? null : (1 - node.receivedPassRate) * 100
  }
}

/** El color de un porcentaje dentro de una escala. */
export function scaleColor(percent: number, scale: Scale): string {
  return heat((percent - scale.min) / Math.max(1, scale.max - scale.min))
}

/**
 * La escala que mejor separa a las personas que se están pintando: de la que
 * menos tiene a la que más, con un punto de margen.
 */
export function fitScale(nodes: readonly NetworkNode[], mode: ScaleMode): Scale {
  const values = nodes.flatMap((node) => valueOf(node, mode) ?? [])

  if (values.length === 0) return DEFAULT_SCALES[mode]

  const min = Math.max(0, Math.floor(Math.min(...values)))
  const max = Math.min(100, Math.ceil(Math.max(...values)))

  return max > min ? { min, max } : { min: Math.max(0, min - 1), max: Math.min(100, min + 1) }
}

/** Color estable para un año: los años seguidos quedan lejos en el círculo. */
function yearColor(year: number): string {
  return `hsl(${(year * 67) % 360} 82% 63%)`
}

/** Color de un porcentaje de aprobados: rojo si suspende una de cada cuatro o más, verde si casi nada. */
export function passColor(passRate: number): string {
  return heat((1 - passRate) / STRICTEST)
}

/**
 * @param scale Entre qué porcentajes se reparte el degradado, en los modos que
 *   lo usan. Sin ella, la de fábrica.
 */
export function colorOf(node: NetworkNode, mode: ColorMode, scale?: Scale): string {
  if (isScaleMode(mode)) {
    const value = valueOf(node, mode)

    // Gris si no hay dato (ha evaluado o le han evaluado muy poco).
    return value === null ? OTHER : scaleColor(value, scale ?? DEFAULT_SCALES[mode])
  }

  switch (mode) {
    case 'community': {
      const hue = COMMUNITY_HUES[node.community]

      return hue === undefined ? OTHER : `hsl(${hue} 86% 62%)`
    }
    case 'cohort':
      return node.cohort === null ? OTHER : yearColor(node.cohort)
    case 'balance': {
      // Azul si corrige más de lo que le corrigen; naranja si es al revés.
      const total = node.given + node.received
      const lean = total === 0 ? 0 : (node.given - node.received) / total

      return `hsl(${lean >= 0 ? 205 : 24} ${Math.round(30 + 60 * Math.abs(lean))}% 62%)`
    }
    case 'origin':
      return node.external ? 'hsl(28 92% 62%)' : 'hsl(186 80% 55%)'
    case 'campus':
      return node.campusId === null ? OTHER : campusColor(node.campusId)
  }
}

/** Color estable para un campus: los ids seguidos quedan lejos en el círculo. */
export function campusColor(campusId: number): string {
  return `hsl(${(campusId * 137) % 360} 86% 62%)`
}

export type LegendEntry = { color: string; label: string }

/**
 * La leyenda de un modo de color para las personas que se están pintando.
 *
 * @param t Traductor, para las etiquetas que no son un dato.
 */
export function legendOf(
  nodes: readonly NetworkNode[],
  mode: ColorMode,
  t: (key: string, vars?: Record<string, string | number>) => string,
  scale?: Scale,
  campuses: readonly { id: number; name: string }[] = [],
): LegendEntry[] {
  if (isScaleMode(mode)) {
    const range = scale ?? DEFAULT_SCALES[mode]
    // Cinco pasos repartidos por la escala, sin repetir si el tramo es muy corto.
    const stops = [
      ...new Set(
        [0, 0.25, 0.5, 0.75, 1].map((step) =>
          Math.round(range.min + (range.max - range.min) * step),
        ),
      ),
    ]

    return [
      ...stops.map((percent) => ({
        color: scaleColor(percent, range),
        label: mode === 'endogamy' ? `${percent} %` : t(`net.legend.${mode}`, { pct: percent }),
      })),
      ...(mode === 'endogamy' ? [] : [{ color: OTHER, label: t('net.legend.unknown') }]),
    ]
  }

  switch (mode) {
    case 'community': {
      const sizes = new Map<number, number>()
      // Cuánta gente de cada año hay en cada comunidad, para ponerle fecha.
      const years = new Map<number, Map<number, number>>()

      for (const node of nodes) {
        sizes.set(node.community, (sizes.get(node.community) ?? 0) + 1)

        if (node.cohort !== null) {
          const tally = years.get(node.community) ?? new Map<number, number>()

          tally.set(node.cohort, (tally.get(node.cohort) ?? 0) + 1)
          years.set(node.community, tally)
        }
      }

      /** El año de llegada más repetido en una comunidad: suelen ser promociones. */
      const mainYear = (community: number): number | null =>
        [...(years.get(community) ?? [])].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null

      const main = [...sizes.entries()]
        .filter(([community]) => community < COMMUNITY_HUES.length)
        .sort((a, b) => a[0] - b[0])
        .map(([community, size]) => {
          const year = mainYear(community)

          return {
            color: `hsl(${COMMUNITY_HUES[community] ?? 0} 86% 62%)`,
            label:
              year === null
                ? t('net.legend.community', { n: community + 1, size })
                : t('net.legend.communityYear', { n: community + 1, size, year }),
          }
        })
      const rest = [...sizes.entries()]
        .filter(([community]) => community >= COMMUNITY_HUES.length)
        .reduce((sum, [, size]) => sum + size, 0)

      return rest === 0
        ? main
        : [...main, { color: OTHER, label: t('net.legend.others', { size: rest }) }]
    }
    case 'cohort': {
      const years = [
        ...new Set(nodes.flatMap((node) => (node.cohort === null ? [] : [node.cohort]))),
      ]

      return years.sort().map((year) => ({ color: yearColor(year), label: String(year) }))
    }
    case 'balance':
      return [
        { color: 'hsl(205 90% 62%)', label: t('net.legend.gives') },
        { color: 'hsl(205 30% 62%)', label: t('net.legend.even') },
        { color: 'hsl(24 90% 62%)', label: t('net.legend.receives') },
      ]
    case 'origin':
      return [
        { color: 'hsl(186 80% 55%)', label: t('net.legend.campus') },
        { color: 'hsl(28 92% 62%)', label: t('net.legend.external') },
      ]
    case 'campus': {
      const count = (id: number | null): number =>
        nodes.filter((node) => node.campusId === id).length

      return [
        ...campuses
          .filter((campus) => count(campus.id) > 0)
          .map((campus) => ({
            color: campusColor(campus.id),
            label: `${campus.name} (${count(campus.id)})`,
          })),
        ...(count(null) > 0 ? [{ color: OTHER, label: t('net.legend.external') }] : []),
      ]
    }
  }
}

/** Luminancia relativa (WCAG) de un color `hsl(h s% l%)`, de 0 a 1. `null` si no se entiende. */
export function luminanceOf(color: string): number | null {
  const match = /^hsl\(\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/.exec(color)

  if (match === null) return null

  const [h, s, l] = [Number(match[1]) / 360, Number(match[2]) / 100, Number(match[3]) / 100]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (offset: number): number => {
    const t = (((h + offset) % 1) + 1) % 1
    const value =
      t < 1 / 6
        ? p + (q - p) * 6 * t
        : t < 1 / 2
          ? q
          : t < 2 / 3
            ? p + (q - p) * (2 / 3 - t) * 6
            : p

    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(1 / 3) + 0.7152 * channel(0) + 0.0722 * channel(-1 / 3)
}

/** Las dos tintas posibles sobre un color: casi negra o blanca. Iguales en los dos temas. */
const DARK_INK = '#080c0e'
const LIGHT_INK = '#ffffff'

/**
 * La tinta que se lee sobre un color de fondo: la que más contraste tenga. Los
 * verdes y ámbares claros del degradado llevan texto oscuro; el rojo, blanco.
 */
export function inkOn(background: string): string {
  const lum = luminanceOf(background)

  if (lum === null) return LIGHT_INK

  // Contraste con negro (0,0035 es la luminancia de DARK_INK) frente a con blanco.
  return (lum + 0.05) / (0.0035 + 0.05) >= 1.05 / (lum + 0.05) ? DARK_INK : LIGHT_INK
}

/** Fondo y tinta de una insignia de color con un número dentro. */
export function badgeStyle(background: string): { background: string; color: string } {
  return { background, color: inkOn(background) }
}
