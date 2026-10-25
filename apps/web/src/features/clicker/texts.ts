/**
 * Code Clicker: los textos, de la tabla `textos/juego/juego.csv`.
 *
 * Van en un grupo de tablas aparte y no con los de la web porque son un juego
 * entero (y secreto): cientos de frases que solo se descargan con el juego.
 * A cada idioma, lo que le falte le llega del español; al francés, del inglés.
 */

import type { Lang } from '@sanatorio/contracts'
import gameCa from 'virtual:textos/juego/ca'
import gameEn from 'virtual:textos/juego/en'
import gameEs from 'virtual:textos/juego/es'
import gameEu from 'virtual:textos/juego/eu'
import gameFr from 'virtual:textos/juego/fr'

import { localeOf } from '../../shared/i18n/locale'
import { unflatten } from '../../shared/i18n/tree'

import {
  BUILDINGS,
  CPS_GOALS,
  FINGERS_BASE,
  FINGERS_MULT,
  OWNED_GOALS,
  PROJECTS,
  RESEARCH,
  TOTAL_GOALS,
} from '@sanatorio/clicker'
import type { BuildingId } from '@sanatorio/clicker'

type Texts = {
  ui: Record<string, string>
  /** Nombre, plural y una línea de cada edificio. */
  buildings: Record<BuildingId, [name: string, plural: string, about: string]>
  /** Los escalones de las mejoras de un edificio, del primero al último. */
  tiers: string[]
  research: Record<string, [name: string, about: string]>
  ducks: string[]
  /** Nombres de los logros de total escrito y de producción, en orden. */
  totals: string[]
  speeds: string[]
  hands: string[]
  goldens: string[]
  /** Nombre y descripción de los logros con texto propio. */
  achievements: Record<string, [name: string, about?: string]>
  /**
   * Lo que se dice al pillar una trampa: título y mensaje. Las tres primeras
   * tienen el suyo; de la cuarta en adelante van los diez siguientes, en orden,
   * y después se repite el último. `{n}` son las veces que van.
   */
  busts: [title: string, text: string][]
  /**
   * Lo que dice la policía del código al vender los edificios por una trampa:
   * título y mensaje. Van rotando según las veces que le han pillado.
   */
  police: [title: string, text: string][]
  /** Sufijos de los números grandes, de mil en mil a partir del millón. */
  scale: string[]
  /**
   * Los mismos con la cifra en singular, según las reglas del idioma: «1
   * millón» pero «1,5 millones»; en francés, «1,5 million» (por debajo de 2
   * va en singular).
   */
  scaleOne: string[]
  /**
   * Las noticias del rótulo, por época. `{name}` es alguien del campus;
   * `{n}`, las líneas escritas.
   */
  news: {
    early: string[]
    mid: string[]
    late: string[]
    one: string[]
    two: string[]
    three: string[]
    /**
     * Las de cada ciclo: se añaden al recompilar la realidad, una tanda nueva
     * (y más desmedida) según el prestigio que se lleve. Ver `CYCLE_AT`.
     */
    cycles: string[][]
  }
}

/**
 * Los textos de un idioma a partir de su tabla (`textos/juego/juego.csv`); lo
 * que no tenga, del idioma anterior de la lista y, al final, del español.
 */
function fromTable(...dicts: Readonly<Record<string, string>>[]): Texts {
  const all = dicts.reduce<Record<string, string>>((sum, dict) => ({ ...sum, ...dict }), gameEs)
  const texts = unflatten(all, 'game') as Texts

  // En las claves de la tabla, el «:» de un logro se escribe «-» (plus-1 es plus:1).
  texts.achievements = Object.fromEntries(
    Object.entries(texts.achievements).map(([id, value]) => [id.replace('-', ':'), value]),
  )

  return texts
}

const TEXTS: Record<Lang, Texts> = {
  es: fromTable(gameEs),
  en: fromTable(gameEn),
  ca: fromTable(gameCa),
  eu: fromTable(gameEu),
  fr: fromTable(gameEn, gameFr),
}

export const textsOf = (lang: Lang): Texts => TEXTS[lang]

/** Sustituye `{clave}` por su valor. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => String(vars[key] ?? whole))
}

/**
 * Un número grande, legible: "1 millón", "1,234 millones", "12 trillion",
 * "1,5 million" en francés. Hasta un millón se escribe entero, con separador de
 * miles. El sufijo va en singular o en plural según las reglas del idioma
 * (`Intl.PluralRules`) para la cifra tal como se escribe, ya redondeada.
 */
export function short(value: number, lang: Lang, decimals = 3): string {
  const locale = localeOf(lang)

  if (!Number.isFinite(value)) return '∞'
  if (Math.abs(value) < 1e6) {
    return value.toLocaleString(locale, {
      maximumFractionDigits: Math.abs(value) < 100 && value % 1 !== 0 ? 1 : 0,
    })
  }

  const { scale, scaleOne } = textsOf(lang)
  const step = Math.min(scale.length - 1, Math.floor(Math.log10(Math.abs(value)) / 3) - 2)
  const figure = value / 10 ** ((step + 2) * 3)
  const options = { maximumFractionDigits: decimals }
  const one = new Intl.PluralRules(locale, options).select(figure) === 'one'
  const suffix = (one ? scaleOne[step] : undefined) ?? scale[step] ?? ''

  return `${figure.toLocaleString(locale, options)} ${suffix}`
}

/** Título y mensaje de la ventana de la trampa número `n`. */
/** Lo que dice la policía la vez `n` que te pilla (desde 1); va rotando. */
export function policeText(n: number, lang: Lang): [title: string, text: string] {
  const list = textsOf(lang).police

  return list[(Math.max(1, n) - 1) % list.length] ?? ['', '']
}

