/**
 * Code Clicker: qué se puede construir, comprar y conseguir.
 *
 * El juego es una recreación con tema de programación de un clásico de los
 * "juegos incrementales": se pulsa para escribir líneas de código, se compran
 * cosas que las escriben solas y cada una cuesta un 15 % más que la anterior.
 * Los números de equilibrio (costes, producción, umbrales) son los del género,
 * para que el ritmo sea el de siempre; el código, los textos y los dibujos son
 * propios.
 *
 * Aquí solo hay datos: las reglas están en `engine.ts` y los nombres, en
 * `texts.ts`.
 */

/** Lo que escribe código solo. De menos a más: cada uno cuesta ~11 veces el anterior. */
export const BUILDINGS = [
  { id: 'cursor', base: 15, cps: 0.1 },
  { id: 'pisciner', base: 100, cps: 1 },
  { id: 'cluster', base: 1_100, cps: 8 },
  { id: 'overflow', base: 12_000, cps: 47 },
  { id: 'pipeline', base: 130_000, cps: 260 },
  { id: 'repo', base: 1_400_000, cps: 1_400 },
  { id: 'temple', base: 20_000_000, cps: 7_800 },
  { id: 'regex', base: 330_000_000, cps: 44_000 },
  { id: 'docker', base: 5_100_000_000, cps: 260_000 },
  { id: 'compiler', base: 75_000_000_000, cps: 1_600_000 },
  { id: 'portal', base: 1e12, cps: 1e7 },
  { id: 'rebase', base: 1.4e13, cps: 6.5e7 },
  { id: 'quantum', base: 1.7e14, cps: 4.3e8 },
  { id: 'neural', base: 2.1e15, cps: 2.9e9 },
  { id: 'fuzzer', base: 2.6e16, cps: 2.1e10 },
  { id: 'recursion', base: 3.1e17, cps: 1.5e11 },
  { id: 'terminal', base: 7.1e19, cps: 1.1e12 },
  { id: 'forks', base: 1.2e22, cps: 8.3e12 },
  { id: 'hive', base: 1.9e24, cps: 6.4e13 },
  { id: 'you', base: 5.4e26, cps: 5.1e14 },
] as const

export type BuildingId = (typeof BUILDINGS)[number]['id']

/** Cada compra encarece la siguiente esto. */
export const GROWTH = 1.15
/** Al vender se recupera esta parte de lo que costó. */
export const REFUND = 0.25
/**
 * Y esta cuando lo vende la policía del código por haber hecho trampas: la
 * mitad. La misma cantidad se reparte entre quienes nunca han sido pillados
 * (lo lleva la API, `SALE_REFUND`; un test comprueba que coinciden).
 */
export const FORCED_REFUND = 0.5

/** Cuántos hay que tener para que salga cada mejora de un edificio. */
export const TIER_AT = [1, 5, 25, 50, 100, 150, 200, 250, 300, 350, 400]
/** Lo que cuesta cada una, en veces el precio base del edificio. */
const TIER_PRICE = [10, 50, 500, 5e4, 5e6, 5e8, 5e10, 5e13, 5e16, 5e19, 5e22]

/**
 * El cursor va aparte: sus tres primeras mejoras lo doblan (a él y a cada
 * pulsación); las siguientes le suman producción por cada edificio que no sea
 * un cursor.
 */
export const CURSOR_AT = [1, 1, 10, 25, 50, 100, 150, 200, 250, 300, 350]
const CURSOR_PRICE = [100, 500, 1e4, 1e5, 1e7, 1e8, 1e9, 1e10, 1e13, 1e16, 1e19]
/** Lo que suma por edificio ajeno la primera de esas mejoras, y por cuánto lo multiplica cada una de las siguientes. */
export const FINGERS_BASE = 0.1
export const FINGERS_MULT = [1, 5, 10, 20, 20, 20, 20, 20]

/** Mejoras del ratón: cada pulsación gana un 1 % de la producción por segundo. */
export const MOUSE_AT = [1e3, 1e5, 1e7, 1e9, 1e11, 1e13, 1e15, 1e17, 1e19]
const MOUSE_PRICE = [5e4, 5e6, 5e8, 5e10, 5e12, 5e14, 5e16, 5e18, 5e20]

/**
 * Proyectos de 42: cada uno sube toda la producción un tanto por ciento. Salen
 * cuando se ha escrito una vigésima parte de lo que cuestan.
 */
