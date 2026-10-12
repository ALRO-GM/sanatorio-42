/**
 * Code Clicker: las reglas.
 *
 * Todo son funciones sobre una partida (`Game`) que reciben la hora y, donde
 * hace falta, el azar: así se pueden probar sin reloj ni suerte. No tocan el
 * navegador ni saben nada de cómo se pinta.
 */

import {
  ACHIEVEMENTS,
  BUGS,
  BUILDINGS,
  CAFFEINE_PER_ACHIEVEMENT,
  CPS_GOALS,
  CURSOR_AT,
  DUCKS,
  FINGERS_BASE,
  FINGERS_MULT,
  GOLDEN,
  GOLDEN_GOALS,
  BUG_GOALS,
  GROWTH,
  HAND_GOALS,
  HOTFIX_BASE,
  HOTFIX_GROWTH,
  HOTFIX_MAX,
  HOTFIX_MS,
  MOUSE_AT,
  OWNED_GOALS,
  PRESTIGE_GOALS,
  PRESTIGE_UNIT,
  PROJECTS,
  REFUND,
  RESEARCH,
  RESEARCH_WAIT_MS,
  TIER_AT,
  TOTAL_GOALS,
  UPGRADE,
  UPGRADES,
} from './data'
import type { BuildingId, Upgrade } from './data'

export type BuffId = 'frenzy' | 'click' | 'clot' | 'elder'

/** Lo que puede pasar al abrir una pull request dorada (o una envenenada). */
export type GoldenEffect = BuffId | 'lucky' | 'ruin'

export type Game = {
  /** Versión del formato de la partida guardada. */
  v: 1
  /** Líneas de código que hay ahora mismo para gastar. */
  code: number
  /** Las escritas en esta partida, gastadas o no. */
  total: number
  /** Las escritas en partidas anteriores, antes de recompilar. */
  before: number
  /** Las escritas a mano, pulsando. */
  hand: number
  clicks: number
  owned: Partial<Record<BuildingId, number>>
  /** Ids de las mejoras compradas. */
  bought: string[]
  /** Ids de los logros conseguidos. */
  achieved: string[]
  /** Pull requests doradas abiertas, bugs aplastados y parches aplicados. */
  golden: number
  pops: number
  hotfixes: number
  /** Nivel de prestigio: un 1 % más de producción por cada uno. */
  prestige: number
  buffs: { id: BuffId; until: number }[]
  /** Cuándo sale la próxima pull request dorada, y la que hay a la vista. */
  goldenAt: number
  goldenUp: { until: number; wrath: boolean; x: number; y: number } | null
  /** Lo que se ha comido cada bug pegado al código. */
  bugs: number[]
  /** Hasta cuándo dura el parche que calma la singularidad. */
  hotfixUntil: number
  /** Cuándo se podrá ver la siguiente investigación. */
  researchAt: number
  /** Última vez que se hicieron cuentas. */
  last: number
}

/** Azar entre 0 y 1. Se pasa como argumento para poder fijarlo en los tests. */
export type Random = () => number

export function newGame(now: number, random: Random = Math.random): Game {
  return {
    v: 1,
    code: 0,
    total: 0,
    before: 0,
    hand: 0,
    clicks: 0,
    owned: {},
    bought: [],
    achieved: [],
    golden: 0,
    pops: 0,
    hotfixes: 0,
    prestige: 0,
    buffs: [],
    goldenAt: now + nextGolden(random),
    goldenUp: null,
    bugs: [],
    hotfixUntil: 0,
    researchAt: 0,
    last: now,
  }
}

const nextGolden = (random: Random): number =>
  GOLDEN.minMs + random() * (GOLDEN.maxMs - GOLDEN.minMs)

const has = (game: Game, id: string): boolean => game.bought.includes(id)
const ownedOf = (game: Game, id: BuildingId): number => game.owned[id] ?? 0

/** Cuántas mejoras de una familia (`tier:repo:`) se han comprado. */
const countBought = (game: Game, prefix: string): number =>
  game.bought.reduce((count, id) => count + (id.startsWith(prefix) ? 1 : 0), 0)

