/**
 * Code Clicker: las reglas del juego, con la hora y el azar fijados.
 */

import { describe, expect, it } from 'vitest'

import {
  ACHIEVEMENTS,
  BUILDINGS,
  GOLDEN,
  HOTFIX_MS,
  PROJECTS,
  RESEARCH,
  RESEARCH_WAIT_MS,
  UPGRADES,
} from '../src/features/clicker/data'
import {
  baseCps,
  buy,
  buyUpgrade,
  click,
  clickPower,
  cpsOf,
  hotfix,
  hotfixPrice,
  newGame,
  openGolden,
  prestigeAfter,
  priceOf,
  reachedStage,
  recompile,
  restore,
  sell,
  serialize,
  shop,
  squash,
  stageOf,
  tick,
  unitCps,
} from '../src/features/clicker/engine'
import type { Game } from '../src/features/clicker/engine'
import {
  achievementText,
  newsFor,
  short,
  textsOf,
  upgradeText,
} from '../src/features/clicker/texts'

const T0 = 1_000_000
const SECOND = 1000
/** Azar fijo: siempre el mismo número. */
const always = (value: number) => (): number => value

/** Una partida con dinero de sobra y lo que se le pida comprado. */
function rich(setup: (game: Game) => void = () => undefined): Game {
  const game = newGame(T0, always(0.5))

  game.code = 1e40
  setup(game)

  return game
}

describe('code clicker: escribir y comprar', () => {
  it('cada pulsación escribe una línea, y los cursores escriben solos', () => {
    const game = newGame(T0, always(0.5))

    expect(click(game, T0)).toBe(1)
    expect(game).toMatchObject({ code: 1, total: 1, hand: 1, clicks: 1 })

    game.code = 15
    expect(buy(game, 'cursor')).toBe(true)
    expect(game.code).toBe(0)
    expect(baseCps(game)).toBeCloseTo(0.1)

    // Diez segundos después, el cursor ha escrito una línea.
    tick(game, T0 + 10 * SECOND, always(0.5))
    expect(game.code).toBeCloseTo(1)
  })

  it('cada compra encarece la siguiente un 15 %, y vender devuelve una cuarta parte', () => {
    const game = rich()

    expect(priceOf(game, 'cursor')).toBe(15)
    buy(game, 'cursor')
    expect(priceOf(game, 'cursor')).toBe(18) // 15 × 1,15, redondeado hacia arriba
    // Diez de golpe cuestan lo mismo que diez de uno en uno.
    const ten = priceOf(game, 'pisciner', 10)
    let one = 0

    for (let bought = 0; bought < 10; bought += 1) {
      one += priceOf(game, 'pisciner')
      buy(game, 'pisciner')
    }

    expect(Math.abs(ten - one)).toBeLessThan(10)
    expect(sell(game, 'pisciner', 10)).toBe(true)
    expect(game.owned.pisciner).toBe(0)
    expect(sell(game, 'pisciner')).toBe(false)
    // Sin dinero no se compra.
    game.code = 5
    expect(buy(game, 'cluster')).toBe(false)
  })

  it('los edificios siguen la escalera del género: cada uno, más caro y más rápido', () => {
    expect(BUILDINGS).toHaveLength(20)

    BUILDINGS.slice(1).forEach((building, index) => {
      const previous = BUILDINGS[index]

      expect(building.base).toBeGreaterThan(previous?.base ?? 0)
      expect(building.cps).toBeGreaterThan(previous?.cps ?? 0)
    })
  })
})

