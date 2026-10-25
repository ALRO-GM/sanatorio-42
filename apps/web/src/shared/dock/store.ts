/**
 * El gestor de las ventanitas flotantes (`docs/interfaz.md`, «Ventanitas de
 * la esquina»): la cuenta atrás, el Pomodoro, Code Clicker… Cada una se apunta
 * al montarse y el gestor decide dónde va para que ninguna tape a otra.
 *
 * Es un estado fuera de React (como `shared/focus.ts`) porque lo comparten
 * ventanitas que viven en sitios distintos del árbol y no se conocen.
 *
 * Lo que recuerda el navegador (`localStorage`, `sanatorio_dock`): el orden de
 * la pila, dónde se dejó cada una que flota y cuáles están plegadas.
 */

import { useSyncExternalStore } from 'react'

import { clampTo, dropIndex, moveTo, stack, NARROW_MAX } from './layout'
import type { Box, Layout, Size } from './layout'

type Pos = { left: number; top: number }

/** Lo que dice una ventanita al apuntarse. */
type DockSpec = {
  id: string
  /** Lo que mide desplegada y plegada antes de poder medirla de verdad. */
  size: Size
  foldedSize: Size
}

type Saved = {
  /** De la esquina hacia fuera. Guarda también las que no se ven ahora: así recuperan su sitio. */
  order: string[]
  floating: Record<string, Pos>
  folded: Record<string, boolean>
}

type Drag = { id: string; at: Pos; index: number | null }

type DockState = {
  saved: Saved
  /** Las que se ven ahora. */
  specs: Record<string, DockSpec>
  /** Lo medido de verdad en la pantalla, que manda sobre lo dicho al apuntarse. */
  sizes: Record<string, Size>
  viewport: Size
  drag: Drag | null
  /** La que se ha cogido con el teclado y el orden de antes, por si se cancela. */
  grabbed: { id: string; before: string[] } | null
  /** Lo último que se ha dicho a los lectores de pantalla (`DockHost`). */
  said: string
}

const KEY = 'sanatorio_dock'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Lee lo guardado sin romper si no se puede (modo privado, sin permiso o estropeado). */
function load(): Saved {
  const empty: Saved = { order: [], floating: {}, folded: {} }

  try {
    const raw = localStorage.getItem(KEY)

    if (raw === null) return empty

    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed)) return empty

    const order = Array.isArray(parsed.order) ? (parsed.order as unknown[]) : []
    const floating = isRecord(parsed.floating) ? parsed.floating : {}
    const folded = isRecord(parsed.folded) ? parsed.folded : {}

    // Lo guardado puede venir de otra versión o tocado a mano: solo vale lo que tiene buena forma.
    return {
      order: order.filter((id): id is string => typeof id === 'string'),
      floating: Object.fromEntries(
        Object.entries(floating).filter(
          (entry): entry is [string, Pos] =>
            isRecord(entry[1]) && Number.isFinite(entry[1].left) && Number.isFinite(entry[1].top),
        ),
      ),
      folded: Object.fromEntries(
        Object.entries(folded).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
        ),
      ),
    }
  } catch {
    return empty
  }
}

function save(saved: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Sin almacenamiento, se olvida al recargar: no pasa nada.
  }
}

const viewportNow = (): Size =>
  typeof window === 'undefined'
    ? { width: 1280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight }

let state: DockState = {
  saved: load(),
  specs: {},
  sizes: {},
  viewport: viewportNow(),
  drag: null,
  grabbed: null,
  said: '',
}
const listeners = new Set<() => void>()
let watching = false

function set(next: Partial<DockState>, persist = false): void {
  state = { ...state, ...next }
  if (persist) save(state.saved)
  layoutCache = null
  for (const listener of listeners) listener()
}

function onResize(): void {
  set({ viewport: viewportNow() })
}

/** `true` en una pantalla estrecha (la del móvil). */
const isNarrow = (viewport: Size = state.viewport): boolean => viewport.width <= NARROW_MAX

/**
 * Si está plegada. Sin elegir nada, en el móvil empiezan plegadas: la pila es
 * una fila de píldoras que no tapa lo que se está haciendo.
 */
export function foldedOf(id: string, current: DockState = state): boolean {
  return current.saved.folded[id] ?? isNarrow(current.viewport)
}

/** Lo que mide ahora: lo medido o, si aún no, lo dicho al apuntarse. */
function sizeOf(id: string, current: DockState): Size {
  const spec = current.specs[id]
  const measured = current.sizes[id]

  if (measured !== undefined && measured.width > 0 && measured.height > 0) return measured
  if (spec === undefined) return { width: 0, height: 0 }

  return foldedOf(id, current) ? spec.foldedSize : spec.size
}

/** Las ancladas que se ven, de la esquina hacia fuera; las nuevas, al final. */
export function dockedOrder(current: DockState = state): string[] {
  const shown = Object.keys(current.specs).filter((id) => current.saved.floating[id] === undefined)
  const known = current.saved.order.filter((id) => shown.includes(id))

  return [...known, ...shown.filter((id) => !known.includes(id))]
}

const boxOf = (id: string, current: DockState): Box => ({ id, ...sizeOf(id, current) })

let layoutCache: Layout | null = null

/**
 * Los huecos de la pila. Mientras se arrastra una, las demás le dejan sitio
 * donde caería (o lo cierran, si se va a soltar flotando).
 */
