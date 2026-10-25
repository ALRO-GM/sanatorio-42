import { useEffect } from 'react'

/**
 * El tiempo activo en un punto de un curso (`docs/plantilla-cursos.md`): los
 * segundos que su vista ha estado abierta, con la pestaña a la vista y con
 * algo de actividad (teclas, ratón, desplazarse) en el último minuto. Se
 * suma entre visitas, en el navegador, hasta que el punto sale; entonces se
 * manda con el intento y vuelve a cero. Con eso la API calibrará las
 * estimaciones de cada punto.
 */

type CourseName = 'git' | 'shell'

const KEY = 'sanatorio_course_time'
/** Sin tocar nada durante este rato, el tiempo deja de contar. */
const IDLE_MS = 60_000
/** Cada cuánto se suma lo que va contando. */
const TICK_MS = 5_000
/** Lo más que se suma de una vez (un portátil que se despierta no cuenta horas). */
const MAX_STEP_MS = 2 * TICK_MS
/** El tope que admite la API: seis horas. */
const MAX_SECONDS = 6 * 3600

const ACTIVITY = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'scroll', 'touchstart'] as const

function stored(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')

    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function store(all: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Sin almacenamiento solo se pierde la medida: el curso sigue igual.
  }
}

const keyOf = (course: CourseName, point: string): string => `${course}:${point}`

/** Los segundos activos que lleva ese punto (enteros, dentro del tope de la API). */
export function activeSecondsOf(course: CourseName, point: string): number {
  const value = stored()[keyOf(course, point)]

  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_SECONDS, Math.max(0, Math.round(value)))
    : 0
}

/** Vuelve a cero un punto: se llama cuando sale. */
export function clearActiveTime(course: CourseName, point: string): void {
  const key = keyOf(course, point)

  store(Object.fromEntries(Object.entries(stored()).filter(([each]) => each !== key)))
}

function add(course: CourseName, point: string, seconds: number): void {
  const all = stored()
  const key = keyOf(course, point)

  all[key] = Math.min(MAX_SECONDS, (all[key] ?? 0) + seconds)
  store(all)
}

/** Cuenta el tiempo activo mientras la vista de ese punto está abierta. */
export function useActiveTime(course: CourseName, point: string): void {
  useEffect(() => {
    let lastInput = Date.now()
    let lastTick = Date.now()
    const touched = () => {
      lastInput = Date.now()
    }
    const tick = () => {
      const now = Date.now()
      const step = Math.min(MAX_STEP_MS, now - lastTick)
      const active =
        document.visibilityState === 'visible' && document.hasFocus() && now - lastInput < IDLE_MS

      lastTick = now
      if (active && step > 0) add(course, point, step / 1000)
    }
    const timer = window.setInterval(tick, TICK_MS)

    for (const name of ACTIVITY) window.addEventListener(name, touched, { passive: true })

    return () => {
      // Lo que va del último tic también cuenta al salir.
      tick()
      window.clearInterval(timer)
      for (const name of ACTIVITY) window.removeEventListener(name, touched)
    }
  }, [course, point])
}
