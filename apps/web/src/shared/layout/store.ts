/**
 * Lo que la persona ha personalizado (orden y bloques plegados) y lo que se usa
 * cada cosa. Vive en el navegador; el uso además se manda a la API de vez en
 * cuando, para la ordenación "según la comunidad".
 *
 * Es un almacén pequeño con suscripción (`useSyncExternalStore`): cambiar algo
 * en la ventana de personalización recoloca la página al momento.
 */

import { useSyncExternalStore } from 'react'

import { api } from '../api'
import { arrange } from './order'
import type { OrderMode } from './order'
import { NAV_DEFAULT, PAGES } from './registry'
import type { PageId } from './registry'

export type Prefs = {
  mode: OrderMode
  /** Orden manual de las pestañas. */
  nav: string[]
  /** Orden manual y bloques plegados de cada página. */
  pages: Partial<Record<PageId, { order: string[]; folded: string[] }>>
  /** Minutos antes de un evento a los que salta el aviso. `0` lo apaga. Por defecto, 5. */
  alertLead?: number
}

type State = {
  prefs: Prefs
  /** Usos propios, desde siempre. */
  mine: Record<string, number>
  /** Usos de toda la comunidad, o `null` si aún no han llegado. */
  community: Record<string, number> | null
}

const PREFS_KEY = 'sanatorio_layout'
const USAGE_KEY = 'sanatorio_usage'

/** Cada cuánto se manda a la API lo usado desde la última vez. */
const FLUSH_EVERY_MS = 60_000

const DEFAULT_PREFS: Prefs = { mode: 'manual', nav: [], pages: {} }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)

    return raw === null ? fallback : { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    // Un valor ilegible (o un navegador sin almacenamiento) no rompe la web.
    return fallback
  }
}

let state: State = {
  prefs: read(PREFS_KEY, DEFAULT_PREFS),
  mine: read<Record<string, number>>(USAGE_KEY, {}),
  community: null,
}
/** Los usos propios tal como estaban al abrir la web. */
const mineAtStart: Readonly<Record<string, number>> = { ...state.mine }
/** Lo usado desde el último envío a la API. */
let pending: Record<string, number> = {}
let asked = false
const listeners = new Set<() => void>()

function set(next: Partial<State>): void {
  state = { ...state, ...next }

  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function persist(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento, lo personalizado dura lo que dure la pestaña.
  }
}

/** Guarda un cambio de la personalización. */
export function updatePrefs(change: (prefs: Prefs) => Prefs): void {
  const prefs = change(state.prefs)

  persist(PREFS_KEY, prefs)
  set({ prefs })
}

/** Vuelve al orden de fábrica, con todo desplegado. */
export function resetPrefs(): void {
  updatePrefs(() => DEFAULT_PREFS)
}

/** Pliega o despliega un bloque de una página. */
export function toggleFold(page: PageId, id: string): void {
  updatePrefs((prefs) => {
    const current = prefs.pages[page] ?? { order: [], folded: [] }
    const folded = current.folded.includes(id)
      ? current.folded.filter((other) => other !== id)
      : [...current.folded, id]

    return { ...prefs, pages: { ...prefs.pages, [page]: { ...current, folded } } }
  })
}

/** Manda a la API lo usado desde la última vez. Si falla, se guarda para la siguiente. */
function flush(): void {
  const counts = pending

  if (Object.keys(counts).length === 0) return

  pending = {}
  api.sendUsage(counts).catch(() => {
    for (const [key, count] of Object.entries(counts)) {
      pending[key] = (pending[key] ?? 0) + count
    }
  })
}

/** Anota un uso de un elemento (`nav.tablon`, `expediente.health`). */
export function track(key: string): void {
  const mine = { ...state.mine, [key]: (state.mine[key] ?? 0) + 1 }

  pending[key] = Math.min(200, (pending[key] ?? 0) + 1)
  persist(USAGE_KEY, mine)
  set({ mine })
}

/** Arranca el envío periódico del uso y pide el de la comunidad. Una sola vez. */
export function startUsage(): void {
  if (asked) return

  asked = true
  api.getUsage().then(
    (usage) => {
      set({ community: usage.counts })
    },
    () => {
      // Sin datos de la comunidad, ese modo deja el orden de fábrica.
    },
  )
  setInterval(flush, FLUSH_EVERY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush()
  })
}

/** La personalización, viva: quien la usa se repinta cuando cambia. */
export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, () => state.prefs)
}

/**
 * Los usos que mandan en el modo de orden elegido.
 *
 * Los propios son los que había al abrir la web, no los de ahora mismo: si se
 * contaran en vivo, la pestaña que acabas de pulsar se movería bajo el ratón.
 * Lo que uses hoy recoloca la web en la próxima visita.
 */
function countsFor(mode: OrderMode): Record<string, number> {
  return mode === 'community' ? (state.community ?? {}) : mineAtStart
}

/** Las pestañas, en el orden que toca. */
export function useNavOrder(): string[] {
  const prefs = usePrefs()
  // Solo para repintar cuando lleguen los usos de la comunidad.
  useSyncExternalStore(subscribe, () => state.community)

  return arrange(NAV_DEFAULT, prefs.nav, prefs.mode, countsFor(prefs.mode), (id) => `nav.${id}`)
}

/** Los bloques de una página, en el orden que toca, y cuáles están plegados. */
export function usePageLayout(page: PageId): { order: string[]; folded: readonly string[] } {
  const prefs = usePrefs()
  // Solo para repintar cuando lleguen los usos de la comunidad.
  useSyncExternalStore(subscribe, () => state.community)

  const saved = prefs.pages[page]

  return {
    order: arrange(
      PAGES[page].map((block) => block.id),
      saved?.order ?? [],
      prefs.mode,
      countsFor(prefs.mode),
      (id) => `${page}.${id}`,
    ),
    folded: saved?.folded ?? [],
  }
}
