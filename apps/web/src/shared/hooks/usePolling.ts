import { useEffect, useRef } from 'react'

import { isCovered } from '../still'

/**
 * Vuelve a pedir algo cada `everyMs` milisegundos mientras la pantalla se está
 * mirando (y no la tapa el Pomodoro a pantalla completa): una lista de salas que se llenan, el mapa de un proyecto, quién
 * está conectado. Con la pestaña en segundo plano no se pide nada, que nadie
 * lo ve (lo mismo que hace `usePulse`); al volver, la siguiente vuelta lo pone
 * al día.
 *
 * Lo que hay que preguntar de fondo, aunque no se mire, va en `GET /pulse`.
 *
 * @param fn      Lo que se pide (normalmente el `reload` de un `useAsync`).
 * @param everyMs Cada cuánto, o `null` para no pedir nada (una sala acabada).
 * @param whileHidden `true` para seguir pidiendo con la pestaña oculta.
 */
export function usePolling(
  fn: () => unknown,
  everyMs: number | null,
  { whileHidden = false } = {},
): void {
  // La última `fn`, sin que cambiar de función reinicie la cuenta.
  const latest = useRef(fn)

  latest.current = fn

  useEffect(() => {
    if (everyMs === null) return undefined

    const timer = window.setInterval(() => {
      if (whileHidden || (!document.hidden && !isCovered())) void latest.current()
    }, everyMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [everyMs, whileHidden])
}
