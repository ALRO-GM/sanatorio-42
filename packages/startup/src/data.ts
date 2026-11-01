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

/**
 * Lo que se compra por niveles, de qué clase es y a qué rama suma:
 *
 * - `learn`, `gear` y `servers`: aprender, el ordenador y los servidores.
 * - `space`: el sitio donde está la empresa (`SPACES`).
 * - `product`: lo que se implementa y da dinero mientras te concentras.
 * - `building`: lo que se le añade al edificio (plantas, sótano, tejado, azotea).
 */
export type ItemKind = 'learn' | 'gear' | 'space' | 'servers' | 'product' | 'building'

/**
 * Con qué se paga: minutos de concentración (lo que se hace con tu tiempo:
 * aprender, implementar) o dinero (lo que se compra o se alquila).
 */
export type Currency = 'minutes' | 'cash'

export type Item = {
  id: string
  kind: ItemKind
  /** La rama a la que suma cada nivel, si suma a una. */
  axis: Axis | null
  /** Lo que cuesta cada nivel (el 1, el 2…), en minutos o en dinero (`currency`). */
  costs: readonly number[]
  /** Hito que hace falta para comprar el primer nivel. */
  needs: Milestone | null
  /** Con qué se paga (sin poner: minutos, como las piezas de antes). */
  currency?: Currency
  /** Lo que da cada nivel de un producto, en dinero por minuto de concentración. */
  yields?: readonly number[]
  /** El espacio que hace falta (`SPACES`): las mejoras del edificio piden el edificio. */
  space?: number
}

/**
 * Los productos: id, rama, hito que piden, coste de cada versión (minutos) y
 * lo que da cada una (dinero por minuto de concentración).
 */
const PRODUCTS: readonly (readonly [
  string,
  Axis,
  Milestone | null,
  readonly number[],
  readonly number[],
])[] = [
  // Un bot o un script que alguien usa: lo primero, desde tu cuarto.
  ['product-bot', 'back', null, [30, 120, 360], [1, 2, 4]],
  ['product-web', 'front', 'side', [60, 240, 720], [2, 5, 10]],
  ['product-api', 'back', 'mvp', [180, 600, 1800], [5, 12, 25]],
  ['product-insights', 'data', 'mvp', [180, 600, 1800], [5, 12, 25]],
  ['product-assistant', 'ai', 'founded', [480, 1500, 4000], [12, 30, 60]],
  ['product-cloud', 'infra', 'founded', [480, 1500, 4000], [12, 30, 60]],
]

/**
 * Lo que se le añade al edificio: más plantas (sitio para la plantilla), el
 * sótano de servidores (dinero), los paneles solares del tejado (energía:
 * multiplica lo que se gana) y la azotea (jardín y luego helipuerto: ánimo).
 */
const BUILDING: readonly (readonly [string, Axis | null, readonly number[]])[] = [
  ['floors', null, [20000, 40000, 80000, 160000]],
  ['basement', 'infra', [15000, 45000, 120000]],
  ['solar', null, [10000, 30000]],
  ['rooftop', null, [25000, 75000]],
]

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
  // Del cuarto al edificio entero (`SPACES`): se alquila con dinero. Las
  // partidas de antes lo compraron con minutos y conservan su nivel.
  {
    id: 'space',
    kind: 'space',
    axis: null,
    costs: [200, 1500, 6000, 25000, 100000],
    needs: 'side',
    currency: 'cash',
  },
  {
    id: 'servers',
    kind: 'servers',
    axis: 'infra',
    costs: [120, 400, 1000, 2500, 6000, 15000],
    needs: 'mvp',
  },
  // Lo que se implementa: cada nivel (v1, v2, v3) pide ese nivel aprendido en
  // su rama y da dinero por cada minuto de concentración que venga después.
  ...PRODUCTS.map(([id, axis, needs, costs, yields]): Item => ({
    id,
    kind: 'product',
    axis,
    costs,
    needs,
    yields,
  })),
  // El edificio: se compra con dinero cuando ya es tuyo (espacio 4).
  ...BUILDING.map(([id, axis, costs]): Item => ({
    id,
    kind: 'building',
    axis,
    costs,
    needs: 'founded',
    currency: 'cash',
    space: 4,
  })),
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

/**
 * Los sitios por los que pasa la empresa, en orden (el nivel de `space`): tu
 * cuarto con un ordenador viejo, un puesto en un coworking, una oficina
 * pequeña, una grande, un edificio y el edificio entero (con sótano, tejado
 * solar y azotea). Cada uno con su suelo y su estilo en la web.
 */
export const SPACES = ['room', 'coworking', 'office', 'floor', 'building', 'tower'] as const
export type Space = (typeof SPACES)[number]

