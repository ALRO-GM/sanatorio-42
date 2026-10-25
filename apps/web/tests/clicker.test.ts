/**
 * Code Clicker: las reglas del juego, con la hora y el azar fijados.
 */

import { describe, expect, it } from 'vitest'
import gameEn from 'virtual:textos/juego/en'
import gameFr from 'virtual:textos/juego/fr'

import {
  ACHIEVEMENTS,
  BUILDINGS,
  GOLDEN,
  HOTFIX_MS,
  PROJECTS,
  RESEARCH,
  RESEARCH_WAIT_MS,
  UPGRADES,
} from '@sanatorio/clicker'
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
} from '@sanatorio/clicker'
import type { Game } from '@sanatorio/clicker'
import { cardFor } from '../src/features/clicker/cards'
import {
  buildingGain,
  buildingShare,
  levelProgress,
  payback,
  span,
  upgradeGain,
  waitFor,
} from '../src/features/clicker/insight'
import { canResume, newSession } from '../src/features/clicker/sync'
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

  it('en francés, lo que no tiene traducción sale en inglés y no en español', () => {
    const ui = textsOf('fr').ui

    for (const [key, english] of Object.entries(gameEn)) {
      if (!key.startsWith('game.ui.')) continue
      expect(ui[key.slice('game.ui.'.length)], key).toBe(gameFr[key] ?? english)
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
    expect(tick(game, T0 + 1, always(0.5), 42)).toEqual(['plus:21', 'plus:42'])

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

    expect(newsFor('es', 0, 10)).toEqual(news.early)
    expect(newsFor('es', 0, 1e9)).toEqual(news.mid)
    expect(newsFor('es', 0, 1e15)).toEqual(news.late)
    expect(newsFor('es', 1, 10)).toBe(news.one)
    expect(newsFor('es', 3, 10)).toBe(news.three)

    // Hay bastantes de cada época para que tarden en repetirse.
    for (const era of ['early', 'mid', 'late'] as const) {
      expect(news[era].length).toBeGreaterThanOrEqual(16)
      expect(new Set(news[era]).size).toBe(news[era].length)
    }

    // Al recompilar la realidad entran las de ese ciclo, que salen el doble
    // que las de la época; con más prestigio, otra tanda distinta.
    const [first = [], second = [], third = [], fourth = []] = news.cycles
    const count = (pool: string[], item: string | undefined): number =>
      pool.filter((other) => other === item).length

    expect(news.cycles).toHaveLength(4)
    expect(count(newsFor('es', 0, 10, 0), first[0])).toBe(0)
    expect(count(newsFor('es', 0, 10, 1), first[0])).toBe(2)
    expect(count(newsFor('es', 0, 10, 1), news.early[0])).toBe(1)
    expect(count(newsFor('es', 0, 10, 4), first[0])).toBe(2)
    expect(count(newsFor('es', 0, 10, 5), second[0])).toBe(2)
    expect(count(newsFor('es', 0, 10, 5), first[0])).toBe(0)
    expect(count(newsFor('es', 0, 10, 30), third[0])).toBe(2)
    expect(count(newsFor('es', 0, 10, 5000), fourth[0])).toBe(2)
    // La singularidad manda aunque se haya recompilado.
    expect(newsFor('es', 2, 10, 30)).toBe(news.two)
    textsOf('en').news.cycles.forEach((tier, index) => {
      expect(tier).toHaveLength(news.cycles[index]?.length ?? -1)
    })

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

describe('code clicker: dónde vive la partida', () => {
  it('tras jugar sin conexión solo se sigue guardando si nadie ha tocado la partida', () => {
    // La API no tenía partida: no hay nada que pisar.
    expect(canResume({ save: null, rev: 0 }, { save: null, rev: null })).toBe(true)
    // La copia del navegador salió de la misma rev que hay en la API.
    expect(canResume({ save: '{}', rev: 7 }, { save: '{}', rev: 7 })).toBe(true)
    // Mientras tanto se guardó desde otro dispositivo.
    expect(canResume({ save: '{}', rev: 8 }, { save: '{}', rev: 7 })).toBe(false)
    // Navegador nuevo, sin copia: la partida recién empezada no pisa la buena.
    expect(canResume({ save: '{}', rev: 3 }, { save: null, rev: null })).toBe(false)
    expect(canResume({ save: '{}', rev: 0 }, { save: null, rev: 0 })).toBe(false)
  })

  it('cada pestaña tiene su identificador', () => {
    expect(newSession()).not.toBe(newSession())
    expect(newSession().length).toBeGreaterThanOrEqual(8)
  })
})

describe('code clicker: las fichas que explican cada cosa', () => {
  const NOW = 1_000_000
  const context = (game: Game) => ({
    game,
    now: NOW,
    lang: 'es' as const,
    selling: false,
    amount: 1,
  })
  const textOf = (game: Game, kind: 'building' | 'upgrade' | 'owned' | 'achievement', id: string) =>
    cardFor({ kind, id }, context(game))
      .lines.map((line) => line.text)
      .join(' | ')

  it('se apunta lo que escribe cada edificio, y entre todos suman lo escrito', () => {
    const game = newGame(NOW)

    game.owned = { cursor: 10, pisciner: 5 }
    game.goldenAt = Infinity
    tick(game, NOW + 100_000, () => 0.5)

    // 10 cursores × 0,1 y 5 pisciners × 1, durante 100 segundos.
    expect(game.made.cursor).toBeCloseTo(100)
    expect(game.made.pisciner).toBeCloseTo(500)
    expect(game.total).toBeCloseTo(600)
    expect(buildingShare(game, 'pisciner')).toMatchObject({ each: 1, all: 5 })
    expect(buildingShare(game, 'pisciner').share).toBeCloseTo(5 / 6)
  })

  it('dice cuánto sube la producción una compra, cuándo llega y en cuánto se paga', () => {
    const game = newGame(NOW)

    game.owned = { pisciner: 10 }
    game.code = 100

    // Un pisciner más: +1 por segundo. La primera mejora los dobla: +10.
    expect(buildingGain(game, 'pisciner')).toBeCloseTo(1)
    expect(upgradeGain(game, 'tier:pisciner:0', NOW).cps).toBeCloseTo(10)
    // Las del cursor suben también cada pulsación.
    expect(upgradeGain(game, 'cursor:0', NOW).click).toBeCloseTo(1)

    // Faltan 900 a 10 por segundo; con lo que ya hay, nada; sin producción, no se sabe.
    expect(waitFor(game, 1000, NOW)).toBeCloseTo(90)
    expect(waitFor(game, 50, NOW)).toBe(0)
    expect(waitFor(newGame(NOW), 50, NOW)).toBeNull()
    expect(payback(1000, 10)).toBe(100)
    expect(payback(1000, 0)).toBeNull()
  })

  it('la ficha de un edificio da sus cifras, y la de uno sin descubrir no cuenta nada', () => {
    const game = newGame(NOW)

    game.owned = { cursor: 4, pisciner: 10 }
    game.made = { pisciner: 25_000 }
    game.code = 100

    const card = cardFor({ kind: 'building', id: 'pisciner' }, context(game))

    expect(card).toMatchObject({ name: 'Pisciner', tag: 'tienes 10', able: false })
    expect(card.price).toBe(priceOf(game, 'pisciner'))
    expect(card.quote).toBeTruthy()

    const text = textOf(game, 'building', 'pisciner')

    expect(text).toContain('Cada pisciner escribe 1 por segundo')
    expect(text).toContain('10 pisciners escriben 10 por segundo')
    expect(text).toContain('Líneas escritas hasta ahora: 25.000')
    expect(text).toContain('Comprarlo suma +1 por segundo')
    expect(text).toContain('Te llegará en')
    expect(text).toContain('Se paga solo en')

    // El siguiente al último que se tiene ya se conoce; el de después, no.
    expect(cardFor({ kind: 'building', id: 'cluster' }, context(game)).name).toBe('Clúster')
    expect(cardFor({ kind: 'building', id: 'overflow' }, context(game))).toMatchObject({
      name: '???',
      lines: [{ text: 'Aún no lo has descubierto.' }],
    })
    expect(cardFor({ kind: 'building', id: 'overflow' }, context(game)).price).toBeUndefined()
  })

  it('la ficha de una mejora dice qué hace y cuánto da; comprada, ya no tiene precio', () => {
    const game = newGame(NOW)

    game.owned = { pisciner: 10 }
    game.code = 5000

    const card = cardFor({ kind: 'upgrade', id: 'tier:pisciner:0' }, context(game))

    expect(card).toMatchObject({ tag: 'Mejora', price: 1000, able: true })
    expect(textOf(game, 'upgrade', 'tier:pisciner:0')).toContain('+10 por segundo (+100 %)')
    expect(textOf(game, 'upgrade', 'tier:pisciner:0')).toContain('Te llega para comprarlo')
    expect(cardFor({ kind: 'upgrade', id: 'project:libft' }, context(game)).tag).toBe(
      'Proyecto de 42',
    )

    game.bought = ['tier:pisciner:0']

    const owned = cardFor({ kind: 'owned', id: 'tier:pisciner:0' }, context(game))

    expect(owned.tag).toBe('Comprada')
    expect(owned.price).toBeUndefined()
    expect(owned.lines).toHaveLength(1)
  })

  it('todas las mejoras y edificios tienen ficha con texto, en los dos idiomas', () => {
    const game = newGame(NOW)

    game.owned = Object.fromEntries(BUILDINGS.map(({ id }) => [id, 1]))

    for (const lang of ['es', 'en'] as const) {
      for (const { id } of UPGRADES) {
        const card = cardFor({ kind: 'upgrade', id }, { ...context(game), lang })

        expect(card.name, id).not.toBe(id)
        expect(card.lines[0]?.text.length, id).toBeGreaterThan(8)
        expect(card.lines.map((line) => line.text).join(' '), id).not.toMatch(/\{\w+\}|card[A-Z]/)
      }
      for (const { id } of BUILDINGS) {
        const text = cardFor({ kind: 'building', id }, { ...context(game), lang })
          .lines.map((line) => line.text)
          .join(' ')

        expect(text, id).not.toMatch(/\{\w+\}|card[A-Z]/)
      }
    }
  })

  it('un logro sin conseguir no se destripa', () => {
    const game = newGame(NOW)

    expect(cardFor({ kind: 'achievement', id: 'total:3' }, context(game))).toMatchObject({
      name: '???',
      lines: [{ text: 'Aún no lo has descubierto.' }],
    })

    game.achieved = ['total:3']
    expect(cardFor({ kind: 'achievement', id: 'total:3' }, context(game)).name).not.toBe('???')
  })

  it('el camino al siguiente nivel y los plazos se leen bien', () => {
    expect(levelProgress(0)).toBe(0)
    // Mil líneas son el nivel 9 justo; a mitad de camino del 10 hay 10^(9,5/3) − 1.
    expect(levelProgress(10 ** (9.5 / 3) - 1)).toBeCloseTo(0.5)
    expect(span(12)).toBe('12 s')
    expect(span(200)).toBe('3 min 20 s')
    expect(span(7500)).toBe('2 h 05 min')
    expect(span(273_600)).toBe('3 d 4 h')
    expect(span(Infinity)).toBe('∞')
  })
})

describe('code clicker: las trampas', () => {
  it('lo invertido y lo que queda nunca pasan de lo escrito jugando limpio', async () => {
    const { buy, buyUpgrade, click, invested, sell, shop } = await import('@sanatorio/clicker')
    const game = newGame(T0, always(0.5))
    let now = T0

    // Un rato comprando lo primero que se pueda pagar, y vendiendo de vez en cuando.
    for (let step = 0; step < 4000; step += 1) {
      now += SECOND
      tick(game, now, always(0.99))
      click(game, now)

      for (const { id } of BUILDINGS) buy(game, id)
      for (const upgrade of shop(game, now)) buyUpgrade(game, upgrade.id, now)
      if (step % 500 === 499) sell(game, 'cursor', 3)

      expect(game.code + invested(game)).toBeLessThanOrEqual(game.total * 1.001 + 1000)
    }

    expect(invested(game)).toBeGreaterThan(1000)
  })

  it('la venta por trampa se lo lleva todo y paga la mitad', async () => {
    const { invested, sellAll } = await import('@sanatorio/clicker')
    const { FORCED_REFUND } = await import('@sanatorio/clicker')
    const game = newGame(T0, always(0.5))

    game.owned = { cursor: 10, pisciner: 3 }
    game.bought = ['cursor:0']

    const worth = invested(game) - 100
    const paid = sellAll(game, FORCED_REFUND)

    expect(paid).toBe(Math.floor(worth / 2))
    expect(game.code).toBe(paid)
    expect(game.owned).toEqual({})
    // Las mejoras se quedan.
    expect(game.bought).toEqual(['cursor:0'])
    expect(baseCps(game)).toBe(0)
  })

  it('las tres primeras veces dan logro, y cada vez toca un mensaje', async () => {
    const { bustText, textsOf } = await import('../src/features/clicker/texts')
    const game = newGame(T0, always(0.5))

    expect(tick(game, T0, always(0.5), 0, 0)).toEqual(['pill:red'])
    expect(tick(game, T0, always(0.5), 0, 1)).toEqual(['hack:0'])
    expect(tick(game, T0, always(0.5), 0, 5)).toEqual(['hack:1', 'hack:2'])
    expect(tick(game, T0, always(0.5), 0, 9)).toEqual([])

    for (const lang of ['es', 'en'] as const) {
      // Tres con título propio y diez para lo que venga después.
      expect(textsOf(lang).busts).toHaveLength(13)
      expect(new Set(textsOf(lang).busts.map(([, text]) => text)).size).toBe(13)
      expect(bustText(4, lang)[1]).toContain('4')
      // Pasados los diez, se queda en el último.
      expect(bustText(40, lang)[0]).toBe(bustText(13, lang)[0])
      expect(bustText(40, lang)[1]).toContain('40')
    }
  })
})

describe('code clicker: el capital', () => {
  it('comprar no lo mueve, aplastar un bug tampoco, y vender lo baja', async () => {
    const { buy, capitalOf, sell, squash } = await import('@sanatorio/clicker')
    const game = newGame(T0, always(0.5))

    game.code = 10_000
    game.total = 10_000
    expect(capitalOf(game)).toBe(10_000)

    buy(game, 'cursor', 10)
    buy(game, 'pisciner', 5)
    // Los precios se redondean hacia arriba: se pierde, como mucho, una línea por compra.
    expect(capitalOf(game)).toBeGreaterThan(9_998)
    expect(capitalOf(game)).toBeLessThanOrEqual(10_000)

    game.bugs = [1000, 500]

    const withBugs = capitalOf(game)

    expect(withBugs).toBeCloseTo(capitalOf({ ...game, bugs: [] }) + 1650)
    squash(game, 0)
    expect(capitalOf(game)).toBeCloseTo(withBugs)

    sell(game, 'pisciner', 5)
    expect(capitalOf(game)).toBeLessThan(withBugs)
  })

  it('se apunta una vez por segundo, y no se acumula sin fin', async () => {
    const { sample } = await import('../src/features/clicker/sync')
    const samples: [number, number][] = []

    sample(samples, 5_000, 10)
    sample(samples, 5_400, 11)
    sample(samples, 6_100, 12)
    expect(samples).toEqual([
      [5, 10],
      [6, 12],
    ])

    for (let second = 7; second < 2000; second += 1) sample(samples, second * 1000, second)

    expect(samples).toHaveLength(900)
    expect(samples.at(-1)).toEqual([1999, 1999])
  })
})
