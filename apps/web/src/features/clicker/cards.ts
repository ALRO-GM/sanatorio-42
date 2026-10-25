/**
 * Las fichas del juego: lo que se enseña al pasar por un edificio, una mejora
 * o un logro, para saber qué hace antes de comprarlo.
 *
 * Como en el original: nombre, precio, cuántos tienes, qué hace cada uno y qué
 * parte de la producción es suya. Y dos cuentas más, que allí hay que hacer de
 * cabeza: cuánto sube la producción y en cuánto se paga solo.
 */

import type { Lang } from '@sanatorio/contracts'

import { ACHIEVEMENTS, BUILDINGS, UPGRADE } from '@sanatorio/clicker'
import type { BuildingId } from '@sanatorio/clicker'
import { baseCps, clickPower, priceOf, refundOf } from '@sanatorio/clicker'
import type { Game } from '@sanatorio/clicker'
import { buildingGain, buildingShare, payback, span, upgradeGain, waitFor } from './insight'
import { achievementText, fill, short, textsOf, upgradeText } from './texts'

/** De qué es la ficha que se está enseñando. */
export type Tip = { kind: 'building' | 'upgrade' | 'owned' | 'achievement'; id: string }

export type CardLine = { text: string; tone?: 'good' | 'dim' | 'warn' }

export type Card = {
  icon: string
  tier?: number
  label?: string
  name: string
  /** La etiqueta de la esquina: "Mejora", "Logro", "tienes 12"… */
  tag: string
  price?: number
  /** Si llega para pagarlo. */
  able?: boolean
  lines: CardLine[]
  /** La frase en cursiva del final. */
  quote?: string
}

const TAGS: Record<string, string> = {
  cursor: 'tagUpgrade',
  tier: 'tagUpgrade',
  mentor: 'tagUpgrade',
  mouse: 'tagMouse',
  project: 'tagProject',
  duck: 'tagDuck',
  research: 'tagResearch',
}

type Context = { game: Game; now: number; lang: Lang; selling: boolean; amount: number }

/** `12,3 %`, sin decimales de más. */
const percent = (share: number, lang: Lang): string =>
  (share * 100).toLocaleString(lang === 'en' ? 'en' : lang === 'fr' ? 'fr' : 'es', {
    maximumFractionDigits: 1,
  })

function buildingCard(id: BuildingId, context: Context, known: boolean): Card {
  const { game, now, lang, selling, amount } = context
  const texts = textsOf(lang)
  const ui = (key: string, vars: Record<string, string | number> = {}): string =>
    fill(texts.ui[key] ?? key, vars)
  const number = (value: number, decimals = 1): string => short(value, lang, decimals)
  const owned = game.owned[id] ?? 0

  if (!known) {
    return {
      icon: id,
      name: ui('locked'),
      tag: ui('tagBuilding'),
      lines: [{ text: ui('cardLocked'), tone: 'dim' }],
    }
  }

  const [name, plural, about] = texts.buildings[id]
  const price = selling ? refundOf(game, id, amount) : priceOf(game, id, amount)
  const lines: CardLine[] = []
  const { each, all, share } = buildingShare(game, id)

  lines.push({ text: ui('cardEach', { name: name.toLowerCase(), n: number(each) }) })

  if (owned > 0) {
    lines.push({
      text: ui('cardAll', { count: owned, plural, n: number(all), pct: percent(share, lang) }),
    })
    lines.push({ text: ui('cardMade', { n: number(game.made[id] ?? 0) }), tone: 'dim' })
  }

  if (selling) {
    lines.push({
      text: ui('cardSell', { n: Math.min(amount, owned), m: number(price) }),
      tone: 'warn',
    })
  } else {
    const gain = buildingGain(game, id, amount)
    const total = baseCps(game)
    const wait = waitFor(game, price, now)
    const back = payback(price, gain)

    lines.push({
      text:
        total > 0
          ? ui('cardGain', { n: number(gain), pct: percent(gain / total, lang) })
          : ui('cardGainFirst', { n: number(gain) }),
      tone: 'good',
    })
    if (back !== null) lines.push({ text: ui('cardPayback', { t: span(back) }), tone: 'dim' })
    lines.push(
      wait === 0
        ? { text: ui('cardNow'), tone: 'good' }
        : {
            text: wait === null ? ui('cardNever') : ui('cardWait', { t: span(wait) }),
            tone: 'warn',
          },
    )
  }

  return {
    icon: id,
    name: amount > 1 && !selling ? `${name} ×${amount}` : name,
    tag: ui('owned', { n: owned }),
    price,
    able: selling ? owned > 0 : price <= game.code,
    lines,
    quote: about,
  }
}

