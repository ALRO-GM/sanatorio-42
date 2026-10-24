import { useRef, useState } from 'react'

import type { ExamFamily, ExamKickoff, ExamStat, ExamStats, ExamTrack } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { Show } from '../../shared/detail'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import type { Translate } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/** Qué exámenes se ven: los de C, los de Nexus o los dos, uno al lado del otro. */
type FamilyFilter = ExamFamily | 'both'

const TRACKS: readonly ExamTrack[] = ['all', 'classic', 'next']
const FAMILIES: readonly FamilyFilter[] = ['classic', 'next', 'both']
/** Intentos que se ven de entrada; los demás, al desplegar. */
const SHOWN_ATTEMPTS = 3
/** Con menos gente, una kickoff va aparte (suele ser alguien con la fecha mal deducida). */
const SMALL_KICKOFF = 5

/** «12 %», o «—» si no hay de dónde sacarlo. */
const pctOf = (t: Translate, part: number, whole: number): string =>
  whole === 0 ? '—' : t('exams.pct', { n: Math.round((part / whole) * 100) })

/** «oct 2025»: el mes de una kickoff, en el idioma de la web. */
function useMonth(): (month: string) => string {
  const { date } = useFormat()

  return (month) => date(`${month}-01T00:00:00Z`, 'monthYear')
}

