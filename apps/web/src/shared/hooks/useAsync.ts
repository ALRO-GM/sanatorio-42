import { useCallback, useEffect, useRef, useState } from 'react'
import type { DependencyList, Dispatch, SetStateAction } from 'react'

export type AsyncState<T> = {
  /** `undefined` hasta que llega la primera respuesta. */
  data: T | undefined
  error: unknown
  /** `true` solo durante la primera carga. */
  loading: boolean
  reload: () => Promise<void>
  setData: Dispatch<SetStateAction<T | undefined>>
}

/**
 * Carga de datos con sus tres estados: cargando, error y datos.
 *
 * Mientras se recarga se siguen enseñando los datos anteriores (`loading` solo
 * es `true` la primera vez): una lista que parpadea cada vez que se refresca
 * cansa más que una que tarda un segundo en ponerse al día.
 *
 * @param fn   Función que devuelve la promesa. Se vuelve a llamar si cambia `deps`.
 * @param deps Dependencias, como en `useEffect`.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  // Solo cuenta la última petición lanzada: si se cambia de proyecto mientras
  // llega la anterior, su respuesta se descarta en vez de pisar la nueva.
  const turn = useRef(0)

  // `fn` se recrea en cada render; las que mandan son las `deps` de quien llama.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const mine = ++turn.current
    setError(null)

    try {
      const result = await load()
      if (mine === turn.current) setData(result)
    } catch (err) {
      if (mine === turn.current) setError(err)
    } finally {
      if (mine === turn.current) setLoading(false)
    }
  }, [load])

  useEffect(() => {
    setLoading(true)
    setData(undefined)
    void reload()

    return () => {
      turn.current += 1
    }
  }, [reload])

  return { data, error, loading, reload, setData }
}

/**
 * Una acción (unirse, fichar, responder) con su estado de "en curso" y su error.
 *
 * Devuelve `run(fn)`, que ejecuta `fn`, guarda el error si falla y devuelve
 * `true` si ha ido bien.
 */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    setError(null)

    try {
      await fn()

      return true
    } catch (err) {
      setError(err)

      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { busy, error, run, clearError }
}
