import { useEffect, useMemo, useState } from 'react'

import type { GitAttemptResult } from '@sanatorio/contracts'
import {
  goalOfLevel,
  LIMITS,
  missing,
  run,
  solvedOf,
  starGoals,
  starsOf,
  startOf,
  tally,
} from '@sanatorio/gitsim'
import type { Level, World } from '@sanatorio/gitsim'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { StarRules, StarsWhy, starText } from '../../shared/course/Stars'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { WorldGraphs } from './GitGraph'
import { Terminal } from '../../shared/course/Terminal'
import type { TerminalEntry } from '../../shared/course/Terminal'

const STEPS = ['animation', 'theory', 'challenge'] as const

type Step = (typeof STEPS)[number]

type LevelViewProps = {
  level: Level
  /** Las mejores estrellas que tienes en este punto (0: sin hacer). */
  best: number
  /** El puesto desde el que juegas; sin él se ve todo pero no se juega. */
  seat: string | null
  onDone: (result: GitAttemptResult) => void
  onBack: () => void
}

/** Un punto del camino: la animación, la teoría y el reto, en ese orden. */
export function LevelView({ level, best, seat, onDone, onBack }: LevelViewProps) {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('animation')

  return (
    <article className="git-level">
      <header className="git-level-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← {t('git.back')}
        </button>
        <h3>
          {level.title}
          {best > 0 && <span className="course-stars"> {'★'.repeat(best)}</span>}
        </h3>
        <p className="git-goal">
          <strong>{t('git.goal')}:</strong> {level.goal}
        </p>
        <StarRules goals={starGoals(level)} rule={t('git.stars.rule')} />
      </header>
      <PillGroup
        kind="tabs"
        options={STEPS}
        value={step}
        onChange={setStep}
        label={level.title}
        text={(option) => `${STEPS.indexOf(option) + 1}. ${t(`git.step.${option}`)}`}
      />
      {step === 'animation' && (
        <Animation
          level={level}
          onNext={() => {
            setStep('theory')
          }}
        />
      )}
      {step === 'theory' && (
        <TheoryView
          level={level}
          onNext={() => {
            setStep('challenge')
          }}
        />
      )}
      {step === 'challenge' && <Challenge level={level} seat={seat} onDone={onDone} />}
    </article>
  )
}

/** Los estados por los que pasa la solución: el de partida y uno por comando. */
function framesOf(level: Level): { world: World; line: string | null }[] {
  const frames: { world: World; line: string | null }[] = [{ world: startOf(level), line: null }]

  for (const line of level.solution) {
    const last = frames[frames.length - 1]

    if (last === undefined) break

    const next = run(last.world, line)

    frames.push({ world: { repo: next.repo, remote: next.remote }, line })
  }

  return frames
}

const FRAME_MS = 1300

/** La solución, comando a comando: se ve cómo se mueve todo hasta el objetivo. */
function Animation({ level, onNext }: { level: Level; onNext: () => void }) {
  const { t } = useI18n()
  const frames = useMemo(() => framesOf(level), [level])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const frame = frames[index] ?? frames[0]

  useEffect(() => {
    if (!playing) return

    if (index >= frames.length - 1) {
      setPlaying(false)

      return
    }

    const timer = setTimeout(() => {
      setIndex((current) => current + 1)
    }, FRAME_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [playing, index, frames.length])

  if (frame === undefined) return null

  return (
    <section className="git-animation">
      <WorldGraphs world={frame.world} />
      <p className="git-frame-line" aria-live="polite">
        {frame.line === null ? t('git.anim.start') : <code>$ {frame.line}</code>}
        <span className="git-frame-count">
          {index}/{frames.length - 1}
        </span>
      </p>
      <div className="git-actions">
        <button
          type="button"
          className="ghost"
          disabled={index === 0}
          onClick={() => {
            setPlaying(false)
            setIndex(index - 1)
          }}
        >
          ‹ {t('common.prev')}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setIndex(0)
            setPlaying(true)
          }}
        >
          ↺ {t('git.anim.replay')}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={index >= frames.length - 1}
          onClick={() => {
            setPlaying(false)
            setIndex(index + 1)
          }}
        >
          {t('common.next')} ›
        </button>
        <button type="button" onClick={onNext}>
          {t('git.toTheory')}
        </button>
      </div>
    </section>
  )
}

