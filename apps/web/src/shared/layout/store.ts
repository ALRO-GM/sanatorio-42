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
import { startClicks } from './clicks'
import { arrange } from './order'
import type { OrderMode } from './order'
import { CATEGORY_DEFAULT, NAV_DEFAULT, PAGE_IDS, PAGES } from './registry'
import type { PageId } from './registry'
import { createViewClock, windowState } from './view-clock'

type Prefs = {
  mode: OrderMode
  /** Orden manual de las pestañas (las secciones de cada categoría). */
  nav: string[]
  /** Orden manual de las categorías de arriba. */
  categories?: string[]
  /** Orden manual y bloques plegados de cada página. */
  pages: Partial<Record<PageId, { order: string[]; folded: string[] }>>
  /** Minutos antes de un evento a los que salta el aviso. `0` lo apaga. Por defecto, 5. */
  alertLead?: number
  /** `false` esconde los iconos de información y sus demostraciones. Por defecto se ven. */
  tips?: boolean
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
/** Pasos de una sección a otra desde el último envío (`tablon>red`). */
let pendingFlows: Record<string, number> = {}
/** La sección que se está mirando; `null` hasta que se abre la primera. */
let current: string | null = null
/** El tiempo pasado en cada sección, repartido según cómo estaba la ventana. */
const clock = createViewClock(FLUSH_EVERY_MS)
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

/** Qué se ordena: las categorías, las pestañas o los bloques de una página. */
type OrderTarget = 'categories' | 'nav' | PageId

/** El orden que se ve ahora de `target`, con lo guardado, el modo y los usos. */
function shownOrder(prefs: Prefs, target: OrderTarget): string[] {
  const counts = countsFor(prefs.mode)

  if (target === 'categories') {
    // Las categorías no se ordenan solas: el perfil, la portada, va el primero
    // salvo que la persona lo mueva a mano.
    return arrange(CATEGORY_DEFAULT, prefs.categories ?? [], 'manual', {}, (id) => id)
  }
  if (target === 'nav') {
    return arrange(NAV_DEFAULT, prefs.nav, prefs.mode, counts, (id) => `nav.${id}`)
  }

  return arrange(
    PAGES[target].map((block) => block.id),
    prefs.pages[target]?.order ?? [],
    prefs.mode,
    counts,
    (id) => `${target}.${id}`,
  )
}

/**
 * Guarda un orden puesto a mano. Si se estaba ordenando solo (por tu uso o el
 * de la comunidad), se pasa a «a mano» con lo que se veía en todo lo demás:
 * así nada salta de sitio al soltar.
 */
export function saveOrder(target: OrderTarget, order: readonly string[]): void {
  updatePrefs((prefs) => {
    const frozen: Prefs =
      prefs.mode === 'manual'
        ? prefs
        : {
            ...prefs,
            mode: 'manual',
            nav: shownOrder(prefs, 'nav'),
            pages: Object.fromEntries(
              PAGE_IDS.map((page) => [
                page,
                { folded: prefs.pages[page]?.folded ?? [], order: shownOrder(prefs, page) },
              ]),
            ),
          }

    if (target === 'categories') return { ...frozen, categories: [...order] }
    if (target === 'nav') return { ...frozen, nav: [...order] }

    return {
      ...frozen,
      pages: {
        ...frozen.pages,
        [target]: { folded: frozen.pages[target]?.folded ?? [], order: [...order] },
      },
    }
  })
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
  settle()

  const counts = pending
  const time = clock.take()
  const flows = pendingFlows

  if (
    Object.keys(counts).length === 0 &&
    Object.keys(time).length === 0 &&
    Object.keys(flows).length === 0
  ) {
    return
  }

  pending = {}
  pendingFlows = {}
  api.sendUsage(counts, time, flows).catch(() => {
    for (const [key, count] of Object.entries(counts)) {
      pending[key] = (pending[key] ?? 0) + count
    }
    for (const [step, count] of Object.entries(flows)) {
      pendingFlows[step] = (pendingFlows[step] ?? 0) + count
    }

    clock.giveBack(time)
  })
}

/** Cuenta hasta ahora el tiempo de la sección abierta, según cómo esté la ventana. */
function settle(): void {
  clock.settle(Date.now(), windowState())
}

/** Qué sección se está mirando: su tiempo empieza a contar desde ahora. */
export function viewing(section: string): void {
  clock.open(`nav.${section}`, Date.now(), windowState())

  // De dónde se viene: de otra sección o, si es la primera, de fuera.
  if (section !== current) {
    const step = `${current ?? 'start'}>${section}`

    pendingFlows[step] = Math.min(200, (pendingFlows[step] ?? 0) + 1)
    current = section
  }
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
  // Con el uso, los clics para el mapa de calor (`clicks.ts`).
  startClicks()
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
    // Al ocultarse se manda lo que haya: puede que la pestaña no vuelva.
    if (document.hidden) flush()
    else settle()
  })
  // Con otra ventana delante la web sigue visible, pero nadie la está mirando.
  window.addEventListener('focus', settle)
  window.addEventListener('blur', settle)
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

/**
 * Lo que se ve ahora de `target`, en su orden: las categorías, las pestañas o
 * los bloques de una página.
 */
export function useOrder(target: OrderTarget): string[] {
  const prefs = usePrefs()
  // Solo para repintar cuando lleguen los usos de la comunidad.
  useSyncExternalStore(subscribe, () => state.community)

  return shownOrder(prefs, target)
}

/** Las pestañas, en el orden que toca. */
export function useNavOrder(): string[] {
  return useOrder('nav')
}

/** Los bloques de una página, en el orden que toca, y cuáles están plegados. */
export function usePageLayout(page: PageId): { order: string[]; folded: readonly string[] } {
  const prefs = usePrefs()
  // Solo para repintar cuando lleguen los usos de la comunidad.
  useSyncExternalStore(subscribe, () => state.community)

  return { order: shownOrder(prefs, page), folded: prefs.pages[page]?.folded ?? [] }
}