/**
 * En qué fase está la singularidad: 0, nada; 1 a 3, según lo investigado. Con
 * un parche puesto vuelve a 0 mientras dure.
 */
export function stageOf(game: Game, now: number): 0 | 1 | 2 | 3 {
  if (now < game.hotfixUntil) return 0

  return has(game, 'research:pact')
    ? 3
    : has(game, 'research:brainsweep')
      ? 2
      : has(game, 'research:onemind')
        ? 1
        : 0
}

/** La fase investigada, haya o no un parche puesto: es la que cambia el decorado. */
export function reachedStage(game: Game): 0 | 1 | 2 | 3 {
  return stageOf(game, Infinity)
}

/** Lo que suma cada cursor y cada pulsación por los edificios que no son cursores. */
function fingers(game: Game): number {
  const upgrades = Math.max(0, countBought(game, 'cursor:') - 3)

  if (upgrades === 0) return 0

  const others = BUILDINGS.reduce(
    (count, { id }) => count + (id === 'cursor' ? 0 : ownedOf(game, id)),
    0,
  )
  const mult = FINGERS_MULT.slice(0, upgrades).reduce((total, step) => total * step, 1)

  return FINGERS_BASE * mult * others
}

/** Lo que escribe por segundo una unidad de ese edificio, con sus mejoras. */
export function unitCps(game: Game, id: BuildingId): number {
  const base = BUILDINGS.find((building) => building.id === id)?.cps ?? 0

  if (id === 'cursor') {
    return base * 2 ** Math.min(3, countBought(game, 'cursor:')) + fingers(game)
  }

  let cps = base * 2 ** countBought(game, `tier:${id}:`)

  if (id === 'pisciner') {
    cps *= 2 ** countBought(game, 'mentor:')

    for (const step of RESEARCH) {
      if (step.pisciners !== undefined && has(game, `research:${step.id}`)) cps *= step.pisciners
    }

    // Una sola mente: cada pisciner rinde más cuantos más son. El pacto: y cuantos más portales hay.
    if (has(game, 'research:onemind')) cps += ownedOf(game, 'pisciner') * 0.02
    if (has(game, 'research:pact')) cps += ownedOf(game, 'portal') * 0.05
  }

  return cps
}

/** La cafeína: un 4 % por logro. De ella tiran los patitos de goma. */
export const caffeine = (game: Game): number => game.achieved.length * CAFFEINE_PER_ACHIEVEMENT

/** Por cuánto se multiplica toda la producción: proyectos, patitos, investigación y prestigio. */
export function globalMult(game: Game): number {
  let mult = 1 + game.prestige * 0.01

  for (const project of PROJECTS) {
    if (has(game, `project:${project.id}`)) mult *= 1 + project.power / 100
  }
  for (const step of RESEARCH) {
    if (step.power !== undefined && has(game, `research:${step.id}`)) mult *= 1 + step.power / 100
  }
  DUCKS.forEach((duck, tier) => {
    if (has(game, `duck:${tier}`)) mult *= 1 + caffeine(game) * duck.factor
  })

  return mult
}

const buffMult = (game: Game, now: number, ids: readonly BuffId[]): number =>
  game.buffs.reduce(
    (mult, buff) =>
      buff.until > now && ids.includes(buff.id)
        ? mult *
          (buff.id === 'frenzy'
            ? GOLDEN.frenzy.mult
            : buff.id === 'clot'
              ? GOLDEN.clot.mult
              : buff.id === 'elder'
                ? GOLDEN.elder.mult
                : GOLDEN.click.mult)
        : mult,
    1,
  )

/** Líneas por segundo sin contar rachas ni bugs: lo que dan los edificios con sus mejoras. */
export function baseCps(game: Game): number {
  return (
    BUILDINGS.reduce((total, { id }) => total + ownedOf(game, id) * unitCps(game, id), 0) *
    globalMult(game)
  )
}