function TheoryView({ level, onNext }: { level: Level; onNext: () => void }) {
  const { t } = useI18n()
  const { theory } = level

  return (
    <section className="git-theory">
      <dl>
        <dt>{t('git.theory.what')}</dt>
        <dd>{theory.what}</dd>
        <dt>{t('git.theory.how')}</dt>
        <dd>
          <pre>{theory.how.join('\n')}</pre>
        </dd>
        <dt>{t('git.theory.when')}</dt>
        <dd>{theory.when}</dd>
        {theory.whenNot !== undefined && (
          <>
            <dt>{t('git.theory.whenNot')}</dt>
            <dd>{theory.whenNot}</dd>
          </>
        )}
        <dt>{t('git.theory.looks')}</dt>
        <dd>{theory.looks}</dd>
        {theory.problems !== undefined && (
          <>
            <dt>{t('git.theory.problems')}</dt>
            <dd>{theory.problems}</dd>
          </>
        )}
      </dl>
      <div className="git-actions">
        <button type="button" onClick={onNext}>
          {t('git.toChallenge')}
        </button>
      </div>
    </section>
  )
}

/** El reto: la terminal, tu repositorio en vivo y el objetivo al lado. */
function Challenge({
  level,
  seat,
  onDone,
}: {
  level: Level
  seat: string | null
  onDone: (result: GitAttemptResult) => void
}) {
  const { t, tn } = useI18n()
  const goal = useMemo(() => goalOfLevel(level), [level])
  const solved = useMemo(() => solvedOf(level), [level])
  const [lines, setLines] = useState<string[]>([])
  const [entries, setEntries] = useState<TerminalEntry[]>([])
  const [result, setResult] = useState<GitAttemptResult | null>(null)
  const { busy, error, run: act } = useAction()
  // El repositorio y el recuento salen de volver a ejecutar las líneas, como
  // hace la API: así lo que se ve aquí es lo que se corrige allí.
  const counted = useMemo(() => tally(level, lines), [level, lines])
  const { world, commands } = counted
  const reached = missing(world.repo, world.remote, goal).length === 0
  const branch = world.repo.head.kind === 'branch' ? world.repo.head.name : world.repo.head.id
  const full = lines.length >= LIMITS.attemptLines

  function reset() {
    setLines([])
    setEntries([])
    setResult(null)
  }

  function submit(all: string[]) {
    void act(async () => {
      const answer = await api.submitGitAttempt(level.id, { lines: all })

      setResult(answer)
      if (answer.done) onDone(answer)
    })
  }

  function onRun(line: string) {
    if (full) {
      setEntries([
        ...entries,
        { line, output: [t('course.term.full', { n: LIMITS.attemptLines })], ok: false },
      ])

      return
    }

    const next = run(world, line)
    const all = [...lines, line]
    const after = tally(level, all)
    const mark = after.lines.at(-1)

    setLines(all)
    setEntries([
      ...entries,
      {
        line,
        output: next.output,
        ok: next.ok,
        counted: mark?.counted === true ? after.commands : null,
      },
    ])
    if (!next.ok) return
    if (
      seat !== null &&
      result === null &&
      missing(after.world.repo, after.world.remote, goal).length === 0
    )
      submit(all)
  }

  const won = result?.done === true

  return (
    <section className="git-challenge">
      {/* Sin puesto se practica igual; solo cuenta el punto desde el clúster (#86). */}
      {seat === null && <p className="notice">{t('git.practice')}</p>}
      <div className="git-challenge-grid">
        <div>
          <p className="course-count" aria-live="polite">
            {tn('course.count', won ? result.commands : commands)}{' '}
            <span className="course-stars" title={t('course.starsNow')}>
              <span aria-hidden="true">{starText(starsOf(level, commands))}</span>
              <span className="sr-only">
                {t('course.starsNowValue', { stars: starsOf(level, commands) })}
              </span>
            </span>
          </p>
          <Terminal
            entries={entries}
            prompt={`${seat ?? 'pc'}:~/repo (${branch})$`}
            hint={t('git.term.hint')}
            maxLength={LIMITS.line}
            disabled={won}
            onRun={onRun}
            onClear={() => {
              setEntries([])
            }}
          />
          <div className="git-actions">
            <button type="button" className="ghost" onClick={reset}>
              ↺ {t('git.reset')}
            </button>
          </div>
          {busy && <p className="muted">{t('git.checking')}</p>}
          <ErrorNote error={error} />
          {won && (
            <div className="git-won" role="status">
              <p>
                <span className="course-stars">{starText(result.stars)}</span> {t('git.won')}
              </p>
              <StarsWhy goals={starGoals(level)} commands={result.commands} />
            </div>
          )}
          {seat === null && reached && (
            <div className="notice" role="status">
              <p>
                <span className="course-stars">{starText(starsOf(level, commands))}</span>{' '}
                {t('git.practiceDone')}
              </p>
              <StarsWhy goals={starGoals(level)} commands={commands} />
            </div>
          )}
          {result !== null && !result.done && (
            <p className="notice">{t('git.notYet', { misses: result.misses.join(', ') })}</p>
          )}
        </div>
        <div>
          <WorldGraphs world={world} />
          <details className="git-target" open>
            <summary>
              {t('git.target')} {reached && '✓'}
            </summary>
            <WorldGraphs world={solved} small />
          </details>
        </div>
      </div>
    </section>
  )
}