function upgradeCard(id: string, context: Context, owned: boolean): Card {
  const { game, now, lang } = context
  const texts = textsOf(lang)
  const ui = (key: string, vars: Record<string, string | number> = {}): string =>
    fill(texts.ui[key] ?? key, vars)
  const number = (value: number, decimals = 1): string => short(value, lang, decimals)
  const upgrade = UPGRADE.get(id)
  const [name, about] = upgradeText(id, lang)
  const kind = id.split(':')[0] ?? ''
  const lines: CardLine[] = [{ text: about }]
  const price = upgrade?.price ?? 0

  if (!owned) {
    const gain = upgradeGain(game, id, now)
    const total = baseCps(game)
    const hand = clickPower(game, now)

    if (gain.cps > 0) {
      lines.push({
        text: ui('cardGain', {
          n: number(gain.cps),
          pct: total > 0 ? percent(gain.cps / total, lang) : '∞',
        }),
        tone: 'good',
      })
    }
    if (gain.click > 0) {
      lines.push({
        text: ui('cardClick', { n: number(gain.click), pct: percent(gain.click / hand, lang) }),
        tone: 'good',
      })
    }

    const back = payback(price, gain.cps)
    const wait = waitFor(game, price, now)

    if (back !== null) lines.push({ text: ui('cardPayback', { t: span(back) }), tone: 'dim' })
    lines.push(
      wait === 0
        ? { text: ui('cardNow'), tone: 'good' }
        : {
            text: wait === null ? ui('cardNever') : ui('cardWait', { t: span(wait) }),
            tone: 'warn',
          },
    )
  }

  return {
    icon: upgrade?.icon ?? 'terminal',
    tier: upgrade?.tier ?? 0,
    ...(upgrade?.icon === 'project' ? { label: '42' } : {}),
    name,
    tag: owned ? ui('tagOwned') : ui(TAGS[kind] ?? 'tagUpgrade'),
    ...(owned ? {} : { price, able: price <= game.code }),
    lines,
  }
}

function achievementCard(id: string, context: Context): Card {
  const { game, lang } = context
  const texts = textsOf(lang)
  const ui = (key: string): string => texts.ui[key] ?? key
  const got = game.achieved.includes(id)
  const [name, about] = achievementText(id, lang)
  const building = id.startsWith('own:') ? (id.split(':')[1] ?? 'trophy') : 'trophy'

  return {
    icon: building,
    tier: ACHIEVEMENTS.indexOf(id) % 11,
    name: got ? name : ui('locked'),
    tag: ui('tagAchievement'),
    // Lo que no se ha conseguido no se cuenta: descubrirlo es parte del juego.
    lines: got
      ? [{ text: about }, { text: ui('cardCaffeine'), tone: 'good' }]
      : [{ text: ui('cardLocked'), tone: 'dim' }],
  }
}

/** La ficha de lo que se está mirando. `lastOwned` es el último edificio que se tiene. */
export function cardFor(tip: Tip, context: Context): Card {
  switch (tip.kind) {
    case 'building': {
      const index = BUILDINGS.findIndex((building) => building.id === tip.id)
      const lastOwned = BUILDINGS.reduce(
        (last, { id }, at) => ((context.game.owned[id] ?? 0) > 0 ? at : last),
        -1,
      )

      return buildingCard(tip.id as BuildingId, context, index <= lastOwned + 1)
    }
    case 'upgrade':
      return upgradeCard(tip.id, context, false)
    case 'owned':
      return upgradeCard(tip.id, context, true)
    case 'achievement':
      return achievementCard(tip.id, context)
  }
}
