import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type {
  BlackHolePerson,
  BlackHoleStats,
  ExamFamily,
  ExamKickoff,
  ExamStat,
  ExamStats,
  ExamTrack,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { Show } from '../../shared/detail'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import type { Translate } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonLink } from '../../shared/ui/PersonLink'

/** Qué exámenes se ven: los de C, los de Nexus o los dos, uno al lado del otro. */
type FamilyFilter = ExamFamily | 'both'

const TRACKS: readonly ExamTrack[] = ['all', 'classic', 'next']
const FAMILIES: readonly FamilyFilter[] = ['classic', 'next', 'both']
/** Con menos gente, una kickoff va aparte (suele ser alguien con la fecha mal deducida). */
/** Intentos que se ven de entrada; los demás, al desplegar. */
const SHOWN_ATTEMPTS = 5
const SMALL_KICKOFF = 5
const DAY_MS = 86_400_000

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
 * mismo rango en la misma fila) y una o varias kickoffs. Debajo, las kickoffs
 * una al lado de otra, la duración de los círculos y el black hole.
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
          <KickoffTable data={data} family={family} />
          <Circles data={data} />
          <BlackHole stats={data.blackHole} />
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
          mark: attempt.avgMark === null ? '—' : Math.round(attempt.avgMark),
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
      {/* El detalle por intento es denso: solo para quien quiere los datos. */}
      {exam.byAttempt.length > 0 && (
        <Show from="datos">
          <span className="eyebrow">{t('exams.byAttempt')}</span>
          <ul className="rows exam-attempts">
            {exam.byAttempt.slice(0, SHOWN_ATTEMPTS).map(line)}
          </ul>
          {exam.byAttempt.length > SHOWN_ATTEMPTS && (
            <details className="exam-more">
              <summary>
                {t('exams.moreAttempts', { n: exam.byAttempt.length - SHOWN_ATTEMPTS })}
              </summary>
              <ul className="rows exam-attempts">
                {exam.byAttempt.slice(SHOWN_ATTEMPTS).map(line)}
              </ul>
            </details>
          )}
        </Show>
      )}
    </article>
  )
}

/** Las kickoffs una al lado de otra: su gente, quién aprobó cada examen y el black hole. */
function KickoffTable({ data, family }: { data: ExamStats; family: FamilyFilter }) {
  const { t } = useI18n()
  const month = useMonth()
  const exams = data.exams
    .filter((exam) => family === 'both' || exam.family === family)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.family.localeCompare(b.family))

  if (data.byKickoff.length === 0) return null

  return (
    <article className="card exam-kickoff-table">
      <span className="eyebrow">{t('exams.byKickoff')}</span>
      <div className="exam-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('exams.col.kickoff')}</th>
              <th scope="col">{t('exams.col.people')}</th>
              {exams.map((exam) => (
                <th key={exam.projectId} scope="col">
                  {exam.name}
                </th>
              ))}
              <th scope="col">{t('exams.col.absorbed')}</th>
            </tr>
          </thead>
          <tbody>
            {data.byKickoff.map((row) => (
              <tr key={row.month}>
                <th scope="row">{month(row.month)}</th>
                <td>{row.people}</td>
                {exams.map((exam) => {
                  const cell = row.exams.find((one) => one.projectId === exam.projectId)
                  const passed = cell?.passed ?? 0

                  return (
                    <td key={exam.projectId}>
                      {t('exams.bar', { n: passed, pct: pctOf(t, passed, row.people) })}
                    </td>
                  )
                })}
                <td>
                  {t('exams.bar', { n: row.absorbed, pct: pctOf(t, row.absorbed, row.known) })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

/** El black hole: cuánta gente se lleva en cada círculo, cada mes, y quién está cerca. */
function BlackHole({ stats }: { stats: BlackHoleStats }) {
  const { t } = useI18n()
  const month = useMonth()

  if (stats.known === 0) return null

  const mostCircle = Math.max(1, ...stats.circles.map((circle) => circle.absorbed))
  const mostMonth = Math.max(1, ...stats.months.map((each) => each.absorbed))

  return (
    <article className="card exam-black-hole">
      <span className="eyebrow">{t('exams.bh.title')}</span>
      <p>
        <strong>
          {t('exams.bh.total', {
            n: stats.absorbed,
            known: stats.known,
            pct: pctOf(t, stats.absorbed, stats.known),
          })}
        </strong>
      </p>
      <span className="eyebrow">{t('exams.bh.circles')}</span>
      <ul className="exam-bars wide" aria-label={t('exams.bh.circles')}>
        {stats.circles.map((circle) => (
          <li key={circle.circle}>
            <span>{t('graph.circle', { n: circle.circle })}</span>
            <i style={{ width: `${(circle.absorbed / mostCircle) * 100}%` }} />
            <small>
              {t('exams.bh.circleLine', {
                n: circle.absorbed,
                reached: circle.reached,
                pct: pctOf(t, circle.absorbed, circle.reached),
              })}
            </small>
          </li>
        ))}
      </ul>
      <ul className="exam-soon">
        {stats.soon.map((each) => (
          <li key={each.days}>
            <strong>
              {t('exams.bar', { n: each.people, pct: pctOf(t, each.people, stats.known) })}
            </strong>{' '}
            <small className="hint">{t('exams.bh.soon', { n: each.days })}</small>
          </li>
        ))}
      </ul>
      <Show from="datos">
        {stats.months.length > 0 && (
          <>
            <span className="eyebrow">{t('exams.bh.months')}</span>
            <ul className="exam-bars wide" aria-label={t('exams.bh.months')}>
              {stats.months.map((each) => (
                <li key={each.month}>
                  <span>{month(each.month)}</span>
                  <i style={{ width: `${(each.absorbed / mostMonth) * 100}%` }} />
                  <small>
                    {t('exams.bar', {
                      n: each.absorbed,
                      pct: pctOf(t, each.absorbed, stats.known),
                    })}
                  </small>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="exam-bh-lists">
          <PeopleList title={t('exams.bh.recent')} people={stats.recent} past />
          <PeopleList title={t('exams.bh.closest')} people={stats.closest} past={false} />
        </div>
      </Show>
    </article>
  )
}

/** Una lista de gente del black hole: cuándo, en qué círculo y de qué kickoff. */
function PeopleList(props: { title: string; people: readonly BlackHolePerson[]; past: boolean }) {
  const { t } = useI18n()
  const { date } = useFormat()
  const month = useMonth()
  const when = (person: BlackHolePerson): ReactNode =>
    props.past
      ? date(person.at, 'medium')
      : t('exams.bh.left', {
          n: Math.max(0, Math.ceil((Date.parse(person.at) - Date.now()) / DAY_MS)),
        })

  return (
    <section>
      <h4>{props.title}</h4>
      {props.people.length === 0 ? (
        <p className="estado">{t('exams.bh.nobody')}</p>
      ) : (
        <ul className="exam-people" aria-label={props.title}>
          {props.people.map((person) => (
            <li key={person.login}>
              <Avatar login={person.login} image={person.image} size={32} />
              <PersonLink login={person.login} className="" />
              <span className="exam-badges">
                {person.circle !== null && (
                  <span className="badge subtle">{t('graph.circle', { n: person.circle })}</span>
                )}
                {person.kickoff !== null && (
                  <span className="badge subtle">{month(person.kickoff)}</span>
                )}
              </span>
              <small className="exam-when">{when(person)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
