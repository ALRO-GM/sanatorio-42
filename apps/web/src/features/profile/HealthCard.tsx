import { useState } from 'react'
import type { ReactNode } from 'react'

import type { Health, PaceRef } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { INTRA_HOME, progressHref } from '../../shared/links'
import { daysBetween, originOf, paceOn, PACES, SLOWEST, stepsFor } from '../../shared/pace'
import type { PaceStep } from '../../shared/pace'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/** El último círculo del common core. */
const LAST_CIRCLE = 6
/** Quien dice "ahora no" a anotar su pace no vuelve a ver la pregunta abierta. */
const SKIP_KEY = 'sanatorio_pace_skip'

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
 * La API de 42 no da ni el pace ni los días de bonus, así que las fechas salen
 * de dos datos que cada persona copia de su perfil de la intra (su pace y su
 * *Milestone Deadline*) y de la tabla de plazos. Sin ellos no se calcula nada:
 * se pregunta.
 */
type HealthCardProps = {
  /** El de otra persona, ya cargado con su expediente. Sin él, se pide el tuyo. */
  health?: Health
}

export function HealthCard({ health }: HealthCardProps) {
  const { t } = useI18n()
  const own = useAsync(
    () => (health === undefined ? api.getHealth() : Promise.resolve(health)),
    [health],
  )
  const { data, error, loading, reload, setData } = own

  return (
    <article className="card health">
      <div className="card-head">
        <span className="eyebrow">{t('health.title')}</span>
        {/* Tu estado, comparado: en el Avance, con tu plan, quien sigue y quien se
            tragó el black hole de tu campus, los paces y tu línea. */}
        {health === undefined && data !== undefined && (
          <a
            className="link"
            href={progressHref({
              plan: [data.track],
              pop: ['current', 'blackholed'],
              scope: ['campus'],
              paces: true,
              me: true,
            })}
          >
            {t('health.compare')} <Icon name="adelante" size={14} />
          </a>
        )}
      </div>
      {loading && <p className="estado">{t('health.loading')}</p>}
      {!loading && data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}
      {data !== undefined &&
        (data.startedAt === null ? (
          <p className="estado">{t('health.unknown')}</p>
        ) : (
          <HealthBody
            health={data}
            startedAt={data.startedAt}
            mine={health === undefined}
            onSaved={setData}
          />
        ))}
    </article>
  )
}

type HealthBodyProps = {
  health: Health
  startedAt: string
  /** Es tu estado de salud: solo entonces se puede anotar el pace. */
  mine: boolean
  onSaved: (health: Health) => void
}

