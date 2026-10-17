import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { Lang } from '@sanatorio/contracts'

import es from 'virtual:textos/es'

import { ApiError } from '../api/http'
import { pickTree, unflatten } from './tree'

type Dictionary = Record<string, string>

/**
 * Idiomas disponibles. Los textos salen de las tablas de `textos/` (una por
 * tema, con una columna por idioma): añadir un idioma es añadir su columna a
 * las tablas, su código en `tools/textos.ts` y su entrada aquí. Lo que le falte
 * cae al español.
 *
 * Solo el español viaja con la web; los demás se descargan al elegirlos.
 */
export const LANGS: Record<Lang, { name: string; load: () => Promise<{ default: Dictionary }> }> = {
  es: { name: 'Español', load: () => Promise.resolve({ default: es }) },
  en: { name: 'English', load: () => import('virtual:textos/en') },
  ca: { name: 'Català', load: () => import('virtual:textos/ca') },
  eu: { name: 'Euskara', load: () => import('virtual:textos/eu') },
}

/** Los idiomas ya descargados. */
const loaded: Partial<Record<Lang, Dictionary>> = { es }

/** Descarga los textos de un idioma, si no lo estaban ya. */
export async function loadLang(lang: Lang): Promise<void> {
  loaded[lang] ??= (await LANGS[lang].load()).default
}

export { localeOf } from './locale'

export type Translate = (key: string, vars?: Record<string, string | number>) => string

type I18n = {
  lang: Lang
  setLang: (next: Lang) => void
  t: Translate
  /**
   * Un texto largo guardado en muchas claves (una lista, un documento): su
   * estructura en este idioma o, si no está traducido, en español. Ver `tree.ts`.
   */
  tree: (prefix: string) => { value: unknown; translated: boolean }
}

const STORAGE_KEY = 'sanatorio_lang'

export function isLang(value: string | null | undefined): value is Lang {
  return value !== null && value !== undefined && value in LANGS
}

/** Idioma inicial: el que eligió la última vez, o el del navegador si lo tenemos. */
export function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (isLang(stored)) {
    return stored
  }

  const browser = navigator.language.slice(0, 2)

  return isLang(browser) ? browser : 'es'
}

const I18nContext = createContext<I18n>({
  lang: 'es',
  setLang: () => undefined,
  t: (key) => key,
  tree: (prefix) => ({ value: unflatten(es, prefix), translated: true }),
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang)
  // Cambia cuando termina de llegar un idioma: obliga a pintar con sus textos.
  const [arrived, setArrived] = useState(0)

  useEffect(() => {
    if (loaded[lang] !== undefined) return

    let alive = true

    loadLang(lang).then(
      () => {
        if (alive) setArrived((count) => count + 1)
      },
      () => undefined,
    )

    return () => {
      alive = false
    }
  }, [lang])

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
      const template = loaded[lang]?.[key] ?? es[key] ?? key

      if (vars === undefined) {
        return template
      }

      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    },
    // `arrived`: al llegar los textos del idioma, `t` cambia y se repinta todo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, arrived],
  )

  const tree = useCallback(
    (prefix: string) => pickTree(loaded[lang], es, prefix, lang === 'es'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, arrived],
  )

  const value = useMemo(() => ({ lang, setLang, t, tree }), [lang, setLang, t, tree])

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
