import { useEffect, useState } from 'react'

import type { LiveExam, LiveExaminee } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { PersonLink } from '../../shared/ui/PersonLink'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'
import { ExamStatsPanel } from './ExamStatsPanel'
import { ExamsTour } from './ExamsTour'

/** Cada cuánto se pregunta por el examen en vivo: la API refresca las notas cada 5 min. */
const LIVE_REFRESH_MS = 60_000

type TrackFilter = 'all' | LiveExaminee['track']

/**
 * Exámenes: arriba, el examen que hay ahora en tu campus (quién está, qué
 * examen hace y su última nota); debajo, las estadísticas por plan y kickoff
 * (`ExamStatsPanel`).
 */
export function ExamsPage() {
  const { t } = useI18n()
  const live = useAsync(() => api.getLiveExam(), [])

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
      <h2>
        {t('exams.title')}
        <InfoTip title={t('exams.title')}>
          <ExamsTour />
        </InfoTip>
      </h2>
      {live.data !== undefined && <LiveCard live={live.data} />}
      <ErrorNote error={live.error} onRetry={() => void live.reload()} />

      <ExamStatsPanel />
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
                  <PersonLink login={person.login} className="" />
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