describe('code clicker: mejoras', () => {
  it('una mejora de edificio sale al tener bastantes, y lo dobla', () => {
    const game = rich((g) => {
      g.owned.pisciner = 1
    })

    expect(shop(game, T0).map((upgrade) => upgrade.id)).toContain('tier:pisciner:0')
    expect(shop(game, T0).map((upgrade) => upgrade.id)).not.toContain('tier:pisciner:1')
    expect(unitCps(game, 'pisciner')).toBe(1)
    expect(buyUpgrade(game, 'tier:pisciner:0', T0)).toBe(true)
    expect(unitCps(game, 'pisciner')).toBe(2)
    // No se compra dos veces, ni lo que aún no se ha visto.
    expect(buyUpgrade(game, 'tier:pisciner:0', T0)).toBe(false)
    expect(buyUpgrade(game, 'tier:pisciner:3', T0)).toBe(false)
  })

  it('las tres primeras del cursor doblan la pulsación; las siguientes suman por edificio', () => {
    const game = rich((g) => {
      g.owned.cursor = 25
      g.owned.pisciner = 10
    })

    for (const tier of [0, 1, 2]) buyUpgrade(game, `cursor:${tier}`, T0)
    expect(clickPower(game, T0)).toBe(8)

    buyUpgrade(game, 'cursor:3', T0)
    // +0,1 por cada uno de los diez pisciners.
    expect(clickPower(game, T0)).toBeCloseTo(9)
    expect(unitCps(game, 'cursor')).toBeCloseTo(0.8 + 1)
  })

  it('un proyecto de 42 sube toda la producción su tanto por ciento', () => {
    const game = rich((g) => {
      g.owned.pisciner = 100
      g.total = 1e9
    })
    const before = baseCps(game)

    expect(buyUpgrade(game, 'project:libft', T0)).toBe(true)
    expect(baseCps(game)).toBeCloseTo(before * 1.01)
    expect(PROJECTS.map((project) => project.id)).toContain('ft_transcendence')
  })

  it('los patitos convierten la cafeína de los logros en producción', () => {
    const game = rich((g) => {
      g.owned.pisciner = 10
      g.achieved = ACHIEVEMENTS.slice(0, 25)
    })
    const before = baseCps(game)

    buyUpgrade(game, 'duck:0', T0)
    // 25 logros son un 100 % de cafeína; el primer patito aprovecha la décima parte.
    expect(baseCps(game)).toBeCloseTo(before * 1.1)
  })

  it('todas las mejoras tienen nombre y descripción en los dos idiomas', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const upgrade of UPGRADES) {
        const [name, about] = upgradeText(upgrade.id, lang)

        expect(name, upgrade.id).not.toBe(upgrade.id.startsWith('project:') ? '' : upgrade.id)
        expect(about.length, upgrade.id).toBeGreaterThan(5)
        expect(`${name}${about}`).not.toMatch(/\{\w+\}/)
      }
    }
  })
})

describe('code clicker: pull requests doradas', () => {
  it('sale entre cinco y quince minutos después, y dura trece segundos', () => {
    const game = newGame(T0, always(0))

    expect(game.goldenAt).toBe(T0 + GOLDEN.minMs)
    tick(game, T0 + GOLDEN.minMs - 1, always(0.5))
    expect(game.goldenUp).toBeNull()
    tick(game, T0 + GOLDEN.minMs, always(0.5))
    expect(game.goldenUp).toMatchObject({ wrath: false, until: T0 + GOLDEN.minMs + GOLDEN.lifeMs })

    // Si nadie la abre, se va y se programa la siguiente.
    tick(game, T0 + GOLDEN.minMs + GOLDEN.lifeMs + 1, always(0.5))
    expect(game.goldenUp).toBeNull()
    expect(openGolden(game, T0 + GOLDEN.minMs + GOLDEN.lifeMs + 2)).toBeNull()
  })

  it('el frenesí multiplica por siete durante 77 segundos', () => {
    const game = rich((g) => {
      g.owned.pisciner = 10
      g.goldenUp = { until: T0 + 5000, wrath: false, x: 0.5, y: 0.5 }
    })

    expect(openGolden(game, T0, always(0.1))).toEqual({ effect: 'frenzy', amount: 0 })
    expect(cpsOf(game, T0 + 1000)).toBeCloseTo(baseCps(game) * 7)
    expect(cpsOf(game, T0 + GOLDEN.frenzy.ms + 1)).toBeCloseTo(baseCps(game))
    expect(game.golden).toBe(1)
  })

  it('la suerte da el 15 % de lo que hay o un cuarto de hora de producción, lo menor', () => {
    const game = newGame(T0, always(0.5))

    game.owned.pisciner = 10
    game.code = 1000
    game.goldenUp = { until: T0 + 5000, wrath: false, x: 0.5, y: 0.5 }

    // 15 % de 1000 = 150; un cuarto de hora a 10/s serían 9000. Gana lo menor, más 13.
    expect(openGolden(game, T0, always(0.6))).toEqual({ effect: 'lucky', amount: 163 })
    expect(game.code).toBe(1163)
  })

  it('con la singularidad en marcha puede venir envenenada, y quitar líneas', () => {
    const game = rich((g) => {
      g.bought = ['research:onemind', 'research:brainsweep', 'research:pact']
      g.owned.pisciner = 10
      g.goldenAt = T0
    })

    tick(game, T0, always(0.1))
    expect(game.goldenUp?.wrath).toBe(true)

    game.code = 1000
    expect(openGolden(game, T0, always(0.4))).toMatchObject({ effect: 'ruin' })
    expect(game.code).toBeLessThan(1000)
  })
})