/** Líneas por segundo ahora mismo, con las rachas que haya en marcha. */
export function cpsOf(game: Game, now: number): number {
  return baseCps(game) * buffMult(game, now, ['frenzy', 'clot', 'elder'])
}

/** Lo que da una pulsación. */
export function clickPower(game: Game, now: number): number {
  const mouse = countBought(game, 'mouse:')
  const power =
    2 ** Math.min(3, countBought(game, 'cursor:')) + fingers(game) + baseCps(game) * 0.01 * mouse

  return power * buffMult(game, now, ['frenzy', 'clot', 'elder', 'click'])
}

/** Lo que cuestan las `count` siguientes unidades de un edificio. */
export function priceOf(game: Game, id: BuildingId, count = 1): number {
  const base = BUILDINGS.find((building) => building.id === id)?.base ?? 0
  const owned = ownedOf(game, id)

  // Suma de una progresión geométrica: base·g^n·(g^count − 1)/(g − 1).
  return Math.ceil((base * GROWTH ** owned * (GROWTH ** count - 1)) / (GROWTH - 1))
}

/** Lo que se recupera al vender `count` unidades. */
export function refundOf(game: Game, id: BuildingId, count = 1): number {
  const sold = Math.min(count, ownedOf(game, id))
  const base = BUILDINGS.find((building) => building.id === id)?.base ?? 0
  const from = ownedOf(game, id) - sold

  return Math.floor(((base * GROWTH ** from * (GROWTH ** sold - 1)) / (GROWTH - 1)) * REFUND)
}

function earn(game: Game, amount: number): void {
  game.code += amount
  game.total += amount
}

/** Una pulsación en la tecla grande. Devuelve lo que ha dado. */
export function click(game: Game, now: number): number {
  const gained = clickPower(game, now)

  earn(game, gained)
  game.hand += gained
  game.clicks += 1

  return gained
}

/** Compra `count` unidades de un edificio, si llega. `true` si se han comprado. */
export function buy(game: Game, id: BuildingId, count = 1): boolean {
  const price = priceOf(game, id, count)

  if (price > game.code) return false

  game.code -= price
  game.owned[id] = ownedOf(game, id) + count

  return true
}

export function sell(game: Game, id: BuildingId, count = 1): boolean {
  const sold = Math.min(count, ownedOf(game, id))

  if (sold === 0) return false

  game.code += refundOf(game, id, sold)
  game.owned[id] = ownedOf(game, id) - sold

  return true
}

/** `true` si esa mejora ya se puede ver en la tienda (no si se puede pagar). */
function unlocked(game: Game, upgrade: Upgrade, now: number): boolean {
  const [kind = '', second = '', third = ''] = upgrade.id.split(':')
  const everWritten = game.total

  switch (kind) {
    case 'cursor':
      return ownedOf(game, 'cursor') >= (CURSOR_AT[Number(second)] ?? Infinity)
    case 'mouse':
      return game.hand >= (MOUSE_AT[Number(second)] ?? Infinity)
    case 'tier':
      return ownedOf(game, second as BuildingId) >= (TIER_AT[Number(third)] ?? Infinity)
    case 'mentor':
      return ownedOf(game, second as BuildingId) >= 15 && ownedOf(game, 'pisciner') >= 1
    case 'project':
      return everWritten >= upgrade.price / 20
    case 'duck':
      return game.achieved.length >= (DUCKS[Number(second)]?.at ?? Infinity)
    case 'research': {
      const index = RESEARCH.findIndex((step) => step.id === second)

      if (index === 0) {
        // El laboratorio sale con siete tipos de pisciner especializado.
        return countBought(game, 'mentor:') >= 7
      }

      const previous = RESEARCH[index - 1]

      return (
        previous !== undefined && has(game, `research:${previous.id}`) && now >= game.researchAt
      )
    }
    default:
      return false
  }
}

