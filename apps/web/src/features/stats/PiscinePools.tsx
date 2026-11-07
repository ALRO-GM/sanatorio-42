import { useState } from 'react'
import type { ReactNode } from 'react'

import type {
  PiscinePoolLine,
  PiscinePoolPart,
  PiscineProgress,
  ProgressLine,
} from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import type { Line } from './PiscineProgressChart'

/**
 * Quién cuenta en las medias de las piscinas y en los más avanzados (pedido
 * por Alberto el 2026-11-07): todos, solo quien sigue o solo quien abandonó.
 */
export type PoolWho = 'all' | 'stayed' | 'left'
const WHO: readonly PoolWho[] = ['all', 'stayed', 'left']

/** La parte de una piscina que cuenta; sin saber quién abandonó, toda. */
const partOf = (pool: PiscinePoolLine, who: PoolWho): PiscinePoolPart =>
  (who === 'all' ? undefined : pool[who]) ?? pool

/** El selector de quién cuenta, si la API sabe quién abandonó. */
export function PoolWhoPicker({
  data,
  value,
  onChange,
}: {
  data: PiscineProgress | undefined
  value: PoolWho
  onChange: (next: PoolWho) => void
}) {
  const { t } = useI18n()

  if (data?.pools?.some((pool) => pool.left !== undefined) !== true) return null

  return (
    <div className="progress-option">
      <span className="eyebrow">{t('piscine.who.title')}</span>
      <PillGroup
        options={WHO}
        value={value}
        onChange={onChange}
        label={t('piscine.who.title')}
        text={(option) => t(`piscine.who.${option}`)}
      />
      <p className="hint">{t('piscine.who.hint')}</p>
    </div>
  )
}

/**
 * El color de cada piscina, por su sitio en la lista (como en la comparación
 * del Abandono, `styles/dropout.css`): no cambia al encender otras.
 */
const poolColor = (index: number): string => `var(--pool-${String((index % 10) + 1)})`

/**
 * La media de todas, por persona: cada piscina pesa lo que su gente. Solo las
 * ya copiadas, y cada día con las que lo han vivido.
 */
function overallLine(
  pools: readonly PiscinePoolLine[],
  length: number,
  who: PoolWho,
): ProgressLine {
  const copied = pools.filter((pool) => pool.copied).map((pool) => partOf(pool, who))

  return Array.from({ length }, (_, index) => {
    let sum = 0
    let people = 0

    for (const pool of copied) {
      const value = pool.line[index]

      if (value === null || value === undefined) continue
      sum += value * pool.people
      people += pool.people
    }

    return people === 0 ? null : Math.round((sum / people) * 10) / 10
  })
}

/**
 * Comparar piscinas en el Avance (pedido por Alberto el 2026-11-07,
 * `docs/piscineros.md`): solo en la vista sin límites del dueño, la media de
 * cada una de las últimas 10 piscinas del campus y la de todas juntas.
 * Devuelve las líneas de más para la gráfica y sus opciones para el panel;
 * `null` si la API no trae las piscinas (cualquier otra vista).
 */
export function usePoolLines(
  data: PiscineProgress | undefined,
  who: PoolWho = 'all',
): { lines: Line[]; options: ReactNode } | null {
  const { t, tn } = useI18n()
  const [chosen, setChosen] = useState<string[]>([])
  const [overall, setOverall] = useState(true)

  if (data?.pools === undefined || data.pools.length === 0) return null

  const pools = data.pools
  const total = pools
    .filter((pool) => pool.copied)
    .reduce((sum, pool) => sum + partOf(pool, who).people, 0)
  const lines: Line[] = [
    ...pools.flatMap((pool, index): Line[] =>
      chosen.includes(pool.start)
        ? [
            {
              key: `pool-${pool.start}`,
              line: partOf(pool, who).line,
              stroke: poolColor(index),
              width: 1.75,
              label: t('piscine.pools.name', { start: pool.start }),
            },
          ]
        : [],
    ),
    ...(overall && total > 0
      ? [
          {
            key: 'pools-overall',
            line: overallLine(pools, data.days.length, who),
            stroke: 'var(--text)',
            width: 3,
            dash: '8 4',
            label: t('piscine.pools.overall'),
          },
        ]
      : []),
  ]
  const options = (
    <fieldset className="progress-option">
      <legend className="eyebrow">{t('piscine.pools.title')}</legend>
      <label className="progress-toggle">
        <input
          type="checkbox"
          checked={overall}
          onChange={(event) => {
            setOverall(event.target.checked)
          }}
        />{' '}
        {t('piscine.pools.overall')} · {tn('piscine.chart.people', total)}
      </label>
      {pools.map((pool, index) => (
        <label key={pool.start} className="progress-toggle">
          <input
            type="checkbox"
            checked={chosen.includes(pool.start)}
            onChange={(event) => {
              setChosen(
                event.target.checked
                  ? [...chosen, pool.start]
                  : chosen.filter((start) => start !== pool.start),
              )
            }}
          />{' '}
          <i className="progress-chip-dot" style={{ background: poolColor(index) }} />
          {t('piscine.pools.name', { start: pool.start })} ·{' '}
          {tn('piscine.chart.people', partOf(pool, who).people)}
          {!pool.copied && ` · ${t('piscine.pools.copying')}`}
        </label>
      ))}
      <p className="hint">{t('piscine.pools.hint')}</p>
    </fieldset>
  )

  return { lines, options }
}
