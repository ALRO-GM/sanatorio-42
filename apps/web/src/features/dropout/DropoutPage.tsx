import { useEffect, useState } from 'react'

import type {
  DropoutCounts,
  DropoutPerson,
  DropoutReport,
  DropoutTuning,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { DropoutTweaks } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ChartWithRail } from '../../shared/ui/ChartWithRail'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonLink } from '../../shared/ui/PersonLink'
import { PillGroup } from '../../shared/ui/PillGroup'
import { SectionTitle } from '../../shared/ui/SectionTitle'
import {
  COUNTS,
  dateOf,
  departures,
  FILTERS,
  filterPeople,
  GROUPINGS,
  INCLUDES,
  summaryOf,
  transitions,
  tuningOf,
  tweaksOf,
  weekdayOf,
} from './dropout'
import type { DropoutFilter, DropoutGrouping, DropoutInclude } from './dropout'
import { DeparturesChart, PersonHoursChart, STATUS_COLOR, TransitionsChart } from './DropoutCharts'
import { DropoutCorrelations, DropoutFactorsPanel } from './DropoutCorrelations'
import { DropoutTuningPanel } from './DropoutTuningPanel'

/** Dónde se guarda el ajuste en este navegador: no se pierde al cambiar de piscina ni al volver. */
const STORAGE = 'sanatorio_dropout_tuning'
/** Cuánto se espera a que se deje de mover un deslizador antes de pedir el cálculo. */
const DEBOUNCE_MS = 250

function storedTweaks(): DropoutTweaks {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as unknown

    return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {}
  } catch {
    return {}
  }
}

function storeTweaks(tweaks: DropoutTweaks): void {
  try {
    if (Object.keys(tweaks).length === 0) localStorage.removeItem(STORAGE)
    else localStorage.setItem(STORAGE, JSON.stringify(tweaks))
  } catch {
    // Sin almacenamiento, el ajuste dura lo que la página.
  }
}

/**
 * El abandono de la piscina (pedido por Alberto el 2026-11-06,
 * `docs/abandono.md`): quién ha dejado de venir a los ordenadores y con qué
 * probabilidad, cuándo lo dejan (por día, por semana de piscina y por día de
 * la semana), cuántas horas hacían antes, y con qué se relaciona. Lo ve quien
 * administra y, si el panel lo permite, los piscineros.
 */
