import { useEffect, useMemo, useState } from 'react'

import type { CourseRun, ShellAttemptResult, ShellCourse } from '@sanatorio/contracts'
import { estimateOf, exampleOf, starGoals, timeGoalsOf, unitIn } from '@sanatorio/shellsim'
import type { Unit } from '@sanatorio/shellsim'

import { api } from '../../shared/api'
import { useActiveTime } from '../../shared/course/activeTime'
import { EstimateBadge } from '../../shared/course/Estimate'
import { clock, StarRules, starText } from '../../shared/course/Stars'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Challenge } from './Challenge'

const STEPS = ['theory', 'example', 'test'] as const

type Step = (typeof STEPS)[number]

type UnitViewProps = {
  unit: Unit
  course: ShellCourse
  onCourse: (course: ShellCourse) => void
  onBack: () => void
}

/**
 * Un punto del curso. Una unidad: teoría, ejemplo y prueba, en ese orden (la
 * plantilla de cursos). Un jefe: la historia, sus tareas y el contrarreloj.
 */
export function UnitView({ unit, course, onCourse, onBack }: UnitViewProps) {
  const { t, lang } = useI18n()
  const text = unitIn(unit, lang)
  const best = course.stars[unit.id] ?? 0
  const time = timeGoalsOf(unit)
  const [step, setStep] = useState<Step>('theory')

  useActiveTime('shell', unit.id)

  return (
    <article className={`git-level shell-unit ${unit.kind}`}>
      <header className="git-level-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← {t('shell.back')}
        </button>
        <h3>
          {text.title}
          {best > 0 && <span className="course-stars"> {starText(best)}</span>}{' '}
          <EstimateBadge seconds={estimateOf(unit)} />
        </h3>
        <p className="git-goal">
          <strong>{t('shell.goal')}:</strong> {text.goal}
        </p>
        {time === null ? (
          <StarRules goals={starGoals(unit)} rule={t('shell.stars.rule')} />
        ) : (
          <StarRules time={time} rule={t('shell.time.rule')} />
        )}
      </header>
      {unit.kind === 'unit' ? (
        <>
          <PillGroup
            kind="tabs"
            options={STEPS}
            value={step}
            onChange={setStep}
            label={text.title}
            text={(option) => `${STEPS.indexOf(option) + 1}. ${t(`shell.step.${option}`)}`}
          />
          {step === 'theory' && (
            <TheoryView
              unit={unit}
              onNext={() => {
                setStep('example')
              }}
            />
          )}
          {step === 'example' && (
            <ExampleView
              unit={unit}
              onNext={() => {
                setStep('test')
              }}
            />
          )}
          {step === 'test' && (
            <Challenge
              unit={unit}
              run={null}
              onResult={(result) => {
                onCourse(result.course)
              }}
            />
          )}
        </>
      ) : (
        <BossView unit={unit} course={course} onCourse={onCourse} />
      )}
    </article>
  )
}

function TheoryView({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { t, lang } = useI18n()
  const theory = unitIn(unit, lang).theory

  if (theory === undefined) return null

  return (
    <section className="git-theory">
      <dl>
        <dt>{t('shell.theory.what')}</dt>
        <dd>{theory.what}</dd>
        <dt>{t('shell.theory.how')}</dt>
        <dd>
          <pre>{theory.how.join('\n')}</pre>
        </dd>
        <dt>{t('shell.theory.when')}</dt>
        <dd>{theory.when}</dd>
        {theory.whenNot !== undefined && (
          <>
            <dt>{t('shell.theory.whenNot')}</dt>
            <dd>{theory.whenNot}</dd>
          </>
        )}
        {theory.problems !== undefined && (
          <>
            <dt>{t('shell.theory.problems')}</dt>
            <dd>{theory.problems}</dd>
          </>
        )}
      </dl>
      <div className="git-actions">
        <button type="button" onClick={onNext}>
          {t('shell.toExample')}
        </button>
      </div>
    </section>
  )
}

const FRAME_MS = 1400

/** El ejemplo: las órdenes se «escriben» solas, una a una, con su salida de verdad. */
function ExampleView({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { t, lang } = useI18n()
  const steps = useMemo(() => exampleOf(unit), [unit])
  const [shown, setShown] = useState(1)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    if (shown >= steps.length) {
      setPlaying(false)

      return
    }

    const timer = setTimeout(() => {
      setShown((current) => current + 1)
    }, FRAME_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [playing, shown, steps.length])

  return (
    <section className="shell-example">
      <p className="muted">{unitIn(unit, lang).example}</p>
      <div className="course-terminal shell-example-screen" aria-live="polite">
        {steps.slice(0, shown).map((step, index) => (
          <div key={index} className="course-term-entry">
            {step.line.split('\n').map((part, row) => (
              <div key={row} className="course-term-line">
                <span className="course-prompt">{row === 0 ? '$' : '>'}</span> {part}
              </div>
            ))}
            {step.output.map((line, row) => (
              <div key={row} className="course-term-out">
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="git-frame-line">
        <span>{t('shell.example.try')}</span>
        <span className="git-frame-count">
          {shown}/{steps.length}
        </span>
      </p>
      <div className="git-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setShown(1)
            setPlaying(true)
          }}
        >
          ↺ {t('shell.example.replay')}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={shown >= steps.length}
          onClick={() => {
            setPlaying(false)
            setShown(steps.length)
          }}
        >
          {t('shell.example.all')}
        </button>
        <button type="button" onClick={onNext}>
          {t('shell.toTest')}
        </button>
      </div>
    </section>
  )
}

/** Un jefe: la historia y las tareas a la vista; el reloj, de la API, empieza al pulsar. */
function BossView({
  unit,
  course,
  onCourse,
}: {
  unit: Unit
  course: ShellCourse
  onCourse: (course: ShellCourse) => void
}) {
  const { t, lang } = useI18n()
  const text = unitIn(unit, lang)
  const [run, setRun] = useState<CourseRun | null>(course.runs[unit.id] ?? null)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<ShellAttemptResult | null>(null)
  const starting = useAction()

  function start() {
    void starting.run(async () => {
      const started = await api.startShellBoss(unit.id)

      setResult(null)
      setRun(started.run)
      setRound((current) => current + 1)
      onCourse(started.course)
    })
  }

  return (
    <section className="shell-boss">
      <div className="shell-story">
        <p>{text.story}</p>
        <ol>
          {text.tasks?.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ol>
      </div>
      {result?.done === true && <BossWon unit={unit} result={result} />}
      {run === null ? (
        <div className="git-actions">
          <button type="button" className="primary" disabled={starting.busy} onClick={start}>
            {result?.done === true
              ? t('shell.boss.again')
              : t('shell.boss.start', { time: clock(unit.limit ?? 0) })}
          </button>
        </div>
      ) : (
        <Challenge
          key={`${run.startedAt}-${round}`}
          unit={unit}
          run={run}
          onRestart={start}
          onResult={(answer) => {
            setResult(answer)
            onCourse(answer.course)
            if (answer.done) setRun(null)
          }}
        />
      )}
      <ErrorNote error={starting.error} />
    </section>
  )
}

function BossWon({ unit, result }: { unit: Unit; result: ShellAttemptResult }) {
  const { t } = useI18n()

  return (
    <div className={`git-won shell-won ${unit.kind}`} role="status">
      <p>
        <span className="course-stars">{starText(result.stars)}</span>{' '}
        {t('shell.boss.won', { time: clock(result.seconds ?? 0) })}
      </p>
      {unit.kind === 'final' && <p className="shell-cert-won">{t(`shell.cert.${unit.tier}`)}</p>}
    </div>
  )
}
