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
] as const

export type ColorMode = (typeof COLOR_MODES)[number]

/** Tonos de las comunidades mayores. De la décima en adelante, gris. */
const COMMUNITY_HUES = [186, 28, 262, 138, 340, 48, 212, 96, 300, 12]

const OTHER = 'hsl(160 6% 62%)'

/**
 * Parte de suspensos a partir de la cual alguien ya sale en rojo del todo. En
 * los datos reales se aprueba más del 90 %: con una escala hasta la mitad todo
 * el mundo saldría verde.
 */
const STRICTEST = 0.25

/** Verde → ámbar → rojo, para un valor de 0 a 1. */
function heat(value: number): string {
  const clamped = Math.max(0, Math.min(1, value))

  return `hsl(${Math.round(150 - 150 * clamped)} 68% ${Math.round(48 + 6 * clamped)}%)`
}

/** Color estable para un año: los años seguidos quedan lejos en el círculo. */
function yearColor(year: number): string {
  return `hsl(${(year * 67) % 360} 58% 55%)`
}

/** Color de un porcentaje de aprobados: rojo si suspende una de cada cuatro o más, verde si casi nada. */
export function passColor(passRate: number): string {
  return heat((1 - passRate) / STRICTEST)
}

export function colorOf(node: NetworkNode, mode: ColorMode): string {
  switch (mode) {
    case 'community': {
      const hue = COMMUNITY_HUES[node.community]

      return hue === undefined ? OTHER : `hsl(${hue} 62% 52%)`
    }
    case 'endogamy':
      return heat(node.endogamy / 100)
    case 'failsGiven':
      // Como corrector: rojo quien más suspende a otros; gris si ha evaluado muy poco.
      return node.givenPassRate === null ? OTHER : passColor(node.givenPassRate)
    case 'failsReceived':
      // Como corregido: rojo a quien más le suspenden sus proyectos.
      return node.receivedPassRate === null ? OTHER : passColor(node.receivedPassRate)
    case 'cohort':
      return node.cohort === null ? OTHER : yearColor(node.cohort)
    case 'balance': {
      // Azul si corrige más de lo que le corrigen; naranja si es al revés.
      const total = node.given + node.received
      const lean = total === 0 ? 0 : (node.given - node.received) / total

      return `hsl(${lean >= 0 ? 205 : 24} ${Math.round(25 + 55 * Math.abs(lean))}% 54%)`
    }
    case 'origin':
      return node.external ? 'hsl(28 80% 55%)' : 'hsl(186 62% 45%)'
  }
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
): LegendEntry[] {
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
            color: `hsl(${COMMUNITY_HUES[community] ?? 0} 62% 52%)`,
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
    case 'endogamy':
      return [0, 0.25, 0.5, 0.75, 1].map((value) => ({
        color: heat(value),
        label: String(Math.round(value * 100)),
      }))
    case 'failsGiven':
    case 'failsReceived':
      return [
        ...[0, 0.5, 1].map((value) => ({
          color: heat(value),
          label: t(`net.legend.${mode}`, { pct: Math.round(value * STRICTEST * 100) }),
        })),
        { color: OTHER, label: t('net.legend.unknown') },
      ]
    case 'cohort': {
      const years = [
        ...new Set(nodes.flatMap((node) => (node.cohort === null ? [] : [node.cohort]))),
      ]

      return years.sort().map((year) => ({ color: yearColor(year), label: String(year) }))
    }
    case 'balance':
      return [
        { color: 'hsl(205 80% 54%)', label: t('net.legend.gives') },
        { color: 'hsl(205 25% 54%)', label: t('net.legend.even') },
        { color: 'hsl(24 80% 54%)', label: t('net.legend.receives') },
      ]
    case 'origin':
      return [
        { color: 'hsl(186 62% 45%)', label: t('net.legend.campus') },
        { color: 'hsl(28 80% 55%)', label: t('net.legend.external') },
      ]
  }
}
