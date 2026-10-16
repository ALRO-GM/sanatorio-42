/**
 * Comodidad: el tamaño del texto, los colores para daltonismo y el modo zen.
 *
 * Como el tema, se escribe en `<html>` (`font-size`, `data-cvd`, `data-zen`) y
 * se guarda en el navegador. `public/theme.js` aplica lo mismo antes de pintar:
 * si cambias una clave, cámbiala allí.
 */

import { useEffect, useState } from 'react'

/** Los tamaños que se pueden elegir, en %, además de `auto`. */
export const TEXT_SIZES = [90, 100, 110, 125, 150] as const

export type TextSize = 'auto' | (typeof TEXT_SIZES)[number]

export type Comfort = {
  text: TextSize
  /** Colores pensados para daltonismo: azul y naranja en vez de verde y rojo. */
  cvd: boolean
  /** Lo mínimo: sin avisos de adorno, ni ventanitas, ni animaciones. */
  zen: boolean
}

const KEY = 'sanatorio_comfort'

export const DEFAULT_COMFORT: Comfort = { text: 'auto', cvd: false, zen: false }

/**
 * El tamaño con `auto`: en las pantallas grandes del cluster todo se ve
 * pequeño, así que se agranda un poco.
 */
export function autoSize(width: number): number {
  if (width >= 2400) return 125
  if (width >= 1800) return 110

  return 100
}

export function readComfort(raw: string | null): Comfort {
  try {
    const read = JSON.parse(raw ?? 'null') as Partial<Comfort> | null

    return {
      text: TEXT_SIZES.find((size) => size === read?.text) ?? 'auto',
      cvd: read?.cvd === true,
      zen: read?.zen === true,
    }
  } catch {
    return DEFAULT_COMFORT
  }
}

function load(): Comfort {
  try {
    return readComfort(localStorage.getItem(KEY))
  } catch {
    return DEFAULT_COMFORT
  }
}

function apply(comfort: Comfort): void {
  const root = document.documentElement
  const size = comfort.text === 'auto' ? autoSize(window.screen.width) : comfort.text

  root.style.fontSize = size === 100 ? '' : `${size}%`
  root.dataset.cvd = comfort.cvd ? 'on' : 'off'
  root.dataset.zen = comfort.zen ? 'on' : 'off'
}

/** Lo elegido y cómo cambiarlo. */
export function useComfort(): [Comfort, (next: Comfort) => void] {
  const [comfort, setComfort] = useState(load)

  useEffect(() => {
    apply(comfort)
  }, [comfort])

  return [
    comfort,
    (next) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // Dura lo que dure la pestaña.
      }
      setComfort(next)
    },
  ]
}