describe('code clicker: la singularidad', () => {
  const withMentors = (game: Game): void => {
    game.bought = BUILDINGS.slice(2, 9).map(({ id }) => `mentor:${id}`)
  }

  it('la investigación se compra en orden, con media hora entre una y otra', () => {
    const game = rich(withMentors)

    expect(shop(game, T0).map((upgrade) => upgrade.id)).toContain('research:lab')
    expect(buyUpgrade(game, 'research:lab', T0)).toBe(true)
    // La siguiente no se ve hasta que pasa la espera.
    expect(buyUpgrade(game, 'research:syntax', T0 + 1000)).toBe(false)
    expect(buyUpgrade(game, 'research:syntax', T0 + RESEARCH_WAIT_MS)).toBe(true)
    expect(buyUpgrade(game, 'research:onemind', T0 + 2 * RESEARCH_WAIT_MS)).toBe(false)
    expect(RESEARCH.filter((step) => step.stage !== undefined).map((step) => step.stage)).toEqual([
      1, 2, 3,
    ])
  })

  it('las tres fases suben de una en una, y un parche las calma media hora', () => {
    const game = rich()

    expect(reachedStage(game)).toBe(0)
    game.bought.push('research:onemind')
    expect(stageOf(game, T0)).toBe(1)
    game.bought.push('research:brainsweep', 'research:pact')
    expect(stageOf(game, T0)).toBe(3)

    expect(hotfixPrice(game)).toBe(64)
    expect(hotfix(game, T0)).toBe(true)
    expect(stageOf(game, T0 + 1000)).toBe(0)
    // El decorado sigue siendo el de la fase alcanzada.
    expect(reachedStage(game)).toBe(3)
    expect(stageOf(game, T0 + HOTFIX_MS + 1)).toBe(3)
    // El siguiente cuesta ocho veces más, y no se aplica otro mientras dura.
    expect(hotfixPrice(game)).toBe(512)
    expect(hotfix(game, T0 + 1000)).toBe(false)
  })

  it('un bug se come el 5 %, y al aplastarlo devuelve lo comido con un 10 % más', () => {
    const game = newGame(T0, always(0.99))

    game.owned.pisciner = 100
    game.bugs = [0]

    tick(game, T0 + 10 * SECOND, always(0.99))
    // 100 líneas por segundo durante diez segundos: 950 para ti, 50 para el bug.
    expect(game.code).toBeCloseTo(950)
    expect(game.bugs[0]).toBeCloseTo(50)
    expect(squash(game, 0)).toBeCloseTo(55)
    expect(game.code).toBeCloseTo(1005)
    expect(game.pops).toBe(1)
    expect(squash(game, 3)).toBe(0)
  })

  it('con una sola mente, cada pisciner rinde más cuantos más son', () => {
    const game = rich((g) => {
      g.owned.pisciner = 100
    })
    const before = unitCps(game, 'pisciner')

    game.bought.push('research:onemind')
    expect(unitCps(game, 'pisciner')).toBeCloseTo(before + 100 * 0.02)
  })
})

