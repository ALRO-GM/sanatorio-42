import { useState } from 'react'
import type { ReactNode } from 'react'

import type { PiscineProgress } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { RangeSlider, Slider } from '../../shared/ui/RangeSlider'
import { RankingList } from '../../shared/ui/RankingList'
import type { Line } from './PiscineProgressChart'
import { bestOf, between, meanOf, rankPool } from './piscineTop'
import type { Ranked } from './piscineTop'

/** Cuántos se ven de entrada en la lista de los más avanzados; el resto, al pedirlo. */
const FIRST = 15

/**
 * Lo de la vista sin límites del dueño en el Avance de la piscina
 * (`docs/piscineros.md`): la media de los mejores X % y, con el deslizador
 * doble, la línea de cada piscinero entre dos percentiles. Devuelve las
 * líneas de más para la gráfica y sus opciones para el panel; `null` si la API
 * no trae a toda la piscina (cualquier otra vista).
 */
export function useTopLines(
  data: PiscineProgress | undefined,
): { ranked: Ranked[]; lines: Line[]; options: ReactNode } | null {
  const { t, tn } = useI18n()
  const [best, setBest] = useState({ on: true, percent: 10 })
  const [band, setBand] = useState({ on: false, low: 75, high: 90 })

  if (data?.everyone === undefined) return null

  const ranked = rankPool(data.everyone)
  const leaders = bestOf(ranked, best.percent)
  const inBand = between(ranked, band.low, band.high)
  const lines: Line[] = [
    // Cada cual entre los dos percentiles, fino y por debajo de las medias.
    ...(band.on
      ? inBand.map((each): Line => ({
          key: `band-${each.login}`,
          line: each.line,
          stroke: 'var(--text-3)',
          width: 1,
          opacity: 0.55,
          label: t('piscine.top.lineOne', { login: each.login, p: each.percentile }),
        }))
      : []),
    ...(best.on && leaders.length > 0
      ? [
          {
            key: 'best',
            line: meanOf(
              leaders.map((each) => each.line),
              data.days.length,
            ),
            stroke: 'var(--gold)',
            width: 2.5,
            dash: '6 3',
            label: t('piscine.top.bestLine', { p: best.percent, n: leaders.length }),
          },
        ]
      : []),
  ]
  const options = (
    <>
      <div className="progress-option">
        <span className="eyebrow">{t('piscine.top.title')}</span>
        <label className="progress-toggle">
          <input
            type="checkbox"
            checked={best.on}
            onChange={(event) => {
              setBest({ ...best, on: event.target.checked })
            }}
          />{' '}
          {t('piscine.top.best', { p: best.percent })} ·{' '}
          {tn('piscine.chart.people', leaders.length)}
        </label>
        <Slider
          min={1}
          max={100}
          value={best.percent}
          format={(value) => `${String(value)} %`}
          label={t('piscine.top.bestLabel')}
          disabled={!best.on}
          onChange={(percent) => {
            setBest({ ...best, percent })
          }}
        />
      </div>
      <div className="progress-option">
        <label className="progress-toggle">
          <input
            type="checkbox"
            checked={band.on}
            onChange={(event) => {
              setBand({ ...band, on: event.target.checked })
            }}
          />{' '}
          {t('piscine.top.between', { low: band.low, high: band.high })} ·{' '}
          {tn('piscine.chart.people', inBand.length)}
        </label>
        <RangeSlider
          max={100}
          low={band.low}
          high={band.high}
          format={(value) => `P${String(value)}`}
          lowLabel={t('piscine.top.betweenLow')}
          highLabel={t('piscine.top.betweenHigh')}
          disabled={!band.on}
          onChange={(low, high) => {
            setBand({ ...band, low, high })
          }}
        />
        <p className="hint">{t('piscine.top.betweenHint')}</p>
      </div>
    </>
  )

  return { ranked, lines, options }
}

/** Los piscineros más avanzados de la piscina, con su foto, lo aprobado y su percentil. */
export function PiscineTop({ ranked, total }: { ranked: readonly Ranked[]; total: number }) {
  const { t } = useI18n()
  const [all, setAll] = useState(false)
  const rows = all ? ranked : ranked.slice(0, FIRST)

  return (
    <article className="card piscine-top" aria-labelledby="piscine-top">
      <h3 id="piscine-top">{t('piscine.top.listTitle')}</h3>
      {ranked.length === 0 ? (
        <p className="estado">{t('piscine.top.nobody')}</p>
      ) : (
        <>
          <RankingList
            rows={rows}
            me=""
            label={t('piscine.top.listTitle')}
            value={(row) => (
              <span className="row-count piscine-top-value">
                <strong>{t('piscine.top.done', { n: row.done, total })}</strong>
                <small>
                  P{row.percentile}
                  {row.lastDay !== null && ` · ${t('piscine.top.lastDay', { n: row.lastDay + 1 })}`}
                </small>
              </span>
            )}
          />
          {ranked.length > FIRST && (
            <button
              type="button"
              className="pill"
              onClick={() => {
                setAll(!all)
              }}
            >
              {all ? t('piscine.top.less') : t('piscine.top.more', { n: ranked.length })}
            </button>
          )}
        </>
      )}
    </article>
  )
}
