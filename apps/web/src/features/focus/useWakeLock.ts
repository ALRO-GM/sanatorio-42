import { useEffect } from 'react'

/**
 * Mientras se monta, pide que la pantalla no se apague ni se bloquee: en el
 * móvil, el Pomodoro a pantalla completa tiene que seguir enseñando el tiempo
 * y el «no molestar». El navegador lo suelta al esconder la pestaña; al volver
 * a verse, se pide otra vez. Donde no existe (o no se concede), no pasa nada.
 */
export function useWakeLock(): void {
  useEffect(() => {
    // No está en todos los navegadores (Firefox, Safari antiguo).
    if (!('wakeLock' in navigator)) return undefined

    const api = navigator.wakeLock
    let held: WakeLockSentinel | null = null
    let done = false

    const take = (): void => {
      if (document.hidden) return
      api.request('screen').then(
        (sentinel) => {
          // Si ya se ha cerrado el Pomodoro mientras se pedía, se suelta.
          if (done) void sentinel.release().catch(() => undefined)
          else held = sentinel
        },
        () => {
          // Sin permiso (batería baja, por ejemplo): la pantalla se apagará sola.
        },
      )
    }

    take()
    document.addEventListener('visibilitychange', take)

    return () => {
      done = true
      document.removeEventListener('visibilitychange', take)
      if (held !== null) void held.release().catch(() => undefined)
    }
  }, [])
}
