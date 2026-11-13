import { useEffect, useMemo, useState } from 'react'

import type { CourseRun, RagAttemptResult, RagCourse } from '@sanatorio/contracts'
import type { Theory } from '@sanatorio/course'
import { blockOf, estimateOf, exampleOf, starGoals, timeGoalsOf, unitIn } from '@sanatorio/ragsim'
import type { Block, FrameView, Unit } from '@sanatorio/ragsim'

import { courseText } from '@sanatorio/course'

import { api } from '../../shared/api'
import { useActiveTime } from '../../shared/course/activeTime'
import { EstimateBadge } from '../../shared/course/Estimate'
import { clock, StarRules, starText } from '../../shared/course/Stars'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Bench } from './Bench'
import { TraceView } from './Pipeline'
import { ApiExchange, AskData, AskTitle, CalcSteps, MetricTiles, OpsTimeline } from './Views'

const STEPS = ['theory', 'example', 'test'] as const

type Step = (typeof STEPS)[number]

/**
 * Un punto del curso de RAG. Una unidad: teoría, ejemplo y prueba (la
 * plantilla de cursos), con un banco de pruebas en vez de una terminal. Un
 * jefe: la historia, sus tareas y el contrarreloj.
 */
export function UnitView({
  unit,
  course,
  onCourse,
  onBack,
}: {
  unit: Unit
  course: RagCourse
  onCourse: (course: RagCourse) => void
  onBack: () => void
}) {
  const { t, tn, lang } = useI18n()
  const text = unitIn(unit, lang)
  const best = course.stars[unit.id] ?? 0
  const time = timeGoalsOf(unit)
  const goals = starGoals(unit)
  const [step, setStep] = useState<Step>('theory')

  useActiveTime('rag', unit.id)

  return (
    <article className={`git-level shell-unit rag-unit ${unit.kind}`}>
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
          <div className="course-star-rules">
            <ul aria-label={t('rag.stars.title')}>
              {[
                tn('rag.stars.three', goals.three),
                tn('rag.stars.two', goals.two),
                t('course.stars.any'),
              ].map((line, index) => (
                <li key={index}>
                  <span className="course-stars" aria-hidden="true">
                    {starText(3 - index)}
                  </span>{' '}
                  {line}
                </li>
              ))}
            </ul>
            <details>
              <summary>{t('rag.stars.what')}</summary>
              <p>{t('rag.stars.rule')}</p>
            </details>
          </div>
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
            <Bench
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

const PARTS = ['what', 'how', 'when', 'whenNot', 'problems'] as const

/** La teoría, con las partes de siempre (`Theory` de `@sanatorio/course`), en su orden. */
function TheoryView({ theory, onNext }: { theory: Theory; onNext: () => void }) {
  const { t } = useI18n()

  return (
    <section className="git-theory rag-theory">
      <dl>
        {PARTS.map((part) => {
          const body = theory[part]

          return body === undefined ? null : (
            <div key={part}>
              <dt>{t(`shell.theory.${part}`)}</dt>
              <dd>{typeof body === 'string' ? body : <pre>{body.join('\n')}</pre>}</dd>
            </div>
          )
        })}
      </dl>
      <p className="git-actions">
        <button type="button" onClick={onNext}>
          {t('shell.toExample')}
        </button>
      </p>
    </section>
  )
}

const FRAME_MS = 4200

/** Lo que el motor ha hecho en un paso del ejemplo, pintado según lo que sea. */
function FrameBody({ frame }: { frame: FrameView }) {
  switch (frame.show) {
    case 'trace':
      return <TraceView judged={frame.judged} config={frame.config} focus={frame.focus} />
    case 'calc':
      return (
        <div className="rag-calc-example">
          <p className="rag-task-text">
            <AskTitle ask={frame.view.ask} />
          </p>
          <AskData view={frame.view} />
          <CalcSteps view={frame.view} />
        </div>
      )
    case 'metrics':
      return <MetricTiles metrics={frame.metrics} keys={frame.keys} />
    case 'ops':
      return <OpsTimeline result={frame.result} />
    case 'api':
      return <ApiExchange request={frame.request} response={frame.response} />
  }
}

/**
 * El ejemplo: los pasos van saliendo solos, uno a uno, con lo que el motor ha
 * hecho de verdad en cada uno (el mismo que corrige la prueba) y su pie.
 */
function ExampleView({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { t, lang } = useI18n()
  const frames = useMemo(() => exampleOf(unit), [unit])
  const text = unitIn(unit, lang)
  const [shown, setShown] = useState(1)

  useEffect(() => {
    if (shown >= frames.length) return

    const timer = setTimeout(() => {
      setShown((current) => current + 1)
    }, FRAME_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [shown, frames.length])

  return (
    <section className="shell-example rag-example">
      <p className="rag-predict">{text.example}</p>
      <ol className="rag-frames" aria-live="polite">
        {frames.slice(0, shown).map((frame, index) => (
          <li key={index} className="rag-frame">
            <p className="rag-frame-caption">
              <span className="rag-rank">{index + 1}</span> {text.frames?.[index]}
            </p>
            <FrameBody frame={frame} />
          </li>
        ))}
      </ol>
      <p className="git-frame-line">
        <span>{t('rag.example.note')}</span>
        <span className="git-frame-count">
          {Math.min(shown, frames.length)}/{frames.length}
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
          disabled={shown >= frames.length}
          onClick={() => {
            setShown(frames.length)
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

/** La pieza de tu propio RAG que ya puedes escribir al acabar un bloque. */
export function BuildStep({ block, open = false }: { block: Block; open?: boolean }) {
  const { t, lang } = useI18n()
  const { build } = courseText(block, lang)

  return (
    <details className="rag-build" open={open}>
      <summary>
        <span className="rag-rank">{block.n}</span> {t('rag.build.title')}: {build.piece}
      </summary>
      <pre className="rag-skeleton">
        <code>{build.skeleton.join('\n')}</code>
      </pre>
      <p>
        <strong>{t('rag.build.verify')}:</strong> {build.verify}
      </p>
    </details>
  )
}

/** Un jefe: historia y tareas a la vista; el reloj, de la API, empieza al pulsar. */
function BossView({
  unit,
  course,
  onCourse,
}: {
  unit: Unit
  course: RagCourse
  onCourse: (course: RagCourse) => void
}) {
  const { t, lang } = useI18n()
  const text = unitIn(unit, lang)
  const block = blockOf(unit.block)
  const [run, setRun] = useState<CourseRun | null>(course.runs[unit.id] ?? null)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<RagAttemptResult | null>(null)
  const starting = useAction()
  const won = result?.done === true
  const beaten = won || course.stars[unit.id] !== undefined

  function start() {
    void starting.run(async () => {
      const started = await api.startRagBoss(unit.id)

      setResult(null)
      setRun(started.run)
      setRound((current) => current + 1)
      onCourse(started.course)
    })
  }

  return (
    <section className="shell-boss rag-boss">
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
          {unit.kind === 'final' && <p className="shell-cert-won">{t(`rag.cert.${unit.tier}`)}</p>}
        </div>
      )}
      {/* Vencido el jefe del bloque: la pieza de tu RAG que ya sabes escribir. */}
      {beaten && unit.kind === 'boss' && block !== undefined && <BuildStep block={block} open />}
      {run === null ? (
        <div className="git-actions">
          <button type="button" className="primary" disabled={starting.busy} onClick={start}>
            {won ? t('shell.boss.again') : t('shell.boss.start', { time: clock(unit.limit ?? 0) })}
          </button>
        </div>
      ) : (
        <Bench
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
