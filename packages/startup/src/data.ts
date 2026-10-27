/**
 * El catálogo de la startup: todo son datos, para añadir o retocar una pieza
 * sin tocar las cuentas. Los precios van en minutos de concentración (un minuto
 * del Pomodoro, un minuto para gastar).
 *
 * Nada de esto lleva texto: la web lo pinta con dibujos e iconos (pedido por
 * Alberto, 2026-10-27: «sin idiomas»). Los ids solo son claves.
 */

/**
 * Los cinco modelos de negocio hacia los que se enfoca la empresa:
 *
 * - `front`: apps y producto de consumo (interfaces, móvil).
 * - `back`: plataforma y APIs para otras empresas (SaaS).
 * - `data`: datos y analítica.
 * - `ai`: inteligencia artificial (modelos).
 * - `infra`: nube e infraestructura (servidores, despliegues).
 */
export const AXES = ['front', 'back', 'data', 'ai', 'infra'] as const
export type Axis = (typeof AXES)[number]

/** Lo que se compra por niveles, de qué clase es y a qué rama suma. */
export type ItemKind = 'learn' | 'gear' | 'space' | 'servers'

export type Item = {
  id: string
  kind: ItemKind
  /** La rama a la que suma cada nivel, si suma a una. */
  axis: Axis | null
  /** Lo que cuesta cada nivel (el 1, el 2…), en minutos. */
  costs: readonly number[]
  /** Hito que hace falta para comprar el primer nivel. */
  needs: Milestone | null
}

/** Aprender: cinco ramas, cinco niveles cada una. */
const LEARN_COSTS = [30, 60, 120, 240, 480] as const

export const ITEMS: readonly Item[] = [
  ...AXES.map((axis): Item => ({
    id: `learn-${axis}`,
    kind: 'learn',
    axis,
    costs: LEARN_COSTS,
    needs: null,
  })),
  // Del portátil viejo a la estación de trabajo: cada nivel rinde más.
  { id: 'computer', kind: 'gear', axis: null, costs: [45, 180, 480, 1200, 3000], needs: null },
  // Del coworking al campus propio: cada nivel deja más sitio para la plantilla.
  {
    id: 'space',
    kind: 'space',
    axis: null,
    costs: [300, 1200, 3000, 8000, 20000],
    needs: 'founded',
  },
  {
    id: 'servers',
    kind: 'servers',
    axis: 'infra',
    costs: [120, 400, 1000, 2500, 6000, 15000],
    needs: 'mvp',
  },
]

/**
 * Los hitos, en orden. Cada uno pide el anterior y algo más (`MILESTONE_RULES`).
 * Fundar la startup es cuando se le pone nombre.
 */
export const MILESTONES = ['side', 'mvp', 'founded', 'global'] as const
export type Milestone = (typeof MILESTONES)[number]

export const MILESTONE_RULES: Record<
  Milestone,
  { cost: number; skill: number; team: number; round: Round | null; hours: number }
> = {
  // Un proyecto propio: haber aprendido algo de verdad.
  side: { cost: 90, skill: 3, team: 0, round: null, hours: 0 },
  // Un producto mínimo que alguien usa.
  mvp: { cost: 300, skill: 7, team: 0, round: null, hours: 5 },
  // Fundar: ponerle nombre. Gratis, pero pide el MVP.
  founded: { cost: 0, skill: 7, team: 0, round: null, hours: 5 },
  // La meta: control global. Tras salir a bolsa y cientos de horas.
  global: { cost: 20000, skill: 25, team: 60, round: 'ipo', hours: 400 },
}

/** Las rondas de inversión, en orden. */
export const ROUNDS = ['preseed', 'seed', 'a', 'b', 'c', 'ipo'] as const
export type Round = (typeof ROUNDS)[number]

export const ROUND_RULES: Record<
  Round,
  {
    /** Lo que cuesta preparar la ronda (pitch, cifras), en minutos. */
    cost: number
    /** Plantilla, espacio y horas de concentración que pide. */
    team: number
    space: number
    hours: number
    /** Cuánto multiplica la valoración, antes de la suerte. */
    multiplier: number
  }
> = {
  preseed: { cost: 60, team: 1, space: 1, hours: 10, multiplier: 1.5 },
  seed: { cost: 120, team: 3, space: 1, hours: 25, multiplier: 2 },
  a: { cost: 240, team: 6, space: 2, hours: 50, multiplier: 2.5 },
  b: { cost: 480, team: 12, space: 3, hours: 100, multiplier: 3 },
  c: { cost: 960, team: 25, space: 4, hours: 180, multiplier: 3 },
  ipo: { cost: 1500, team: 40, space: 4, hours: 280, multiplier: 4 },
}

/** Sitio para la plantilla según el espacio (sin espacio: el garaje, para dos). */
export const SEATS = [2, 5, 12, 30, 70, 160] as const

/** Lo que cuesta contratar: base por estrella, y sube con la plantilla. */
export const HIRE_BASE = 60
/** Volver a sacar candidatos. */
export const REROLL_COST = 15
/** Candidatos que se ofrecen cada vez. */
export const CANDIDATES = 3

/** Lo largo que puede ser el nombre de la startup. */
export const NAME_MAX = 32
