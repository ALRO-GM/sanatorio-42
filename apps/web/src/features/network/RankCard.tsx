import { useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'

export type Order = 'asc' | 'desc'

type RankCardProps = {
  /** Nombre corto y estable: con él se recuerda si la tarjeta está plegada. */
  id: string
  title: string
  /** Sentido en que está ordenada la lista. Lo lleva quien la usa. */
  order: Order
  onOrder: (order: Order) => void
  /** Cuántas filas hay, para decirlo junto al título. `null` si aún no se sabe. */
  count: number | null
  /** Controles propios de la lista (un deslizador), encima de ella. */
  controls?: ReactNode
  /** Nota al pie, debajo de la lista. */
  footer?: ReactNode
  /** Las filas: elementos `<li>`. La tarjeta pone la lista y el desplazamiento. */
  children: ReactNode
}

const STORAGE_PREFIX = 'sanatorio_net_fold_'

/**
 * Una lista ordenada del panel de la red (más endogamia, parejas, estrictos,
 * proyectos). Las cuatro se comportan igual:
 *
 *  - se pliegan con la flecha, y se quedan como se dejaron;
 *  - se ordenan de mayor a menor o al revés con el botón de al lado;
 *  - enseñan todas sus filas dentro de una caja con barra de desplazamiento, en
 *    vez de cortar por las diez primeras.
 */
export function RankCard({
  id,
  title,
  order,
  onOrder,
  count,
  controls,
  footer,
  children,
}: RankCardProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_PREFIX + id) !== '0')

  const toggle = (): void => {
    setOpen((current) => {
      localStorage.setItem(STORAGE_PREFIX + id, current ? '0' : '1')

      return !current
    })
  }

  return (
    <article className={`card net-panel rank-card ${open ? 'open' : ''}`}>
      <div className="rank-head">
        <button
          type="button"
          className="rank-title"
          aria-expanded={open}
          aria-controls={`rank-${id}`}
          onClick={toggle}
        >
          <span className="rank-arrow" aria-hidden="true">
            ▾
          </span>
          <span className="eyebrow">{title}</span>
          {count !== null && <span className="rank-count">{count}</span>}
        </button>
        {open && (
          <button
            type="button"
            className="rank-order"
            aria-label={t(order === 'desc' ? 'net.sort.toAsc' : 'net.sort.toDesc')}
            title={t(order === 'desc' ? 'net.sort.toAsc' : 'net.sort.toDesc')}
            onClick={() => {
              onOrder(order === 'desc' ? 'asc' : 'desc')
            }}
          >
            {t(order === 'desc' ? 'net.sort.desc' : 'net.sort.asc')}
          </button>
        )}
      </div>
      {open && (
        <div id={`rank-${id}`} className="rank-body">
          {controls}
          <ol className="net-rows rank-list">{children}</ol>
          {footer}
        </div>
      )}
    </article>
  )
}

/** Ordena una copia de `items` por `value`, en el sentido pedido. */
export function ranked<T>(items: readonly T[], value: (item: T) => number, order: Order): T[] {
  return [...items].sort((a, b) => (order === 'desc' ? value(b) - value(a) : value(a) - value(b)))
}
