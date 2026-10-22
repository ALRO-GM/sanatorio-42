import { useCallback, useEffect, useState } from 'react'

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

/** Sin examen en marcha, cada cuánto se mira si ha aparecido uno. */
const IDLE_REFRESH_MS = 5 * 60_000
/** Lo menos que se espera entre dos preguntas solas, por si el reloj del servidor va por delante. */
const MIN_WAIT_MS = 5_000

type TrackFilter = 'all' | LiveExaminee['track']

/**
 * Exámenes: arriba, el examen que hay ahora en tu campus (quién está, qué
 * examen le toca y cómo va); debajo, las estadísticas por plan y kickoff
 * (`ExamStatsPanel`).
 */
export function ExamsPage() {
  const { t } = useI18n()
  const live = useAsync(() => api.getLiveExam(), [])
  const [refreshing, setRefreshing] = useState(false)
  const { reload, setData } = live

  // Se vuelve a preguntar cuando la API dice que habrá datos nuevos (cada cinco
  // minutos con el examen en marcha) o cuando empieza el siguiente.
  const target = live.data?.running ? live.data.nextRefreshAt : (live.data?.exam?.beginAt ?? null)

  useEffect(() => {
    if (live.data === undefined) return

    const wait =
      target === null ? IDLE_REFRESH_MS : Math.max(MIN_WAIT_MS, Date.parse(target) - Date.now())
    // Con la pestaña escondida se espera a que vuelva a verse: nadie mira.
    const whenSeen = (): void => {
      if (document.hidden) return
      document.removeEventListener('visibilitychange', whenSeen)
      void reload()
    }
    const timer = setTimeout(() => {
      if (document.hidden) document.addEventListener('visibilitychange', whenSeen)
      else void reload()
    }, wait)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', whenSeen)
    }
  }, [live.data, target, reload])

  const refresh = useCallback(async () => {
    setRefreshing(true)

    try {
      setData(await api.refreshLiveExam())
    } catch {
      // Si falla, se queda lo que había; el siguiente refresco solo lo arreglará.
    } finally {
      setRefreshing(false)
    }
  }, [setData])

  return (
    <section>
      <h2>
        {t('exams.title')}
        <InfoTip title={t('exams.title')}>
          <ExamsTour />
        </InfoTip>
      </h2>
      {live.data !== undefined && (
        <LiveCard live={live.data} refreshing={refreshing} onRefresh={() => void refresh()} />
      )}
      <ErrorNote error={live.error} onRetry={() => void live.reload()} />

      <ExamStatsPanel />
    </section>
  )
}

/**
 * La hora del reloj, que avanza cada segundo mientras se ve la tarjeta. Se
 * pone en hora al llegar datos nuevos: si no, la cuenta atrás recién
 * refrescada empezaría un segundo por encima.
 */
function useNow(since: unknown): number {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    setNow(Date.now())

    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [since])

  return now
}

/** Lo que falta hasta `iso`, como un reloj: `1:05:09` o `4:59`. Nunca negativo. */
function remaining(iso: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const pad = (value: number): string => String(value).padStart(2, '0')

  return hours > 0
    ? `${String(hours)}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${String(minutes)}:${pad(seconds % 60)}`
}

/** El examen de ahora: quién está, por examen, y cómo va cada cual. */
function LiveCard({
  live,
  refreshing,
  onRefresh,
}: {
  live: LiveExam
  refreshing: boolean
  onRefresh: () => void
}) {
  const { t, lang } = useI18n()
  const [track, setTrack] = useState<TrackFilter>('all')
  const [circle, setCircle] = useState<string>('all')
  const now = useNow(live)

  if (live.exam === null) return <p className="estado">{t('exams.none')}</p>

  const time = (iso: string): string =>
    new Date(iso).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })
  const day =
    live.exam.when === 'today'
      ? t('exams.next')
      : live.exam.when === 'tomorrow'
        ? t('exams.tomorrow')
        : new Date(live.exam.beginAt).toLocaleDateString(localeOf(lang), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
  const circles = [
    ...new Set(live.groups.flatMap((group) => group.people.map((person) => person.circle))),
  ]
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)
  const shown = (person: LiveExaminee): boolean =>
    (track === 'all' || person.track === track) &&
    (circle === 'all' || String(person.circle) === circle)
  // El botón espera al minuto que pone la API, que es el mismo para todo el campus.
  const locked = live.refreshableAt !== null && Date.parse(live.refreshableAt) > now

  return (
    <article className={`card exam-live ${live.running ? 'running' : ''}`}>
      <span className="eyebrow">{live.running ? `● ${t('exams.live')}` : day}</span>
      <h3>
        {live.exam.name}
        {live.exam.location !== null && <small> · {live.exam.location}</small>}
      </h3>
      <p className="hint">
        {time(live.exam.beginAt)}–{time(live.exam.endAt)}
        {live.updatedAt !== null && ` · ${t('exams.updated', { time: time(live.updatedAt) })}`}
      </p>
      {live.running && (
        <div className="exam-clocks">
          <span role="timer" aria-label={t('exams.endsInLabel')}>
            {t('exams.endsIn', { time: remaining(live.exam.endAt, now) })}
          </span>
          {live.nextRefreshAt !== null && (
            <span role="timer" aria-label={t('exams.nextRefreshLabel')}>
              {t('exams.nextRefresh', { time: remaining(live.nextRefreshAt, now) })}
            </span>
          )}
          <button
            type="button"
            className="primary small"
            disabled={locked || refreshing}
            onClick={onRefresh}
          >
            {t('exams.refresh')}
          </button>
          {locked && live.refreshableAt !== null && (
            <small className="hint">
              {t('exams.refreshIn', { time: remaining(live.refreshableAt, now) })}
            </small>
          )}
        </div>
      )}
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
              {group.name ?? t('exams.unknownExam')} <small>({people.length})</small>
            </h4>
            <ul className="exam-people">
              {people.map((person) => (
                <li key={person.login} className={`status-${person.status}`}>
                  <Avatar login={person.login} image={person.image} size={32} />
                  <PersonLink login={person.login} className="" />
                  <span className="exam-badges">
                    {person.circle !== null && (
                      <span className="badge subtle">
                        {t('graph.circle', { n: person.circle })}
                      </span>
                    )}
                    <span className="badge subtle">{t(`exams.track.${person.track}`)}</span>
                    <span className="badge exam-status">{t(`exams.status.${person.status}`)}</span>
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