export function dockLayout(current: DockState = state): Layout {
  if (current === state && layoutCache !== null) return layoutCache

  const { drag } = current
  let order = dockedOrder(current)

  if (drag !== null) {
    order = order.filter((id) => id !== drag.id)
    if (drag.index !== null) order.splice(drag.index, 0, drag.id)
  }

  const result = stack(
    order.map((id) => boxOf(id, current)),
    current.viewport,
  )

  if (current === state) layoutCache = result

  return result
}

/** Se apunta una ventanita que se ve. Devuelve cómo quitarla cuando deja de verse. */
export function register(spec: DockSpec): () => void {
  if (!watching && typeof window !== 'undefined') {
    watching = true
    window.addEventListener('resize', onResize)
  }

  const saved = state.saved.order.includes(spec.id)
    ? state.saved
    : { ...state.saved, order: [...state.saved.order, spec.id] }

  set({ specs: { ...state.specs, [spec.id]: spec }, saved, viewport: viewportNow() })

  return () => {
    const { [spec.id]: _gone, ...specs } = state.specs
    const { [spec.id]: _size, ...sizes } = state.sizes

    set({
      specs,
      sizes,
      drag: state.drag?.id === spec.id ? null : state.drag,
      grabbed: state.grabbed?.id === spec.id ? null : state.grabbed,
    })
  }
}

/** Lo que mide de verdad, al pintarse o al cambiar. */
export function measure(id: string, size: Size): void {
  const before = state.sizes[id]

  if (before?.width === size.width && before.height === size.height) return
  set({ sizes: { ...state.sizes, [id]: size } })
}

export function setFolded(id: string, folded: boolean): void {
  set({ saved: { ...state.saved, folded: { ...state.saved.folded, [id]: folded } } }, true)
}

/** Vuelve a la esquina, al hueco que tenía en la pila (o al final si es nueva). */
export function redock(id: string): void {
  const { [id]: _was, ...floating } = state.saved.floating

  set({ saved: { ...state.saved, floating } }, true)
}

/** Dónde flota, si flota: ya dentro de la pantalla aunque esta haya encogido. */
export function floatingAt(id: string, current: DockState = state): Pos | null {
  const at = current.saved.floating[id]

  return at === undefined ? null : clampTo(at, sizeOf(id, current), current.viewport)
}

// --- Arrastrar ---------------------------------------------------------------

/** Empieza a arrastrarse desde donde está pintada. */
export function startDrag(id: string, at: Pos): void {
  set({ drag: { id, at, index: indexNear(id, at) } })
}

function indexNear(id: string, at: Pos): number | null {
  const others = dockedOrder().filter((each) => each !== id)

  return dropIndex(
    others.map((each) => boxOf(each, state)),
    boxOf(id, state),
    at,
    state.viewport,
  )
}

export function moveDrag(at: Pos): void {
  if (state.drag === null) return

  const clamped = clampTo(at, sizeOf(state.drag.id, state), state.viewport)

  set({ drag: { ...state.drag, at: clamped, index: indexNear(state.drag.id, clamped) } })
}

/**
 * Se suelta: cerca de la pila, entra en el hueco que se le hacía; lejos,
 * se queda flotando donde se dejó. Devuelve la posición en la pila (desde 0)
 * o `null` si flota.
 */
export function endDrag(): number | null {
  const { drag } = state

  if (drag === null) return null

  const { [drag.id]: _was, ...floating } = state.saved.floating

  if (drag.index === null) {
    set(
      { drag: null, saved: { ...state.saved, floating: { ...floating, [drag.id]: drag.at } } },
      true,
    )

    return null
  }

  const order = moveTo(state.saved.order, dockedOrder(), drag.id, drag.index)

  set({ drag: null, saved: { ...state.saved, order, floating } }, true)

  return drag.index
}

// --- Con el teclado ------------------------------------------------------------

export function grab(id: string): void {
  set({ grabbed: { id, before: state.saved.order } })
}

/** Mueve la cogida `step` puestos (positivo: lejos de la esquina). Devuelve su posición nueva. */
export function nudge(id: string, step: number): number {
  const shown = dockedOrder()
  const index = Math.max(0, Math.min(shown.length - 1, shown.indexOf(id) + step))

  set({ saved: { ...state.saved, order: moveTo(state.saved.order, shown, id, index) } })

  return index
}

/** Suelta la cogida donde está (`keep`) o la devuelve a donde estaba. */
export function release(keep: boolean): void {
  const { grabbed } = state

  if (grabbed === null) return
  set(
    {
      grabbed: null,
      saved: keep ? state.saved : { ...state.saved, order: grabbed.before },
    },
    true,
  )
}

/**
 * Lo que oye un lector de pantalla al mover una ventanita. Si se repite la
 * misma frase, se le añade un espacio sin anchura para que se vuelva a leer.
 */
export function say(text: string): void {
  set({ said: text === state.said ? `${text}\u200b` : text })
}

// --- Para React ----------------------------------------------------------------

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function useDock(): DockState {
  return useSyncExternalStore(subscribe, () => state)
}

/** Vuelve a leer lo guardado y olvida lo demás. Para los tests. */
export function resetDock(): void {
  set({
    saved: load(),
    specs: {},
    sizes: {},
    drag: null,
    grabbed: null,
    said: '',
    viewport: viewportNow(),
  })
}
