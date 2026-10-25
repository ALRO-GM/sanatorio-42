import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

import type { SeatHeat, SeatHeatCell, SeatHeatCluster } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import type { Translate, TranslateCount } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import type { Column } from '../../shared/ui/DataTable'
import { PillGroup } from '../../shared/ui/PillGroup'
import { clusterName } from '../../shared/seats'
import { loadLook, order, rowsTopDown, screenSide } from './look'

/** Horas de todos los puestos de un clúster. */
const totalOf = (cluster: SeatHeatCluster): number =>
  cluster.cells.reduce((sum, cell) => sum + cell.hours, 0)

/** El clúster más usado: es el que se abre de entrada. */
function busiest(clusters: readonly SeatHeatCluster[]): string | null {
  return [...clusters].sort((a, b) => totalOf(b) - totalOf(a))[0]?.id ?? null
}

/** «c2r3s4 · 37 h · 9 personas»: lo que dice la ficha y lee un lector de pantalla. */
function cellText(
  cell: SeatHeatCell,
  { t, tn }: { t: Translate; tn: TranslateCount },
  number: (n: number) => string,
): string {
  return [
    cell.host,
    t('seats.heat.hours', { n: number(cell.hours) }),
    tn('seats.heat.people', cell.people, { n: number(cell.people) }),
  ].join(' · ')
}

type Hovered = { cell: SeatHeatCell; anchor: Element }

/**
 * El mapa de calor de los puestos (`docs/asientos.md`): cuántas horas se ha
 * usado cada ordenador de un clúster. Es el plano del mapa de clústeres en
 * pequeño y sin caras: la misma cuadrícula, girada como cada cual la tiene
 * puesta en la pestaña Clústeres (`look.ts`), y cada puesto coloreado por sus
 * horas. Solo para mirar: no se pulsa nada.
 */
export function SeatHeatMap({ heat }: { heat: SeatHeat }) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  // Lo que se eligió en el mapa de clústeres: se lee una vez, no se cambia aquí.
  const [look] = useState(loadLook)
  const [chosen, setChosen] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const fallback = useMemo(() => busiest(heat.clusters), [heat.clusters])
  const cluster =
    heat.clusters.find((one) => one.id === chosen) ??
    heat.clusters.find((one) => one.id === fallback)
  // La tabla: el más usado primero; al ordenar por horas al revés, los menos usados.
  const ranked = useMemo(
    () =>
      [...(cluster?.cells ?? [])].sort(
        (a, b) => b.hours - a.hours || a.host.localeCompare(b.host, 'en', { numeric: true }),
      ),
    [cluster],
  )

  if (cluster === undefined) {
    return <p className="estado">{t('seats.heat.empty')}</p>
  }

  const byPosition = new Map(cluster.cells.map((cell) => [`${cell.row}:${cell.seat}`, cell]))
  const rows = rowsTopDown(cluster.rows, look)
  const columns = order(cluster.seatsPerRow, look.flipSeats)
  const label = (cell: SeatHeatCell): string => cellText(cell, { t, tn }, number)
  const table: Column<SeatHeatCell>[] = [
    { id: 'seat', label: t('seats.heat.col.seat'), cell: (cell) => cell.host },
    {
      id: 'hours',
      label: t('seats.heat.col.hours'),
      cell: (cell) => number(cell.hours),
      sort: (cell) => cell.hours,
    },
    {
      id: 'people',
      label: t('seats.heat.col.people'),
      cell: (cell) => number(cell.people),
      sort: (cell) => cell.people,
    },
  ]
  const show = (cell: SeatHeatCell) => (event: { currentTarget: Element }) => {
    setHovered({ cell, anchor: event.currentTarget })
  }
  const hide = (): void => {
    setHovered(null)
  }

  return (
    <div className="cluster-map seat-heat">
      <PillGroup
        options={heat.clusters.map((one) => one.id)}
        value={cluster.id}
        onChange={(id) => {
          setChosen(id)
          setHovered(null)
        }}
        label={t('map.clusters')}
        text={(id) => {
          const entry = heat.clusters.find((one) => one.id === id)

          return (
            <>
              {clusterName(id, t)}
              <span className="pill-count">
                {t('seats.heat.hours', {
                  n: number(Math.round(entry === undefined ? 0 : totalOf(entry))),
                })}
              </span>
            </>
          )
        }}
      />

      <div className="map-scroll">
        <div
          className={`seat-grid heat-grid ${look.flat ? '' : 'staggered'}`}
          style={{ gridTemplateColumns: `auto repeat(${cluster.seatsPerRow}, var(--seat))` }}
          role="group"
          aria-label={t('seats.heat.label', { cluster: clusterName(cluster.id, t) })}
        >
          {rows.map((row) => (
            <div key={row} className="seat-row">
              <span className="row-label" aria-hidden="true">
                {t('map.row', { n: row })}
              </span>
              {columns.map((column) => {
                const cell = byPosition.get(`${row}:${column}`)

                if (cell === undefined) {
                  return <span key={column} className="seat ghost" aria-hidden="true" />
                }

                const used = cell.hours > 0
                // Lo poco no se pierde contra el puesto vacío: empieza en el tono más claro.
                const style = {
                  '--heat': heat.max === 0 ? 0 : cell.hours / heat.max,
                } as CSSProperties

                return (
                  <span
                    key={column}
                    className={`seat heat-cell ${used ? 'used' : 'free'} screen-${screenSide(cell.seat, look)}`}
                    style={used ? style : undefined}
                    role="img"
                    tabIndex={0}
                    aria-label={label(cell)}
                    data-host={cell.host}
                    onMouseEnter={show(cell)}
                    onMouseLeave={hide}
                    onFocus={show(cell)}
                    onBlur={hide}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {hovered !== null && <HeatTip text={label(hovered.cell)} anchor={hovered.anchor} />}

      <div className="heat-legend">
        <span className="heat-legend-item">
          <span className="seat sample heat-cell free" aria-hidden="true" />
          {t('seats.heat.unused')}
        </span>
        <span className="heat-legend-item">
          {t('seats.heat.hours', { n: 0 })}
          <span className="heat-ramp" aria-hidden="true" />
          {t('seats.heat.hours', { n: number(heat.max) })}
        </span>
      </div>

      <details className="heat-table">
        <summary>{t('seats.heat.table')}</summary>
        <p className="hint">
          {tn('seats.heat.summary', heat.days, {
            cluster: clusterName(cluster.id, t),
          })}
        </p>
        <DataTable id="seat-heat" rows={ranked} columns={table} rowKey={(cell) => cell.host} />
      </details>
    </div>
  )
}

/**
 * La ficha de un puesto al pasar o enfocar: fija en la ventana, como la del
 * mapa, para que la caja que se desliza de lado no la recorte.
 */
function HeatTip({ text, anchor }: { text: string; anchor: Element }) {
  const rect = anchor.getBoundingClientRect()
  const center = rect.left + rect.width / 2
  const left = Math.min(Math.max(center, 110), window.innerWidth - 110)

  return (
    <div
      className="seat-hover above heat-tip"
      style={{ left, top: rect.top - 8 }}
      role="tooltip"
      aria-hidden="true"
    >
      {text}
    </div>
  )
}
