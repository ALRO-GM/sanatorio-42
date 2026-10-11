import { useState } from 'react'

import type { Health } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { daysBetween, paceOn, SLOWEST, stepsFor } from '../../shared/pace'
import type { PaceStep } from '../../shared/pace'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/** El último círculo del common core. */
const LAST_CIRCLE = 6

/** `YYYY-MM-DD` de una fecha, en la hora local: lo que entiende un `<input type="date">`. */
function inputDay(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Estado de salud: cómo vas de tiempo en el common core.
 *
 * Enseña a qué pace vas, en qué fecha caerías a cada pace más lento si no
 * terminas el círculo en el que estás, cuándo te alcanzaría el black hole, y una
 * calculadora: "si termino tal día, ¿en qué pace me quedo?".
 *
 * La API solo da los hechos (inicio, círculos completados, black hole según
 * 42); las cuentas se hacen aquí con la tabla de plazos.
 */
export function HealthCard() {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getHealth(), [])

  return (
    <article className="card health">
      <span className="eyebrow">{t('health.title')}</span>
      {loading && <p className="estado">{t('health.loading')}</p>}
      {!loading && data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined &&
        (data.startedAt === null ? (
          <p className="estado">{t('health.unknown')}</p>
        ) : (
          <HealthBody health={data} startedAt={data.startedAt} />
        ))}
    </article>
  )
}

