import { useMemo, useState } from 'react'

import type { CourseRun, NetAttemptResult } from '@sanatorio/contracts'
import { starsFor } from '@sanatorio/course'
import {
  encodeEntry,
  evaluate,
  fieldsOf,
  LIMITS,
  questionsOf,
  schemeOf,
  starGoals,
  startOf,
} from '@sanatorio/netsim'
import type { Evaluation, Unit, Values } from '@sanatorio/netsim'

import { api } from '../../shared/api'
import { activeSecondsOf, clearActiveTime } from '../../shared/course/activeTime'
import { clock, starText } from '../../shared/course/Stars'
import { useAction } from '../../shared/hooks/useAsync'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { CalcBoard } from './CalcBoard'
import { SchemeBoard } from './SchemeBoard'

type Played = { values: Values; entries: string[]; checked: Evaluation | null }

/**
 * La prueba de un punto: se rellenan los campos y se pulsa «Comprobar». Cada
 * comprobación la mira el motor aquí mismo (el paquete se anima, los campos se
 * marcan) y se apunta; al acertar se mandan todas a la API, que las vuelve a
 * mirar y pone las estrellas: a la primera, tres. En un jefe manda el reloj.
 */
export function Challenge({
  unit,
  run,
  onResult,
  onRestart,
}: {
  unit: Unit
  run: CourseRun | null
  onResult: (result: NetAttemptResult) => void
  onRestart?: () => void
}) {
  const { t, tn } = useI18n()
  const fields = useMemo(() => fieldsOf(unit), [unit])
  const scheme = schemeOf(unit)
  const fresh = (): Played => ({ values: startOf(unit), entries: [], checked: null })
  const [played, setPlayed] = useState<Played>(fresh)
  const [result, setResult] = useState<NetAttemptResult | null>(null)
  const sending = useAction()
  const now = useNow(1000, { active: run !== null })
  const left = run === null ? null : Math.max(0, Math.ceil((Date.parse(run.deadline) - now) / 1000))
  const won = result?.done === true
  const timeUp = left === 0 && !won
  const full = played.entries.length >= LIMITS.attemptEntries
  const used = played.entries.length

  function check() {
    const entries = [...played.entries, encodeEntry(played.values)]
    const checked = evaluate(unit, played.values)

    setPlayed({ ...played, entries, checked })
    if (!checked.done) return
    void sending.run(async () => {
      const answer = await api.submitNetAttempt(unit.id, {
        entries,
        activeSeconds: activeSecondsOf('net', unit.id),
      })

      if (answer.done && answer.stars > 0) clearActiveTime('net', unit.id)
      setResult(answer)
      onResult(answer)
    })
  }

  const board = {
    fields,
    values: played.values,
    disabled: won || timeUp,
    checked: played.checked,
    onChange: (id: string, value: string) => {
      setPlayed({ ...played, values: { ...played.values, [id]: value } })
    },
  }

  return (
    <form
      className="net-challenge"
      onSubmit={(event) => {
        event.preventDefault()
        if (!won && !timeUp && !full && !sending.busy) check()
      }}
    >
      {left !== null && (
        <p
          className={`shell-timer ${left <= 30 ? 'hurry' : ''}`}
          role="timer"
          aria-live={left <= 10 ? 'assertive' : 'off'}
        >
          {t('shell.boss.left', { time: clock(left) })}
        </p>
      )}
      {scheme === null ? (
        <CalcBoard questions={questionsOf(unit)} {...board} />
      ) : (
        <SchemeBoard scheme={scheme} checks={used} {...board} />
      )}
      <div className="net-check-bar">
        <button type="submit" className="primary" disabled={won || timeUp || full || sending.busy}>
          {t('net.check')}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={
            run === null
              ? () => {
                  setPlayed(fresh())
                  setResult(null)
                }
              : onRestart
          }
        >
          ↺ {t('shell.reset')}
        </button>
        <span className="course-count" aria-live="polite">
          {tn('net.count', won ? result.commands : used)}{' '}
          {run === null && !won && (
            <span className="course-stars" title={t('net.starsNow')}>
              <span aria-hidden="true">{starText(starsFor(used + 1, starGoals()))}</span>
              <span className="sr-only">
                {t('net.starsNowValue', { stars: starsFor(used + 1, starGoals()) })}
              </span>
            </span>
          )}
        </span>
      </div>
      {sending.busy && <p className="muted">{t('shell.checking')}</p>}
      <ErrorNote error={sending.error} />
      {full && !won && <p className="notice">{t('net.full', { max: LIMITS.attemptEntries })}</p>}
      {won && run === null && (
        <div className="git-won" role="status">
          <p>
            <span className="course-stars">{starText(result.stars)}</span> {t('shell.won')}
          </p>
          <p className="course-why">
            {result.stars === 3
              ? t('net.why.three')
              : tn(result.stars === 2 ? 'net.why.two' : 'net.why.one', result.commands)}
          </p>
        </div>
      )}
      {timeUp && (
        <p className="notice" role="status">
          {t('shell.boss.timeUp')}
        </p>
      )}
      {played.checked !== null && !played.checked.done && !timeUp && (
        <p className="notice net-not-yet">
          {t(scheme === null ? 'net.calc.notYet' : 'net.notYet')}
        </p>
      )}
    </form>
  )
}