export const PROJECTS: readonly { id: string; price: number; power: number }[] = [
  { id: 'libft', price: 999_999, power: 1 },
  { id: 'ft_printf', price: 5e6, power: 1 },
  { id: 'get_next_line', price: 1e7, power: 1 },
  { id: 'born2beroot', price: 5e7, power: 2 },
  { id: 'so_long', price: 1e8, power: 2 },
  { id: 'fdf', price: 5e8, power: 2 },
  { id: 'fract-ol', price: 1e9, power: 2 },
  { id: 'pipex', price: 5e9, power: 2 },
  { id: 'minitalk', price: 1e10, power: 2 },
  { id: 'push_swap', price: 5e10, power: 2 },
  { id: 'philosophers', price: 1e11, power: 2 },
  { id: 'minishell', price: 5e11, power: 3 },
  { id: 'netpractice', price: 1e12, power: 3 },
  { id: 'cub3d', price: 5e12, power: 3 },
  { id: 'miniRT', price: 1e13, power: 3 },
  { id: 'cpp', price: 5e13, power: 3 },
  { id: 'inception', price: 1e14, power: 4 },
  { id: 'webserv', price: 5e14, power: 4 },
  { id: 'ft_irc', price: 1e15, power: 4 },
  { id: 'ft_transcendence', price: 5e15, power: 4 },
  { id: 'exam_rank_06', price: 1e17, power: 5 },
  { id: 'kfs', price: 1e19, power: 5 },
  { id: 'ft_linux', price: 1e21, power: 5 },
  { id: 'doom_nukem', price: 1e23, power: 5 },
]

/**
 * Patitos de goma: multiplican la producción según la cafeína, que es un 4 %
 * por logro. `at` son los logros que hacen falta para que salgan.
 */
export const DUCKS: readonly { at: number; price: number; factor: number }[] = [
  { at: 13, price: 9e6, factor: 0.1 },
  { at: 25, price: 9e9, factor: 0.125 },
  { at: 50, price: 9e13, factor: 0.15 },
  { at: 75, price: 9e16, factor: 0.175 },
  { at: 100, price: 9e20, factor: 0.2 },
  { at: 125, price: 9e23, factor: 0.2 },
  { at: 150, price: 9e26, factor: 0.2 },
]
export const CAFFEINE_PER_ACHIEVEMENT = 0.04

/**
 * La investigación que lo tuerce todo. Se compra en orden y cada compra tarda
 * media hora en dejar ver la siguiente. `stage` es la fase de la singularidad
 * que abre: 1, los pisciners piensan como uno; 2, ya no hace falta que piensen;
 * 3, el pacto.
 */
export const RESEARCH: readonly {
  id: string
  price: number
  /** Tanto por ciento que suma a toda la producción. */
  power?: number
  /** Multiplica la producción de los pisciners. */
  pisciners?: number
  stage?: 1 | 2 | 3
}[] = [
  { id: 'lab', price: 1e15, pisciners: 4 },
  { id: 'syntax', price: 1e15, power: 1 },
  { id: 'style', price: 2e15, power: 2 },
  { id: 'ritual', price: 4e15, pisciners: 2 },
  { id: 'underworld', price: 8e15, power: 3 },
  { id: 'onemind', price: 1.6e16, stage: 1 },
  { id: 'exotic', price: 3.2e16, power: 4 },
  { id: 'brainsweep', price: 6.4e16, stage: 2 },
  { id: 'arcane', price: 1.28e17, power: 5 },
  { id: 'pact', price: 2.56e17, stage: 3 },
]
export const RESEARCH_WAIT_MS = 30 * 60_000

/** El parche que calma la singularidad un rato: cada vez cuesta ocho veces más. */
export const HOTFIX_BASE = 64
export const HOTFIX_GROWTH = 8
export const HOTFIX_MAX = 64 * 8 ** 12
export const HOTFIX_MS = 30 * 60_000

/** La pull request dorada: cada cuánto sale, cuánto dura y qué hace. */
export const GOLDEN = {
  minMs: 5 * 60_000,
  maxMs: 15 * 60_000,
  lifeMs: 13_000,
  frenzy: { mult: 7, ms: 77_000 },
  click: { mult: 777, ms: 13_000 },
  clot: { mult: 0.5, ms: 66_000 },
  elder: { mult: 666, ms: 6_000 },
  /** La racha de suerte da esto de lo que hay, o tantos segundos de producción: lo menor. */
  luckyShare: 0.15,
  luckySeconds: 900,
  /** La ruina quita esto, con el mismo criterio. */
  ruinShare: 0.05,
  ruinSeconds: 600,
} as const

/** Bugs que se pegan al código: cada uno se come un 5 % y devuelve un 10 % más al aplastarlo. */
export const BUGS = { max: 10, share: 0.05, back: 1.1, spawnPerSecond: 0.002 } as const