export function bustText(n: number, lang: Lang): [title: string, text: string] {
  const { busts } = textsOf(lang)
  const [title, text] = busts[Math.min(n, busts.length) - 1] ?? ['', '']

  return [title, fill(text, { n })]
}

/** Nombre y descripción de un logro. */
export function achievementText(id: string, lang: Lang): [name: string, about: string] {
  const texts = textsOf(lang)
  const [kind = '', second = '', third = ''] = id.split(':')
  const index = Number(second)
  const own = texts.achievements[id]

  // Sin descripción propia en la tabla, se calcula aquí abajo.
  if (own?.[1] !== undefined && own[1] !== '') return [own[0], own[1]]

  switch (kind) {
    case 'total':
      return [
        texts.totals[index] ?? id,
        fill(texts.ui.totalAbout ?? '', { n: short(TOTAL_GOALS[index] ?? 0, lang) }),
      ]
    case 'cps':
      return [
        texts.speeds[index] ?? id,
        fill(texts.ui.cpsAbout ?? '', { n: short(CPS_GOALS[index] ?? 0, lang) }),
      ]
    case 'hand':
      return [
        texts.hands[index] ?? id,
        fill(texts.ui.handAbout ?? '', { n: short(10 ** (3 + 2 * index), lang) }),
      ]
    case 'golden':
      return [
        texts.goldens[index] ?? id,
        fill(texts.ui.goldenAbout ?? '', { n: [1, 7, 27, 77][index] ?? 0 }),
      ]
    case 'bug':
      return [own?.[0] ?? id, fill(texts.ui.bugAbout ?? '', { n: [1, 50, 200][index] ?? 0 })]
    case 'prestige':
      return [own?.[0] ?? id, fill(texts.ui.prestigeAbout2 ?? '', { n: [1, 10, 100][index] ?? 0 })]
    case 'own': {
      const building = BUILDINGS.find((entry) => entry.id === second)
      const goal = OWNED_GOALS[Number(third)] ?? 0
      const names = building === undefined ? undefined : texts.buildings[building.id]

      return [
        fill(texts.ui.ownName ?? '', { building: names?.[0] ?? second, n: goal }),
        fill(texts.ui.ownAbout ?? '', {
          n: `${goal} ${goal === 1 ? (names?.[0] ?? '') : (names?.[1] ?? '')}`,
        }),
      ]
    }
    default:
      return [own?.[0] ?? id, own?.[1] ?? '']
  }
}

/** Nombre y descripción de una mejora de la tienda. */
export function upgradeText(id: string, lang: Lang): [name: string, about: string] {
  const texts = textsOf(lang)
  const ui = (key: string): string => texts.ui[key] ?? key
  const [kind = '', second = '', third = ''] = id.split(':')
  const building = texts.buildings[second as BuildingId] as
    [name: string, plural: string, about: string] | undefined

  switch (kind) {
    case 'cursor': {
      const tier = Number(second)

      return [
        `${texts.buildings.cursor[0]} · ${texts.tiers[tier] ?? ''}`,
        tier < 3
          ? ui('upCursor')
          : fill(ui('upFingers'), {
              n: short(
                FINGERS_BASE *
                  FINGERS_MULT.slice(0, tier - 2).reduce((total, step) => total * step, 1),
                lang,
              ),
            }),
      ]
    }
    case 'mouse':
      return [fill(ui('mouseName'), { n: texts.tiers[Number(second)] ?? '' }), ui('upMouse')]
    case 'tier':
      return [
        `${building?.[0] ?? second} · ${texts.tiers[Number(third)] ?? ''}`,
        fill(ui('upTier'), { building: capital(building?.[1] ?? second) }),
      ]
    case 'mentor':
      return [
        fill(ui('mentorName'), { building: building?.[0] ?? second }),
        fill(ui('upMentor'), { building: building?.[0] ?? second }),
      ]
    case 'project': {
      const project = PROJECTS.find((entry) => entry.id === second)

      return [second, fill(ui('upProject'), { project: second, n: project?.power ?? 0 })]
    }
    case 'duck':
      return [texts.ducks[Number(second)] ?? id, ui('upDuck')]
    case 'research': {
      const [name, about] = texts.research[second] ?? [id, '']
      const step = RESEARCH.find((entry) => entry.id === second)
      const effect =
        step?.power !== undefined
          ? fill(ui('upPower'), { n: step.power })
          : step?.pisciners !== undefined && second !== 'lab'
            ? fill(ui('upPisciners'), { n: step.pisciners })
            : ''

      return [name, `${about} ${effect}`.trim()]
    }
    default:
      return [id, '']
  }
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Las noticias que tocan según cómo va la partida: mandan las de la
 * singularidad; si no ha empezado, las del tamaño de lo escrito.
 */
/** Prestigio a partir del cual entra cada tanda de noticias de `cycles`. */
const CYCLE_AT = [1, 5, 25, 100]

/**
 * Las noticias que tocan. Con la singularidad en marcha mandan las suyas. Si
 * no, las de la época de esta partida y, si ya se ha recompilado la realidad,
 * las de ese ciclo, que salen el doble: son las que cuentan lo que ha cambiado.
 *
 * @param total Líneas escritas en esta partida, no desde siempre.
 */
export function newsFor(lang: Lang, stage: number, total: number, prestige = 0): string[] {
  const { news } = textsOf(lang)

  if (stage >= 3) return news.three
  if (stage === 2) return news.two
  if (stage === 1) return news.one

  const era = total < 1e6 ? news.early : total < 1e12 ? news.mid : news.late
  const tier = CYCLE_AT.findLastIndex((from) => prestige >= from)
  const cycle = news.cycles[tier] ?? []

  return [...cycle, ...cycle, ...era]
}
