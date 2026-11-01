import { useCallback, useEffect, useRef, useState } from 'react'
import type { DependencyList, RefObject } from 'react'

import { usePolling } from './usePolling'

/** Lo que tiene toda sala que se juega con el servidor: su hora y en qué va. */
type Room = { now: string; status: string }

type LiveRoomOptions<T> = {
  /** Cada cuánto se pide mientras se juega. */
  playingMs: number
  /** Y mientras se espera a la gente (en el vestíbulo). Acabada, ya no se pide. */
  waitingMs: number
  /** Lo que cambia de una vez a otra (los sonidos de Not-games). */
  onChange?: (previous: T | null, next: T) => void
}

type LiveRoom<T> = {
  /** `null` hasta que llega la primera vez. */
  room: T | null
  error: unknown
  /** Vuelve a pedirla (el «Reintentar»). */
  load: () => Promise<void>
  /** Pone la sala que devuelve una acción (contestar, mover, empezar) sin esperar a la vuelta. */
  take: (next: T) => void
  /** Diferencia entre el reloj del servidor y el de aquí: las cuentas atrás van con la suya. */
  offset: RefObject<number>
}

/**
 * Una sala que se juega con más gente y que lleva el servidor (Not-games, el
 * ajedrez, las pruebas de grupo del curso de git): se pide al entrar y, con
 * `usePolling`, cada poco mientras no ha acabado; deprisa jugando, despacio
 * esperando. Antes cada sala copiaba esta carga entera.
 *
 * @param fetch Lo que pide la sala. Se vuelve a llamar si cambia `deps`.
 * @param deps  Dependencias, como en `useEffect` (normalmente, el id de la sala).
 */
export function useLiveRoom<T extends Room>(
  fetch: () => Promise<T>,
  deps: DependencyList,
  { playingMs, waitingMs, onChange }: LiveRoomOptions<T>,
): LiveRoom<T> {
  const [room, setRoom] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const offset = useRef(0)
  // El último `onChange`, sin que cambiarlo vuelva a pedir la sala.
  const changed = useRef(onChange)

  changed.current = onChange

  const take = useCallback((next: T) => {
    offset.current = Date.parse(next.now) - Date.now()
    setRoom((previous) => {
      changed.current?.(previous, next)

      return next
    })
    setError(null)
  }, [])

  // `fetch` se recrea en cada pintado; las que mandan son las `deps` de quien llama.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const get = useCallback(fetch, deps)

  const load = useCallback(async () => {
    try {
      take(await get())
    } catch (caught) {
      setError(caught)
    }
  }, [get, take])

  useEffect(() => {
    void load()
  }, [load])

  const status = room?.status

  usePolling(load, status === 'done' ? null : status === 'playing' ? playingMs : waitingMs)

  return { room, error, load, take, offset }
}
