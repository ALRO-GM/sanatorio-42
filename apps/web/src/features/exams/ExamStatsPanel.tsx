import { useRef, useState } from 'react'

import type {
  BlackholePerson,
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
import { ChartWithRail } from '../../shared/ui/ChartWithRail'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonLink } from '../../shared/ui/PersonLink'
import { PillGroup } from '../../shared/ui/PillGroup'
import { StepPicker } from '../../shared/ui/StepPicker'

/** Qué exámenes se ven: los de C, los de Nexus o los dos, uno al lado del otro. */
type FamilyFilter = ExamFamily | 'both'

/** Las dos kickoffs (`AAAA-MM`) que se comparan; '' si aún no se ha elegido. */
type Pair = readonly [string, string]

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
 * de los círculos y a cuánta gente se tragó el black hole en cada uno (lo que
 * 42 hizo al echarla, no su fecha, que no es de fiar: `docs/blackhole.md`) y,
 * con nombres, quién se fue y quién lo tiene más cerca: las dos cosas desde el
 * modo normal y para todo el mundo (decidido por Alberto el 2026-11-14).
 *
 * Las opciones van en un panel a la derecha y las cifras a la izquierda
 * (`docs/interfaz.md`, «Gráficas con opciones»); en el modo de datos, además,
 * se comparan dos kickoffs una al lado de la otra (#81).
 */
export function ExamStatsPanel() {
  const { t, tn } = useI18n()
  const [track, setTrack] = useState<ExamTrack>('all')
  const [family, setFamily] = useState<FamilyFilter>('both')
  const [kickoffs, setKickoffs] = useState<string[]>([])
  // Las dos kickoffs que se comparan (modo de datos); '' es ninguna.
  const [pair, setPair] = useState<Pair>(['', ''])
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
      <ErrorNote error={stats.error} retry />
      {data !== undefined && (
        <>
          {data.backfill.done < data.backfill.total && (
            <p className="hint">
              {tn('exams.backfill', data.backfill.total, {
                done: data.backfill.done,
                total: data.backfill.total,
              })}
            </p>
          )}
          <ChartWithRail
            framed={false}
            railLabel={t('exams.options')}
            chart={
              <>
                <p className="hint">{tn('exams.selection', data.people)}</p>
                <Show from="datos">
                  <KickoffCompare track={track} family={family} pair={pair} />
                </Show>
                <ExamPairs exams={data.exams} family={family} />
              </>
            }
          >
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
            <Show from="datos">
              <ComparePickers kickoffs={data.kickoffs} pair={pair} onChange={setPair} />
            </Show>
          </ChartWithRail>
          <Circles data={data} />
          <Show from="normal">
            <BlackholeCircles data={data} />
            <BlackholeHistory track={track} kickoffs={kickoffs} />
          </Show>
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
  const { t, tn } = useI18n()
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
        {tn('exams.attemptLine', attempt.people, {
          mark: attempt.medianMark === null ? '—' : Math.round(attempt.medianMark),
          pct: Math.round(attempt.passRate * 100),
        })}
      </span>
    </li>
  )

  return (
    <article className="card exam-card">
      <span className="eyebrow">{exam.name}</span>
      <p>
        <strong>
          {exam.avgAttempts === null
            ? '—'
            : tn('exams.avg', Math.round(exam.avgAttempts * 10) / 10)}
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
                {tn('exams.moreAttempts', exam.attemptsToPass.length - SHOWN_ATTEMPTS)}
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
      {/* El detalle por intento es denso: solo para quien quiere los datos. Como la
          cola de intentos, sale plegado (pedido por Alberto, 2026-11-01). */}
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
  const { t, tn } = useI18n()

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
              <strong>{tn('exams.days', circle.median)}</strong>
              <small className="hint">
                {tn('exams.range', circle.people, { p25: circle.p25, p75: circle.p75 })}
              </small>
            </li>
          ))}
        </ul>
      </article>
    </Show>
  )
}

/** Los dos selectores de las kickoffs que se comparan, de la más reciente a la más antigua. */
function ComparePickers(props: {
  kickoffs: readonly ExamKickoff[]
  pair: Pair
  onChange: (pair: Pair) => void
}) {
  const { t } = useI18n()
  const month = useMonth()
  const options = ['', ...props.kickoffs.map((kickoff) => kickoff.month)]
  const text = (value: string): string => (value === '' ? t('exams.compare.none') : month(value))

  return (
    <fieldset className="exam-compare-pick">
      <legend>{t('exams.compare.title')}</legend>
      <StepPicker
        label={t('exams.compare.first')}
        options={options}
        value={props.pair[0]}
        onChange={(next) => {
          props.onChange([next, props.pair[1]])
        }}
        text={text}
      />
      <StepPicker
        label={t('exams.compare.second')}
        options={options}
        value={props.pair[1]}
        onChange={(next) => {
          props.onChange([props.pair[0], next])
        }}
        text={text}
      />
    </fieldset>
  )
}

/** «12 de 40 · 30 %», o «—» si nadie lo ha intentado. */
function passLine(t: Translate, exam: ExamStat | undefined): string {
  return exam === undefined || exam.people === 0
    ? '—'
    : t('exams.people', {
        passed: exam.passed,
        people: exam.people,
        pct: pctOf(t, exam.passed, exam.people),
      })
}

