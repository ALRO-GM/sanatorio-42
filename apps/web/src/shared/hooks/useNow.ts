import { useCallback, useRef, useSyncExternalStore } from 'react'

type Clock = {
  /** El último instante que marcó. */
  now: number
  listeners: Set<() => void>
  timer: number | null
}

/**
 * Un reloj por cadencia, compartido por todo el que lo mira: con cinco relojes
 * en pantalla (sala, Pomodoro, avisos) hay un intervalo por cadencia y no
 * cinco. Se para solo cuando nadie lo escucha.
 */
const clocks = new Map<number, Clock>()

function clockFor(everyMs: number): Clock {
  let clock = clocks.get(everyMs)

  if (clock === undefined) {
    clock = { now: Date.now(), listeners: new Set(), timer: null }
    clocks.set(everyMs, clock)
  }

  return clock
}

function subscribe(everyMs: number, listener: () => void): () => void {
  const clock = clockFor(everyMs)

  if (clock.listeners.size === 0) {
    // El primero en mirar arranca el reloj, con la hora al día.
    clock.now = Date.now()
    clock.timer = window.setInterval(() => {
      clock.now = Date.now()
      clock.listeners.forEach((tick) => {
        tick()
      })
    }, everyMs)
  }

  clock.listeners.add(listener)

  return () => {
    clock.listeners.delete(listener)

    if (clock.listeners.size === 0 && clock.timer !== null) {
      window.clearInterval(clock.timer)
      clock.timer = null
    }
  }
}

const never = (): (() => void) => () => undefined

/**
 * El instante actual, al día cada `everyMs` milisegundos, para cuentas atrás,
 * cronómetros y rayas de «ahora». Sustituye a los `setInterval(() =>
 * setNow(Date.now()))` de cada componente y a leer `Date.now()` al pintar, que
 * hace que cada pintado salga distinto aunque nada haya cambiado.
 *
 * @param everyMs Cada cuánto cambia.
 * @param active  Con `false` el reloj no corre: devuelve el instante en que se
 *   montó (o el último que marcó) y no vuelve a pintar.
 * @param offset  Lo que va adelantado o atrasado el servidor respecto a este
 *   reloj, para medir contra sus horas.
 */
export function useNow(everyMs: number, { active = true, offset = 0 } = {}): number {
  const frozen = useRef(Date.now())
  const clock = clockFor(everyMs)
  const listen = useCallback(
    (listener: () => void) => (active ? subscribe(everyMs, listener) : never()),
    [everyMs, active],
  )
  const read = useCallback(() => {
    if (active) frozen.current = clock.now

    return frozen.current
  }, [active, clock])

  return useSyncExternalStore(listen, read, read) + offset
}
