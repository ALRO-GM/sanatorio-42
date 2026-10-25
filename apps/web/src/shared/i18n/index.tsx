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
 * cae a su `fallback`, si lo tiene, y si no al español.
 *
 * Solo el español viaja con la web; los demás se descargan al elegirlos.
 */
type LangEntry = {
  name: string
  load: () => Promise<{ default: Dictionary }>
  /**
   * El idioma que se enseña donde a este le falta el texto, antes que el
   * español. El francés cae al inglés: en la sede de 42 en Francia se lee
   * mejor que el castellano mientras se traduce.
   */
  fallback?: Lang
  /**
   * Aún no se ofrece en el selector (se traduce y se revisa). Quien ya lo tenga
   * elegido lo sigue viendo. Se quita cuando `FR_REQUIRED` pase a `true`.
   */
  unlisted?: boolean
}

export const LANGS: Record<Lang, LangEntry> = {
  es: { name: 'Español', load: () => Promise.resolve({ default: es }) },
  en: { name: 'English', load: () => import('virtual:textos/en') },
  ca: { name: 'Català', load: () => import('virtual:textos/ca') },
  eu: { name: 'Euskara', load: () => import('virtual:textos/eu') },
  fr: {
    name: 'Français',
    load: () => import('virtual:textos/fr'),
    fallback: 'en',
    unlisted: true,
  },
}

/** Los idiomas ya descargados. */
const loaded: Partial<Record<Lang, Dictionary>> = { es }

/** Un idioma y el de su `fallback`, los dos: lo que hace falta para pintarlo. */
const needed = (lang: Lang): Lang[] => {
  const { fallback } = LANGS[lang]

  return fallback === undefined ? [lang] : [lang, fallback]
}

/** Descarga los textos de un idioma (y los de su `fallback`), si no lo estaban ya. */
export async function loadLang(lang: Lang): Promise<void> {
  await Promise.all(
    needed(lang).map(async (code) => {
      loaded[code] ??= (await LANGS[code].load()).default
    }),
  )
}

/**
 * El texto de una clave en un idioma: el suyo, si no el de su `fallback` y si
 * no el español. `undefined` si no está en ninguno.
 */
export function lookup(lang: Lang, key: string): string | undefined {
  const { fallback } = LANGS[lang]

  return (
    loaded[lang]?.[key] ?? (fallback === undefined ? undefined : loaded[fallback]?.[key]) ?? es[key]
  )
}

import { localeOf } from './locale'

export { localeOf }

export type Translate = (key: string, vars?: Record<string, string | number>) => string

/**
 * Un texto que cambia con una cantidad: `tn('xp.got', 3)` lee `xp.got.many`
 * con `{n}` = 3, y `tn('xp.got', 1)`, `xp.got.one`. Una sola regla para todos
 * los plurales, en vez de un `n === 1 ? … : …` distinto en cada sitio.
 */
export type TranslateCount = (
  key: string,
  n: number,
  vars?: Record<string, string | number>,
) => string

/**
 * `one` o `many` según las reglas de plural del idioma (`Intl.PluralRules`).
 * Para los cinco de la web solo hay dos formas; un idioma con más («few»,
 * «two»…) caería en `many` hasta que sus tablas tengan esas columnas. En
 * francés el cero y 1,5 van en singular («0 réponse»): les toca `one`.
 */
export function pluralOf(lang: string, n: number): 'one' | 'many' {
  return new Intl.PluralRules(localeOf(lang)).select(n) === 'one' ? 'one' : 'many'
}

type I18n = {
  lang: Lang
  setLang: (next: Lang) => void
  t: Translate
  tn: TranslateCount
  /**
   * Un texto largo guardado en muchas claves (una lista, un documento): su
   * estructura en este idioma o, si no está traducido, en el de su `fallback`
   * o en español (`translated: false`). Ver `tree.ts`.
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
  tn: (key, n) => `${key}.${pluralOf('es', n)}`,
  tree: (prefix) => ({ value: unflatten(es, prefix), translated: true }),
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang)
  // Cambia cuando termina de llegar un idioma: obliga a pintar con sus textos.
  const [arrived, setArrived] = useState(0)

  useEffect(() => {
    if (needed(lang).every((code) => loaded[code] !== undefined)) return

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
      const template = lookup(lang, key) ?? key

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

  const tn = useCallback<TranslateCount>(
    (key, n, vars = {}) => t(`${key}.${pluralOf(lang, n)}`, { n, ...vars }),
    [t, lang],
  )

  const tree = useCallback(
    (prefix: string) => {
      const { fallback } = LANGS[lang]

      return pickTree(
        loaded[lang],
        es,
        prefix,
        lang === 'es',
        fallback === undefined ? undefined : loaded[fallback],
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, arrived],
  )

  const value = useMemo(() => ({ lang, setLang, t, tn, tree }), [lang, setLang, t, tn, tree])

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
