import { Fragment, useMemo, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

import type { SeatHeat, SeatHeatCell, SeatHeatCluster } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import type { Translate, TranslateCount } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import type { Column } from '../../shared/ui/DataTable'
import { clusterName } from '../../shared/seats'

/** Paradas de la escala (`--heat-0` … `--heat-4` en `network.css`). */
const STOPS = 5

/** De las horas más bajas a las más altas que se han usado: la escala de colores. */
type Scale = { min: number; max: number }

/** Lo menos y lo más usado de todos los clústeres, sin contar los puestos a 0. */
function scaleOf(clusters: readonly SeatHeatCluster[]): Scale {
  const used = clusters.flatMap((cluster) =>
    cluster.cells.filter((cell) => cell.hours > 0).map((cell) => cell.hours),
  )

  return used.length === 0 ? { min: 0, max: 0 } : { min: Math.min(...used), max: Math.max(...used) }
}

/**
 * El color de un puesto usado: entre qué dos paradas de la escala cae y cuánto
 * de la segunda lleva. Si todos tienen las mismas horas, van al rojo.
 */
function heatStyle(hours: number, { min, max }: Scale): CSSProperties {
  const share = max === min ? 1 : (hours - min) / (max - min)
  const at = Math.min(Math.max(share, 0), 1) * (STOPS - 1)
  const from = Math.min(Math.floor(at), STOPS - 2)

  return {
    '--from': `var(--heat-${String(from)})`,
    '--to': `var(--heat-${String(from + 1)})`,
    '--mix': `${String(Math.round((at - from) * 100))}%`,
  } as CSSProperties
}

const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index + 1)

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

type Row = SeatHeatCell & { cluster: string }

/**
 * El mapa de calor de los puestos (`docs/asientos.md`): cuántas horas se ha
 * usado cada ordenador. Todos los clústeres a la vez, en miniatura y uno al
 * lado de otro, cada uno como una cuadrícula sin más (la fila 1 arriba y el
 * puesto 1 a la izquierda), con sus cuentas debajo. No imita el plano del
 * mapa de clústeres: así se ve de un vistazo qué clúster y qué puestos se usan.
 */
export function SeatHeatMap({ heat }: { heat: SeatHeat }) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const scale = useMemo(() => scaleOf(heat.clusters), [heat.clusters])
  // La tabla: el más usado primero; al ordenar por horas al revés, los menos usados.
  const ranked = useMemo(
    () =>
      heat.clusters
        .flatMap((cluster) => cluster.cells.map((cell): Row => ({ ...cell, cluster: cluster.id })))
        .sort((a, b) => b.hours - a.hours || a.host.localeCompare(b.host, 'en', { numeric: true })),
    [heat.clusters],
  )

  if (heat.clusters.length === 0) {
    return <p className="estado">{t('seats.heat.empty')}</p>
  }

  const label = (cell: SeatHeatCell): string => cellText(cell, { t, tn }, number)
  const table: Column<Row>[] = [
    {
      id: 'cluster',
      label: t('seats.heat.col.cluster'),
      cell: (row) => clusterName(row.cluster, t),
      sort: (row) => row.cluster,
      first: 'asc',
    },
    { id: 'seat', label: t('seats.heat.col.seat'), cell: (row) => row.host },
    {
      id: 'hours',
      label: t('seats.heat.col.hours'),
      cell: (row) => number(row.hours),
      sort: (row) => row.hours,
    },
    {
      id: 'people',
      label: t('seats.heat.col.people'),
      cell: (row) => number(row.people),
      sort: (row) => row.people,
    },
  ]
  const hover = {
    show: (cell: SeatHeatCell) => (event: { currentTarget: Element }) => {
      setHovered({ cell, anchor: event.currentTarget })
    },
    hide: (): void => {
      setHovered(null)
    },
  }

  return (
    <div className="seat-heat">
      <div className="heat-clusters">
        {heat.clusters.map((cluster) => (
          <HeatCluster
            key={cluster.id}
            cluster={cluster}
            scale={scale}
            label={label}
            hover={hover}
          />
        ))}
      </div>

      {hovered !== null && <HeatTip text={label(hovered.cell)} anchor={hovered.anchor} />}

      <div className="heat-legend">
        <span className="heat-legend-item">
          <span className="heat-cell free" aria-hidden="true" />
          {t('seats.heat.unused')}
        </span>
        {scale.max > 0 && (
          <span className="heat-legend-item">
            {t('seats.heat.hours', { n: number(scale.min) })}
            <span className="heat-ramp" aria-hidden="true" />
            {t('seats.heat.hours', { n: number(scale.max) })}
          </span>
        )}
      </div>

      <details className="heat-table">
        <summary>{t('seats.heat.table')}</summary>
        <p className="hint">{tn('seats.heat.summary', heat.days)}</p>
        <DataTable id="seat-heat" rows={ranked} columns={table} rowKey={(row) => row.host} />
      </details>
    </div>
  )
}

