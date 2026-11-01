import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

import type { NetworkNode, SeatGroupQuality, SeatWeightsPreview } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { daysOf } from '../../shared/period'
import type { Period } from '../../shared/period'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { colorOf } from './colors'
import { ForceGraph } from './ForceGraph'
import { seatLinks, seatNodes } from './seat-view'
import { DEFAULT_TRIM, trimSeats } from './seat-trim'
import {
  allCells,
  applyWeight,
  cellKey,
  CENTRE,
  COLUMNS,
  facesAway,
  isCentre,
  MAX_WEIGHT,
  reach,
  ROWS,
  rowCells,
  sameGrid,
} from './seat-grid'
import type { Cell, Linking } from './seat-grid'

/** Los periodos que se ofrecen: sin «a mano», que aquí no aporta. */
const PERIOD_OPTIONS = ['1', '3', '6', '12', '24', 'all'] as const satisfies readonly Period[]
const ALL_DAYS = 3650

/** Lo que se compara de cada reparto, y hacia dónde es mejor. */
const METRICS = [
  { key: 'modularity', better: 'up' },
  { key: 'inside', better: 'up' },
  { key: 'grouped', better: 'up' },
  { key: 'largest', better: 'down' },
  { key: 'communities', better: null },
  { key: 'pairs', better: null },
] as const satisfies readonly { key: keyof SeatGroupQuality; better: 'up' | 'down' | null }[]

/** Cifras que son partes (0-1) y se enseñan como porcentaje. */
const SHARES = new Set<keyof SeatGroupQuality>(['inside', 'grouped', 'largest'])

/**
 * Panel de gestión: los pesos de los puestos de la red de asientos
 * (`docs/asientos.md`). Una cuadrícula de tres filas alrededor de la propia
 * persona; se eligen casillas una a una o por filas, se les da un peso, se ve
 * cómo saldría el grafo de tu campus y lo bien que separa en grupos al lado de
 * los pesos en uso, y se guardan (pedido por Alberto, 2026-11-01).
 */
