import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { Lang } from '@sanatorio/contracts'

import { ApiError } from '../api/http'
import { ca } from './ca'
import { en } from './en'
import { es } from './es'
import { eu } from './eu'

type Dictionary = Record<string, string>

// Idiomas disponibles. Añadir uno es crear su fichero y apuntarlo aquí: las
// claves que le falten caen al español.
export const LANGS: Record<Lang, { name: string; dict: Dictionary }> = {
  es: { name: 'Español', dict: es },
  en: { name: 'English', dict: en },
  ca: { name: 'Català', dict: ca },
  eu: { name: 'Euskara', dict: eu },
}

export { localeOf } from './locale'

export type Translate = (key: string, vars?: Record<string, string | number>) => string

type I18n = {
  lang: Lang
  setLang: (next: Lang) => void
  t: Translate
}

const STORAGE_KEY = 'sanatorio_lang'

export function isLang(value: string | null | undefined): value is Lang {
  return value !== null && value !== undefined && value in LANGS
}

/** Idioma inicial: el que eligió la última vez, o el del navegador si lo tenemos. */
function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (isLang(stored)) {
    return stored
  }

  const browser = navigator.language.slice(0, 2)

  return isLang(browser) ? browser : 'es'
}

const I18nContext = createContext<I18n>({ lang: 'es', setLang: () => undefined, t: (key) => key })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLangState(next)
  }, [])

  /**
   * Texto de una clave, con `{variables}` sustituidas.
   *
   * Si la clave no existe en ningún idioma se devuelve la propia clave: se ve
   * raro en pantalla, que es justo lo que hace falta para darse cuenta.
   */
  const t = useCallback<Translate>(
    (key, vars) => {
      const template = LANGS[lang].dict[key] ?? es[key] ?? key

      if (vars === undefined) {
        return template
      }

      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}

/**
 * Mensaje para enseñar a partir de un error de la capa de API.
 *
 * Los mensajes del servidor están en español; en otros idiomas se enseña uno
 * genérico según el código, que es menos preciso pero se entiende.
 */
export function errorText(t: Translate, lang: Lang, error: unknown): string {
  if (!(error instanceof ApiError)) {
    return t('error.generic', { detail: error instanceof Error ? error.message : '?' })
  }

  if (error.network) {
    return t('error.network')
  }

  if (lang === 'es' && error.serverMessage !== undefined) {
    return error.serverMessage
  }

  const byStatus = `error.${error.status ?? ''}`
  const known = t(byStatus)

  return known === byStatus ? t('error.generic', { detail: error.message }) : known
}
