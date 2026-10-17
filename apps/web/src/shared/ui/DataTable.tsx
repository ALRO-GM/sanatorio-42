import { useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { pressColumn, sortRows } from '../table-sort'
import type { SortKey, SortValue } from '../table-sort'

export type Column<T> = {
  id: string
  label: ReactNode
  /** Lo que se pinta en la celda. */
  cell: (row: T) => ReactNode
  /** El valor por el que se ordena. Sin él, la columna no se ordena. */
  sort?: (row: T) => SortValue
  /** Sentido al pulsarla por primera vez. Por defecto, de mayor a menor. */
  first?: 'asc' | 'desc'
}

type DataTableProps<T> = {
  /** Nombre de la tabla: con él se recuerda su orden en este navegador. */
  id: string
  rows: readonly T[]
  columns: readonly Column<T>[]
  rowKey: (row: T) => string
  /** Clase de una fila (`picked` para la elegida). */
  rowClass?: (row: T) => string
  /** Cuántas filas enseñar como mucho, después de ordenar. */
  limit?: number
  className?: string
}

const STORAGE = 'sanatorio_table_sort'

function storedOrder(id: string): SortKey[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Record<string, SortKey[]>

    return Array.isArray(all[id]) ? all[id] : []
  } catch {
    return []
  }
}

function storeOrder(id: string, order: readonly SortKey[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Record<string, SortKey[]>

    localStorage.setItem(STORAGE, JSON.stringify({ ...all, [id]: order }))
  } catch {
    // Sin almacenamiento, el orden dura lo que la página.
  }
}

/**
 * Una tabla de datos: la cabecera se queda fija al bajar y cada columna se
 * puede ordenar. El último clic manda y los anteriores deciden los empates
 * (`shared/table-sort.ts`); cada cabecera ordenada lleva su flecha y su número
 * de prioridad. La primera columna es el nombre de la fila (`<th>`).
 */
export function DataTable<T>({
  id,
  rows,
  columns,
  rowKey,
  rowClass,
  limit,
  className = 'stat-table',
}: DataTableProps<T>) {
  const { t } = useI18n()
  const [order, setOrder] = useState<SortKey[]>(() =>
    storedOrder(id).filter((key) => columns.some((column) => column.id === key.id)),
  )
  const byId = new Map(columns.map((column) => [column.id, column]))
  const sorted = sortRows(rows, order, (row, column) => byId.get(column)?.sort?.(row))
  const shown = limit === undefined ? sorted : sorted.slice(0, limit)

  const choose = (next: SortKey[]): void => {
    setOrder(next)
    storeOrder(id, next)
  }

  return (
    <>
      {order.length > 0 && (
        <p className="data-table-order">
          {t('table.sortedBy', {
            columns: order
              .map((key) => {
                const label = byId.get(key.id)?.label

                return `${typeof label === 'string' ? label : key.id} ${key.dir === 'asc' ? '↑' : '↓'}`
              })
              .join(' · '),
          })}{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              choose([])
            }}
          >
            {t('table.unsort')}
          </button>
        </p>
      )}
      <div className="table-scroll data-table-scroll">
        <table className={`${className} data-table`}>
          <thead>
            <tr>
              {columns.map((column) => {
                const place = order.findIndex((key) => key.id === column.id)
                const key = order[place]

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      place !== 0 || key === undefined
                        ? undefined
                        : key.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                    }
                  >
                    {column.sort === undefined ? (
                      column.label
                    ) : (
                      <button
                        type="button"
                        className="sort-head"
                        title={t('table.sortHint')}
                        onClick={() => {
                          choose(pressColumn(order, column.id, column.first ?? 'desc'))
                        }}
                      >
                        {column.label}
                        {key !== undefined && (
                          <span className="sort-mark">
                            {key.dir === 'asc' ? '↑' : '↓'}
                            {order.length > 1 && <sup>{place + 1}</sup>}
                          </span>
                        )}
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={rowKey(row)} className={rowClass?.(row)}>
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th key={column.id} scope="row">
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td key={column.id}>{column.cell(row)}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
