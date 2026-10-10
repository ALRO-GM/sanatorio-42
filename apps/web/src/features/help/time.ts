import type { TimeRange } from '@sanatorio/contracts'

/** Todo va en medias horas. */
export const SLOT = 30

/** Primera y última hora que enseña el editor de franjas. */
export const DAY_START = 8 * 60
export const DAY_END = 24 * 60

export function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "1 h 30 min", "45 min", "2 h". */
export function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return [hours > 0 ? `${hours} h` : '', rest > 0 ? `${rest} min` : ''].filter(Boolean).join(' ')
}

/** Inicios de media hora que cubren esas franjas. */
export function slotsOf(windows: readonly TimeRange[]): Set<number> {
  const slots = new Set<number>()

  for (const window of windows) {
    for (let start = toMinutes(window.start); start < toMinutes(window.end); start += SLOT) {
      slots.add(start)
    }
  }

  return slots
}

/** Las franjas que forman esas medias horas: las contiguas se juntan. */
export function windowsOf(slots: ReadonlySet<number>): TimeRange[] {
  const windows: { start: number; end: number }[] = []

  for (const start of [...slots].sort((a, b) => a - b)) {
    const last = windows.at(-1)

    if (last?.end === start) {
      last.end = start + SLOT
    } else {
      windows.push({ start, end: start + SLOT })
    }
  }

  return windows.map((window) => ({ start: toTime(window.start), end: toTime(window.end) }))
}
