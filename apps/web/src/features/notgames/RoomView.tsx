import { useCallback, useEffect, useRef, useState } from 'react'

import type { QuizPlayer, QuizQuestion, QuizRoom, QuizTeam } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { usePolling } from '../../shared/hooks/usePolling'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { notGamesHref } from '../../shared/links'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { settingsText } from './settings-text'
import { SoundToggle } from './SoundToggle'
import { useGameSounds } from './sounds'
import { CodeText } from '../../shared/ui/CodeText'

/** Cada cuánto se pide la sala: deprisa jugando, despacio esperando gente. */
const PLAYING_MS = 1000
const WAITING_MS = 2500

type RoomViewProps = { id: number; me: string }

/**
 * Una sala de Not-games. Se pide al servidor cada poco: él lleva el reloj y
 * dice en qué pregunta se va, quién ha contestado y, al cerrarse, cuál era la
 * buena. La cuenta atrás se calcula con su hora, no con la del ordenador.
 */
export function RoomView({ id, me }: RoomViewProps) {
  const { t } = useI18n()
  const [room, setRoom] = useState<QuizRoom | null>(null)
  const [error, setError] = useState<unknown>(null)
  // Diferencia entre el reloj del servidor y el de aquí.
  const offset = useRef(0)
  const action = useAction()

  const sounds = useGameSounds()
  const take = useCallback(
    (next: QuizRoom) => {
      offset.current = Date.parse(next.now) - Date.now()
      setRoom((previous) => {
        sounds.quizChanged(previous, next, me)

        return next
      })
      setError(null)
    },
    [me, sounds],
  )

  const load = useCallback(async () => {
    try {
      take(await api.getQuizRoom(id))
    } catch (caught) {
      setError(caught)
    }
  }, [id, take])

  useEffect(() => {
    void load()
  }, [load])

  const status = room?.status

  usePolling(load, status === 'done' ? null : status === 'playing' ? PLAYING_MS : WAITING_MS)

  if (room === null) {
    return error === null ? (
      <p className="estado">{t('app.loading')}</p>
    ) : (
      <ErrorNote error={error} onRetry={() => void load()} />
    )
  }

  const inside = room.players.some((p) => p.login === me && !p.out)
  const present = room.players.some((p) => p.login === me)
  const run = (task: () => Promise<QuizRoom>): void => {
    void action.run(async () => {
      take(await task())
    })
  }
  // Se puede salir siempre: esperando, jugando o al acabar.
  const leave = (): void => {
    void action.run(async () => {
      await api.leaveQuizRoom(id)
      window.location.hash = notGamesHref()
    })
  }

  return (
    <div className="quiz-room">
      <div className="quiz-room-bar">
        <a className="back-btn" href={notGamesHref()}>
          <Icon name="atras" size={14} /> {t('notgames.back')}
        </a>
        <span className="quiz-room-tools">
          <SoundToggle />
          {present && (
            <button type="button" className="pill" disabled={action.busy} onClick={leave}>
              <Icon name="salir" size={14} /> {t('common.leave')}
            </button>
          )}
        </span>
      </div>
      <p className="hint">
        <strong>{t(`notgames.mode.${room.settings.mode}`)}</strong> ·{' '}
        {settingsText(t, room.settings)}
      </p>

      {room.status === 'lobby' && (
        <Waiting
          room={room}
          me={me}
          busy={action.busy}
          onJoin={(team) => {
            run(() => api.joinQuizRoom(id, team))
          }}
          onStart={() => {
            run(() => api.startQuizRoom(id))
          }}
        />
      )}

      {room.status === 'playing' && room.question !== null && (
        <Question
          room={room}
          question={room.question}
          me={me}
          playing={inside}
          offset={offset.current}
          onAnswer={(option) => {
            if (room.question !== null)
              run(() => api.answerQuiz(id, room.question?.index ?? 0, option))
          }}
        />
      )}

      {room.status === 'done' && <Final room={room} me={me} />}

      {room.status !== 'lobby' && <Scores room={room} me={me} />}
      <ErrorNote error={action.error ?? error} />
    </div>
  )
}

type WaitingProps = {
  room: QuizRoom
  me: string
  busy: boolean
  onJoin: (team: QuizTeam | null) => void
  onStart: () => void
}

