import type { CalendarKind } from '@sanatorio/contracts'

/**
 * Los tipos de evento, en el orden en que salen en los filtros: primero lo de
 * Sanatorio, luego lo de 42.
 *
 * Cada uno tiene su icono y su color (`--kind`, en `global.css`, por la clase
 * `kind-<tipo>`). Los textos, en `agenda.kind.<tipo>`.
 */
export const KINDS: readonly { kind: CalendarKind; icon: string; fortyTwo: boolean }[] = [
  { kind: 'help', icon: '🛟', fortyTwo: false },
  { kind: 'therapy', icon: '🫂', fortyTwo: false },
  { kind: 'board', icon: '🧑‍🏫', fortyTwo: false },
  { kind: 'evaluation', icon: '🔎', fortyTwo: true },
  { kind: 'event_joined', icon: '🎟️', fortyTwo: true },
  { kind: 'event_open', icon: '📣', fortyTwo: true },
  { kind: 'exam', icon: '📝', fortyTwo: true },
]

export const iconOf = (kind: CalendarKind): string =>
  KINDS.find((entry) => entry.kind === kind)?.icon ?? ''

const HIDDEN_KEY = 'sanatorio_calendar_hidden'
const VIEW_KEY = 'sanatorio_calendar_view'

export const VIEWS = ['day', 'week', 'month'] as const

export type View = (typeof VIEWS)[number]

/** Tipos que la persona ha ocultado. Se recuerda entre visitas. */
export function loadHidden(): Set<CalendarKind> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]')
    const known = new Set<string>(KINDS.map((entry) => entry.kind))

    return new Set(
      (Array.isArray(stored) ? stored : []).filter(
        (kind): kind is CalendarKind => typeof kind === 'string' && known.has(kind),
      ),
    )
  } catch {
    return new Set()
  }
}

export function saveHidden(hidden: ReadonlySet<CalendarKind>): void {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]))
}

export function loadView(): View {
  const stored = localStorage.getItem(VIEW_KEY)

  // En pantallas estrechas un mes entero no se lee: se empieza por la semana.
  return VIEWS.find((view) => view === stored) ?? (window.innerWidth < 700 ? 'week' : 'month')
}

export function saveView(view: View): void {
  localStorage.setItem(VIEW_KEY, view)
}
