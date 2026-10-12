/**
 * La velocidad de las demostraciones: a cuánto va cada una de fábrica (lo dice
 * la API, que la ajusta con lo que hace la gente) y a cuánto la quiere ver cada
 * persona (lo recuerda el navegador).
 */

import { useEffect, useState } from 'react'

import { api } from '../api'

/** Las velocidades entre las que se elige, respecto a la de fábrica. */
export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const STORAGE_KEY = 'sanatorio_tour_speed'

/** La de fábrica de todas, pedida una vez por visita y compartida. */
let asked: Promise<Record<string, number>> | null = null

function baseSpeeds(): Promise<Record<string, number>> {
  asked ??= api.getTourSpeeds().then(
    ({ speeds }) => speeds,
    // Sin respuesta, todas van como se escribieron.
    () => ({}),
  )

  return asked
}

function stored(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/** La velocidad de la lista más cercana a esa. */
export const nearestRate = (rate: number): number =>
  RATES.reduce((best, option) => (Math.abs(option - rate) < Math.abs(best - rate) ? option : best))

/**
 * La velocidad de una demostración.
 *
 * Lo que se recuerda de cada persona no es «un 50 % más» sino a cuánto la vio
 * de verdad (la de fábrica por su ajuste). Así, cuando la de fábrica sube
 * porque casi todo el mundo la aceleraba, quien la tenía acelerada la sigue
 * viendo igual, y su deslizador vuelve hacia el centro en vez de acelerarla
 * otra vez.
 *
 * @returns `base`, la de fábrica; `rate`, el ajuste de esta persona sobre ella;
 *   y `choose`, para cambiarlo.
 */
export function useTourSpeed(name: string): {
  base: number
  rate: number
  choose: (rate: number) => void
} {
  const [base, setBase] = useState(1)
  // A cuánto la quiere ver, en total; `null` si nunca la ha tocado.
  const [wanted, setWanted] = useState<number | null>(() => stored()[name] ?? null)

  useEffect(() => {
    let current = true

    void baseSpeeds().then((speeds) => {
      if (current) setBase(speeds[name] ?? 1)
    })

    return () => {
      current = false
    }
  }, [name])

  return {
    base,
    rate: wanted === null ? 1 : nearestRate(wanted / base),
    choose: (rate) => {
      setWanted(base * rate)

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored(), [name]: base * rate }))
      } catch {
        // Sin almacenamiento, vale lo que dure la ventana.
      }
    },
  }
}
