import { useEffect, useMemo, useState } from 'react'

import type { CourseRun, ShellAttemptResult } from '@sanatorio/contracts'
import {
  goalOf,
  isIncomplete,
  LIMITS,
  missing,
  run as runEntry,
  starGoals,
  startOf,
} from '@sanatorio/shellsim'
import type { Tally, Unit, World } from '@sanatorio/shellsim'
import { starsFor } from '@sanatorio/course'

import { api } from '../../shared/api'
import { activeSecondsOf, clearActiveTime } from '../../shared/course/activeTime'
import { clock, StarsWhy, starText } from '../../shared/course/Stars'
import { Terminal } from '../../shared/course/Terminal'
import type { TerminalEntry } from '../../shared/course/Terminal'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type ChallengeProps = {
  unit: Unit
  /** El contrarreloj en marcha (jefes), o `null` en una unidad. */
  run: CourseRun | null
  onResult: (result: ShellAttemptResult) => void
  /** Volver a empezar un contrarreloj (pide otra hora de salida a la API). */
  onRestart?: () => void
}

/** `peer@web1:~/proyectos$` (con `#` si eres root). */
function promptOf(world: World): string {
  const { user, host, cwd, env } = world.session
  const home = env.HOME ?? ''
  const where =
    home !== '' && (cwd === home || cwd.startsWith(`${home}/`)) ? `~${cwd.slice(home.length)}` : cwd

  return `${user}@${host}:${where}${user === 'root' ? '#' : '$'}`
}

/** Segundos que quedan hasta `deadline`, al segundo. */
function useRemaining(deadline: string | null): number | null {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (deadline === null) return

    // Un reloj de cuenta atrás (no un sondeo): solo vuelve a pintar.
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [deadline])

  return deadline === null ? null : Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000))
}

/**
 * La prueba: la terminal con la shell simulada, los objetivos que se marcan
 * solos y el recuento de comandos. Al llegar al objetivo se manda todo a la
 * API, que lo vuelve a ejecutar y pone las estrellas (y el tiempo).
 */
