/**
 * El álbum de correcciones (`docs/correcciones-coleccion.md`): cada proyecto
 * que puedes corregir es un cromo; los de un círculo, un set. Aquí van las
 * reglas que pinta la web (qué cromos tienes, cuáles te faltan, qué te queda
 * más cerca); la rareza y los puestos los cuenta la API.
 *
 * Los niveles de cada cromo son los logros de siempre: 1, 3, 5 y 10
 * correcciones (a partir de 10, maestría del código en ese proyecto).
 */

import type { CollectionRarity, GraphProject, HolyGraph } from '@sanatorio/contracts'

export const CORRECTION_TIERS = [1, 3, 5, 10] as const

/** El nivel de un cromo: 0 sin corregir, del 1 al 4 según las veces. */
export function tierOf(times: number): number {
  return CORRECTION_TIERS.filter((goal) => times >= goal).length
}

/** Cuántas correcciones faltan para el siguiente nivel, o `null` si ya es maestría. */
export function toNextTier(times: number): number | null {
  const goal = CORRECTION_TIERS.find((each) => times < each)

  return goal === undefined ? null : goal - times
}

/** Los exámenes no se corrigen entre peers: no son cromos (la API tampoco los cuenta). */
export const isExam = (project: Pick<GraphProject, 'name' | 'group'>): boolean =>
  project.group === 'exam' || /^exam\b/i.test(project.name)

/**
 * Cómo está un cromo:
 * - `owned`: lo has corregido al menos una vez.
 * - `missing`: lo puedes corregir (lo aprobaste y sigue vivo) y aún no lo has hecho.
 * - `locked`: aún no lo has aprobado; sale en silueta, pero no cuenta.
 */
export type CardState = 'owned' | 'missing' | 'locked'

export type AlbumCard = GraphProject & { state: CardState; tier: number }

export type AlbumSet = {
  circle: number
  cards: AlbumCard[]
  /** Cromos conseguidos del set. */
  owned: number
  /** Cromos que se pueden conseguir ya (sin los `locked`). */
  total: number
  /** `true` si tiene algo que conseguir y lo tienes todo. */
  complete: boolean
}

function stateOf(project: GraphProject): CardState | null {
  if (project.status !== 'finished') return project.retired ? null : 'locked'
  if (project.corrected > 0) return 'owned'

  // Retirado y sin corregir: ya nadie lo corrige en el campus; no es un hueco.
  return project.retired ? null : 'missing'
}

/** El álbum por círculos (en la piscina, lo que cuenta y lo de aparte), sin exámenes. */
export function albumOf(graph: HolyGraph): AlbumSet[] {
  return graph.circles
    .map(({ circle, projects }) => {
      const cards = projects.flatMap((project): AlbumCard[] => {
        const state = isExam(project) ? null : stateOf(project)

        return state === null ? [] : [{ ...project, state, tier: tierOf(project.corrected) }]
      })
      const owned = cards.filter((card) => card.state === 'owned').length
      const total = cards.filter((card) => card.state !== 'locked').length

      return { circle, cards, owned, total, complete: total > 0 && owned === total }
    })
    .filter((set) => set.cards.length > 0)
}

type AlbumProgress = {
  owned: number
  total: number
  /** De 0 a 1; 0 si aún no hay nada que conseguir. */
  share: number
  /** Sets completos, de los que tienen algo que conseguir. */
  completeSets: number
  sets: number
  /** Cromos en cada nivel o más, del 1 al 4. */
  tiers: number[]
}

export function progressOf(sets: readonly AlbumSet[]): AlbumProgress {
  const owned = sets.reduce((sum, set) => sum + set.owned, 0)
  const total = sets.reduce((sum, set) => sum + set.total, 0)
  const cards = sets.flatMap((set) => set.cards)

  return {
    owned,
    total,
    share: total === 0 ? 0 : owned / total,
    completeSets: sets.filter((set) => set.complete).length,
    sets: sets.filter((set) => set.total > 0).length,
    tiers: CORRECTION_TIERS.map((goal) => cards.filter((card) => card.corrected >= goal).length),
  }
}

/**
 * Lo raro que es un cromo, de lo que dice la API (qué parte de quienes lo
 * pueden corregir lo ha corregido). Con menos de 5 personas no se dice nada:
 * con 2, «el 50 %» no significa nada.
 */
type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary'

const RARITY_MIN_PEOPLE = 5

export function rarityTierOf(rarity: CollectionRarity | undefined): RarityTier | null {
  if (rarity === undefined || rarity.eligible < RARITY_MIN_PEOPLE) return null
  if (rarity.share >= 0.5) return 'common'
  if (rarity.share >= 0.25) return 'uncommon'
  if (rarity.share >= 0.1) return 'rare'

  return 'legendary'
}

type AlbumGoals = {
  /** El set al que menos le falta (y lo que le falta), si hay alguno a medias. */
  closestSet: { circle: number; missing: AlbumCard[] } | null
  /** El cromo que te falta y menos gente tiene (solo si la API dice su rareza). */
  rarest: { card: AlbumCard; share: number } | null
  /** El cromo que tienes más cerca de subir de nivel. */
  nextLevel: { card: AlbumCard; needed: number } | null
}

/**
 * Los siguientes objetivos: el gradiente de meta dice que cuanto más cerca se
 * ve el final, más ganas dan; por eso se propone lo más cercano, no lo más
 * grande. A igualdad, el círculo más bajo (lo más antiguo, más fácil de pillar).
 */
export function goalsOf(
  sets: readonly AlbumSet[],
  rarity: readonly CollectionRarity[] = [],
): AlbumGoals {
  let closestSet: AlbumGoals['closestSet'] = null

  for (const set of sets) {
    const missing = set.cards.filter((card) => card.state === 'missing')

    if (missing.length === 0) continue
    if (closestSet === null || missing.length < closestSet.missing.length) {
      closestSet = { circle: set.circle, missing }
    }
  }

  const shares = new Map(rarity.map((one) => [one.projectId, one]))
  let rarest: AlbumGoals['rarest'] = null

  for (const card of sets.flatMap((set) => set.cards)) {
    const known = shares.get(card.projectId)

    if (card.state !== 'missing' || known === undefined || known.eligible < RARITY_MIN_PEOPLE) {
      continue
    }
    if (rarest === null || known.share < rarest.share) rarest = { card, share: known.share }
  }

  let nextLevel: AlbumGoals['nextLevel'] = null

  for (const card of sets.flatMap((set) => set.cards)) {
    const needed = card.state === 'owned' ? toNextTier(card.corrected) : null

    if (needed !== null && (nextLevel === null || needed < nextLevel.needed)) {
      nextLevel = { card, needed }
    }
  }

  return { closestSet, rarest, nextLevel }
}

/**
 * Los sets que se acaban de completar: los completos que no estaban en
 * `seen` (lo guardado la última vez). La primera vez (`seen === null`) no se
 * celebra nada: lo que ya tenías no es una novedad.
 */
export function newlyComplete(sets: readonly AlbumSet[], seen: readonly number[] | null): number[] {
  if (seen === null) return []

  return sets.filter((set) => set.complete && !seen.includes(set.circle)).map((set) => set.circle)
}
