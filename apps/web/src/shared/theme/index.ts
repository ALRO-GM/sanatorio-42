/**
 * El aspecto de la web: tema (claro, nocturno o el del sistema), estilo y, si
 * el estilo las tiene, paleta de color.
 *
 * Todo se escribe en `<html>`, que es lo que miran las hojas de estilos:
 * `data-theme`, `data-style` y las variables de la paleta. La elección se
 * guarda en el navegador.
 *
 * `public/theme.js` hace lo mismo antes de pintar, para que al cargar no se vea
 * un fogonazo con el aspecto de fábrica. Si cambias una clave, cámbiala allí.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { DEFAULT_THEME, themeOf } from '../../themes'
import type { ThemeManifest, ThemePalette } from '../../themes'

export const THEME_CHOICES = ['auto', 'light', 'dark'] as const

type ThemeChoice = (typeof THEME_CHOICES)[number]

const STORAGE_KEY = 'sanatorio_theme'
const STYLE_KEY = 'sanatorio_style'
/** La paleta elegida de cada estilo: `{ libre: 'oceano' }`. */
const PALETTE_KEY = 'sanatorio_palette'
/** Las variables de la paleta en uso, tal cual, para `theme.js`. */
const PALETTE_VARS_KEY = 'sanatorio_palette_vars'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Sin almacenamiento (modo privado estricto): vale lo de fábrica.
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // La elección dura lo que dure la pestaña.
  }
}

function stored(): ThemeChoice {
  const value = read(STORAGE_KEY)

  return THEME_CHOICES.find((choice) => choice === value) ?? 'auto'
}

/** El tema que toca de verdad: `auto` se resuelve con lo que diga el sistema. */
function resolve(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'auto') {
    return choice
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function apply(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolve(choice)
}

/** La elección de tema y cómo cambiarla. Con `auto`, sigue al sistema en vivo. */
export function useTheme(): [ThemeChoice, (next: ThemeChoice) => void] {
  const [choice, setChoice] = useState(stored)

  useEffect(() => {
    apply(choice)

    if (choice !== 'auto') {
      return undefined
    }

    const media = window.matchMedia(DARK_QUERY)
    const onChange = (): void => {
      apply('auto')
    }

    media.addEventListener('change', onChange)

    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [choice])

  const change = useCallback((next: ThemeChoice) => {
    write(STORAGE_KEY, next)
    setChoice(next)
  }, [])

  return [choice, change]
}

// --- Estilo y paleta ----------------------------------------------------------
// Van en un almacén propio, fuera de React: los usa el selector, pero también
// cada icono, que tiene que saber si el estilo lo dibuja a su manera.

function storedPalettes(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(read(PALETTE_KEY) ?? '{}')

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

const paletteOf = (theme: ThemeManifest, palettes: Record<string, string>): ThemePalette | null =>
  theme.palettes?.find((palette) => palette.id === palettes[theme.id]) ??
  theme.palettes?.[0] ??
  null

let look: { theme: ThemeManifest; palette: ThemePalette | null } = (() => {
  const theme = themeOf(read(STYLE_KEY))

  return { theme, palette: paletteOf(theme, storedPalettes()) }
})()
/**
 * El estilo prestado: el del expediente que se está mirando, si su dueña eligió
 * uno. Se pinta encima de lo tuyo y no se guarda: al salir vuelve lo tuyo.
 */
let borrowed: ThemeManifest | null = null
/** Las variables que puso la paleta anterior, para quitarlas al cambiar. */
let painted: string[] = []
const listeners = new Set<() => void>()

/** Nombre de variable de CSS y valor que se acepta en ella (un color, una medida…). */
const VAR_NAME = /^--[a-z0-9-]+$/
const VAR_VALUE = /^[#\w\s.,%()+\-/]{1,100}$/

/**
 * Las variables de una paleta que se pueden pintar: con nombre de variable y
 * un valor sencillo, sin `url(…)` ni nada que cierre la declaración. La paleta
 * puede venir de lo guardado en el navegador o de un estilo prestado.
 */
export function paintable(vars: Readonly<Record<string, string>>): [string, string][] {
  return Object.entries(vars).filter(
    ([name, value]) => VAR_NAME.test(name) && VAR_VALUE.test(value) && !/url\s*\(/i.test(value),
  )
}

/** Escribe el estilo y la paleta en `<html>` y los deja guardados. */
function paint(): void {
  // Sin página (en los tests) no hay dónde escribirlo.
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const shown = borrowed ?? look.theme
  // Un estilo prestado va con su paleta de fábrica: la tuya es de tu estilo.
  const vars = (borrowed === null ? look.palette : (borrowed.palettes?.[0] ?? null))?.vars ?? {}

  root.dataset.style = shown.id
  for (const name of painted) root.style.removeProperty(name)
  const shownVars = paintable(vars)

  for (const [name, value] of shownVars) root.style.setProperty(name, value)
  painted = shownVars.map(([name]) => name)

  // Lo guardado es siempre lo tuyo, aunque ahora se vea un estilo prestado.
  write(STYLE_KEY, look.theme.id)
  write(PALETTE_VARS_KEY, JSON.stringify(look.palette?.vars ?? {}))
}

function set(next: typeof look): void {
  look = next
  paint()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

paint()

/**
 * Pinta la página con otro estilo mientras se usa el componente que lo pide (el
 * expediente de alguien con estilo propio). `null` no presta nada. Lo tuyo no
 * cambia: ni el selector ni lo guardado se enteran.
 */
export function useBorrowedStyle(style: string | null): void {
  useEffect(() => {
    if (style === null) return undefined

    borrowed = themeOf(style)
    paint()
    for (const listener of listeners) listener()

    return () => {
      borrowed = null
      paint()
      for (const listener of listeners) listener()
    }
  }, [style])
}

/**
 * El estilo que se ve ahora: el prestado si lo hay, si no el tuyo. Es el que
 * manda en lo que se dibuja (los iconos de cada estilo).
 */
export function useShownTheme(): ThemeManifest {
  return useSyncExternalStore(subscribe, () => borrowed ?? look.theme)
}

/** El estilo en uso, con su manifiesto: se repinta quien lo use cuando cambia. */
export function useLook(): typeof look {
  return useSyncExternalStore(subscribe, () => look)
}

/** El estilo elegido (su id) y cómo cambiarlo. */
export function useStyle(): [string, (next: string) => void] {
  const { theme } = useLook()
  const change = useCallback((next: string) => {
    const chosen = themeOf(next)

    set({ theme: chosen, palette: paletteOf(chosen, storedPalettes()) })
  }, [])

  return [theme.id, change]
}

/** La paleta en uso (su id, o `null` si el estilo no tiene) y cómo cambiarla. */
export function usePalette(): [string | null, (next: string) => void] {
  const { palette } = useLook()
  const change = useCallback((next: string) => {
    const palettes = { ...storedPalettes(), [look.theme.id]: next }

    write(PALETTE_KEY, JSON.stringify(palettes))
    set({ theme: look.theme, palette: paletteOf(look.theme, palettes) })
  }, [])

  return [palette?.id ?? null, change]
}

export { DEFAULT_THEME }