export function Challenge({ unit, run, onResult, onRestart }: ChallengeProps) {
  const { t, tn } = useI18n()
  const goal = useMemo(() => goalOf(unit), [unit])
  const [world, setWorld] = useState<World>(() => startOf(unit))
  const [sent, setSent] = useState<string[]>([])
  const [lines, setLines] = useState<Tally['lines']>([])
  const [entries, setEntries] = useState<TerminalEntry[]>([])
  const [pending, setPending] = useState<string[]>([])
  const [result, setResult] = useState<ShellAttemptResult | null>(null)
  const { busy, error, run: act } = useAction()
  const remaining = useRemaining(run?.deadline ?? null)
  const commands = lines.reduce((sum, line) => sum + line.counted, 0)
  const misses = missing(unit, { world, lines, commands }, sent)
  const timeUp = remaining === 0 && result?.done !== true
  const won = result?.done === true
  const keys = [
    ...Object.keys(goal.goal),
    ...(goal.output === null ? [] : ['output']),
    ...(unit.requires ?? []).map((group) => `requires:${group.join('|')}`),
  ]

  function reset() {
    setWorld(startOf(unit))
    setSent([])
    setLines([])
    setEntries([])
    setPending([])
    setResult(null)
  }

  function submit(all: string[]) {
    void act(async () => {
      const answer = await api.submitShellAttempt(unit.id, {
        entries: all,
        activeSeconds: activeSecondsOf('shell', unit.id),
      })

      // Superado: lo que tardó ya lo tiene la API; la próxima vez empieza de cero.
      if (answer.done && answer.stars > 0) clearActiveTime('shell', unit.id)
      setResult(answer)
      onResult(answer)
    })
  }

  function onRun(line: string) {
    const text = pending.length > 0 ? [...pending, line].join('\n') : line

    // Una orden a medias (comillas, un if, un heredoc): la terminal pide el resto con `>`.
    if (pending.length + 1 < LIMITS.entryLines && isIncomplete(text)) {
      setPending(text.split('\n'))

      return
    }
    setPending([])
    if (sent.length >= LIMITS.attemptEntries) {
      setEntries([
        ...entries,
        { line: text, output: [t('course.term.full', { n: LIMITS.attemptEntries })], ok: false },
      ])

      return
    }

    const answer = runEntry(world, text)
    const all = [...sent, text]
    const marks = [
      ...lines,
      {
        ok: answer.ok,
        counted: answer.counted,
        stdout: answer.stdout,
        incomplete: answer.incomplete === true,
      },
    ]
    const total = commands + answer.counted

    setWorld(answer.world)
    setSent(all)
    setLines(marks)
    setEntries([
      ...entries,
      {
        line: text,
        output: answer.output,
        ok: answer.ok,
        counted: answer.counted > 0 ? total : null,
      },
    ])
    if (
      result?.done !== true &&
      missing(unit, { world: answer.world, lines: marks, commands: total }, all).length === 0
    )
      submit(all)
  }

  return (
    <section className="git-challenge shell-challenge">
      {run !== null && remaining !== null && (
        <p
          className={`shell-timer ${remaining <= 30 ? 'hurry' : ''}`}
          role="timer"
          aria-live={remaining <= 10 ? 'assertive' : 'off'}
        >
          {t('shell.boss.left', { time: clock(remaining) })}
        </p>
      )}
      <div className="git-challenge-grid">
        <div>
          <p className="course-count" aria-live="polite">
            {tn('course.count', won ? result.commands : commands)}{' '}
            {run === null && (
              <span className="course-stars" title={t('course.starsNow')}>
                <span aria-hidden="true">{starText(starsFor(commands, starGoals(unit)))}</span>
                <span className="sr-only">
                  {t('course.starsNowValue', { stars: starsFor(commands, starGoals(unit)) })}
                </span>
              </span>
            )}
          </p>
          <Terminal
            entries={entries}
            prompt={promptOf(world)}
            hint={t('shell.term.hint')}
            maxLength={LIMITS.entry}
            pending={pending}
            disabled={won || timeUp}
            onRun={onRun}
            onClear={() => {
              setEntries([])
            }}
          />
          <div className="git-actions">
            <button type="button" className="ghost" onClick={run === null ? reset : onRestart}>
              ↺ {t('shell.reset')}
            </button>
          </div>
          {busy && <p className="muted">{t('shell.checking')}</p>}
          <ErrorNote error={error} />
          {won && run === null && (
            <div className="git-won" role="status">
              <p>
                <span className="course-stars">{starText(result.stars)}</span> {t('shell.won')}
              </p>
              <StarsWhy goals={starGoals(unit)} commands={result.commands} />
            </div>
          )}
          {timeUp && (
            <p className="notice" role="status">
              {t('shell.boss.timeUp')}
            </p>
          )}
          {result !== null && !result.done && !timeUp && (
            <p className="notice">{t('shell.notYet')}</p>
          )}
        </div>
        <div>
          <h4 className="shell-objectives-title">{t('shell.objectives')}</h4>
          <ul className="shell-objectives" aria-label={t('shell.objectives')}>
            {keys.map((key) => {
              const ok = !misses.includes(key)

              return (
                <li key={key} className={ok ? 'ok' : ''}>
                  <span aria-hidden="true">{ok ? '✓' : '○'}</span> <Objective id={key} />
                  <span className="sr-only">{ok ? t('shell.obj.done') : t('shell.obj.todo')}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Una clave de lo que se comprueba (`file:/ruta`, `service:nginx`…), en palabras. */
function Objective({ id }: { id: string }) {
  const { t } = useI18n()
  const at = id.indexOf(':')
  const kind = at < 0 ? id : id.slice(0, at)
  const what =
    at < 0
      ? ''
      : id
          .slice(at + 1)
          .replace(/^web1:/, '')
          .replace('|', ' / ')

  return <>{t(`shell.obj.${kind}`, { what })}</>
}
