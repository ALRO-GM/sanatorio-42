import { useEffect, useState } from 'react'

import type { ExamStat, LiveExam, LiveExaminee } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Show } from '../../shared/detail'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { recordHref } from '../../shared/links'

/** Cada cuánto se pregunta por el examen en vivo: la API refresca las notas cada 5 min. */
const LIVE_REFRESH_MS = 60_000

type TrackFilter = 'all' | LiveExaminee['track']

/**
 * Exámenes: arriba, el examen que hay ahora en tu campus (quién está, qué
 * examen hace y su última nota); debajo, las estadísticas de cada examen y de
 * cuánto se tarda en cada círculo.
 */
export function ExamsPage() {
  const { t } = useI18n()
  const live = useAsync(() => api.getLiveExam(), [])
  const stats = useAsync(() => api.getExamStats(), [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void live.reload()
    }, LIVE_REFRESH_MS)

    return () => {
      clearInterval(timer)
    }
  }, [live])

  return (
    <section>
      <h2>{t('exams.title')}</h2>
      {live.data !== undefined && <LiveCard live={live.data} />}
      <ErrorNote error={live.error} onRetry={() => void live.reload()} />

      <h3 className="exams-subtitle">{t('exams.stats')}</h3>
      {stats.loading && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={stats.error} onRetry={() => void stats.reload()} />
      {stats.data !== undefined && (
        <>
          {stats.data.backfill.done < stats.data.backfill.total && (
            <p className="hint">
              {t('exams.backfill', {
                done: stats.data.backfill.done,
                total: stats.data.backfill.total,
              })}
            </p>
          )}
          {stats.data.exams.length === 0 ? (
            <p className="estado">{t('exams.noStats')}</p>
          ) : (
            <div className="exam-stats">
              {stats.data.exams.map((exam) => (
                <ExamCard key={exam.projectId} exam={exam} />
              ))}
            </div>
          )}
          {stats.data.circles.length > 0 && (
            <Show from="datos">
              <article className="card">
                <span className="eyebrow">{t('exams.circles')}</span>
                <p className="hint">{t('exams.circlesHint')}</p>
                <ul className="rows">
                  {stats.data.circles.map((circle) => (
                    <li key={circle.circle} className="row">
                      <span>{t('graph.circle', { n: circle.circle })}</span>
                      <strong>{t('exams.days', { n: circle.median })}</strong>
                      <small className="hint">
                        {t('exams.range', { p25: circle.p25, p75: circle.p75, n: circle.people })}
                      </small>
                    </li>
                  ))}
                </ul>
              </article>
            </Show>
          )}
        </>
      )}
    </section>
  )
}

/** El examen de ahora: quién está, por examen, con su nota. */
function LiveCard({ live }: { live: LiveExam }) {
  const { t, lang } = useI18n()
  const [track, setTrack] = useState<TrackFilter>('all')
  const [circle, setCircle] = useState<string>('all')

  if (live.exam === null) return <p className="estado">{t('exams.none')}</p>

  const time = (iso: string): string =>
    new Date(iso).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })
  const circles = [
    ...new Set(live.groups.flatMap((group) => group.people.map((person) => person.circle))),
  ]
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)
  const shown = (person: LiveExaminee): boolean =>
    (track === 'all' || person.track === track) &&
    (circle === 'all' || String(person.circle) === circle)

  return (
    <article className={`card exam-live ${live.running ? 'running' : ''}`}>
      <span className="eyebrow">{live.running ? `● ${t('exams.live')}` : t('exams.next')}</span>
      <h3>
        {live.exam.name}
        {live.exam.location !== null && <small> · {live.exam.location}</small>}
      </h3>
      <p className="hint">
        {time(live.exam.beginAt)}–{time(live.exam.endAt)}
        {live.updatedAt !== null && ` · ${t('exams.updated', { time: time(live.updatedAt) })}`}
      </p>
      {live.running && (
        <div className="filter-pills">
          {(['all', 'classic', 'next'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`pill ${track === option ? 'active' : ''}`}
              aria-pressed={track === option}
              onClick={() => {
                setTrack(option)
              }}
            >
              {t(`exams.track.${option}`)}
            </button>
          ))}
          {circles.length > 0 && (
            <select
              value={circle}
              aria-label={t('exams.circleFilter')}
              onChange={(event) => {
                setCircle(event.target.value)
              }}
            >
              <option value="all">{t('exams.allCircles')}</option>
              {circles.map((value) => (
                <option key={value} value={value}>
                  {t('graph.circle', { n: value })}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {live.running && live.groups.length === 0 && <p className="estado">{t('exams.nobody')}</p>}
      {live.groups.map((group) => {
        const people = group.people.filter(shown)

        if (people.length === 0) return null

        return (
          <section key={group.projectId ?? 'none'} className="exam-group">
            <h4>
              {group.name ?? t('exams.noAttempt')} <small>({people.length})</small>
            </h4>
            <ul className="exam-people">
              {people.map((person) => (
                <li key={person.login} className={person.passed ? 'passed' : ''}>
                  <Avatar login={person.login} image={person.image} size={32} />
                  <a href={recordHref(person.login)}>{person.login}</a>
                  <span className="exam-badges">
                    {person.circle !== null && (
                      <span className="badge subtle">
                        {t('graph.circle', { n: person.circle })}
                      </span>
                    )}
                    <span className="badge subtle">{t(`exams.track.${person.track}`)}</span>
                  </span>
                  <strong className="exam-mark">{person.mark ?? '—'}</strong>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </article>
  )
}

/** Las estadísticas de un examen: intentos hasta aprobar y cómo va cada intento. */
function ExamCard({ exam }: { exam: ExamStat }) {
  const { t, lang } = useI18n()
  const decimal = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: 1 })
  const most = Math.max(1, ...exam.attemptsToPass)

  return (
    <article className="card exam-card">
      <span className="eyebrow">{exam.name}</span>
      <p>
        <strong>
          {exam.avgAttempts === null
            ? '—'
            : t('exams.avg', { n: decimal.format(exam.avgAttempts) })}
        </strong>{' '}
        <small className="hint">
          {t('exams.people', { passed: exam.passed, people: exam.people })}
        </small>
      </p>
      <span className="eyebrow">{t('exams.toPass')}</span>
      <ul className="exam-bars">
        {exam.attemptsToPass.map((count, index) => (
          <li key={index}>
            <span>{index === 4 ? '5+' : index + 1}</span>
            <i style={{ width: `${(count / most) * 100}%` }} />
            <small>{count}</small>
          </li>
        ))}
      </ul>
      {exam.byAttempt.length > 0 && (
        <>
          <span className="eyebrow">{t('exams.byAttempt')}</span>
          <ul className="rows exam-attempts">
            {exam.byAttempt.slice(0, 6).map((attempt) => (
              <li key={attempt.attempt} className="row">
                <span>{t('exams.attempt', { n: attempt.attempt })}</span>
                <span>
                  {t('exams.attemptLine', {
                    mark: attempt.avgMark === null ? '—' : Math.round(attempt.avgMark),
                    pct: Math.round(attempt.passRate * 100),
                    n: attempt.people,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}
