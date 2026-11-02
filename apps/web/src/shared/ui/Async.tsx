import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { AsyncState } from '../hooks/useAsync'
import { useI18n } from '../i18n'
import { ErrorNote } from './ErrorNote'

type AsyncProps<T> = {
  /** Lo que devuelve `useAsync`. */
  state: Pick<AsyncState<T>, 'data' | 'error' | 'loading' | 'reload'>
  /** Lo que se pinta con los datos ya llegados. */
  children: (data: T) => ReactNode
  /** Si los datos no traen nada que enseñar (una lista vacía). */
  empty?: (data: T) => boolean
  /** Qué se dice entonces. */
  emptyText?: string
  /** Qué se dice mientras llega lo primero; por defecto, «Cargando…». */
  loadingText?: string
}

/**
 * Los tres estados de algo que se pide a la API, siempre iguales: cargando,
 * error con su botón de reintentar, y vacío. Antes cada pantalla los escribía
 * a mano con su propio envoltorio, y en algunas el error no se enseñaba: la
 * sección salía en blanco sin decir por qué.
 *
 * Mientras se recarga se siguen viendo los datos de antes (como en `useAsync`).
 */
export function Async<T>({ state, children, empty, emptyText, loadingText }: AsyncProps<T>) {
  const { t } = useI18n()
  const { data, error, loading } = state

  if (data === undefined) {
    return loading ? (
      <Waiting text={loadingText ?? t('app.loading')} />
    ) : (
      <ErrorNote error={error} retry />
    )
  }

  if (empty?.(data) === true && emptyText !== undefined) {
    return <p className="estado">{emptyText}</p>
  }

  return <>{children(data)}</>
}

/** A partir de cuándo se dice que sigue en marcha, y que ya casi está. */
const SLOW_MS = 2_500
const ALMOST_MS = 8_000

/**
 * «Cargando…» y, si tarda, una segunda línea que cambia: así no parece que la
 * web se ha quedado colgada (pedido por Alberto, 2026-11-02).
 */
function Waiting({ text }: { text: string }) {
  const { t } = useI18n()
  const [more, setMore] = useState<string | null>(null)

  useEffect(() => {
    const slow = window.setTimeout(() => {
      setMore('app.loadingSlow')
    }, SLOW_MS)
    const almost = window.setTimeout(() => {
      setMore('app.loadingAlmost')
    }, ALMOST_MS)

    return () => {
      window.clearTimeout(slow)
      window.clearTimeout(almost)
    }
  }, [])

  return (
    <p className="estado">
      {text}
      {more !== null && (
        <>
          <br />
          <small>{t(more)}</small>
        </>
      )}
    </p>
  )
}