/**
 * Dos kickoffs una al lado de la otra (#81): de cada examen, cuánta gente de
 * cada una lo aprobó (en cifras y en %) y con cuántos intentos de media. Usa
 * la misma ruta que el resto, una vez por kickoff.
 */
function KickoffCompare(props: { track: ExamTrack; family: FamilyFilter; pair: Pair }) {
  const { t, tn } = useI18n()
  const month = useMonth()
  const [first, second] = props.pair
  const ready = first !== '' && second !== '' && first !== second
  const both = useAsync(
    () =>
      ready
        ? Promise.all([
            api.getExamStats({ track: props.track, kickoffs: [first] }),
            api.getExamStats({ track: props.track, kickoffs: [second] }),
          ])
        : Promise.resolve(null),
    [props.track, first, second],
  )

  if (!ready) return null
  if (both.error !== null) return <ErrorNote error={both.error} retry />
  if (both.data === undefined || both.data === null) {
    return <p className="estado">{t('app.loading')}</p>
  }

  const [left, right] = both.data
  const families: ExamFamily[] = props.family === 'both' ? ['classic', 'next'] : [props.family]
  const key = (exam: ExamStat): string => `${exam.family}:${String(exam.rank)}`
  const names = new Map(
    [...left.exams, ...right.exams]
      .filter((exam) => families.includes(exam.family))
      .map((exam) => [key(exam), exam]),
  )
  const rows = [...names.values()].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.family.localeCompare(b.family),
  )
  const avg = (exam: ExamStat | undefined): string =>
    exam?.avgAttempts === null || exam === undefined
      ? '—'
      : tn('exams.avg', Math.round(exam.avgAttempts * 10) / 10)

  return (
    <div className="exam-compare">
      <table>
        <caption>{t('exams.compare.title')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('exams.familyFilter')}</th>
            <th scope="col">{tn('exams.compare.column', left.people, { month: month(first) })}</th>
            <th scope="col">
              {tn('exams.compare.column', right.people, { month: month(second) })}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((exam) => {
            const a = left.exams.find((one) => key(one) === key(exam))
            const b = right.exams.find((one) => key(one) === key(exam))

            return (
              <tr key={key(exam)}>
                <th scope="row">{exam.name}</th>
                <td>
                  {passLine(t, a)}
                  <small className="hint">{avg(a)}</small>
                </td>
                <td>
                  {passLine(t, b)}
                  <small className="hint">{avg(b)}</small>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A cuánta gente se tragó el black hole en cada círculo (#81), de quien llegó
 * a él: en cifras y en %. Desde el modo normal (2026-11-14, decidido por
 * Alberto): es la cifra que la mayoría viene a mirar, no un desglose de más.
 */
function BlackholeCircles({ data }: { data: ExamStats }) {
  const { t } = useI18n()

  if (data.blackhole.length === 0) return null

  return (
    <article className="card">
      <span className="eyebrow">{t('exams.blackhole.title')}</span>
      <ul className="rows">
        {data.blackhole.map((row) => (
          <li key={row.circle} className="row">
            <span>{t('graph.circle', { n: row.circle })}</span>
            <strong>{pctOf(t, row.absorbed, row.reached)}</strong>
            <small className="hint">
              {t('exams.blackhole.line', { absorbed: row.absorbed, reached: row.reached })}
            </small>
          </li>
        ))}
      </ul>
    </article>
  )
}

/** Las dos listas del historial del black hole. */
const BLACKHOLE_TABS = ['absorbed', 'closest'] as const

/**
 * El historial del black hole de la selección (#81): a quién se tragó y quién
 * lo tiene más cerca. Para todo el mundo desde el 2026-11-14 (decidido por
 * Alberto): lleva lo que 42 ya publica al campus, y la API quita a piscineros,
 * ocultos y cuentas anonimizadas.
 */
function BlackholeHistory({ track, kickoffs }: { track: ExamTrack; kickoffs: readonly string[] }) {
  const { t } = useI18n()
  const { date } = useFormat()
  const month = useMonth()
  const [tab, setTab] = useState<(typeof BLACKHOLE_TABS)[number]>('absorbed')
  const lists = useAsync(
    () => api.getExamBlackhole({ track, kickoffs: [...kickoffs] }),
    [track, kickoffs.join(',')],
  )
  const shown: readonly BlackholePerson[] = lists.data?.[tab] ?? []

  return (
    <article className="card">
      <span className="eyebrow">{t('exams.blackhole.history')}</span>
      <PillGroup
        kind="tabs"
        id="exam-blackhole"
        options={BLACKHOLE_TABS}
        value={tab}
        onChange={setTab}
        label={t('exams.blackhole.history')}
        text={(option) => t(`exams.blackhole.${option}`)}
      />
      <div id={`exam-blackhole-panel-${tab}`} role="tabpanel">
        <ErrorNote error={lists.error} retry />
        {lists.data === undefined && lists.loading && <p className="estado">{t('app.loading')}</p>}
        {lists.data !== undefined && shown.length === 0 && (
          <p className="estado">{t('exams.blackhole.nobody')}</p>
        )}
        {shown.length > 0 && (
          <ul className="rows">
            {shown.map((person) => (
              <li key={person.login} className="row">
                <PersonLink login={person.login} />
                <span>
                  {t('graph.circle', { n: person.circle })} · {t(`exams.plan.${person.track}`)}
                  {person.kickoff === null ? '' : ` · ${month(person.kickoff)}`}
                </span>
                <small className="hint">{date(person.at, 'medium')}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
