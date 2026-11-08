import { useEffect, useMemo, useState } from 'react'

import type { CourseRun, DockerAttemptResult, DockerCourse } from '@sanatorio/contracts'
import type { Theory } from '@sanatorio/course'
import { estimateOf, exampleOf, starGoals, timeGoalsOf, unitIn } from '@sanatorio/dockersim'
import type { Unit } from '@sanatorio/dockersim'

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

/**
 * Un punto del curso de Docker. Una unidad: teoría, ejemplo y prueba (la
 * plantilla de cursos). Un jefe: la historia, sus tareas y el contrarreloj.
 */
export function UnitView({
  unit,
  course,
  onCourse,
  onBack,
}: {
  unit: Unit
  course: DockerCourse
  onCourse: (course: DockerCourse) => void
  onBack: () => void
}) {
  const { t, lang } = useI18n()
  const text = unitIn(unit, lang)
  const best = course.stars[unit.id] ?? 0
  const time = timeGoalsOf(unit)
  const [step, setStep] = useState<Step>('theory')

  useActiveTime('docker', unit.id)

  return (
    <article className={`git-level shell-unit docker-unit ${unit.kind}`}>
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
          <StarRules goals={starGoals(unit)} rule={t('docker.stars.rule')} />
        ) : (
          <StarRules time={time} rule={t('shell.time.rule')} />
        )}
      </header>
      {unit.kind !== 'unit' ? (
        <BossView unit={unit} course={course} onCourse={onCourse} />
      ) : (
        <>
          <PillGroup
            kind="tabs"
            options={STEPS}
            value={step}
            onChange={setStep}
            label={text.title}
            text={(option) => `${STEPS.indexOf(option) + 1}. ${t(`shell.step.${option}`)}`}
          />
          {step === 'theory' && text.theory !== undefined && (
            <TheoryView
              theory={text.theory}
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
      )}
    </article>
  )
}

/** La teoría, con las partes de siempre (`Theory` de `@sanatorio/course`). */
function TheoryView({ theory, onNext }: { theory: Theory; onNext: () => void }) {
  const { t } = useI18n()
  const parts = [
    ['what', theory.what],
    ['when', theory.when],
    ['whenNot', theory.whenNot],
    ['problems', theory.problems],
  ] as const

  return (
    <section className="git-theory">
      <dl>
        <dt>{t('shell.theory.what')}</dt>
        <dd>{parts[0][1]}</dd>
        <dt>{t('shell.theory.how')}</dt>
        <dd>
          <pre>{theory.how.join('\n')}</pre>
        </dd>
        {parts.slice(1).map(([key, value]) =>
          value === undefined ? null : (
            <div key={key}>
              <dt>{t(`shell.theory.${key}`)}</dt>
              <dd>{value}</dd>
            </div>
          ),
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

const FRAME_MS = 1600

/** El ejemplo: las órdenes se «escriben» solas, una a una, con su salida de verdad (del mismo motor). */
function ExampleView({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { t, lang } = useI18n()
  const steps = useMemo(() => exampleOf(unit), [unit])
  const [shown, setShown] = useState(1)

  useEffect(() => {
    if (shown >= steps.length) return

    const timer = setTimeout(() => {
      setShown((current) => current + 1)
    }, FRAME_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [shown, steps.length])

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
          {Math.min(shown, steps.length)}/{steps.length}
        </span>
      </p>
      <div className="git-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setShown(1)
          }}
        >
          ↺ {t('shell.example.replay')}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={shown >= steps.length}
          onClick={() => {
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

/** Un jefe: historia y tareas a la vista; el reloj, de la API, empieza al pulsar. */
function BossView({
  unit,
  course,
  onCourse,
}: {
  unit: Unit
  course: DockerCourse
  onCourse: (course: DockerCourse) => void
}) {
  const { t, lang } = useI18n()
  const text = unitIn(unit, lang)
  const [run, setRun] = useState<CourseRun | null>(course.runs[unit.id] ?? null)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<DockerAttemptResult | null>(null)
  const starting = useAction()
  const won = result?.done === true

  function start() {
    void starting.run(async () => {
      const started = await api.startDockerBoss(unit.id)

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
      {won && (
        <div className={`git-won shell-won ${unit.kind}`} role="status">
          <p>
            <span className="course-stars">{starText(result.stars)}</span>{' '}
            {t('shell.boss.won', { time: clock(result.seconds ?? 0) })}
          </p>
          {unit.kind === 'final' && (
            <p className="shell-cert-won">{t(`docker.cert.${unit.tier}`)}</p>
          )}
        </div>
      )}
      {run === null ? (
        <div className="git-actions">
          <button type="button" className="primary" disabled={starting.busy} onClick={start}>
            {won ? t('shell.boss.again') : t('shell.boss.start', { time: clock(unit.limit ?? 0) })}
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