/** Un desplegable de los que solo vale una opción. */
function Choice<T extends string>(props: {
  label: string
  options: readonly T[]
  current: T
  onPick: (value: T) => void
  text: (value: T) => string
}) {
  return (
    <label className="exam-choice">
      <span>{props.label}</span>
      <select
        value={props.current}
        onChange={(event) => {
          const picked = props.options.find((option) => option === event.target.value)

          if (picked !== undefined) props.onPick(picked)
        }}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {props.text(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Las estadísticas de exámenes del campus (#81 del buzón): se elige el plan de
 * la gente (C o Python), qué exámenes (los de C, los de Nexus o los dos, el
 * mismo rango en la misma fila) y una o varias kickoffs. Debajo, la duración
 * de los círculos. El black hole no sale: la fecha que da 42 no es de fiar.
 */
export function ExamStatsPanel() {
  const { t } = useI18n()
  const [track, setTrack] = useState<ExamTrack>('all')
  const [family, setFamily] = useState<FamilyFilter>('both')
  const [kickoffs, setKickoffs] = useState<string[]>([])
  const stats = useAsync(() => api.getExamStats({ track, kickoffs }), [track, kickoffs.join(',')])
  // Al cambiar de filtro, `useAsync` se vacía hasta la respuesta: se siguen
  // enseñando las cifras anteriores para que los botones no desaparezcan.
  const kept = useRef<ExamStats | undefined>(undefined)

  if (stats.data !== undefined) kept.current = stats.data

  const data = stats.data ?? kept.current
  const toggle = (month: string): void => {
    setKickoffs((current) =>
      current.includes(month) ? current.filter((one) => one !== month) : [...current, month],
    )
  }

  return (
    <>
      <h3 className="exams-subtitle">{t('exams.stats')}</h3>
      {data === undefined && stats.loading && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={stats.error} onRetry={() => void stats.reload()} />
      {data !== undefined && (
        <>
          {data.backfill.done < data.backfill.total && (
            <p className="hint">
              {t('exams.backfill', {
                done: data.backfill.done,
                total: data.backfill.total,
              })}
            </p>
          )}
          <div className="exam-filters">
            <Choice
              label={t('exams.trackFilter')}
              options={TRACKS}
              current={track}
              onPick={setTrack}
              text={(value) => t(`exams.plan.${value}`)}
            />
            <Choice
              label={t('exams.familyFilter')}
              options={FAMILIES}
              current={family}
              onPick={setFamily}
              text={(value) => t(`exams.family.${value}`)}
            />
            <KickoffPicker
              all={data.kickoffs}
              track={track}
              chosen={kickoffs}
              onToggle={toggle}
              onAll={() => {
                setKickoffs([])
              }}
            />
          </div>
          <p className="hint">{t('exams.selection', { n: data.people })}</p>
          <ExamPairs exams={data.exams} family={family} />
          <Circles data={data} />
        </>
      )}
    </>
  )
}

/**
 * Las kickoffs para elegir, en un desplegable con casillas (se pueden marcar
 * varias), con su gente del plan elegido; las de poca gente, al final.
 */
function KickoffPicker(props: {
  all: readonly ExamKickoff[]
  track: ExamTrack
  chosen: readonly string[]
  onToggle: (month: string) => void
  onAll: () => void
}) {
  const { t } = useI18n()
  const month = useMonth()
  const count = (kickoff: ExamKickoff): number =>
    props.track === 'all' ? kickoff.classic + kickoff.next : kickoff[props.track]
  // Una elegida sigue a la vista aunque en este plan no tenga a nadie: si no, no se podría quitar.
  const shown = props.all.filter(
    (kickoff) => count(kickoff) > 0 || props.chosen.includes(kickoff.month),
  )
  const big = shown.filter((kickoff) => count(kickoff) >= SMALL_KICKOFF)
  const small = shown.filter((kickoff) => count(kickoff) < SMALL_KICKOFF)
  const box = (kickoff: ExamKickoff) => (
    <label key={kickoff.month} className="exam-kickoff-option">
      <input
        type="checkbox"
        checked={props.chosen.includes(kickoff.month)}
        onChange={() => {
          props.onToggle(kickoff.month)
        }}
      />{' '}
      {t('exams.kickoffPill', { month: month(kickoff.month), n: count(kickoff) })}
    </label>
  )

  return (
    <div className="exam-choice">
      <span>{t('exams.kickoffs')}</span>
      <details className="exam-kickoff-select">
        <summary>
          {props.chosen.length === 0
            ? t('exams.kickoff.all')
            : props.chosen.length === 1
              ? month(props.chosen[0] ?? '')
              : t('exams.kickoff.chosen', { n: props.chosen.length })}
        </summary>
        <div className="exam-kickoff-list" role="group" aria-label={t('exams.kickoffs')}>
          <label className="exam-kickoff-option">
            <input type="checkbox" checked={props.chosen.length === 0} onChange={props.onAll} />{' '}
            {t('exams.kickoff.all')}
          </label>
          {big.map(box)}
          {small.length > 0 && (
            <>
              <span className="hint">{t('exams.kickoff.small', { n: small.length })}</span>
              {small.map(box)}
            </>
          )}
        </div>
      </details>
    </div>
  )
}

/** Los exámenes por rango: cada fila, el de C y el de Nexus de ese número, juntos. */
function ExamPairs({ exams, family }: { exams: readonly ExamStat[]; family: FamilyFilter }) {
  const { t } = useI18n()
  const families: ExamFamily[] = family === 'both' ? ['classic', 'next'] : [family]
  const shown = exams.filter((exam) => families.includes(exam.family))
  const ranks = [...new Set(shown.map((exam) => exam.rank))].sort(
    (a, b) => (a ?? Infinity) - (b ?? Infinity),
  )

  if (shown.length === 0) return <p className="estado">{t('exams.noStats')}</p>

  return (
    <div className="exam-pairs">
      {ranks.map((rank) => (
        <section key={rank ?? 'otro'} className={`exam-pair cols-${families.length}`}>
          <h4>{rank === null ? t('exams.otherRank') : t('exams.rank', { n: rank })}</h4>
          {families.map((each) => {
            const exam = shown.find((one) => one.rank === rank && one.family === each)

            return exam === undefined ? (
              <article key={each} className="card exam-card exam-empty">
                <span className="eyebrow">{t(`exams.family.${each}`)}</span>
                <p className="estado">{t('exams.noAttempts')}</p>
              </article>
            ) : (
              <ExamCard key={each} exam={exam} />
            )
          })}
        </section>
      ))}
    </div>
  )
}

/** Las estadísticas de un examen: intentos hasta aprobar y cómo va cada intento, sin tope. */
function ExamCard({ exam }: { exam: ExamStat }) {
  const { t } = useI18n()
  const { number } = useFormat()
  const most = Math.max(1, ...exam.attemptsToPass)
  const known = exam.attemptsToPass.reduce((sum, count) => sum + count, 0)
  const bar = (count: number, index: number) => (
    <li key={index}>
      <span>{index + 1}</span>
      <i style={{ width: `${(count / most) * 100}%` }} />
      <small>{t('exams.bar', { n: count, pct: pctOf(t, count, known) })}</small>
    </li>
  )
  const line = (attempt: ExamStat['byAttempt'][number]) => (
    <li key={attempt.attempt} className="row">
      <span>{t('exams.attempt', { n: attempt.attempt })}</span>
      <span>
        {t('exams.attemptLine', {
          mark: attempt.medianMark === null ? '—' : Math.round(attempt.medianMark),
          pct: Math.round(attempt.passRate * 100),
          n: attempt.people,
        })}
      </span>
    </li>
  )

  return (
    <article className="card exam-card">
      <span className="eyebrow">{exam.name}</span>
      <p>
        <strong>
          {exam.avgAttempts === null ? '—' : t('exams.avg', { n: number(exam.avgAttempts, 1) })}
        </strong>{' '}
        <small className="hint">
          {t('exams.people', {
            passed: exam.passed,
            people: exam.people,
            pct: pctOf(t, exam.passed, exam.people),
          })}
        </small>
      </p>
      {exam.attemptsToPass.length > 0 && (
        <>
          <span className="eyebrow">{t('exams.toPass')}</span>
          <ul className="exam-bars" aria-label={t('exams.toPass')}>
            {exam.attemptsToPass.slice(0, SHOWN_ATTEMPTS).map(bar)}
          </ul>
          {exam.attemptsToPass.length > SHOWN_ATTEMPTS && (
            <details className="exam-more">
              <summary>
                {t('exams.moreAttempts', {
                  n: exam.attemptsToPass.length - SHOWN_ATTEMPTS,
                })}
              </summary>
              <ul className="exam-bars">
                {exam.attemptsToPass
                  .slice(SHOWN_ATTEMPTS)
                  .map((count, index) => bar(count, index + SHOWN_ATTEMPTS))}
              </ul>
            </details>
          )}
        </>
      )}
      {/* El detalle por intento es denso: plegado, y solo para quien quiere los datos. */}
      {exam.byAttempt.length > 0 && (
        <Show from="datos">
          <details className="exam-more">
            <summary>{t('exams.byAttempt')}</summary>
            <ul className="rows exam-attempts">{exam.byAttempt.map(line)}</ul>
          </details>
        </Show>
      )}
    </article>
  )
}

/** Cuánto se tarda en cada círculo, de la gente elegida. */
function Circles({ data }: { data: ExamStats }) {
  const { t } = useI18n()

  if (data.circles.length === 0) return null

  return (
    <Show from="datos">
      <article className="card">
        <span className="eyebrow">{t('exams.circles')}</span>
        <p className="hint">{t('exams.circlesHint')}</p>
        <ul className="rows">
          {data.circles.map((circle) => (
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
  )
}