function HealthBody({ health, startedAt }: { health: Health; startedAt: string }) {
  const { t, lang } = useI18n()
  // Se fija al montar: las cuentas no deben bailar entre un render y el siguiente.
  const [now] = useState(() => Date.now())
  const circle = health.currentCircle
  const finished = health.milestones.length > LAST_CIRCLE

  const day = (date: Date | string): string =>
    new Date(date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  // Lo que diría la tabla sin más, para compararlo con la fecha de 42.
  const tableHole = stepsFor(startedAt, circle, now).at(-1)?.date ?? null
  // 42 puede dar días de más (bonus, compensación, o un *freeze* que para el
  // reloj). Si su fecha de black hole es posterior a la de la tabla, es la real,
  // y esos días retrasan también los plazos de los demás paces.
  const official = health.blackholedAt === null ? null : new Date(health.blackholedAt)
  const extraDays =
    official === null || tableHole === null
      ? 0
      : Math.max(0, daysBetween(tableHole.getTime(), official.getTime()))
  const steps = stepsFor(startedAt, circle, now, extraDays)
  // El pace al que vas: el más rápido que aún puedes conservar en este círculo.
  const current = steps.find((step) => step.daysLeft >= 0) ?? null
  const hole = steps.at(-1)?.date ?? null
  const holeLeft = hole === null ? null : daysBetween(now, hole.getTime())

  return (
    <>
      <div className="health-head">
        <div className={`health-pace ${finished ? 'safe' : current === null ? 'gone' : ''}`}>
          <span className="eyebrow">{t('health.pace')}</span>
          <strong>{finished ? '✓' : (current?.pace ?? '🕳')}</strong>
        </div>
        <p className="health-summary">
          {finished
            ? t('health.finished')
            : current === null
              ? t('health.summaryGone', { circle })
              : t('health.summary', {
                  circle,
                  pace: current.pace,
                  date: day(current.date),
                  left: current.daysLeft,
                })}
          <small>
            {t('health.started', {
              date: day(startedAt),
              days: daysBetween(Date.parse(startedAt), now),
            })}
          </small>
        </p>
      </div>

      {!finished && (
        <>
          <span className="eyebrow">{t('health.drops', { circle })}</span>
          <ol className="health-steps">
            {steps.map((step, index) => (
              <StepRow
                key={step.pace}
                step={step}
                next={steps[index + 1]?.pace ?? null}
                current={step.pace === current?.pace}
                day={day}
              />
            ))}
            {hole !== null && holeLeft !== null && (
              <li className="health-step hole">
                <span className="health-badge" aria-hidden="true">
                  🕳
                </span>
                <span>
                  <strong>{t('health.hole', { date: day(hole) })}</strong>
                  <small>
                    {extraDays > 0
                      ? t('health.holeOfficial', { n: extraDays })
                      : t('health.holeTable')}
                  </small>
                </span>
                <span className="health-left">
                  {holeLeft >= 0
                    ? t('pace.left', { n: holeLeft })
                    : t('pace.late', { n: -holeLeft })}
                </span>
              </li>
            )}
          </ol>
        </>
      )}

      {health.milestones.length > 0 && (
        <>
          <span className="eyebrow">{t('health.history')}</span>
          <ul className="health-history">
            {health.milestones.map((date, done) => {
              const pace = paceOn(startedAt, done, Date.parse(date))

              return (
                <li key={date} className="chip">
                  {t('health.historyRow', { circle: done, date: day(date) })}
                  <strong>{pace === null ? '—' : t('pace.option', { n: pace })}</strong>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {!finished && (
        <Calculator startedAt={startedAt} from={circle} now={now} extraDays={extraDays} day={day} />
      )}
      <p className="hint">
        {t(extraDays > 0 ? 'health.noteExtra' : 'health.note', { n: extraDays })}
      </p>
    </>
  )
}

type StepRowProps = {
  step: PaceStep
  /** El pace al que se cae al pasarse de este plazo; `null` si lo siguiente es el black hole. */
  next: number | null
  current: boolean
  day: (date: Date) => string
}

/** Un pace y hasta cuándo se puede conservar. */
function StepRow({ step, next, current, day }: StepRowProps) {
  const { t } = useI18n()
  const lost = step.daysLeft < 0

  return (
    <li className={`health-step ${lost ? 'lost' : ''} ${current ? 'current' : ''}`}>
      <span className="health-badge">{step.pace}</span>
      <span>
        <strong>
          {lost
            ? t('health.stepLost', { date: day(step.date) })
            : t('health.stepUntil', { date: day(step.date) })}
        </strong>
        {!lost && (
          <small>
            {next === null ? t('health.thenHole') : t('health.thenDrop', { pace: next })}
          </small>
        )}
      </span>
      <span className="health-left">
        {lost ? t('health.lost') : t('pace.left', { n: step.daysLeft })}
      </span>
    </li>
  )
}

type CalculatorProps = {
  startedAt: string
  /** El círculo en el que estás: no se calcula sobre los ya completados. */
  from: number
  now: number
  /** Días que 42 ha añadido a los plazos. */
  extraDays: number
  day: (date: Date) => string
}

/** "Si termino el círculo N tal día, ¿en qué pace me quedo?" */
function Calculator({ startedAt, from, now, extraDays, day }: CalculatorProps) {
  const { t } = useI18n()
  const [circle, setCircle] = useState(from)
  const [date, setDate] = useState(() => inputDay(new Date(now)))
  // Plegada por defecto: lo primero que se ve es el estado, no las cuentas.
  const [open, setOpen] = useState(false)
  const circles = Array.from({ length: LAST_CIRCLE - from + 1 }, (_, index) => from + index)

  // A mediodía: así el día entero cuenta igual en cualquier zona horaria.
  const at = Date.parse(`${date}T12:00:00`)
  const valid = !Number.isNaN(at)
  const pace = valid ? paceOn(startedAt, circle, at, extraDays) : null
  const steps = stepsFor(startedAt, circle, at, extraDays)
  const kept = steps.find((step) => step.pace === pace)
  const faster = steps[steps.findIndex((step) => step.pace === pace) - 1]

  return (
    <div className={`health-calc ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="health-calc-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <span className="eyebrow">{t('health.calc')}</span>
        <span className="health-calc-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <>
          <div className="health-calc-form">
            <label>
              {t('health.calcCircle')}
              <select
                value={circle}
                onChange={(event) => {
                  setCircle(Number(event.target.value))
                }}
              >
                {circles.map((option) => (
                  <option key={option} value={option}>
                    {t('health.circle', { n: option })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('health.calcDate')}
              <input
                type="date"
                value={date}
                min={inputDay(new Date(startedAt))}
                onChange={(event) => {
                  setDate(event.target.value)
                }}
              />
            </label>
          </div>
          {valid && (
            <p className={`health-result ${pace === null ? 'gone' : ''}`} role="status">
              {pace === null || kept === undefined ? (
                t('health.calcGone', {
                  circle,
                  date: day(steps[steps.length - 1]?.date ?? new Date()),
                })
              ) : (
                <>
                  <strong>{t('health.calcPace', { pace })}</strong>{' '}
                  {t('health.calcMargin', { n: kept.daysLeft, date: day(kept.date) })}
                  {faster !== undefined &&
                    ` ${t('health.calcFaster', { pace: faster.pace, n: Math.max(1, -faster.daysLeft) })}`}
                  {pace === SLOWEST && ` ${t('health.calcSlowest')}`}
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}