describe('code clicker: logros, prestigio y partida guardada', () => {
  it('los logros se dan una sola vez, y los del secreto dependen de la cruz', () => {
    const game = newGame(T0, always(0.5))

    expect(tick(game, T0, always(0.5), 10)).toEqual(['plus:1', 'plus:10', 'pill:red'])
    expect(tick(game, T0 + 1, always(0.5), 100)).toEqual(['plus:50', 'plus:100'])

    click(game, T0 + 2)
    expect(tick(game, T0 + 3, always(0.5), 100)).toEqual(['total:0'])
    expect(tick(game, T0 + 4, always(0.5), 100)).toEqual([])

    game.code = 1e6
    buy(game, 'cursor', 50)
    expect(tick(game, T0 + 5, always(0.5), 100)).toEqual(
      expect.arrayContaining(['own:cursor:0', 'own:cursor:1', 'cps:0']),
    )
  })

  it('todos los logros tienen nombre en los dos idiomas, y no hay ninguno repetido', () => {
    expect(new Set(ACHIEVEMENTS).size).toBe(ACHIEVEMENTS.length)
    expect(ACHIEVEMENTS.length).toBeGreaterThan(190)

    for (const lang of ['es', 'en'] as const) {
      for (const id of ACHIEVEMENTS) {
        const [name, about] = achievementText(id, lang)

        expect(name, id).not.toBe(id)
        expect(`${name}${about}`, id).not.toMatch(/\{\w+\}/)
      }
    }
  })

  it('recompilar empieza de cero, pero guarda logros y sube el prestigio', () => {
    const game = rich((g) => {
      g.total = 8e12
      g.owned.pisciner = 40
      g.achieved = ['total:0']
    })

    // Raíz cúbica de ocho billones entre un billón: 2.
    expect(prestigeAfter(game)).toBe(2)

    const next = recompile(game, T0 + 1000, always(0.5))

    expect(next).toMatchObject({ code: 0, total: 0, before: 8e12, prestige: 2, owned: {} })
    expect(next.achieved).toEqual(['total:0'])

    next.owned.pisciner = 10
    // Un 1 % más por nivel de prestigio.
    expect(baseCps(next)).toBeCloseTo(10 * 1.02)
  })

  it('la partida guardada se recupera, y el tiempo con la web cerrada no cuenta', () => {
    const game = rich((g) => {
      g.owned.repo = 3
      g.bought = ['tier:repo:0']
    })
    const back = restore(serialize(game), T0 + 3600 * SECOND)

    expect(back).toMatchObject({
      owned: { repo: 3 },
      bought: ['tier:repo:0'],
      last: T0 + 3600 * SECOND,
    })
    expect(restore('no es json', T0)).toBeNull()
    expect(restore('{"v":99}', T0)).toBeNull()
    expect(restore(null, T0)).toBeNull()
  })
})

describe('code clicker: textos', () => {
  it('los números grandes se leen, en cada idioma a su manera', () => {
    expect(short(999, 'es')).toBe('999')
    expect(short(1_500_000, 'en')).toBe('1.5 million')
    expect(short(1_500_000, 'es')).toBe('1,5 millones')
    // En español, mil millones no son un billón.
    expect(short(2e9, 'es')).toBe('2 miles de millones')
    expect(short(2e9, 'en')).toBe('2 billion')
    expect(short(3e12, 'es')).toBe('3 billones')
  })

  it('las noticias cambian con la partida: del presente a un mundo escrito en código', () => {
    const { news } = textsOf('es')

    expect(newsFor('es', 0, 10)).toBe(news.early)
    expect(newsFor('es', 0, 1e9)).toBe(news.mid)
    expect(newsFor('es', 0, 1e15)).toBe(news.late)
    expect(newsFor('es', 1, 10)).toBe(news.one)
    expect(newsFor('es', 3, 10)).toBe(news.three)

    // Los dos idiomas tienen las mismas noticias, una a una.
    for (const era of ['early', 'mid', 'late', 'one', 'two', 'three'] as const) {
      expect(textsOf('en').news[era]).toHaveLength(news[era].length)
    }
  })

  it('cada edificio tiene nombre, plural y descripción en los dos idiomas', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const { id } of BUILDINGS) {
        expect(textsOf(lang).buildings[id].every((text) => text.length > 1)).toBe(true)
      }
    }
  })
})
