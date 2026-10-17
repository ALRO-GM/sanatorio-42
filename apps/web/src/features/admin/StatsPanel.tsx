import { useEffect, useState } from 'react'

import type { StatTotals, UsageStats } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { EVERYONE, SegmentSlider } from './SegmentSlider'
import { RangePills } from './RangePills'

const DAY_MS = 24 * 60 * 60_000

/** `YYYY-MM-DD` en UTC: los días de las estadísticas van en UTC. */
const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)

/** "2 h 05 min", "7 min", "40 s". */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`

  const minutes = Math.round(seconds / 60)

  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

/** "2h", "45m", "30s": lo justo para caber encima de una barra. */
function briefTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`

  const hours = seconds / 3600

  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`
}

/** "1,2 MB", "340 kB". */
const size = (bytes: number): string =>
  bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} kB`

/**
 * El uso de cada hora del día, sumando todos los días del periodo, en la hora
 * de quien mira: la API las da en UTC.
 */
export function byLocalHour(hours: UsageStats['hours']): StatTotals[] {
  const day = Array.from({ length: 24 }, () => ({
    clicks: 0,
    seen: 0,
    back: 0,
    hidden: 0,
    requests: 0,
    bytes: 0,
  }))

  for (const row of hours) {
    const local = new Date(`${row.day}T${String(row.hour).padStart(2, '0')}:00:00Z`).getHours()
    const slot = day[local]

    if (slot === undefined) continue

    slot.clicks += row.clicks
    slot.seen += row.seen
    slot.back += row.back
    slot.hidden += row.hidden
    slot.requests += row.requests
    slot.bytes += row.bytes
  }

  return day
}

/**
 * Estadísticas de uso: cuánto tiempo se pasa en la web y en qué, a qué horas,
 * y cuánto tráfico cuesta, de todo el mundo o de una persona.
 *
 * El tiempo va en tres cuentas: viéndola, abierta detrás de otra ventana y con
 * la pestaña oculta. Solo la primera es uso de verdad; las otras dos dicen
 * cuánto se queda la web abierta sin que nadie la mire.
 */