export function SeatWeightsPanel() {
  const { t } = useI18n()
  const { number } = useFormat()
  const { data, error } = useAsync(() => api.getSeatWeights(), [])
  const [inUse, setInUse] = useState<number[][] | null>(null)
  const [grid, setGrid] = useState<number[][] | null>(null)
  const [chosen, setChosen] = useState<readonly Cell[]>([])
  const [linking, setLinking] = useState<Linking>({ partner: true, mirror: true })
  const [value, setValue] = useState('1')
  const [period, setPeriod] = useState<Exclude<Period, 'custom'>>('all')
  const [result, setResult] = useState<SeatWeightsPreview | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const trying = useAction()
  const save = useAction()

  useEffect(() => {
    if (data === undefined) return
    setInUse(data.grid)
    setGrid(data.grid)
  }, [data])

  const touched = useMemo(() => new Set(reach(chosen, linking).map(cellKey)), [chosen, linking])
  const picked = useMemo(() => new Set(chosen.map(cellKey)), [chosen])
  const toggle = (cells: readonly Cell[]): void => {
    const keys = new Set(cells.map(cellKey))
    const all = cells.every((cell) => picked.has(cellKey(cell)))

    setChosen((current) =>
      all
        ? current.filter((cell) => !keys.has(cellKey(cell)))
        : [...current.filter((cell) => !keys.has(cellKey(cell))), ...cells],
    )
  }
  const change = (next: number[][]): void => {
    setGrid(next)
    setSaved(false)
  }
  const weight = Number(value.replace(',', '.'))
  const valid =
    value.trim() !== '' && Number.isFinite(weight) && weight >= 0 && weight <= MAX_WEIGHT
  const days = daysOf(period) ?? ALL_DAYS

  const shown = useMemo(
    () =>
      result === null
        ? null
        : trimSeats(result.graph.people, result.graph.links, DEFAULT_TRIM, null),
    [result],
  )
  const nodes = useMemo(() => (shown === null ? [] : seatNodes(shown)), [shown])
  const links = useMemo(() => (shown === null ? [] : seatLinks(shown)), [shown])
  const paint = useCallback((node: NetworkNode) => colorOf(node, 'community'), [])
  const tooltip = useCallback((node: NetworkNode) => node.login, [])
  const controls = useMemo(
    () => ({
      zoomIn: t('net.zoomIn'),
      zoomOut: t('net.zoomOut'),
      fit: t('net.fit'),
      shake: t('net.shake'),
      find: t('net.find'),
      none: t('net.findNone'),
      gave: t('net.arrows.gave'),
      got: t('net.arrows.got'),
    }),
    [t],
  )

  const rowName = (row: number): string => t(`admin.seats.row.${String(row)}`)
  const sideOf = (column: number): string => {
    const offset = column - CENTRE

    if (offset === 0) return t('admin.seats.straight')

    return t(offset < 0 ? 'admin.seats.left' : 'admin.seats.right', { n: Math.abs(offset) })
  }
  const show = (metric: keyof SeatGroupQuality, quality: SeatGroupQuality): string =>
    SHARES.has(metric)
      ? `${number(quality[metric] * 100, 0)} %`
      : number(quality[metric], metric === 'modularity' ? 3 : 0)

  if (grid === null || inUse === null) {
    return (
      <article className="card seat-weights">
        <span className="eyebrow">{t('admin.seats.title')}</span>
        <ErrorNote error={error} retry />
      </article>
    )
  }

  return (
    <article className="card seat-weights">
      <span className="eyebrow">{t('admin.seats.title')}</span>
      <p className="hint">{t('admin.seats.intro')}</p>

      <div className="seat-weights-grid" role="group" aria-label={t('admin.seats.title')}>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="seat-weights-row">
            <button
              type="button"
              className="seat-weights-rowname"
              aria-pressed={rowCells(row).every((cell) => picked.has(cellKey(cell)))}
              onClick={() => {
                toggle(rowCells(row))
              }}
            >
              {rowName(row)}
            </button>
            {Array.from({ length: COLUMNS }, (_, column) => {
              const cell = { row, column }
              const key = cellKey(cell)
              const current = grid[row]?.[column] ?? 0

              if (isCentre(cell)) {
                return (
                  <span key={key} className="seat-weights-cell me" title={t('admin.seats.me')}>
                    {t('admin.seats.me')}
                  </span>
                )
              }

              return (
                <button
                  key={key}
                  type="button"
                  className={`seat-weights-cell${picked.has(key) ? ' chosen' : touched.has(key) ? ' linked' : ''}${facesAway(cell) ? ' away' : ''}`}
                  style={{ '--weight': String(current / MAX_WEIGHT) } as CSSProperties}
                  aria-pressed={picked.has(key)}
                  aria-label={t('admin.seats.cell', {
                    row: rowName(row),
                    side: sideOf(column),
                    weight: number(current, 2),
                  })}
                  onClick={() => {
                    toggle([cell])
                  }}
                >
                  <small aria-hidden="true">{facesAway(cell) ? '▼' : '▲'}</small>
                  {current === 0 ? '·' : number(current, 2)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="hint">{t('admin.seats.legend')}</p>

      <div className="seat-weights-tools">
        <label className="duty-check">
          <input
            type="checkbox"
            checked={linking.partner}
            onChange={(event) => {
              setLinking({ ...linking, partner: event.target.checked })
            }}
          />
          {t('admin.seats.partner')}
        </label>
        <label className="duty-check">
          <input
            type="checkbox"
            checked={linking.mirror}
            onChange={(event) => {
              setLinking({ ...linking, mirror: event.target.checked })
            }}
          />
          {t('admin.seats.mirror')}
        </label>
        <button
          type="button"
          onClick={() => {
            setChosen(chosen.length === allCells().length ? [] : allCells())
          }}
        >
          {chosen.length === allCells().length ? t('admin.seats.none') : t('admin.seats.all')}
        </button>
      </div>

      <form
        className="seat-weights-apply"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid || chosen.length === 0) return
          change(applyWeight(grid, reach(chosen, linking), weight))
        }}
      >
        <label>
          {t('admin.seats.weight')}
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_WEIGHT}
            step={0.1}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
            }}
          />
        </label>
        <button type="submit" disabled={!valid || chosen.length === 0}>
          {t('admin.seats.apply', { n: touched.size })}
        </button>
      </form>

      <div className="seat-weights-actions">
        <div className="net-filter">
          <PeriodPicker
            value={period}
            onChange={(next) => {
              if (next !== 'custom') setPeriod(next)
            }}
            options={PERIOD_OPTIONS}
            from=""
            to=""
            onDates={() => undefined}
          />
        </div>
        <button
          type="button"
          className="primary"
          disabled={trying.busy}
          onClick={() => {
            void trying.run(async () => {
              setResult(await api.previewSeatWeights(grid, days))
            })
          }}
        >
          {t('admin.seats.preview')}
        </button>
        <button
          type="button"
          disabled={save.busy || sameGrid(grid, inUse)}
          onClick={() => {
            void save
              .run(async () => {
                const next = await api.saveSeatWeights(grid)

                setInUse(next.grid)
                setGrid(next.grid)
              })
              .then(setSaved)
          }}
        >
          {t('admin.seats.save')}
        </button>
        <button
          type="button"
          disabled={sameGrid(grid, inUse)}
          onClick={() => {
            change(inUse)
          }}
        >
          {t('admin.seats.undo')}
        </button>
        {data !== undefined && (
          <button
            type="button"
            disabled={sameGrid(grid, data.defaults)}
            onClick={() => {
              change(data.defaults)
            }}
          >
            {t('admin.seats.defaults')}
          </button>
        )}
      </div>
      {saved && (
        <p className="estado ok" role="status">
          {t('admin.seats.saved')}
        </p>
      )}
      <ErrorNote error={trying.error ?? save.error} />

      {result !== null && (
        <>
          <table className="seat-weights-compare">
            <caption>{t('admin.seats.compare')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('admin.seats.metric')}</th>
                <th scope="col">{t('admin.seats.inUse')}</th>
                <th scope="col">{t('admin.seats.tried')}</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(({ key, better }) => {
                const before = result.current[key]
                const after = result.proposed[key]
                const verdict =
                  better === null || before === after
                    ? ''
                    : after > before === (better === 'up')
                      ? 'better'
                      : 'worse'

                return (
                  <tr key={key}>
                    <th scope="row">
                      {t(`admin.seats.q.${key}`)}
                      <small className="hint">{t(`admin.seats.qHint.${key}`)}</small>
                    </th>
                    <td>{show(key, result.current)}</td>
                    <td className={verdict}>
                      {show(key, result.proposed)}
                      {verdict !== '' && (
                        <span className="sr-only">{t(`admin.seats.${verdict}`)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {nodes.length === 0 ? (
            <p className="hint">{t('seats.empty')}</p>
          ) : (
            <ForceGraph
              nodes={nodes}
              links={links}
              colorOf={paint}
              selected={selected}
              onSelect={setSelected}
              label={t('admin.seats.graph')}
              tooltip={tooltip}
              controls={controls}
              undirected
            />
          )}
        </>
      )}
    </article>
  )
}