type Hover = {
  show: (cell: SeatHeatCell) => (event: { currentTarget: Element }) => void
  hide: () => void
}

/** Las flechas mueven el foco por la cuadrícula: así cada clúster es una sola parada del tabulador. */
const STEPS: Record<string, [row: number, seat: number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/** Un clúster en miniatura: números de puesto arriba, de fila a la izquierda y sus cuentas debajo. */
function HeatCluster({
  cluster,
  scale,
  label,
  hover,
}: {
  cluster: SeatHeatCluster
  scale: Scale
  label: (cell: SeatHeatCell) => string
  hover: Hover
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const [focus, setFocus] = useState<string | null>(null)
  const byPosition = new Map(cluster.cells.map((cell) => [`${cell.row}:${cell.seat}`, cell]))
  const used = cluster.cells.filter((cell) => cell.hours > 0).length
  const name = clusterName(cluster.id, t)
  // El que recibe el tabulador: el último enfocado o, de entrada, el primero.
  const current = focus ?? cluster.cells[0]?.host

  const move = (cell: SeatHeatCell) => (event: KeyboardEvent<HTMLElement>) => {
    const step = STEPS[event.key]

    if (step === undefined) return

    const next = byPosition.get(`${cell.row + step[0]}:${cell.seat + step[1]}`)

    event.preventDefault()
    if (next === undefined) return
    setFocus(next.host)
    event.currentTarget.parentElement
      ?.querySelector<HTMLElement>(`[data-host="${next.host}"]`)
      ?.focus()
  }

  return (
    <figure className="heat-cluster">
      <figcaption>{name}</figcaption>
      <div className="heat-scroll">
        <div
          className="heat-grid"
          style={{
            gridTemplateColumns: `auto repeat(${String(cluster.seatsPerRow)}, var(--cell))`,
          }}
          role="group"
          aria-label={t('seats.heat.label', { cluster: name })}
        >
          <span aria-hidden="true" />
          {range(cluster.seatsPerRow).map((seat) => (
            <span key={seat} className="heat-axis" aria-hidden="true">
              {seat}
            </span>
          ))}
          {range(cluster.rows).map((row) => (
            <Fragment key={row}>
              <span className="heat-axis heat-row" aria-hidden="true">
                {row}
              </span>
              {range(cluster.seatsPerRow).map((seat) => {
                const cell = byPosition.get(`${row}:${seat}`)

                if (cell === undefined) {
                  return <span key={seat} aria-hidden="true" />
                }

                const isUsed = cell.hours > 0

                return (
                  <span
                    key={seat}
                    className={`heat-cell ${isUsed ? 'used' : 'free'}`}
                    style={isUsed ? heatStyle(cell.hours, scale) : undefined}
                    role="img"
                    tabIndex={cell.host === current ? 0 : -1}
                    aria-label={label(cell)}
                    data-host={cell.host}
                    data-hours={cell.hours}
                    onMouseEnter={hover.show(cell)}
                    onMouseLeave={hover.hide}
                    onFocus={(event) => {
                      setFocus(cell.host)
                      hover.show(cell)(event)
                    }}
                    onBlur={hover.hide}
                    onKeyDown={move(cell)}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <ul className="heat-stats">
        <li>{t('seats.heat.cluster.hours', { n: number(cluster.hours) })}</li>
        <li>
          {t('seats.heat.cluster.used', {
            used: number(used),
            total: number(cluster.cells.length),
          })}
        </li>
        <li>{t('seats.heat.cluster.people', { n: number(cluster.people) })}</li>
      </ul>
    </figure>
  )
}

/** La ficha de un puesto al pasar o enfocar: fija en la ventana, para que nada la recorte. */
function HeatTip({ text, anchor }: { text: string; anchor: Element }) {
  const rect = anchor.getBoundingClientRect()
  const center = rect.left + rect.width / 2
  const left = Math.min(Math.max(center, 110), window.innerWidth - 110)

  return (
    <div className="heat-tip" style={{ left, top: rect.top - 6 }} role="tooltip" aria-hidden="true">
      {text}
    </div>
  )
}
