import { useEffect, useMemo, useState } from 'react'

import type { CourseRun, DockerAttemptResult } from '@sanatorio/contracts'
import { starsFor } from '@sanatorio/course'
import {
  goalOf,
  isIncomplete,
  LIMITS,
  missing,
  run as runEntry,
  starGoals,
  startOf,
  unitIn,
} from '@sanatorio/dockersim'
import type { Tally, Unit, World } from '@sanatorio/dockersim'

import { api } from '../../shared/api'
import { activeSecondsOf, clearActiveTime } from '../../shared/course/activeTime'
import { clock, StarsWhy, starText } from '../../shared/course/Stars'
import { Terminal } from '../../shared/course/Terminal'
import type { TerminalEntry } from '../../shared/course/Terminal'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/** `peer@dev1:~/api$`: la máquina de trabajo del curso. */
function promptOf(world: World): string {
  const { user, host, cwd, env } = world.session
  const home = env.HOME ?? ''
  const where =
    home !== '' && (cwd === home || cwd.startsWith(`${home}/`)) ? `~${cwd.slice(home.length)}` : cwd

  return `${user}@${host}:${where}$`
}

/** Segundos que quedan hasta `deadline` (un reloj de cuenta atrás, no un sondeo: solo repinta). */
function useRemaining(deadline: string | null): number | null {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (deadline === null) return

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [deadline])

  return deadline === null ? null : Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000))
}

type Played = { world: World; sent: string[]; lines: Tally['lines']; screen: TerminalEntry[] }

/**
 * La prueba: la terminal con Docker simulado, los objetivos que se marcan
 * solos y el recuento de comandos. Al llegar al objetivo se manda todo a la
 * API, que lo vuelve a ejecutar y pone las estrellas (y el tiempo).
 */
export function Challenge({
  unit,
  run,
  onResult,
  onRestart,
}: {
  unit: Unit
  run: CourseRun | null
  onResult: (result: DockerAttemptResult) => void
  onRestart?: () => void
}) {
  const { t, tn } = useI18n()
  const goal = useMemo(() => goalOf(unit), [unit])
  const fresh = (): Played => ({ world: startOf(unit), sent: [], lines: [], screen: [] })
  const [played, setPlayed] = useState<Played>(fresh)
  const [pending, setPending] = useState<string[]>([])
  const [result, setResult] = useState<DockerAttemptResult | null>(null)
  const { busy, error, run: act } = useAction()
  const remaining = useRemaining(run?.deadline ?? null)
  const commands = played.lines.reduce((sum, line) => sum + line.counted, 0)
  const misses = missing(unit, { world: played.world, lines: played.lines, commands }, played.sent)
  const won = result?.done === true
  const timeUp = remaining === 0 && !won
  const keys = [
    ...Object.keys(goal.goal),
    ...(goal.output === null ? [] : ['output']),
    ...(unit.requires ?? []).map((group) => `requires:${group.join('|')}`),
  ]

  function submit(all: string[]) {
    void act(async () => {
      const answer = await api.submitDockerAttempt(unit.id, {
        entries: all,
        activeSeconds: activeSecondsOf('docker', unit.id),
      })

      if (answer.done && answer.stars > 0) clearActiveTime('docker', unit.id)
      setResult(answer)
      onResult(answer)
    })
  }

  function onRun(line: string) {
    const text = [...pending, line].join('\n')

    // Una orden a medias (un heredoc con el Dockerfile, comillas): se pide el resto con `>`.
    if (pending.length + 1 < LIMITS.entryLines && isIncomplete(text)) {
      setPending(text.split('\n'))

      return
    }
    setPending([])
    if (played.sent.length >= LIMITS.attemptEntries) {
      setPlayed({
        ...played,
        screen: [
          ...played.screen,
          { line: text, output: [t('course.term.full', { n: LIMITS.attemptEntries })], ok: false },
        ],
      })

      return
    }

    const answer = runEntry(played.world, text)
    const next: Played = {
      world: answer.world,
      sent: [...played.sent, text],
      lines: [
        ...played.lines,
        {
          ok: answer.ok,
          counted: answer.counted,
          stdout: answer.stdout,
          incomplete: answer.incomplete === true,
        },
      ],
      screen: [
        ...played.screen,
        {
          line: text,
          output: answer.output,
          ok: answer.ok,
          counted: answer.counted > 0 ? commands + answer.counted : null,
        },
      ],
    }

    setPlayed(next)
    if (
      !won &&
      missing(
        unit,
        { world: next.world, lines: next.lines, commands: commands + answer.counted },
        next.sent,
      ).length === 0
    )
      submit(next.sent)
  }

  return (
    <section className="git-challenge shell-challenge docker-challenge">
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
            entries={played.screen}
            prompt={promptOf(played.world)}
            hint={t('docker.term.hint')}
            maxLength={LIMITS.entry}
            pending={pending}
            disabled={won || timeUp}
            onRun={onRun}
            onClear={() => {
              setPlayed({ ...played, screen: [] })
            }}
          />
          <div className="git-actions">
            <button
              type="button"
              className="ghost"
              onClick={
                run === null
                  ? () => {
                      setPlayed(fresh())
                      setPending([])
                      setResult(null)
                    }
                  : onRestart
              }
            >
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
                  <span aria-hidden="true">{ok ? '✓' : '○'}</span>{' '}
                  <Objective unit={unit} id={key} />
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

/**
 * Lo que se comprueba, en palabras: el texto de la unidad si lo trae
 * (`objectives`), o el genérico de su tipo (`container:web` → «Contenedor web»).
 */
function Objective({ unit, id }: { unit: Unit; id: string }) {
  const { t, lang } = useI18n()
  const own = unitIn(unit, lang).objectives?.[id]

  if (own !== undefined) return <>{own}</>

  const at = id.indexOf(':')
  const kind = at < 0 ? id : id.slice(0, at)
  const what = at < 0 ? '' : id.slice(at + 1).replace('|', ' / ')

  return <>{t(`docker.obj.${kind}`, { what })}</>
}
