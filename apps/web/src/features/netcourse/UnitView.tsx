import { useState } from 'react'

import type { CourseRun, NetAttemptResult, NetCourse } from '@sanatorio/contracts'
import { estimateOf, starGoals, timeGoalsOf, unitIn } from '@sanatorio/netsim'
import type { Unit, UnitText } from '@sanatorio/netsim'

import { api } from '../../shared/api'
import { useActiveTime } from '../../shared/course/activeTime'
import { EstimateBadge } from '../../shared/course/Estimate'
import { clock, StarRules, starText } from '../../shared/course/Stars'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Challenge } from './Challenge'
import { Example } from './Example'

const STEPS = ['theory', 'example', 'test'] as const

type Step = (typeof STEPS)[number]

type PointProps = {
  unit: Unit
  course: NetCourse
  onCourse: (course: NetCourse) => void
}

/**
 * Un punto del curso de redes. Una unidad: teoría, ejemplo y prueba (la
 * plantilla de cursos). Un jefe: la historia, sus tareas y el contrarreloj.
 */
export function UnitView({ onBack, ...point }: PointProps & { onBack: () => void }) {
  const { t, lang } = useI18n()
  const { unit, course } = point
  const text = unitIn(unit, lang)
  const stars = course.stars[unit.id]
  const time = timeGoalsOf(unit)

  useActiveTime('net', unit.id)

  return (
    <article className={`git-level shell-unit net-unit ${unit.kind}`}>
      <header className="git-level-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← {t('shell.back')}
        </button>
        <h3>
          {text.title}{' '}
          {stars !== undefined && <span className="course-stars">{starText(stars)}</span>}{' '}
          <EstimateBadge seconds={estimateOf(unit)} />
        </h3>
        <p className="git-goal">
          <strong>{t('shell.goal')}:</strong> {text.goal}
        </p>
        {time === null ? <CheckRules /> : <StarRules time={time} rule={t('shell.time.rule')} />}
      </header>
      {unit.kind === 'unit' ? (
        <Lesson unit={unit} text={text} onCourse={point.onCourse} />
      ) : (
        <Boss {...point} text={text} />
      )}
    </article>
  )
}

/** Lo que da cada estrella en una unidad: cuántas comprobaciones (`checkGoals` de la plantilla). */
function CheckRules() {
  const { t } = useI18n()
  const goals = starGoals()
  const rules = [
    t('net.stars.three'),
    t('net.stars.two', { two: goals.two }),
    t('course.stars.any'),
  ]

  return (
    <div className="course-star-rules">
      <ul aria-label={t('net.stars.title')}>
        {rules.map((rule, index) => (
          <li key={rule}>
            <span className="course-stars" aria-hidden="true">
              {starText(3 - index)}
            </span>{' '}
            {rule}
          </li>
        ))}
      </ul>
      <details>
        <summary>{t('net.stars.what')}</summary>
        <p>{t('net.stars.rule')}</p>
      </details>
    </div>
  )
}

/** Las tres pestañas de una unidad. */
function Lesson({
  unit,
  text,
  onCourse,
}: {
  unit: Unit
  text: UnitText
  onCourse: (course: NetCourse) => void
}) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('theory')
  const next = STEPS[STEPS.indexOf(step) + 1]

  return (
    <>
      <PillGroup
        kind="tabs"
        options={STEPS}
        value={step}
        onChange={setStep}
        label={text.title}
        text={(option) => `${STEPS.indexOf(option) + 1}. ${t(`shell.step.${option}`)}`}
      />
      {step === 'theory' && <Theory text={text} />}
      {step === 'example' && <Example unit={unit} text={text.example} />}
      {step === 'test' && (
        <Challenge
          unit={unit}
          run={null}
          onResult={(result) => {
            onCourse(result.course)
          }}
        />
      )}
      {next !== undefined && (
        <div className="git-actions net-next">
          <button
            type="button"
            onClick={() => {
              setStep(next)
            }}
          >
            {t(next === 'example' ? 'shell.toExample' : 'shell.toTest')}
          </button>
        </div>
      )}
    </>
  )
}

/** La teoría, con las partes de siempre (`Theory` de `@sanatorio/course`) y los mismos rótulos que los demás cursos. */
function Theory({ text }: { text: UnitText }) {
  const { t } = useI18n()
  const theory = text.theory

  if (theory === undefined) return null

  const parts = (['what', 'how', 'when', 'whenNot', 'problems'] as const).flatMap((part) => {
    const body = theory[part]

    return body === undefined ? [] : [{ part, body }]
  })

  return (
    <dl className="git-theory net-theory">
      {parts.map(({ part, body }) => (
        <div key={part}>
          <dt>{t(`shell.theory.${part}`)}</dt>
          <dd>{typeof body === 'string' ? body : <pre>{body.join('\n')}</pre>}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Un jefe: historia y tareas a la vista; el reloj, de la API, empieza al pulsar. */
function Boss({ unit, course, onCourse, text }: PointProps & { text: UnitText }) {
  const { t } = useI18n()
  const starting = useAction()
  const [state, setState] = useState<{
    run: CourseRun | null
    round: number
    won: NetAttemptResult | null
  }>({ run: course.runs[unit.id] ?? null, round: 0, won: null })

  const start = () =>
    void starting.run(async () => {
      const started = await api.startNetBoss(unit.id)

      onCourse(started.course)
      setState({ run: started.run, round: state.round + 1, won: null })
    })

  return (
    <section className="shell-boss net-boss">
      <div className="shell-story">
        <p>{text.story}</p>
        <ol>
          {text.tasks?.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ol>
      </div>
      {state.won !== null && (
        <div className={`git-won shell-won ${unit.kind}`} role="status">
          <p>
            <span className="course-stars">{starText(state.won.stars)}</span>{' '}
            {t('shell.boss.won', { time: clock(state.won.seconds ?? 0) })}
          </p>
          {unit.kind === 'final' && <p className="shell-cert-won">{t(`net.cert.${unit.tier}`)}</p>}
        </div>
      )}
      {state.run === null ? (
        <div className="git-actions">
          <button type="button" className="primary" disabled={starting.busy} onClick={start}>
            {state.won === null
              ? t('shell.boss.start', { time: clock(unit.limit ?? 0) })
              : t('shell.boss.again')}
          </button>
        </div>
      ) : (
        <Challenge
          key={state.round}
          unit={unit}
          run={state.run}
          onRestart={start}
          onResult={(answer) => {
            onCourse(answer.course)
            if (answer.done) setState({ ...state, run: null, won: answer })
          }}
        />
      )}
      <ErrorNote error={starting.error} />
    </section>
  )
}
