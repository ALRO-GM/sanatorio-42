import { useCallback, useEffect, useState } from 'react'

import type { Pulse } from '@sanatorio/contracts'

import { api } from '../api'

/**
 * Cada cuánto se pregunta si hay algo nuevo: a menudo si esperas turno en la
 * cola de 42, algo menos si la cuota va justa, y cada dos minutos si todo va
 * bien. Con la pestaña en segundo plano no se pregunta.
 */
const EVERY_MS = { waiting: 20_000, tight: 60_000, ok: 120_000 }

/**
 * El "pulso" de la web: los avisos sin leer y cómo anda la cuota de 42, en una
 * sola petición de fondo. Lo usan el número rojo del buzón y el rótulo de cuota.
 *
 * @returns El último pulso (o `null` hasta que llega el primero) y una función
 *   para pedirlo ya, cuando se sabe que algo ha cambiado.
 */
export function usePulse(): { pulse: Pulse | null; refresh: () => void } {
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const pace =
    pulse === null || (pulse.quota.level === 'ok' && pulse.quota.ticket === null)
      ? 'ok'
      : pulse.quota.ticket !== null
        ? 'waiting'
        : 'tight'

  const refresh = useCallback((): void => {
    // Con la pestaña oculta no se gasta una petición en algo que nadie ve.
    if (document.hidden) return

    api.getPulse().then(setPulse, () => undefined)
  }, [])

  useEffect(() => {
    refresh()

    const timer = window.setInterval(refresh, EVERY_MS[pace])

    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [pace, refresh])

  return { pulse, refresh }
}