export function StatsPanel() {
  const { t } = useI18n()
  const [days, setDays] = useState<number>(7)
  const [login, setLogin] = useState<string | null>(null)
  const [segment, setSegment] = useState(EVERYONE)
  const { data, error, loading, reload } = useAsync(
    () =>
      api.getStats({
        from: dayOf(Date.now() - (days - 1) * DAY_MS),
        to: dayOf(Date.now()),
        ...(login === null ? { low: segment.low, high: segment.high } : { login }),
      }),
    [days, login, segment.low, segment.high],
  )

  const sectionName = (key: string): string => {
    const [page = '', id = ''] = key.split('.')

    return page === 'nav'
      ? t(`nav.${id}`)
      : `${t(`layout.page.${page}`)} · ${t(`layout.${page}.${id}`)}`
  }

  return (
    <section>
      <h2>{login === null ? t('admin.stats.title') : t('admin.stats.of', { login })}</h2>

      <RangePills value={days} onChange={setDays}>
        {login !== null && (
          <button
            type="button"
            className="pill"
            onClick={() => {
              setLogin(null)
            }}
          >
            {t('admin.stats.everyone')}
          </button>
        )}
      </RangePills>

      {login === null && (
        <SegmentSlider value={segment} onChange={setSegment} told={data?.segment} />
      )}
      {login === null && <OnlineCard onPick={setLogin} />}

      {loading && <p className="estado">{t('app.loading')}</p>}
      {data === undefined ? (
        <ErrorNote error={error} onRetry={() => void reload()} />
      ) : (
        <>
          <div className="stat-cards">
            <Figure label={t('admin.stats.seen')} value={duration(data.totals.seen)} strong />
            <Figure label={t('admin.stats.back')} value={duration(data.totals.back)} />
            <Figure label={t('admin.stats.hidden')} value={duration(data.totals.hidden)} />
            <Figure label={t('admin.stats.clicks')} value={String(data.totals.clicks)} />
            <Figure
              label={t('admin.stats.traffic')}
              value={`${data.totals.requests} · ${size(data.totals.bytes)}`}
            />
            {login === null && (
              <Figure label={t('admin.stats.people')} value={String(data.totals.people)} />
            )}
          </div>

          <article className="card">
            <span className="eyebrow">{t('admin.stats.byHour')}</span>
            <HourChart hours={byLocalHour(data.hours)} />
            <ul className="map-legend">
              <li>
                <span className="stat-key seen" /> {t('admin.stats.seen')}
              </li>
              <li>
                <span className="stat-key back" /> {t('admin.stats.back')}
              </li>
              <li>
                <span className="stat-key hidden" /> {t('admin.stats.hidden')}
              </li>
            </ul>
          </article>

          <article className="card">
            <span className="eyebrow">{t('admin.stats.byKey')}</span>
            <div className="table-scroll">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>{t('admin.stats.element')}</th>
                    <th>{t('admin.stats.seen')}</th>
                    <th>{t('admin.stats.back')}</th>
                    <th>{t('admin.stats.hidden')}</th>
                    <th>{t('admin.stats.clicks')}</th>
                    {login === null && <th>{t('admin.stats.people')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.keys.map((row) => (
                    <tr key={row.key}>
                      <th>{sectionName(row.key)}</th>
                      <td>{row.seen > 0 ? duration(row.seen) : '—'}</td>
                      <td>{row.back > 0 ? duration(row.back) : '—'}</td>
                      <td>{row.hidden > 0 ? duration(row.hidden) : '—'}</td>
                      <td>{row.clicks}</td>
                      {login === null && <td>{row.people}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.keys.length === 0 && <p className="estado">{t('admin.stats.empty')}</p>}
          </article>

          {login === null && <TourSpeeds />}
          {login === null && (
            <article className="card">
              <span className="eyebrow">{t('admin.stats.byUser')}</span>
              <div className="table-scroll">
                <table className="stat-table">
                  <thead>
                    <tr>
                      <th>{t('admin.stats.person')}</th>
                      <th>{t('admin.stats.seen')}</th>
                      <th>{t('admin.stats.back')}</th>
                      <th>{t('admin.stats.hidden')}</th>
                      <th>{t('admin.stats.clicks')}</th>
                      <th>{t('admin.stats.requests')}</th>
                      <th>{t('admin.stats.size')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((row) => (
                      <tr key={row.login}>
                        <th>
                          <button
                            type="button"
                            className="link"
                            onClick={() => {
                              setLogin(row.login)
                            }}
                          >
                            {row.login}
                          </button>
                        </th>
                        <td>{duration(row.seen)}</td>
                        <td>{duration(row.back)}</td>
                        <td>{duration(row.hidden)}</td>
                        <td>{row.clicks}</td>
                        <td>{row.requests}</td>
                        <td>{size(row.bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </>
      )}
    </section>
  )
}

function Figure({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className={`stat-card ${strong ? 'strong' : ''}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

/** Veinticuatro barras, una por hora, con el tiempo apilado en sus tres cuentas. */
function HourChart({ hours }: { hours: StatTotals[] }) {
  const top = Math.max(1, ...hours.map((hour) => hour.seen + hour.back + hour.hidden))

  return (
    <div className="stat-hours" role="img">
      {hours.map((hour, index) => (
        <div
          key={index}
          className="stat-hour"
          title={`${String(index).padStart(2, '0')}:00 · ${duration(hour.seen)} / ${duration(hour.back)} / ${duration(hour.hidden)} · ${hour.requests}`}
        >
          <b className="stat-value">
            {hour.seen + hour.back + hour.hidden > 0
              ? briefTime(hour.seen + hour.back + hour.hidden)
              : ''}
          </b>
          <span className="stat-bar">
            <i className="hidden" style={{ height: `${(hour.hidden / top) * 100}%` }} />
            <i className="back" style={{ height: `${(hour.back / top) * 100}%` }} />
            <i className="seen" style={{ height: `${(hour.seen / top) * 100}%` }} />
          </span>
          <small>{index % 3 === 0 ? String(index).padStart(2, '0') : ''}</small>
        </div>
      ))}
    </div>
  )
}

/**
 * A cuánto va cada demostración y qué hace la gente con su deslizador desde el
 * último ajuste: cuántas personas la aceleran, la frenan o la dejan.
 */
function TourSpeeds() {
  const { t, lang } = useI18n()
  const { data } = useAsync(() => api.getTourStats(), [])

  if (data === undefined || data.tours.length === 0) return null

  const times = (value: number): string => `×${value.toLocaleString(localeOf(lang))}`

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.tours.title')}</span>
      <div className="table-scroll">
        <table className="stat-table">
          <thead>
            <tr>
              <th>{t('admin.tours.name')}</th>
              <th>{t('admin.tours.speed')}</th>
              <th>{t('admin.tours.faster')}</th>
              <th>{t('admin.tours.slower')}</th>
              <th>{t('admin.tours.same')}</th>
              <th>{t('admin.tours.mean')}</th>
              <th>{t('admin.tours.left')}</th>
            </tr>
          </thead>
          <tbody>
            {data.tours.map((tour) => {
              const votes = tour.faster + tour.slower + tour.same

              return (
                <tr key={tour.name}>
                  <th>{tour.name}</th>
                  <td>{times(tour.speed)}</td>
                  <td>{tour.faster}</td>
                  <td>{tour.slower}</td>
                  <td>{tour.same}</td>
                  <td>{votes === 0 ? '—' : times(tour.mean)}</td>
                  <td>{Math.max(0, data.votesToAdjust - votes)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">{t('admin.tours.hint', { n: data.votesToAdjust })}</p>
    </article>
  )
}

/** Cada cuánto se vuelve a preguntar quién está conectado. */
const ONLINE_EVERY_MS = 60_000

/**
 * Quién tiene la web abierta ahora mismo y cuánto lleva su sesión. Pulsar a
 * alguien enseña sus estadísticas.
 */
function OnlineCard({ onPick }: { onPick: (login: string) => void }) {
  const { t } = useI18n()
  const { data, reload } = useAsync(() => api.getOnline(), [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void reload()
    }, ONLINE_EVERY_MS)

    return () => {
      clearInterval(timer)
    }
  }, [reload])

  if (data === undefined) return null

  // Con la hora de la API: el reloj de quien mira puede ir a su aire.
  const since = (at: string): number =>
    Math.max(0, Math.round((Date.parse(data.now) - Date.parse(at)) / 1000))

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.online.title', { n: data.people.length })}</span>
      {data.people.length === 0 ? (
        <p className="estado">{t('admin.online.nobody')}</p>
      ) : (
        <ul className="online-list">
          {data.people.map((person) => (
            <li key={person.login}>
              <button
                type="button"
                className="row plain"
                title={t('admin.online.open', { login: person.login })}
                onClick={() => {
                  onPick(person.login)
                }}
              >
                <Avatar login={person.login} image={person.image} size={28} />
                <span>
                  <strong>{person.login}</strong>
                  <small>{t('admin.online.for', { time: duration(since(person.since)) })}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
