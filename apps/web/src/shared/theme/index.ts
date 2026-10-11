/**
 * Tema de la web: claro, nocturno o el que diga el sistema.
 *
 * El tema efectivo se escribe en `data-theme` de `<html>`, que es lo que miran
 * los estilos (`styles/theme.css`). La elección se guarda en el navegador.
 *
 * `index.html` lleva una copia mínima de `resolve` que se ejecuta antes de
 * pintar, para que al cargar en modo nocturno no se vea un fogonazo blanco. Si
 * cambias la clave o la lógica, cámbiala también allí.
 */

import { useCallback, useEffect, useState } from 'react'

export const THEME_CHOICES = ['auto', 'light', 'dark'] as const

export type ThemeChoice = (typeof THEME_CHOICES)[number]

const STORAGE_KEY = 'sanatorio_theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function stored(): ThemeChoice {
  const value = localStorage.getItem(STORAGE_KEY)

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
    localStorage.setItem(STORAGE_KEY, next)
    setChoice(next)
  }, [])

  return [choice, change]
}