/** Las mejoras a la vista y sin comprar, de la más barata a la más cara. */
export function shop(game: Game, now: number): Upgrade[] {
  return UPGRADES.filter((upgrade) => !has(game, upgrade.id) && unlocked(game, upgrade, now)).sort(
    (a, b) => a.price - b.price,
  )
}

export function buyUpgrade(game: Game, id: string, now: number): boolean {
  const upgrade = UPGRADE.get(id)

  if (upgrade === undefined || has(game, id) || upgrade.price > game.code) return false
  if (!unlocked(game, upgrade, now)) return false

  game.code -= upgrade.price
  game.bought.push(id)

  // Cada investigación tarda en dejar ver la siguiente.
  if (id.startsWith('research:')) game.researchAt = now + RESEARCH_WAIT_MS

  return true
}

/** Lo que cuesta el próximo parche. */
export const hotfixPrice = (game: Game): number =>
  Math.min(HOTFIX_MAX, HOTFIX_BASE * HOTFIX_GROWTH ** game.hotfixes)

/** Aplica un parche: la singularidad se calma media hora y los bugs se van. */
export function hotfix(game: Game, now: number): boolean {
  const price = hotfixPrice(game)

  if (reachedStage(game) === 0 || now < game.hotfixUntil || price > game.code) return false

  game.code -= price
  game.hotfixes += 1
  game.hotfixUntil = now + HOTFIX_MS
  game.bugs = []

  return true
}

function addBuff(game: Game, id: BuffId, now: number, ms: number): void {
  game.buffs = [
    ...game.buffs.filter((buff) => buff.id !== id && buff.until > now),
    { id, until: now + ms },
  ]
}

/**
 * Abre la pull request que hay a la vista. Devuelve qué ha pasado y cuánto se
 * ha ganado o perdido, o `null` si no había ninguna.
 */
export function openGolden(
  game: Game,
  now: number,
  random: Random = Math.random,
): { effect: GoldenEffect; amount: number } | null {
  const up = game.goldenUp

  if (up === null || now > up.until) return null

  game.goldenUp = null
  game.goldenAt = now + nextGolden(random)
  game.golden += 1

  const roll = random()
  const effect: GoldenEffect = up.wrath
    ? roll < 0.3
      ? 'clot'
      : roll < 0.6
        ? 'ruin'
        : roll < 0.7
          ? 'elder'
          : roll < 0.85
            ? 'lucky'
            : 'click'
    : roll < 0.5
      ? 'frenzy'
      : roll < 0.95
        ? 'lucky'
        : 'click'
  const cps = baseCps(game)

  if (effect === 'lucky') {
    const amount = Math.min(game.code * GOLDEN.luckyShare, cps * GOLDEN.luckySeconds) + 13

    earn(game, amount)

    return { effect, amount }
  }
  if (effect === 'ruin') {
    const amount = Math.min(game.code * GOLDEN.ruinShare, cps * GOLDEN.ruinSeconds) + 13
    const lost = Math.min(game.code, amount)

    game.code -= lost

    return { effect, amount: -lost }
  }

  addBuff(game, effect, now, GOLDEN[effect].ms)

  return { effect, amount: 0 }
}

/** Aplasta un bug: devuelve lo que se había comido, y un 10 % más. */
export function squash(game: Game, index: number): number {
  const eaten = game.bugs[index]

  if (eaten === undefined) return 0

  const back = eaten * BUGS.back

  game.bugs.splice(index, 1)
  game.pops += 1
  earn(game, back)

  return back
}

/** Los niveles de prestigio que daría recompilar ahora. */
export function prestigeAfter(game: Game): number {
  return Math.floor(Math.cbrt((game.before + game.total) / PRESTIGE_UNIT))
}

/**
 * Recompila la realidad: empieza de cero, pero conserva los logros y sube el
 * prestigio según todo lo escrito hasta ahora.
 */
export function recompile(game: Game, now: number, random: Random = Math.random): Game {
  return {
    ...newGame(now, random),
    before: game.before + game.total,
    achieved: game.achieved,
    prestige: prestigeAfter(game),
  }
}