/** Sitio para la plantilla según el espacio (sin espacio: tu cuarto, para dos). */
export const SEATS = [2, 5, 12, 30, 70, 160] as const
/** Lo que deja de sitio cada planta más del edificio. */
export const SEATS_PER_FLOOR = 20

/**
 * El lado de la planta que se ve, en baldosas, según el espacio. Lo que se
 * coloca a mano tiene que caber dentro (`world.ts`).
 */
export const ROOM = [4, 5, 6, 8, 9, 10] as const

/**
 * La plantilla que no programa, cada cual con su uniforme y lo que hace por la
 * oficina: seguridad (rondas), reparto (paquetes), limpieza, recepción, cocina
 * (el café) y mantenimiento (los servidores). Se contratan con dinero.
 */
export const ROLES = [
  'reception',
  'cleaning',
  'delivery',
  'kitchen',
  'security',
  'maintenance',
] as const
export type Role = (typeof ROLES)[number]

export const ROLE_RULES: Record<
  Role,
  {
    /** Lo que cuesta la primera persona; cada una más, otro tanto. */
    cost: number
    /** El espacio que hace falta. */
    space: number
    /** Lo que sube el ánimo (y con él lo que se gana); la segunda, la mitad… */
    mood: number
    /** Cuántas como mucho. */
    max: number
  }
> = {
  reception: { cost: 800, space: 2, mood: 0.05, max: 2 },
  cleaning: { cost: 600, space: 2, mood: 0.1, max: 4 },
  delivery: { cost: 700, space: 2, mood: 0.05, max: 3 },
  kitchen: { cost: 1500, space: 3, mood: 0.15, max: 3 },
  security: { cost: 2000, space: 3, mood: 0.05, max: 4 },
  maintenance: { cost: 3000, space: 4, mood: 0.1, max: 3 },
}

/**
 * La decoración: cosas (`piece`), alfombras (`flat`, se pisan) y mascotas
 * (`pet`, van solas por la oficina). Se compran con dinero desde el espacio
 * que piden; las de coste 0 solo salen en las cajas sorpresa.
 */
export type DecorKind = 'piece' | 'flat' | 'pet'
export type DecorItem = { id: string; cost: number; space: number; kind: DecorKind }

export const DECOR: readonly DecorItem[] = [
  { id: 'cactus', cost: 30, space: 0, kind: 'piece' },
  { id: 'plant', cost: 60, space: 0, kind: 'piece' },
  { id: 'rug', cost: 50, space: 0, kind: 'flat' },
  { id: 'lamp', cost: 80, space: 0, kind: 'piece' },
  { id: 'corkboard', cost: 90, space: 0, kind: 'piece' },
  { id: 'guitar', cost: 120, space: 0, kind: 'piece' },
  { id: 'beanbag', cost: 150, space: 0, kind: 'piece' },
  { id: 'bonsai', cost: 300, space: 1, kind: 'piece' },
  { id: 'bookcase', cost: 350, space: 1, kind: 'piece' },
  { id: 'sofa', cost: 400, space: 1, kind: 'piece' },
  { id: 'tv', cost: 600, space: 1, kind: 'piece' },
  { id: 'neon', cost: 900, space: 2, kind: 'piece' },
  { id: 'vending', cost: 1000, space: 2, kind: 'piece' },
  { id: 'aquarium', cost: 1200, space: 2, kind: 'piece' },
  { id: 'arcade', cost: 1500, space: 2, kind: 'piece' },
  { id: 'tree', cost: 3000, space: 3, kind: 'piece' },
  { id: 'clock', cost: 2500, space: 3, kind: 'piece' },
  { id: 'piano', cost: 4000, space: 3, kind: 'piece' },
  { id: 'statue', cost: 8000, space: 4, kind: 'piece' },
  { id: 'fountain', cost: 10000, space: 4, kind: 'piece' },
  // Solo en las cajas sorpresa.
  { id: 'trophy', cost: 0, space: 0, kind: 'piece' },
  { id: 'discoball', cost: 0, space: 0, kind: 'piece' },
  { id: 'telescope', cost: 0, space: 0, kind: 'piece' },
  { id: 'cat', cost: 0, space: 0, kind: 'pet' },
  { id: 'dog', cost: 0, space: 0, kind: 'pet' },
  { id: 'robot', cost: 0, space: 0, kind: 'pet' },
]

/** Cuántas piezas de decoración como mucho, colocadas o guardadas. */
export const DECOR_MAX = 80

/** Lo que tiene que durar una sesión del Pomodoro para ganar una caja sorpresa, en minutos. */
export const BOX_MINUTES = 30

/** Lo que cuesta contratar: base por estrella, y sube con la plantilla. */
export const HIRE_BASE = 60
/** Volver a sacar candidatos. */
export const REROLL_COST = 15
/** Candidatos que se ofrecen cada vez. */
export const CANDIDATES = 3

/** Lo largo que puede ser el nombre de la startup. */
export const NAME_MAX = 32
