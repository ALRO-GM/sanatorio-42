/**
 * El reloj del tiempo de uso: cuánto se pasa en cada sección y cómo estaba la
 * ventana mientras tanto.
 *
 * No es lo mismo tener la web delante que tenerla abierta en una pestaña que
 * nadie mira, y una estadística que las sume engaña. Por eso cada tramo se
 * apunta en una de tres cuentas:
 *
 * - `seen`:   la pestaña se ve y la ventana tiene el foco. Alguien la mira.
 * - `back`:   la pestaña se ve, pero el foco está en otra ventana.
 * - `hidden`: la pestaña está oculta o la ventana minimizada.
 *
 * No toca el navegador: recibe la hora y el estado, así se puede probar.
 */

type WindowState = 'seen' | 'back' | 'hidden'

/** `[viéndola, detrás de otra ventana, oculta]`, en segundos. */
type ViewTime = [seen: number, back: number, hidden: number]

const SLOT: Record<WindowState, 0 | 1 | 2> = { seen: 0, back: 1, hidden: 2 }

/** Cómo está la ventana ahora mismo. */
export function windowState(): WindowState {
  return document.hidden ? 'hidden' : document.hasFocus() ? 'seen' : 'back'
}

/**
 * @param beatMs Cada cuánto se va a llamar a `settle` como poco. Un tramo mucho
 *   más largo que eso no es uso: es el portátil dormido o el navegador
 *   congelando la pestaña, y solo se cuenta un latido.
 */
export function createViewClock(beatMs: number) {
  let key: string | null = null
  let since = 0
  let state: WindowState = 'seen'
  /** Milisegundos acumulados por sección, aún sin mandar. */
  let pending: Record<string, ViewTime> = {}

  /** Apunta lo transcurrido desde la última vez a la cuenta del estado que había. */
  const settle = (now: number, next: WindowState): void => {
    if (key !== null) {
      const elapsed = now - since
      const counted = elapsed > 5 * beatMs ? beatMs : Math.max(0, elapsed)
      const entry = pending[key] ?? [0, 0, 0]

      entry[SLOT[state]] += counted
      pending[key] = entry
    }

    since = now
    state = next
  }

  return {
    settle,

    /** Se abre otra sección: lo anterior se cierra y esta empieza a contar. */
    open(next: string, now: number, current: WindowState): void {
      settle(now, current)
      key = next
    },

    /**
     * Lo acumulado, en segundos enteros, para mandarlo. Los restos de menos de
     * un segundo se quedan para la siguiente: así no se pierde ni se inventa.
     */
    take(): Record<string, ViewTime> {
      const whole: Record<string, ViewTime> = {}
      const rest: Record<string, ViewTime> = {}

      for (const [section, time] of Object.entries(pending)) {
        const seconds = time.map((ms) => Math.floor(ms / 1000)) as ViewTime

        if (seconds.some((value) => value > 0)) whole[section] = seconds

        rest[section] = time.map((ms, slot) => ms - (seconds[slot] ?? 0) * 1000) as ViewTime
      }

      pending = rest

      return whole
    },

    /** El envío ha fallado: lo que se llevó vuelve a la cuenta. */
    giveBack(time: Record<string, ViewTime>): void {
      for (const [section, seconds] of Object.entries(time)) {
        const entry = pending[section] ?? [0, 0, 0]

        pending[section] = entry.map((ms, slot) => ms + (seconds[slot] ?? 0) * 1000) as ViewTime
      }
    },
  }
}
