import { useEffect, useState } from 'react'

import type { GitCourse, GitGateQuiz, GitGateResult } from '@sanatorio/contracts'
import type { Gate } from '@sanatorio/gitsim'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { GroupRooms } from './GroupRoom'

type GateViewProps = {
  gate: Gate
  me: string
  course: GitCourse
  onCourse: (course: GitCourse) => void
  onBack: () => void
  onReview: () => void
}

/**
 * Antes de una prueba de grupo: el test de preguntas rápidas. Todas bien para
 * pasar; si no, una hora de espera (mientras, el Repaso enseña lo fallado).
 */
export function GateView({ gate, me, course, onCourse, onBack, onReview }: GateViewProps) {
  const { t, lang } = useI18n()
  const [quiz, setQuiz] = useState<GitGateQuiz | null>(null)
  const [chosen, setChosen] = useState<(number | null)[]>([])
  const [result, setResult] = useState<GitGateResult | null>(null)
  const { busy, error, run } = useAction()
  const state = course.gates[gate.id]
  const name = t(`git.${gate.kind}`, { n: gate.min })
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit' })

  function start() {
    void run(async () => {
      const next = await api.startGitGate(gate.id)

      setQuiz(next)
      setChosen(next.questions.map(() => null))
      setResult(null)
    })
  }

  function send(answers: (number | null)[]) {
    void run(async () => {
      const answer = await api.answerGitGate(gate.id, { answers })

      setResult(answer)
      setQuiz(null)
      onCourse(answer.course)
    })
  }

  return (
    <article className="git-gate">
      <header className="git-level-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← {t('git.back')}
        </button>
        <h3>{name}</h3>
        {state?.passed !== true && <p className="git-goal">{t('git.gate.rules')}</p>}
      </header>
      <ErrorNote error={error} />
      {quiz !== null ? (
        <GateQuestions
          quiz={quiz}
          chosen={chosen}
          busy={busy}
          onChoose={(index, option) => {
            setChosen(chosen.map((value, i) => (i === index ? option : value)))
          }}
          onSend={() => {
            send(chosen)
          }}
        />
      ) : (
        <>
          {result !== null && <GateResult result={result} />}
          {state?.passed === true ? (
            <>
              {course.stars[gate.id] !== undefined && (
                <p className="git-won">★ {t('git.room.done')}</p>
              )}
              <GroupRooms gate={gate} me={me} />
            </>
          ) : state !== undefined && state.retryAt !== null ? (
            <p className="notice">
              {t('git.gate.wait', { time: time(state.retryAt) })}{' '}
              <button type="button" className="link" onClick={onReview}>
                {t('git.gate.toReview')}
              </button>
            </p>
          ) : course.seat === null ? (
            <p className="notice">{t('git.needSeat')}</p>
          ) : (
            <div className="git-actions">
              <button type="button" disabled={busy} onClick={start}>
                {t('git.gate.start')}
              </button>
            </div>
          )}
        </>
      )}
    </article>
  )
}

function GateQuestions({
  quiz,
  chosen,
  busy,
  onChoose,
  onSend,
}: {
  quiz: GitGateQuiz
  chosen: (number | null)[]
  busy: boolean
  onChoose: (index: number, option: number) => void
  onSend: () => void
}) {
  const { t } = useI18n()
  const left = useCountdown(quiz.deadline)
  const answered = chosen.filter((value) => value !== null).length

  // Se acaba el tiempo: se manda lo que haya.
  useEffect(() => {
    if (left === 0 && !busy) onSend()
    // Solo al llegar a cero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left === 0])

  return (
    <form
      className="git-gate-quiz"
      onSubmit={(event) => {
        event.preventDefault()
        onSend()
      }}
    >
      <p className={`git-gate-clock ${left <= 20 ? 'late' : ''}`} aria-live="off">
        ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </p>
      <ol>
        {quiz.questions.map((question, index) => (
          <li key={index}>
            <fieldset>
              <legend>{question.prompt}</legend>
              {question.code !== null && <pre>{question.code}</pre>}
              {question.options.map((option, value) => (
                <label key={value} className="git-gate-option">
                  <input
                    type="radio"
                    name={`q${index}`}
                    checked={chosen[index] === value}
                    onChange={() => {
                      onChoose(index, value)
                    }}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="git-actions">
        <button type="submit" disabled={busy}>
          {t('git.gate.send', { n: answered, total: quiz.questions.length })}
        </button>
      </div>
    </form>
  )
}

function GateResult({ result }: { result: GitGateResult }) {
  const { t } = useI18n()

  return (
    <section className="git-gate-result">
      <p className={result.passed ? 'git-won' : 'notice'} role="status">
        {t(result.passed ? 'git.gate.won' : 'git.gate.lost', {
          right: result.right,
          total: result.total,
        })}
      </p>
      <ol>
        {result.review.map((item, index) => {
          const ok = item.chosen === item.answer

          return (
            <li key={index} className={ok ? 'right' : 'wrong'}>
              <strong>{ok ? '✓' : '✗'}</strong> {item.prompt}
              <div className="muted">
                {item.options[item.answer]} — {item.why}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Segundos que quedan hasta `deadline`, al segundo (solo mientras dura el test). */
function useCountdown(deadline: string): number {
  const end = Date.parse(deadline)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [end])

  return Math.max(0, Math.ceil((end - now) / 1000))
}