/** Recompilar la realidad: un nivel por cada raíz cúbica de billones escritos. */
export const PRESTIGE_UNIT = 1e12

/** Umbrales de los logros que se generan solos. */
export const TOTAL_GOALS = [
  1, 1e3, 1e5, 1e6, 1e8, 1e9, 1e11, 1e12, 1e14, 1e15, 1e17, 1e18, 1e20, 1e21, 1e23, 1e24, 1e26,
  1e27, 1e29, 1e30,
]
export const CPS_GOALS = [
  1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e12, 1e14, 1e16, 1e18, 1e20,
]
export const OWNED_GOALS = [1, 50, 100, 150, 200, 250, 300]
export const HAND_GOALS = [1e3, 1e5, 1e7, 1e9, 1e11]
export const GOLDEN_GOALS = [1, 7, 27, 77]
export const BUG_GOALS = [1, 50, 200]
export const PRESTIGE_GOALS = [1, 10, 100]
/** Veces que te han pillado haciendo trampas: las tres primeras dan logro. */
export const HACK_GOALS = [1, 2, 3]
/** Puntos de evaluación donados a la bolsa de 42 que dan cada logro. */
export const DONATE_GOALS = [1, 10, 42]
/** Lo más que suma a la producción lo donado: un 42 %. */
export const DONATION_CAP = 0.42
/** Los del secreto: las pulsaciones de la cruz que dan cada uno (42 abre el juego). */
export const PLUS_GOALS = [1, 10, 21, 42]

/**
 * Para quien llegó antes de que la puerta bajara de cien a 42 pulsaciones: lo
 * tiene quien consiguió el logro de las cincuenta. Ya no se puede conseguir.
 */
export const BETA = 'beta'

/** Todos los ids de logro, en el orden en que se enseñan. */
export const ACHIEVEMENTS: readonly string[] = [
  ...PLUS_GOALS.map((goal) => `plus:${goal}`),
  'pill:red',
  BETA,
  ...TOTAL_GOALS.map((_, index) => `total:${index}`),
  ...CPS_GOALS.map((_, index) => `cps:${index}`),
  ...HAND_GOALS.map((_, index) => `hand:${index}`),
  ...GOLDEN_GOALS.map((_, index) => `golden:${index}`),
  ...BUILDINGS.flatMap(({ id }) => OWNED_GOALS.map((_, index) => `own:${id}:${index}`)),
  'stage:1',
  'stage:2',
  'stage:3',
  'hotfix',
  ...DONATE_GOALS.map((_, index) => `donate:${index}`),
  ...BUG_GOALS.map((_, index) => `bug:${index}`),
  ...PRESTIGE_GOALS.map((_, index) => `prestige:${index}`),
  // Los de las trampas van al final y no se enseñan hasta tenerlos.
  ...HACK_GOALS.map((_, index) => `hack:${index}`),
]

/** Un logro que no sale en la lista hasta que se consigue. */
export const hiddenAchievement = (id: string): boolean => id.startsWith('hack:') || id === BETA

export type Upgrade = {
  id: string
  price: number
  /** Qué dibujo lleva: el de un edificio, o uno propio. */
  icon: string
  /** Escalón de la mejora, para el color del marco. */
  tier: number
}

/** Todas las mejoras que existen, sin decir cuáles están a la vista. */
export const UPGRADES: readonly Upgrade[] = [
  ...CURSOR_PRICE.map((price, tier) => ({ id: `cursor:${tier}`, price, icon: 'cursor', tier })),
  ...MOUSE_PRICE.map((price, tier) => ({ id: `mouse:${tier}`, price, icon: 'mouse', tier })),
  ...BUILDINGS.slice(1).flatMap(({ id, base }) =>
    TIER_PRICE.map((mult, tier) => ({
      id: `tier:${id}:${tier}`,
      price: base * mult,
      icon: id,
      tier,
    })),
  ),
  // Cada edificio tiene sus pisciners especializados, que doblan a todos los pisciners.
  ...BUILDINGS.slice(2).map(({ id, base }, index) => ({
    id: `mentor:${id}`,
    price: base * 50,
    icon: 'pisciner',
    tier: index % 11,
  })),
  ...PROJECTS.map(({ id, price }, index) => ({
    id: `project:${id}`,
    price,
    icon: 'project',
    tier: index % 11,
  })),
  ...DUCKS.map(({ price }, tier) => ({ id: `duck:${tier}`, price, icon: 'duck', tier })),
  ...RESEARCH.map(({ id, price }, tier) => ({
    id: `research:${id}`,
    price,
    icon: 'research',
    tier,
  })),
]

export const UPGRADE: ReadonlyMap<string, Upgrade> = new Map(
  UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
)
