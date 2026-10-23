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
  const { data, error, loading, reload } = state

  if (data === undefined) {
    return loading ? (
      <p className="estado">{loadingText ?? t('app.loading')}</p>
    ) : (
      <ErrorNote error={error} onRetry={() => void reload()} />
    )
  }

  if (empty?.(data) === true && emptyText !== undefined) {
    return <p className="estado">{emptyText}</p>
  }

  return <>{children(data)}</>
}