/** Los logros que tocan y aún no se tienen. `plus` son las pulsaciones de la cruz. */
function earned(game: Game, plus: number): string[] {
  const all = game.before + game.total
  const cps = baseCps(game)
  const reached = reachedStage(game)
  const tests: Record<string, (index: number, id: string) => boolean> = {
    plus: (goal) => plus >= goal,
    pill: () => true,
    total: (index) => all >= (TOTAL_GOALS[index] ?? Infinity),
    cps: (index) => cps >= (CPS_GOALS[index] ?? Infinity),
    hand: (index) => game.hand >= (HAND_GOALS[index] ?? Infinity),
    golden: (index) => game.golden >= (GOLDEN_GOALS[index] ?? Infinity),
    stage: (index) => reached >= index,
    hotfix: () => game.hotfixes > 0,
    bug: (index) => game.pops >= (BUG_GOALS[index] ?? Infinity),
    prestige: (index) => game.prestige >= (PRESTIGE_GOALS[index] ?? Infinity),
    own: (_, id) => {
      const [, building = '', index = ''] = id.split(':')

      return ownedOf(game, building as BuildingId) >= (OWNED_GOALS[Number(index)] ?? Infinity)
    },
  }

  return ACHIEVEMENTS.filter((id) => {
    if (game.achieved.includes(id)) return false

    const [kind = '', second = ''] = id.split(':')

    return tests[kind]?.(Number(second), id) ?? false
  })
}

/**
 * Hace avanzar la partida hasta `now`: escribe lo que toca, mueve rachas, pull
 * requests y bugs, y concede logros.
 *
 * @param plus Pulsaciones de la cruz de la cabecera, para los logros del secreto.
 * @returns Los logros que se acaban de conseguir.
 */
export function tick(game: Game, now: number, random: Random = Math.random, plus = 100): string[] {
  const seconds = Math.max(0, (now - game.last) / 1000)
  const stage = stageOf(game, now)

  game.last = now
  game.buffs = game.buffs.filter((buff) => buff.until > now)

  if (seconds > 0) {
    const cps = cpsOf(game, now)
    // Los bugs se comen su parte, y cada uno engorda con todo lo que se comen entre todos.
    const eaten = game.bugs.length * BUGS.share

    earn(game, cps * seconds * (1 - eaten))
    game.bugs = game.bugs.map((bug) => bug + cps * seconds * eaten)

    // Con la singularidad en marcha, de vez en cuando se pega un bug nuevo.
    if (
      stage > 0 &&
      game.bugs.length < BUGS.max &&
      random() < 1 - (1 - BUGS.spawnPerSecond * stage) ** seconds
    ) {
      game.bugs.push(0)
    }
  }

  if (game.goldenUp !== null && now > game.goldenUp.until) {
    game.goldenUp = null
    game.goldenAt = now + nextGolden(random)
  }
  if (game.goldenUp === null && now >= game.goldenAt) {
    game.goldenUp = {
      until: now + GOLDEN.lifeMs,
      // Cuanto más avanzada la singularidad, más a menudo viene envenenada.
      wrath: random() < stage / 3,
      x: 0.1 + random() * 0.8,
      y: 0.1 + random() * 0.8,
    }
  }

  const fresh = earned(game, plus)

  game.achieved.push(...fresh)

  return fresh
}

/** La partida tal como se guarda. */
export const serialize = (game: Game): string => JSON.stringify(game)

/** Lee una partida guardada; `null` si no se entiende. */
export function restore(saved: string | null, now: number): Game | null {
  if (saved === null) return null

  try {
    const parsed = JSON.parse(saved) as Partial<Game>

    if (parsed.v !== 1 || typeof parsed.code !== 'number') return null

    // Lo que falte (una partida de una versión anterior) vale lo de una nueva.
    // El tiempo con la web cerrada no cuenta: se retoma desde ahora.
    return { ...newGame(now), ...parsed, last: now, goldenUp: null }
  } catch {
    return null
  }
}
