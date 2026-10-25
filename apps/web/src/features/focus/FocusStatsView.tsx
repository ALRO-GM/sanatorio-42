import type { FocusFigures, FocusStats } from '@sanatorio/contracts'

import type { FocusStatsQuery } from '../../shared/api/types'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { durationText } from '../../shared/time'
import { StepPicker } from '../../shared/ui/StepPicker'

/** Los periodos que se pueden mirar (#80 del buzón): hoy, semana, mes y total. */
export const PERIODS = ['day', 'week', 'month', 'total'] as const

export type FocusPeriod = (typeof PERIODS)[number]

/** Días que cubre cada periodo, contando hoy; el total no tiene principio. */
const SPAN: Record<FocusPeriod, number | null> = { day: 1, week: 7, month: 30, total: null }
const DAY_MS = 86_400_000
const W = 640
const H = 150
const PAD = 22

/**
 * Lo que se pide a la API para un periodo, en los días de quien mira: la API
 * los corta con `offset` (los minutos que esta zona va por delante de UTC).
 */
export function periodQuery(
  period: FocusPeriod,
  segment: { low: number; high: number },
  at = Date.now(),
): FocusStatsQuery {
  const offset = -new Date(at).getTimezoneOffset()
  const local = (ms: number): string => new Date(ms + offset * 60_000).toISOString().slice(0, 10)
  const span = SPAN[period]

  return {
    to: local(at),
    offset,
    low: segment.low,
    high: segment.high,
    ...(span === null ? {} : { from: local(at - (span - 1) * DAY_MS) }),
  }
}

/** El selector de periodo: hoy, la semana, el mes o todo (`StepPicker`, el de toda la web). */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: FocusPeriod
  onChange: (next: FocusPeriod) => void
}) {
  const { t } = useI18n()

  return (
    <StepPicker
      options={PERIODS}
      value={value}
      onChange={onChange}
      label={t('focus.stats.period')}
      text={(option) => t(`focus.period.${option}`)}
    />
  )
}

const FIGURES = ['sessions', 'focusedSeconds', 'completed', 'cancelled', 'stayed'] as const

/**
 * Las cifras del periodo, una por tarjeta. Con `band`, debajo de cada una la
 * media por persona del tramo elegido, para compararse.
 *
 * @param who `me` si son las tuyas (los textos te hablan a ti), `all` en el panel.
 */
export function FocusFigureCards({
  figures,
  band,
  who,
  people,
}: {
  figures: FocusFigures
  band?: FocusFigures
  who: 'me' | 'all'
  people?: number
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const show = (key: (typeof FIGURES)[number], value: number): string =>
    key === 'focusedSeconds' ? durationText(value) : number(value)

  return (
    <div className="stat-cards">
      {FIGURES.map((key) => (
        <div key={key} className={`stat-card ${key === 'focusedSeconds' ? 'strong' : ''}`}>
          <span className="eyebrow">
            {t(key === 'stayed' && who === 'all' ? 'focus.stats.stayedAll' : `focus.stats.${key}`)}
          </span>
          <strong>{show(key, figures[key])}</strong>
          {band !== undefined && (
            <small className="focus-band-value">
              {t('focus.stats.band', { value: show(key, band[key]) })}
            </small>
          )}
        </div>
      ))}
      {people !== undefined && (
        <div className="stat-card">
          <span className="eyebrow">{t('focus.stats.people')}</span>
          <strong>{number(people)}</strong>
        </div>
      )}
    </div>
  )
}

/** Todos los días entre el primero y el último, aunque en alguno no hubiera nada. */
function everyDay(stats: FocusStats): { day: string; seconds: number }[] {
  const first = stats.from ?? stats.days[0]?.day ?? stats.to
  const seconds = new Map(stats.days.map((one) => [one.day, one.focusedSeconds]))
  const out: { day: string; seconds: number }[] = []

  for (let at = Date.parse(`${first}T00:00:00Z`); at <= Date.parse(`${stats.to}T00:00:00Z`);) {
    const day = new Date(at).toISOString().slice(0, 10)

    out.push({ day, seconds: seconds.get(day) ?? 0 })
    at += DAY_MS
  }

  return out
}

/**
 * Las gráficas del periodo: el tiempo concentrado de cada día, el de cada
 * hora (con las sesiones que empezaron en ella) y los motivos para querer
 * parar, tanto de quien paró como de quien siguió.
 */
export function FocusCharts({ stats }: { stats: FocusStats }) {
  const { t } = useI18n()
  const days = everyDay(stats)
  const topDay = Math.max(1, ...days.map((one) => one.seconds))
  const topHour = Math.max(1, ...stats.hours.map((hour) => hour.focusedSeconds))
  const step = (W - PAD * 2) / Math.max(1, days.length)

  if (stats.totals.sessions === 0) return <p className="estado">{t('focus.stats.empty')}</p>

  return (
    <>
      <span className="eyebrow">{t('focus.stats.byDay')}</span>
      <figure className="growth-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('focus.stats.byDay')}>
          <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="growth-axis" />
          {days.map((one, at) => {
            const height = (one.seconds / topDay) * (H - PAD * 2)

            return (
              <rect
                key={one.day}
                className="focus-day-bar"
                x={PAD + at * step + step * 0.1}
                y={H - PAD - height}
                width={Math.max(1, step * 0.8)}
                height={height}
              >
                <title>{`${one.day} · ${durationText(one.seconds)}`}</title>
              </rect>
            )
          })}
          <text x={PAD} y={H - 6} className="growth-tick">
            {days[0]?.day}
          </text>
          <text x={W - PAD} y={H - 6} textAnchor="end" className="growth-tick">
            {days.at(-1)?.day}
          </text>
        </svg>
      </figure>

      <span className="eyebrow">{t('focus.stats.byHour')}</span>
      <div className="stat-hours" role="img" aria-label={t('focus.stats.byHour')}>
        {stats.hours.map((hour) => (
          <div
            key={hour.hour}
            className="stat-hour"
            title={`${String(hour.hour).padStart(2, '0')}:00 · ${durationText(hour.focusedSeconds)} · ${hour.sessions}`}
          >
            <span className="stat-bar">
              <i className="seen" style={{ height: `${(hour.focusedSeconds / topHour) * 100}%` }} />
            </span>
            <small>{hour.hour % 3 === 0 ? String(hour.hour).padStart(2, '0') : ''}</small>
          </div>
        ))}
      </div>

      <span className="eyebrow">{t('focus.stats.reasons')}</span>
      <div className="table-scroll">
        <table className="stat-table">
          <thead>
            <tr>
              <th scope="col">{t('focus.stats.reason')}</th>
              <th scope="col">{t('focus.stats.reasonStopped')}</th>
              <th scope="col">{t('focus.stats.reasonStayed')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.reasons.map((row) => (
              <tr key={row.reason}>
                <th scope="row">{t(`focus.reason.${row.reason}`)}</th>
                <td>{row.cancelled}</td>
                <td>{row.stayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
