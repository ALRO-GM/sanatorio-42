import { useCallback, useEffect, useState } from 'react'

import type { LiveExam, LiveExamGroup, LiveExamResults, LiveExaminee } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'
import { ExamPeople } from './ExamPeople'
import { ExamStatsPanel } from './ExamStatsPanel'
import { ExamsTour } from './ExamsTour'
import { PoolOnly } from '../../shared/ui/PoolOnly'

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

  return (
    <section>
      <h2>
        {t('exams.title')}
        <InfoTip title={t('exams.title')}>
          <ExamsTour />
        </InfoTip>
      </h2>
      {/* Un piscinero, solo lo que permite el panel (`docs/piscineros.md`). */}
      <PoolOnly k="examenes.live">
        <LiveSection />
      </PoolOnly>
      <PoolOnly k="examenes.stats">
        <ExamStatsPanel />
      </PoolOnly>
    </section>
  )
}

/** El examen en marcha (o el siguiente), que se pone al día solo. */
function LiveSection() {
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
    <>
      {live.data !== undefined && (
        <LiveCard live={live.data} refreshing={refreshing} onRefresh={() => void refresh()} />
      )}
      {live.data?.last && <LastExamCard last={live.data.last} />}
      <ErrorNote error={live.error} onRetry={() => void live.reload()} />
    </>
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

/**
 * La nota de hoy sobre 100, como barra: azul mientras sigue dentro, y del color
 * del aprobado o del suspenso al cerrar. Sin nota aún, vacía y con un brillo
 * que dice que está en marcha.
 */
function ExamProgress({ person }: { person: LiveExaminee }) {
  const { t } = useI18n()
  const value = Math.max(0, Math.min(100, person.mark ?? 0))

  return (
    <span
      className={`exam-progress ${person.mark === null ? 'waiting' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={t('exams.progressLabel', { login: person.login })}
    >
      <span style={{ width: `${String(value)}%` }} />
    </span>
  )
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
            {t('common.refresh')}
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
      <ExamGroups groups={live.groups} shown={shown} bars={live.running} />
    </article>
  )
}

/**
 * La gente de un examen, por grupos: estado, nota de hoy, la mejor en la
 * esquina y, con `bars`, la barra de progreso.
 */
function ExamGroups({
  groups,
  shown = () => true,
  bars,
}: {
  groups: readonly LiveExamGroup[]
  shown?: (person: LiveExaminee) => boolean
  bars: boolean
}) {
  const { t } = useI18n()

  return (
    <>
      {groups.map((group) => {
        const people = group.people.filter(shown)

        if (people.length === 0) return null

        return (
          <section key={group.projectId ?? 'none'} className="exam-group">
            <h4>
              {group.name ?? t('exams.unknownExam')} <small>({people.length})</small>
            </h4>
            <ExamPeople
              people={people}
              rowClass={(person) => `status-${person.status}`}
              badges={(person) => (
                <>
                  <span className="badge subtle">{t(`exams.track.${person.track}`)}</span>
                  <span className="badge exam-status">{t(`exams.status.${person.status}`)}</span>
                </>
              )}
              end={(person) =>
                person.mark === null && person.status === 'inProgress' ? (
                  // 42 no da nota hasta que se cierra el examen: un guion, que la
                  // barra vacía con su brillo ya dice que sigue dentro.
                  <strong
                    className="exam-mark pending"
                    title={t('exams.markLaterHint')}
                    aria-label={t('exams.markLater')}
                  >
                    —
                  </strong>
                ) : (
                  <strong className="exam-mark">{person.mark ?? '—'}</strong>
                )
              }
              corner={(person) =>
                person.bestMark !== null && (
                  <small className="exam-best">{t('exams.bestMark', { n: person.bestMark })}</small>
                )
              }
              footer={(person) => bars && <ExamProgress person={person} />}
            />
          </section>
        )
      })}
    </>
  )
}

/**
 * El último examen acabado, con los resultados de quien entró: no desaparece
 * al acabar, para que se pueda revisar después (cómo le fue a cada cual).
 */
function LastExamCard({ last }: { last: LiveExamResults }) {
  const { t, lang } = useI18n()
  const when = new Date(last.exam.beginAt).toLocaleString(localeOf(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article className="card exam-live exam-last">
      <span className="eyebrow">{t('exams.lastTitle')}</span>
      <h3>
        {last.exam.name}
        {last.exam.location !== null && <small> · {last.exam.location}</small>}
      </h3>
      <p className="hint">{when}</p>
      {last.groups.length === 0 ? (
        <p className="estado">{t('exams.lastNobody')}</p>
      ) : (
        <ExamGroups groups={last.groups} bars />
      )}
    </article>
  )
}
