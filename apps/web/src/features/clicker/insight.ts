/**
 * Las cuentas que ayudan a decidir qué comprar: cuánto sube la producción con
 * cada cosa, cuánto falta para poder pagarla y en cuánto se amortiza.
 *
 * El original no las da (las sacan las extensiones de quien juega en serio),
 * pero son lo que convierte la tienda en una decisión y no en una lotería.
 */

import type { BuildingId } from '@sanatorio/clicker'
import { baseCps, clickPower, cpsOf, globalMult, unitCps } from '@sanatorio/clicker'
import type { Game } from '@sanatorio/clicker'

/** Lo que sube la producción por segundo y cada pulsación al comprar una mejora. */
export function upgradeGain(game: Game, id: string, now: number): { cps: number; click: number } {
  const after: Game = { ...game, bought: [...game.bought, id] }

  return {
    cps: baseCps(after) - baseCps(game),
    click: clickPower(after, now) - clickPower(game, now),
  }
}

/** Lo que sube la producción por segundo al comprar `count` unidades de un edificio. */
export function buildingGain(game: Game, id: BuildingId, count = 1): number {
  const after: Game = { ...game, owned: { ...game.owned, [id]: (game.owned[id] ?? 0) + count } }

  return baseCps(after) - baseCps(game)
}

/** Cómo le va a un tipo de edificio: lo que escribe cada uno, entre todos y qué parte es del total. */
export function buildingShare(
  game: Game,
  id: BuildingId,
): { each: number; all: number; share: number } {
  const each = unitCps(game, id) * globalMult(game)
  const all = each * (game.owned[id] ?? 0)
  const total = baseCps(game)

  return { each, all, share: total > 0 ? all / total : 0 }
}

/**
 * Segundos que faltan para poder pagar algo con lo que se escribe ahora mismo:
 * `0` si ya llega, `null` si no se produce nada y solo queda pulsar.
 */
export function waitFor(game: Game, price: number, now: number): number | null {
  if (price <= game.code) return 0

  const cps = cpsOf(game, now) * (1 - game.bugs.length * 0.05)

  return cps > 0 ? (price - game.code) / cps : null
}

/** Segundos que tarda una compra en devolver lo que costó; `null` si no sube la producción. */
export const payback = (price: number, gain: number): number | null =>
  gain > 0 ? price / gain : null

/** Cuánto de lleno está el camino a poder pagar algo, de 0 a 1. */
export const reach = (game: Game, price: number): number =>
  price <= 0 ? 1 : Math.max(0, Math.min(1, game.code / price))

/**
 * Parte recorrida hacia el siguiente nivel, de 0 a 1. El nivel es
 * `floor(3·log10(1 + total))`, así que es la parte decimal de esa cuenta.
 */
export function levelProgress(total: number): number {
  const exact = 3 * Math.log10(1 + Math.max(0, total))

  return exact - Math.floor(exact)
}

/** "45 s", "3 min 20 s", "2 h 05 min", "3 d 4 h": un plazo, en corto. */
export function span(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds > 3650 * 86_400) return '∞'

  const whole = Math.max(1, Math.ceil(seconds))

  if (whole < 60) return `${whole} s`
  if (whole < 3600) return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`
  if (whole < 86_400) {
    return `${Math.floor(whole / 3600)} h ${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')} min`
  }

  return `${Math.floor(whole / 86_400)} d ${Math.floor((whole % 86_400) / 3600)} h`
}