function HealthBody({ health, startedAt, mine, onSaved }: HealthBodyProps) {
  const { t, tn, lang } = useI18n()
  // En el expediente de otra persona, las frases van en tercera persona (`…Other`).
  // Se fija al montar: las cuentas no deben bailar entre un render y el siguiente.
  const [now] = useState(() => Date.now())
  // Plegado por defecto: de un vistazo, el pace y hasta cuándo; el resto, al abrir.
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const circle = health.currentCircle
  const finished = health.milestones.length > LAST_CIRCLE
  const declared = health.declared
  // El día cero: de él cuelgan todas las fechas. Sin pace anotado, no lo hay.
  const origin = declared === null ? null : originOf(declared)

  const day = (date: Date | string): string =>
    new Date(date).toLocaleDateString(localeOf(lang), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  const started = (
    <small>
      {t(mine ? 'health.started' : 'health.startedOther', {
        date: day(startedAt),
        days: daysBetween(Date.parse(startedAt), now),
      })}
    </small>
  )

  if (finished) {
    return (
      <div className="health-head">
        <div className="health-pace safe">
          <span className="eyebrow">{t('health.pace')}</span>
          <strong>✓</strong>
        </div>
        <p className="health-summary">
          {t(mine ? 'health.finished' : 'health.finishedOther')}
          {started}
        </p>
      </div>
    )
  }

  if (origin === null || declared === null) {
    return mine ? (
      <PaceAsk health={health} onSaved={onSaved} />
    ) : (
      <p className="health-summary">
        {t('health.undeclared', { circle })}
        {started}
      </p>
    )
  }

  const steps = stepsFor(origin, circle, now)
  // El pace al que vas: el más rápido que aún puedes conservar en este círculo.
  const current = steps.find((step) => step.daysLeft >= 0) ?? null
  const hole = steps.at(-1) ?? null
  // Lo que el día cero se ha retrasado respecto al inicio: los días de bonus.
  const bonusDays = Math.max(0, daysBetween(Date.parse(startedAt), origin))

  const detail = open ? detailOf() : null

  return (
    <>
      <div className="health-head">
        {/* Dos números distintos, y cada uno dice cuál es: el que tendrías si
            pasaras de círculo hoy y el que pone tu intra (el que anotaste). */}
        <div
          className={`health-pace ${current === null ? 'gone' : ''}`}
          title={t(mine ? 'health.paceNowHint' : 'health.paceNowHintOther')}
        >
          <span className="eyebrow">{t('health.paceNow')}</span>
          <strong>{current?.pace ?? <Icon name="pozo" size={26} />}</strong>
        </div>
        <div
          className="health-pace official"
          title={t(mine ? 'health.paceIntraHint' : 'health.paceIntraHintOther')}
        >
          <span className="eyebrow">{t(mine ? 'health.paceIntra' : 'health.paceIntraOther')}</span>
          <strong>{declared.pace}</strong>
        </div>
        <p className="health-summary">
          {current === null
            ? t(mine ? 'health.summaryGone' : 'health.summaryGoneOther', { circle })
            : tn(mine ? 'health.summary' : 'health.summaryOther', current.daysLeft, {
                circle,
                pace: current.pace,
                date: day(current.date),
                left: current.daysLeft,
              })}
          {started}
        </p>
        <button
          type="button"
          className={`xp-toggle ${open ? 'open' : ''}`}
          aria-expanded={open}
          aria-controls="health-detail"
          aria-label={t('health.toggle')}
          title={t('health.toggle')}
          onClick={() => {
            setOpen((current) => !current)
          }}
        >
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      {open && (
        <div id="health-detail" className="health-detail">
          {detail}
        </div>
      )}
    </>
  )

  // Lo que queda plegado: plazos, black hole, historial, calculadora y de dónde sale todo.
  function detailOf(): ReactNode {
    if (origin === null || declared === null) return null

    const lost = steps.filter((step) => step.daysLeft < 0)
    const upcoming = steps.filter((step) => step.daysLeft >= 0)

    return (
      <>
        <span className="eyebrow">
          {t(mine ? 'health.drops' : 'health.dropsOther', { circle })}
        </span>
        <ol className="health-steps">
          {/* Los plazos que ya se pasaron, en una sola línea: lo que importa es lo que queda. */}
          {lost.length > 0 && (
            <li className="health-step lost-all">
              <span className="health-badge">
                <Icon name="reloj" size={16} />
              </span>
              <span>
                {t('health.lostAll', { paces: lost.map((step) => step.pace).join(', ') })}
              </span>
            </li>
          )}
          {upcoming.map((step) => (
            <StepRow
              key={step.pace}
              step={step}
              next={steps[steps.indexOf(step) + 1]?.pace ?? null}
              current={step.pace === current?.pace}
              day={day}
            />
          ))}
          {hole !== null && (
            <li className="health-step hole">
              <span className="health-badge">
                <Icon name="pozo" size={16} />
              </span>
              <span>
                <strong>{t('health.hole', { date: day(hole.date) })}</strong>
                <small>{t('health.holeTable')}</small>
              </span>
              <span className="health-left">
                {hole.daysLeft >= 0
                  ? tn('pace.left', hole.daysLeft)
                  : tn('pace.late', -hole.daysLeft)}
              </span>
            </li>
          )}
        </ol>

        {health.milestones.length > 0 && (
          <>
            <span className="eyebrow">{t('health.history')}</span>
            <ul className="health-history">
              {health.milestones.map((date, done) => {
                const pace = paceOn(origin, done, Date.parse(date))

                return (
                  <li key={date} className="chip">
                    {t('health.historyRow', { circle: done, date: day(date) })}
                    {pace !== null && <strong>{t('pace.option', { n: pace })}</strong>}
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <Calculator origin={origin} from={circle} now={now} day={day} />

        <p className="hint">
          {t(mine ? 'health.source' : 'health.sourceOther', {
            pace: declared.pace,
            circle: declared.circle,
            deadline: day(`${declared.deadline}T12:00:00`),
            updated: day(declared.updatedAt),
          })}{' '}
          {bonusDays > 0 && tn(mine ? 'health.bonus' : 'health.bonusOther', bonusDays)}
        </p>
        {mine &&
          (editing ? (
            <PaceForm
              health={health}
              onSaved={(next) => {
                setEditing(false)
                onSaved(next)
              }}
              onCancel={() => {
                setEditing(false)
              }}
            />
          ) : (
            <button
              type="button"
              className="pill health-update"
              onClick={() => {
                setEditing(true)
              }}
            >
              <Icon name="lapiz" size={14} /> {t('health.update')}
            </button>
          ))}
      </>
    )
  }
}

type PaceAskProps = {
  health: Health
  onSaved: (health: Health) => void
}

/**
 * La pregunta de la primera vez: ¿quieres tus fechas? Hacen falta dos datos del
 * perfil de la intra. Quien dice que no, se queda con una línea y un botón.
 */
function PaceAsk({ health, onSaved }: PaceAskProps) {
  const { t } = useI18n()
  const [skipped, setSkipped] = useState(() => {
    try {
      return localStorage.getItem(SKIP_KEY) === '1'
    } catch {
      // Sin almacenamiento (ventana privada): se pregunta cada vez.
      return false
    }
  })

  const skip = (value: boolean): void => {
    setSkipped(value)

    try {
      if (value) localStorage.setItem(SKIP_KEY, '1')
      else localStorage.removeItem(SKIP_KEY)
    } catch {
      // Sin almacenamiento, la respuesta dura lo que dure la pestaña.
    }
  }

  if (skipped) {
    return (
      <p className="health-summary">
        {t('health.skipped')}{' '}
        <button
          type="button"
          className="pill"
          onClick={() => {
            skip(false)
          }}
        >
          {t('health.askYes')}
        </button>
      </p>
    )
  }

  return (
    <div className="health-ask">
      <strong>{t('health.ask')}</strong>
      <PaceForm
        health={health}
        onSaved={onSaved}
        onCancel={() => {
          skip(true)
        }}
        cancelLabel={t('health.askNo')}
      />
    </div>
  )
}

type PaceFormProps = {
  health: Health
  onSaved: (health: Health) => void
  onCancel: () => void
  cancelLabel?: string
}

/** Los dos datos del perfil de la intra: el pace y el *Milestone Deadline*. */
function PaceForm({ health, onSaved, onCancel, cancelLabel }: PaceFormProps) {
  const { t } = useI18n()
  const before: PaceRef | null = health.declared
  const [pace, setPace] = useState<number | null>(before?.pace ?? null)
  const [deadline, setDeadline] = useState(before?.deadline ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const save = async (): Promise<void> => {
    if (pace === null || deadline === '') return

    setSending(true)
    setError(null)

    try {
      onSaved(await api.declarePace({ pace, deadline }))
    } catch (failure) {
      setError(failure)
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="health-calc-form health-form"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <p className="hint health-form-where">
        {t('health.formWhere')}{' '}
        <a href={INTRA_HOME} target="_blank" rel="noreferrer">
          {t('health.formIntra')}
        </a>
      </p>
      <label>
        {t('health.formPace')}
        <select
          value={pace ?? ''}
          required
          onChange={(event) => {
            setPace(PACES.find((option) => String(option) === event.target.value) ?? null)
          }}
        >
          <option value="" disabled>
            {t('pace.none')}
          </option>
          {PACES.map((option) => (
            <option key={option} value={option}>
              {t('pace.option', { n: option })}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('health.formDeadline', { circle: health.currentCircle })}
        <input
          type="date"
          value={deadline}
          required
          onChange={(event) => {
            setDeadline(event.target.value)
          }}
        />
      </label>
      <div className="health-form-actions">
        <button type="submit" className="primary small" disabled={sending}>
          {t('health.formSave')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {cancelLabel ?? t('common.cancel')}
        </button>
      </div>
      <ErrorNote error={error} />
    </form>
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
  const { t, tn } = useI18n()
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
        {lost ? t('health.lost') : tn('pace.left', step.daysLeft)}
      </span>
    </li>
  )
}

type CalculatorProps = {
  /** Tu día cero: de él salen los plazos. */
  origin: number
  /** El círculo en el que estás: no se calcula sobre los ya completados. */
  from: number
  now: number
  day: (date: Date) => string
}

/** "Si termino el círculo N tal día, ¿en qué pace me quedo?" */
function Calculator({ origin, from, now, day }: CalculatorProps) {
  const { t, tn } = useI18n()
  const [circle, setCircle] = useState(from)
  const [date, setDate] = useState(() => inputDay(new Date(now)))
  // Plegada por defecto: lo primero que se ve es el estado, no las cuentas.
  const [open, setOpen] = useState(false)
  const circles = Array.from({ length: LAST_CIRCLE - from + 1 }, (_, index) => from + index)

  // A mediodía: así el día entero cuenta igual en cualquier zona horaria.
  const at = Date.parse(`${date}T12:00:00`)
  const valid = !Number.isNaN(at)
  const pace = valid ? paceOn(origin, circle, at) : null
  const steps = stepsFor(origin, circle, at)
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
                  {tn('health.calcMargin', kept.daysLeft, { date: day(kept.date) })}
                  {faster !== undefined &&
                    ` ${tn('health.calcFaster', Math.max(1, -faster.daysLeft), { pace: faster.pace })}`}
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
