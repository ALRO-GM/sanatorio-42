/**
 * El tope de juego cuando el pace está en riesgo: quien hoy caería a pace 22,
 * 24 o al black hole solo puede jugar `PLAY_LIMIT_S` al día. Se cuenta el
 * tiempo con el juego a la vista, en este navegador.
 */

import { useEffect, useState } from 'react'

import type { Health } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { todayKey } from '../../shared/day'
import { originOf, stepsFor } from '../../shared/pace'

/** Lo que se puede jugar al día con el pace en riesgo. */
const PLAY_LIMIT_S = 30 * 60
/** Desde este pace (incluido) se considera en riesgo. */
const RISKY_PACE = 22
/** Cada cuánto se apunta el tiempo jugado. */
const TICK_S = 5

const KEY = 'sanatorio_clicker_played'

/**
 * El pace al que irías hoy si está en riesgo (22, 24, o `0` si ya sería black
 * hole), o `null` si no lo está o no se sabe (sin pace anotado).
 */
export function riskyPace(health: Health, now: number): number | null {
  const origin = health.declared === null ? null : originOf(health.declared)

  if (origin === null || health.milestones.length > 6) return null

  const current = stepsFor(origin, health.currentCircle, now).find((step) => step.daysLeft >= 0)

  if (current === undefined) return 0

  return current.pace >= RISKY_PACE ? current.pace : null
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

function storage(): Store | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Los segundos jugados hoy. Lo de otros días no cuenta. */
export function playedToday(now: number, store: Store | null = storage()): number {
  try {
    const read = JSON.parse(store?.getItem(KEY) ?? 'null') as { day?: string; s?: number } | null

    return read?.day === todayKey(now) && typeof read.s === 'number' ? read.s : 0
  } catch {
    return 0
  }
}

/** Suma segundos a lo jugado hoy y devuelve el total. */
export function addPlayed(seconds: number, now: number, store: Store | null = storage()): number {
  const total = playedToday(now, store) + seconds

  try {
    store?.setItem(KEY, JSON.stringify({ day: todayKey(now), s: total }))
  } catch {
    // Sin guardar: el tope se cuenta solo mientras la pestaña siga abierta.
  }

  return total
}

/**
 * El tope de hoy: `pace` si está en riesgo (si no, no hay tope) y los segundos
 * que quedan. Con `active` en falso (en segundo plano o viendo otra partida) no
 * cuenta ni limita.
 */
export function usePlayLimit(active: boolean): { pace: number | null; left: number } {
  const [pace, setPace] = useState<number | null>(null)
  const [played, setPlayed] = useState(() => playedToday(Date.now()))

  useEffect(() => {
    if (!active) return undefined

    let alive = true

    api.getHealth().then(
      (health) => {
        if (alive) setPace(riskyPace(health, Date.now()))
      },
      () => undefined,
    )

    return () => {
      alive = false
    }
  }, [active])

  useEffect(() => {
    if (!active || pace === null) return undefined

    const timer = window.setInterval(() => {
      // Solo cuenta con el juego a la vista.
      if (!document.hidden) setPlayed(addPlayed(TICK_S, Date.now()))
    }, TICK_S * 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [active, pace])

  return { pace: active ? pace : null, left: Math.max(0, PLAY_LIMIT_S - played) }
}