/** La sala antes de empezar: quién está, los equipos y los botones. */
function Waiting({ room, me, busy, onJoin, onStart }: WaitingProps) {
  const { t } = useI18n()
  const inside = room.players.some((p) => p.login === me)
  const teams = room.settings.mode === 'teams'

  return (
    <article className="card quiz-waiting">
      <span className="eyebrow">{t('notgames.waiting', { n: room.players.length })}</span>
      {teams ? (
        <div className="quiz-teams">
          {(['a', 'b'] as const).map((team) => (
            <div key={team} className={`quiz-team team-${team}`}>
              <strong>{t(`notgames.team.${team}`)}</strong>
              <PlayerList players={room.players.filter((p) => p.team === team)} me={me} />
              {(!inside || room.players.find((p) => p.login === me)?.team !== team) && (
                <button
                  type="button"
                  className="pill"
                  disabled={busy || (!inside && !room.joinable)}
                  onClick={() => {
                    onJoin(team)
                  }}
                >
                  {inside ? t('notgames.switchTeam') : t('notgames.joinTeam')}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <PlayerList players={room.players} me={me} />
      )}

      {!inside && room.whyNot !== null && <p className="hint">{room.whyNot}</p>}
      <div className="actions">
        {!inside && !teams && (
          <button
            type="button"
            className="primary small"
            disabled={busy || !room.joinable}
            onClick={() => {
              onJoin(null)
            }}
          >
            {t('common.join')}
          </button>
        )}
        {room.host === me && (
          <button type="button" className="primary small" disabled={busy} onClick={onStart}>
            <Icon name="despegue" size={16} /> {t('notgames.start')}
          </button>
        )}
        {room.host !== me && inside && (
          <span className="hint">{t('notgames.waitHost', { host: room.host })}</span>
        )}
      </div>
    </article>
  )
}

function PlayerList({ players, me }: { players: readonly QuizPlayer[]; me: string }) {
  return (
    <ul className="quiz-players">
      {players.map((player) => (
        <li key={player.login} className={player.login === me ? 'me' : ''}>
          <Avatar login={player.login} image={player.image} size={24} />
          {player.login}
        </li>
      ))}
    </ul>
  )
}

type QuestionProps = {
  room: QuizRoom
  question: QuizQuestion
  me: string
  /** Juega (no se ha ido ni le han eliminado). */
  playing: boolean
  offset: number
  onAnswer: (option: number) => void
}

/** La pregunta de ahora: cuenta atrás, enunciado, código y respuestas; al cerrarse, la buena. */
function Question({ room, question, me, playing, offset, onAnswer }: QuestionProps) {
  const { t } = useI18n()
  const now = useNow(200, { offset })
  const sounds = useGameSounds()

  const startsAt = Date.parse(question.startsAt)
  const endsAt = Date.parse(question.endsAt)
  const reveal = room.phase === 'reveal'
  const waiting = now < startsAt && question.options.length === 0
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const share = Math.max(0, Math.min(1, (endsAt - now) / Math.max(1, endsAt - startsAt)))
  const answered = question.mine !== null
  const ticking = playing && !answered && !reveal && left > 0 && left <= 3 ? left : null

  // Tictac en los tres últimos segundos, si aún no has contestado.
  useEffect(() => {
    if (ticking !== null) sounds.tick()
  }, [ticking, sounds])

  if (waiting) {
    return (
      <article className="card quiz-question quiz-countdown">
        <span className="eyebrow">
          {t('notgames.questionOf', { n: question.index + 1, total: question.total })}
        </span>
        <strong className="quiz-count">{Math.max(1, Math.ceil((startsAt - now) / 1000))}</strong>
      </article>
    )
  }

  return (
    <article className={`card quiz-question ${reveal ? 'reveal' : ''}`}>
      <div className="quiz-question-head">
        <span className="eyebrow">
          {t('notgames.questionOf', { n: question.index + 1, total: question.total })}
        </span>
        <span className="quiz-level" title={t('notgames.levelHint')}>
          {t(`notgames.kind.${question.kind}`)} · {t('notgames.level', { n: question.level })}
        </span>
      </div>
      {!reveal && (
        <div
          className={`quiz-timer ${left <= 3 ? 'late' : ''}`}
          role="timer"
          aria-label={t('notgames.secondsLeft', { n: left })}
        >
          <span style={{ width: `${share * 100}%` }} />
        </div>
      )}
      <p className="quiz-prompt">
        <CodeText text={question.prompt} />
      </p>
      {question.code !== null && <pre className="quiz-code">{question.code}</pre>}

      <div className="quiz-options">
        {question.options.map((option) => {
          const mine = question.mine === option.id
          const right = reveal && question.answer === option.id

          return (
            <button
              // Una clave por pregunta: si el botón se reutiliza, el que se pulsó en la
              // anterior se queda con el foco y parece marcado en la nueva.
              key={`${String(question.index)}-${String(option.id)}`}
              type="button"
              className={[
                'quiz-option',
                mine ? 'mine' : '',
                right ? 'right' : '',
                reveal && mine && !right ? 'wrong' : '',
              ].join(' ')}
              disabled={!playing || answered || reveal}
              aria-pressed={mine}
              onClick={() => {
                onAnswer(option.id)
              }}
            >
              <CodeText text={option.text} />
            </button>
          )
        })}
      </div>

      {!reveal && answered && <p className="hint">{t('notgames.answered')}</p>}
      {!playing && !reveal && <p className="hint">{t('notgames.watching')}</p>}
      {reveal && (
        <div className="quiz-reveal" role="status">
          <strong>
            {question.mine === null
              ? t('notgames.noAnswer')
              : question.mine === question.answer
                ? t('notgames.right')
                : t('notgames.wrong')}
          </strong>
          {question.why !== null && (
            <p>
              <CodeText text={question.why} />
            </p>
          )}
          <ul className="quiz-results">
            {question.results?.map((result) => (
              <li
                key={result.login}
                className={
                  result.correct === true ? 'right' : result.correct === false ? 'wrong' : 'none'
                }
              >
                {result.login === me ? t('agenda.you') : result.login}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

/** El marcador: puntos (o vidas), aciertos y quién ha contestado ya. */
function Scores({ room, me }: { room: QuizRoom; me: string }) {
  const { t } = useI18n()
  const survival = room.settings.mode === 'survival'
  const ranked = [...room.players].sort((a, b) =>
    survival
      ? (b.lives ?? 0) - (a.lives ?? 0) || b.correct - a.correct
      : b.score - a.score || b.correct - a.correct,
  )
  const teamScore = (team: QuizTeam): number =>
    room.players.filter((p) => p.team === team).reduce((sum, p) => sum + p.score, 0)

  return (
    <article className="card quiz-scores">
      <span className="eyebrow">{t('notgames.scores')}</span>
      {room.settings.mode === 'teams' && (
        <p className="quiz-team-scores">
          {t('notgames.team.a')} <strong>{teamScore('a')}</strong> · {t('notgames.team.b')}{' '}
          <strong>{teamScore('b')}</strong>
        </p>
      )}
      <ol className="quiz-ranking">
        {ranked.map((player) => (
          <li
            key={player.login}
            className={`${player.login === me ? 'me' : ''} ${player.out ? 'out' : ''}`}
          >
            <Avatar login={player.login} image={player.image} size={32} />
            <span className="quiz-name">
              {player.login}
              {player.login === me && <small> · {t('rank.you')}</small>}
              {player.team !== null && <small> · {t(`notgames.team.${player.team}`)}</small>}
            </span>
            {survival ? (
              <span
                className="quiz-lives"
                aria-label={t('notgames.lives', { n: player.lives ?? 0 })}
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <Icon
                    key={index}
                    name="corazon"
                    size={14}
                    className={index < (player.lives ?? 0) ? 'on' : 'off'}
                  />
                ))}
              </span>
            ) : (
              <strong>{t('notgames.points', { n: player.score })}</strong>
            )}
            <small>{t('notgames.hits', { n: player.correct })}</small>
            {player.answered && <Icon name="visto" size={14} />}
          </li>
        ))}
      </ol>
    </article>
  )
}

/** Al acabar: quién ha ganado y la vuelta a la lista. */
function Final({ room, me }: { room: QuizRoom; me: string }) {
  const { t } = useI18n()
  const names = room.winners.map((winner) =>
    room.settings.mode === 'teams'
      ? t(`notgames.team.${winner}`)
      : winner === me
        ? t('agenda.you')
        : winner,
  )
  const won =
    room.settings.mode === 'teams'
      ? room.winners.includes(room.players.find((p) => p.login === me)?.team ?? '')
      : room.winners.includes(me)

  return (
    <article className="card quiz-final">
      <span className="eyebrow">{t('notgames.over')}</span>
      <strong className="quiz-winner">
        {won ? t('notgames.youWon') : t('notgames.winner', { names: names.join(', ') })}
      </strong>
      <a className="primary small" href={notGamesHref()}>
        {t('notgames.again')}
      </a>
    </article>
  )
}