export function DropoutPage() {
  const { t } = useI18n()
  const [start, setStart] = useState<string | undefined>(undefined)
  // Lo que se ha movido (lo que difiere de lo de fábrica) y lo que se pide:
  // lo mismo, pero cuando se deja de mover un rato.
  const [tweaks, setTweaks] = useState<DropoutTweaks>(storedTweaks)
  const [asked, setAsked] = useState<DropoutTweaks>(tweaks)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAsked(tweaks)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [tweaks])

  const fetched = useAsync(() => api.getDropout(start, asked), [start, JSON.stringify(asked)])
  // Mientras llega lo nuevo (otro ajuste, otra piscina), se queda lo de antes: no parpadea.
  const [kept, setKept] = useState<DropoutReport | undefined>(undefined)

  if (fetched.data !== undefined && fetched.data !== kept) setKept(fetched.data)
  const data = fetched.data ?? kept
  const change = (next: DropoutTuning, defaults: DropoutTuning): void => {
    const changed = tweaksOf(next, defaults)

    setTweaks(changed)
    storeTweaks(changed)
  }

  return (
    <section className="progress-page dropout-page" aria-labelledby="dropout-title">
      <div className="section-head">
        <SectionTitle id="dropout-title" title={t('dropout.title')}>
          <p>{t('dropout.info')}</p>
          <p>{t('dropout.infoRules')}</p>
        </SectionTitle>
        {data !== undefined && data.pools.length > 1 && (
          <label className="dropout-select">
            <span className="eyebrow">{t('dropout.pool')}</span>
            <select
              value={start ?? data.start ?? ''}
              onChange={(event) => {
                setStart(event.target.value)
              }}
            >
              {data.pools.map((pool) => (
                <option key={pool.start} value={pool.start}>
                  {t('dropout.poolOption', { start: pool.start, people: pool.people })}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {data === undefined ? (
        <ErrorNote error={fetched.error} retry />
      ) : data.people.length === 0 ? (
        <p className="empty">{t('dropout.empty')}</p>
      ) : (
        <>
          <DropoutTuningPanel
            tuning={tuningOf(data.defaults, tweaks)}
            defaults={data.defaults}
            updating={
              fetched.data === undefined || JSON.stringify(asked) !== JSON.stringify(tweaks)
            }
            onChange={(next) => {
              change(next, data.defaults)
            }}
          />
          <DropoutBody report={data} />
        </>
      )}
    </section>
  )
}

function DropoutBody({ report }: { report: DropoutReport }) {
  const { t } = useI18n()
  const [include, setInclude] = useState<DropoutInclude>('gone')
  const [grouping, setGrouping] = useState<DropoutGrouping>('day')
  const [filter, setFilter] = useState<DropoutFilter>('likely')
  const [picked, setPicked] = useState<string | null>(null)
  const summary = summaryOf(report, include)
  const rows = filterPeople(report.people, filter)
  const person = report.people.find((each) => each.login === picked) ?? null
  const hours = (value: number | null): string =>
    value === null ? '—' : t('dropout.hoursValue', { hours: Math.round(value * 10) / 10 })

  return (
    <>
      <CountsRow
        counts={report.counts}
        filter={filter}
        onFilter={(next) => {
          setFilter(next)
        }}
      />
      <ul className="dropout-summary" aria-label={t('dropout.summary.label')}>
        <li>
          <b>{t('dropout.percent', { n: summary.share })}</b>{' '}
          {t('dropout.summary.share', { people: report.counts.people })}
        </li>
        <li>
          <b>{hours(summary.avgLeavers)}</b> {t('dropout.summary.avgLeavers')}
        </li>
        <li>
          <b>{hours(summary.avgStaying)}</b> {t('dropout.summary.avgStaying')}
        </li>
        <li>
          <b>{hours(summary.totalLeavers)}</b> {t('dropout.summary.totalLeavers')}
        </li>
        {summary.topWeek !== null && (
          <li>
            <b>{t('dropout.chart.weekShort', { n: summary.topWeek })}</b>{' '}
            {t('dropout.summary.topWeek')}
          </li>
        )}
        {summary.topWeekday !== null && (
          <li>
            <b>
              {t('dropout.transitions.item', {
                from: t(`dropout.weekday.short.${summary.topWeekday}`),
                to: t(`dropout.weekday.short.${(summary.topWeekday % 7) + 1}`),
              })}
            </b>{' '}
            {t('dropout.summary.topWeekday')}
          </li>
        )}
      </ul>

      <section className="dropout-block" aria-labelledby="dropout-departures">
        <h3 id="dropout-departures">{t('dropout.chart.title')}</h3>
        <ChartWithRail
          railLabel={t('dropout.chart.options')}
          chart={
            <DeparturesChart bars={departures(report, include, grouping)} grouping={grouping} />
          }
        >
          <div className="progress-option">
            <PillGroup
              label={t('dropout.chart.grouping')}
              options={GROUPINGS}
              value={grouping}
              onChange={setGrouping}
              text={(option) => t(`dropout.grouping.${option}`)}
            />
          </div>
          <div className="progress-option">
            <PillGroup
              label={t('dropout.chart.include')}
              options={INCLUDES}
              value={include}
              onChange={setInclude}
              text={(option) => t(`dropout.include.${option}`)}
            />
          </div>
          <div className="progress-option">
            <span className="eyebrow">{t('dropout.transitions.title')}</span>
            <TransitionsChart counts={transitions(report.people, include)} />
          </div>
        </ChartWithRail>
      </section>

      <section className="card dropout-block" aria-labelledby="dropout-people">
        <h3 id="dropout-people">{t('dropout.people.title')}</h3>
        <PillGroup
          label={t('dropout.people.filter')}
          options={FILTERS}
          // Un filtro de los totales de arriba no es ninguna de estas pastillas.
          value={FILTERS.find((each) => each === filter) ?? null}
          onChange={setFilter}
          text={(option) => t(`dropout.filter.${option}`)}
        />
        {person !== null && (
          <PersonPanel
            person={person}
            report={report}
            onClose={() => {
              setPicked(null)
            }}
          />
        )}
        {rows.length === 0 ? (
          <p className="empty">{t('dropout.people.none')}</p>
        ) : (
          <DataTable<DropoutPerson>
            id="dropout-people"
            rows={rows}
            rowKey={(row) => row.login}
            rowClass={(row) => (row.login === picked ? 'picked' : '')}
            columns={[
              {
                id: 'login',
                label: t('dropout.col.person'),
                sort: (row) => row.login,
                first: 'asc',
                cell: (row) => (
                  <button
                    type="button"
                    className="dropout-person"
                    aria-pressed={row.login === picked}
                    onClick={() => {
                      setPicked(row.login === picked ? null : row.login)
                    }}
                  >
                    <Avatar login={row.login} image={row.image} size={28} />
                    {row.login}
                  </button>
                ),
              },
              {
                id: 'risk',
                label: t('dropout.col.risk'),
                sort: (row) => row.factors.risk,
                cell: (row) => (
                  <span className="dropout-risk">
                    <span
                      className="dropout-risk-fill"
                      style={{
                        width: `${row.factors.risk}%`,
                        background: STATUS_COLOR[row.status],
                      }}
                    />
                    <b>{t('dropout.percent', { n: row.factors.risk })}</b>
                  </span>
                ),
              },
              {
                id: 'status',
                label: t('dropout.col.status'),
                sort: (row) => row.status,
                cell: (row) => (
                  <span className={`dropout-status ${row.status}`}>
                    {t(`dropout.status.${row.status}`)}
                  </span>
                ),
              },
              {
                id: 'last',
                label: t('dropout.col.lastSeen'),
                sort: (row) => row.lastSeen ?? '',
                cell: (row) =>
                  row.lastSeen === null
                    ? t('dropout.never')
                    : t('dropout.dayShort', {
                        day: t(`dropout.weekday.short.${weekdayOf(row.lastSeen)}`),
                        date: dateOf(row.lastSeen),
                      }),
              },
              {
                id: 'missed',
                label: t('dropout.col.missed'),
                sort: (row) => row.missedDays,
                cell: (row) =>
                  t('dropout.missed', { days: row.missedDays, weekdays: row.missedWeekdays }),
              },
              {
                id: 'total',
                label: t('dropout.factor.totalHours'),
                sort: (row) => row.factors.totalHours,
                cell: (row) => hours(row.factors.totalHours),
              },
              {
                id: 'avg',
                label: t('dropout.factor.avgHours'),
                sort: (row) => row.factors.avgHours,
                cell: (row) => hours(row.factors.avgHours),
              },
              {
                id: 'attendance',
                label: t('dropout.factor.attendance'),
                sort: (row) => row.factors.attendance,
                cell: (row) => t('dropout.percent', { n: row.factors.attendance }),
              },
              {
                id: 'isolation',
                label: t('dropout.factor.isolation'),
                sort: (row) => row.factors.isolation,
                cell: (row) => t('dropout.percent', { n: row.factors.isolation }),
              },
              {
                id: 'given',
                label: t('dropout.factor.given'),
                sort: (row) => row.factors.given,
                cell: (row) => row.factors.given,
              },
              {
                id: 'received',
                label: t('dropout.factor.received'),
                sort: (row) => row.factors.received,
                cell: (row) => row.factors.received,
              },
              {
                id: 'passed',
                label: t('dropout.factor.passed'),
                sort: (row) => row.factors.passed,
                cell: (row) => row.factors.passed,
              },
            ]}
          />
        )}
      </section>

      <DropoutCorrelations report={report} />
      <DropoutFactorsPanel report={report} />
    </>
  )
}

/**
 * Los totales de la piscina con los ajustes de ahora, como los cuenta la API:
 * cada uno filtra la tabla de debajo.
 */
function CountsRow({
  counts,
  filter,
  onFilter,
}: {
  counts: DropoutCounts
  filter: DropoutFilter
  onFilter: (next: DropoutFilter) => void
}) {
  const { t } = useI18n()

  return (
    <ul className="dropout-counts" aria-label={t('dropout.counts.label')}>
      {COUNTS.map(({ key, filter: target }) => (
        <li key={key}>
          <button
            type="button"
            className={`dropout-count ${key}`}
            aria-pressed={filter === target}
            onClick={() => {
              onFilter(target)
            }}
          >
            <b>{counts[key]}</b>
            <span>{t(`dropout.counts.${key}`)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Lo de una persona: sus horas día a día, por qué tiene ese riesgo y cuándo lo dejó. */
function PersonPanel({
  person,
  report,
  onClose,
}: {
  person: DropoutPerson
  report: DropoutReport
  onClose: () => void
}) {
  const { t } = useI18n()
  const named = (day: string): string =>
    t('dropout.dayLong', {
      day: t(`dropout.weekday.long.${weekdayOf(day)}`),
      date: dateOf(day),
    })

  return (
    <article className="dropout-person-panel" aria-labelledby="dropout-person-name">
      <header className="dropout-person-head">
        <Avatar login={person.login} image={person.image} size={44} />
        <div>
          <h4 id="dropout-person-name">
            <PersonLink login={person.login} />
          </h4>
          <p>
            <span className={`dropout-status ${person.status}`}>
              {t(`dropout.status.${person.status}`)}
            </span>{' '}
            · {t('dropout.person.risk', { n: person.factors.risk })}
          </p>
        </div>
        <button type="button" className="link" onClick={onClose}>
          {t('dropout.person.close')}
        </button>
      </header>
      {person.leftBetween !== null && (
        <p className="dropout-left">
          {t(person.status === 'gone' ? 'dropout.person.left' : 'dropout.person.maybeLeft', {
            from: named(person.leftBetween[0]),
            to: named(person.leftBetween[1]),
            week: person.leftWeek ?? '—',
          })}
        </p>
      )}
      {person.reasons.length > 0 && (
        <ul className="dropout-reasons">
          {person.reasons.map((reason) => (
            <li key={reason}>{t(`dropout.reason.${reason}`)}</li>
          ))}
        </ul>
      )}
      <PersonHoursChart person={person} days={report.days} />
    </article>
  )
}
