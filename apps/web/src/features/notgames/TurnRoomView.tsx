import { useCallback, useEffect, useRef, useState } from 'react'

import type { TurnPlayer, TurnRoom, TurnSide } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { notGamesHref } from '../../shared/links'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { BOARD_STYLES, ChessBoard, loadBoardStyle, saveBoardStyle } from './ChessBoard'
import { ChessTour } from './ChessTour'
import type { BoardStyle } from './ChessBoard'
import { SoundToggle } from './SoundToggle'
import { START_FEN } from '../../shared/chess'
import { useGameSounds } from './sounds'
import { CodeText } from '../../shared/ui/CodeText'

const PLAYING_MS = 1000
const WAITING_MS = 2500
/** Por debajo de esto, el reloj se pone en rojo. */
const LOW_MS = 20_000

/** `m:ss`, o `s.d` en los últimos diez segundos (como los relojes de ajedrez). */
function clockText(ms: number): string {
  if (ms < 10_000) return (Math.max(0, ms) / 1000).toFixed(1)

  const seconds = Math.ceil(ms / 1000)

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Una partida de ajedrez con pregunta entre jugadas. Se pide al servidor cada
 * segundo: él lleva los relojes y decide quién mueve. Los relojes y la cuenta
 * atrás se mueven aquí con la hora del servidor.
 */
export function TurnRoomView({ id, me }: { id: number; me: string }) {
  const { t } = useI18n()
  const [room, setRoom] = useState<TurnRoom | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [style, setStyle] = useState<BoardStyle>(loadBoardStyle)
  const offset = useRef(0)
  const action = useAction()
  const sounds = useGameSounds()
  // Repasando la partida acabada: qué posición se ve (`null`, la de ahora).
  const [step, setStep] = useState<number | null>(null)

  const take = useCallback(
    (next: TurnRoom) => {
      offset.current = Date.parse(next.now) - Date.now()
      setRoom((previous) => {
        sounds.turnChanged(previous, next, me)

        return next
      })
      setError(null)
    },
    [me, sounds],
  )

  const load = useCallback(async () => {
    try {
      take(await api.getTurnRoom(id))
    } catch (caught) {
      setError(caught)
    }
  }, [id, take])

  useEffect(() => {
    void load()
  }, [load])

  const status = room?.status

  useEffect(() => {
    if (status === 'done') return undefined

    const timer = setInterval(
      () => {
        if (!document.hidden) void load()
      },
      status === 'playing' ? PLAYING_MS : WAITING_MS,
    )

    return () => {
      clearInterval(timer)
    }
  }, [status, load])

  if (room === null) {
    return error === null ? (
      <p className="estado">{t('app.loading')}</p>
    ) : (
      <ErrorNote error={error} onRetry={() => void load()} />
    )
  }

  const mine = room.players.find((p) => p.login === me)?.side ?? null
  const positions = room.board?.positions
  // Las posiciones de la partida, desde la inicial; las partidas viejas no las guardaban.
  const frames =
    positions !== undefined && positions.length === room.board?.history.length
      ? [START_FEN, ...positions]
      : null
  const run = (task: () => Promise<TurnRoom>): void => {
    void action.run(async () => {
      take(await task())
    })
  }
  const leave = (): void => {
    void action.run(async () => {
      await api.leaveTurnRoom(id)
      window.location.hash = notGamesHref()
    })
  }

  return (
    <div className="quiz-room turn-room">
      <div className="quiz-room-bar">
        <a className="back-btn" href={notGamesHref()}>
          {t('notgames.back')}
        </a>
        <span className="quiz-room-tools">
          <SoundToggle />
          {mine !== null && (
            <button type="button" className="pill" disabled={action.busy} onClick={leave}>
              <Icon name="salir" size={14} /> {t('notgames.leave')}
            </button>
          )}
        </span>
      </div>
      <p className="hint">
        <strong>{t('notgames.game.chess')}</strong>
        <InfoTip title={t('notgames.game.chess')}>
          <ChessTour />
        </InfoTip>{' '}
        · {t('notgames.minutesN', { n: room.settings.minutes })}
      </p>

      {room.status === 'lobby' ? (
        <ChessLobby
          room={room}
          me={me}
          busy={action.busy}
          onJoin={() => {
            run(() => api.joinTurnRoom(id))
          }}
          onStart={() => {
            run(() => api.startTurnRoom(id))
          }}
        />
      ) : (
        <div className="turn-layout">
          <div className="turn-board-col">
            <div className="turn-board-stack">
              {room.board !== null && (
                <ChessBoard
                  board={
                    step === null || frames === null
                      ? room.board
                      : { ...room.board, fen: frames[step] ?? room.board.fen, lastMove: null }
                  }
                  side={mine}
                  canPlay={
                    step === null &&
                    room.status === 'playing' &&
                    room.mover !== null &&
                    room.mover === mine
                  }
                  style={style}
                  onMove={(move) => {
                    run(() => api.moveTurn(id, move))
                  }}
                />
              )}
              {/* Con la pregunta nadie mueve: va encima del tablero, que no se pierda. */}
              {room.question !== null && (
                <TurnQuestionCard
                  room={room}
                  playing={mine !== null}
                  offset={offset.current}
                  onAnswer={(option) => {
                    if (room.question !== null)
                      run(() => api.answerTurn(id, room.question?.index ?? 0, option))
                  }}
                />
              )}
            </div>
            <div className="filter-pills" role="group" aria-label={t('notgames.chess.boardStyle')}>
              {BOARD_STYLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`pill board-swatch board-${option} ${style === option ? 'active' : ''}`}
                  aria-pressed={style === option}
                  onClick={() => {
                    setStyle(option)
                    saveBoardStyle(option)
                  }}
                >
                  <i aria-hidden="true" /> {t(`notgames.chess.board.${option}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="turn-side">
            <PlayerClocks room={room} me={me} offset={offset.current} />
            {room.status === 'playing' && <TurnStatus room={room} me={me} mine={mine} />}
            {room.last !== null && room.question === null && <LastQuestion room={room} me={me} />}
            {room.end !== null && (
              <TurnFinal room={room} me={me} frames={frames} step={step} onStep={setStep} />
            )}
            {room.board !== null && room.board.history.length > 0 && (
              <details className="turn-history">
                <summary>{t('notgames.chess.moves', { n: room.board.history.length })}</summary>
                <ol>
                  {pairs(room.board.history).map(([white, black], index) => (
                    <li key={index}>
                      {white} {black ?? ''}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {room.status === 'playing' && mine !== null && (
              <button
                type="button"
                className="pill"
                disabled={action.busy}
                onClick={() => {
                  run(() => api.resignTurn(id))
                }}
              >
                <Icon name="bandera" size={14} /> {t('notgames.chess.resign')}
              </button>
            )}
          </div>
        </div>
      )}
      <ErrorNote error={action.error ?? error} />
    </div>
  )
}

const pairs = (moves: readonly string[]): [string, string | undefined][] =>
  Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => [
    moves[index * 2] ?? '',
    moves[index * 2 + 1],
  ])

function ChessLobby({
  room,
  me,
  busy,
  onJoin,
  onStart,
}: {
  room: TurnRoom
  me: string
  busy: boolean
  onJoin: () => void
  onStart: () => void
}) {
  const { t } = useI18n()
  const inside = room.players.some((p) => p.login === me)

  return (
    <article className="card quiz-waiting">
      <span className="eyebrow">{t('notgames.waiting', { n: room.players.length })}</span>
      <ul className="quiz-players">
        {(['a', 'b'] as const).map((side) => {
          const player = room.players.find((p) => p.side === side)

          return (
            <li key={side} className={player?.login === me ? 'me' : ''}>
              {player === undefined ? (
                <span className="hint">{t('notgames.chess.waitingRival')}</span>
              ) : (
                <>
                  <Avatar login={player.login} image={player.image} size={24} />
                  {player.login}
                </>
              )}
              <small> · {t(`notgames.chess.side.${side}`)}</small>
            </li>
          )
        })}
      </ul>
      {!inside && room.whyNot !== null && <p className="hint">{room.whyNot}</p>}
      <div className="actions">
        {!inside && (
          <button
            type="button"
            className="primary small"
            disabled={busy || !room.joinable}
            onClick={onJoin}
          >
            {t('notgames.join')}
          </button>
        )}
        {room.host === me && (
          <button
            type="button"
            className="primary small"
            disabled={busy || room.players.length < 2}
            onClick={onStart}
          >
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

/** Los dos relojes: el de quien mueve, corriendo. */
function PlayerClocks({ room, me, offset }: { room: TurnRoom; me: string; offset: number }) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now() + offset)
  const running = room.status === 'playing' && room.mover !== null

  useEffect(() => {
    if (!running) return undefined

    const timer = setInterval(() => {
      setNow(Date.now() + offset)
    }, 100)

    return () => {
      clearInterval(timer)
    }
  }, [running, offset])

  const since = Date.parse(room.now)
  const left = (player: TurnPlayer): number =>
    running && player.side === room.mover ? player.clockMs - (now - since) : player.clockMs
  // El rival arriba y tú abajo, como en el tablero.
  const ordered = [...room.players].sort((x, y) =>
    x.login === me ? 1 : y.login === me ? -1 : x.side === 'a' ? 1 : -1,
  )

  return (
    <div className="turn-clocks">
      {ordered.map((player) => {
        const ms = left(player)

        return (
          <div
            key={player.login}
            className={[
              'turn-clock',
              player.side === room.mover && running ? 'running' : '',
              ms < LOW_MS ? 'low' : '',
              player.login === me ? 'me' : '',
            ].join(' ')}
          >
            <Avatar login={player.login} image={player.image} size={32} />
            <span className="turn-clock-name">
              <strong>{player.login}</strong>
              <small>
                {t(`notgames.chess.side.${player.side}`)} ·{' '}
                {t('notgames.hits', { n: player.correct })}
              </small>
            </span>
            <strong
              className="turn-clock-time"
              role="timer"
              aria-label={t('notgames.chess.clock', { login: player.login })}
            >
              {clockText(ms)}
            </strong>
          </div>
        )
      })}
    </div>
  )
}

function TurnStatus({ room, me, mine }: { room: TurnRoom; me: string; mine: TurnSide | null }) {
  const { t } = useI18n()

  if (room.question !== null)
    return <p className="turn-status ask">{t('notgames.chess.question')}</p>
  if (room.mover === null) return null

  const mover = room.players.find((p) => p.side === room.mover)

  return (
    <p className={`turn-status ${room.mover === mine ? 'you' : ''}`} role="status">
      {room.mover === mine
        ? t('notgames.chess.yourMove')
        : t('notgames.chess.theirMove', {
            login: mover?.login === me ? t('agenda.you') : (mover?.login ?? ''),
          })}
    </p>
  )
}

function TurnQuestionCard({
  room,
  playing,
  offset,
  onAnswer,
}: {
  room: TurnRoom
  playing: boolean
  offset: number
  onAnswer: (option: number) => void
}) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now() + offset)
  const question = room.question

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + offset)
    }, 200)

    return () => {
      clearInterval(timer)
    }
  }, [offset])

  if (question === null) return null

  const startsAt = Date.parse(question.startsAt)
  const endsAt = Date.parse(question.endsAt)
  const share = Math.max(0, Math.min(1, (endsAt - now) / Math.max(1, endsAt - startsAt)))
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const answered = question.mine !== null

  return (
    <article className="card quiz-question turn-question">
      <div className="quiz-question-head">
        <span className="eyebrow">{t('notgames.chess.questionTitle')}</span>
        <span className="quiz-level">{t(`notgames.kind.${question.kind}`)}</span>
      </div>
      <div
        className={`quiz-timer ${left <= 3 ? 'late' : ''}`}
        role="timer"
        aria-label={t('notgames.secondsLeft', { n: left })}
      >
        <span style={{ width: `${share * 100}%` }} />
      </div>
      <p className="quiz-prompt">
        <CodeText text={question.prompt} />
      </p>
      {question.code !== null && <pre className="quiz-code">{question.code}</pre>}
      <div className="quiz-options">
        {question.options.map((option) => (
          <button
            // Una clave por pregunta: si el botón se reutiliza, el que se pulsó en la
            // anterior se queda con el foco y parece marcado en la nueva.
            key={`${String(question.index)}-${String(option.id)}`}
            type="button"
            className={`quiz-option ${question.mine === option.id ? 'mine' : ''}`}
            disabled={!playing || answered}
            aria-pressed={question.mine === option.id}
            onClick={() => {
              onAnswer(option.id)
            }}
          >
            <CodeText text={option.text} />
          </button>
        ))}
      </div>
      {answered && <p className="hint">{t('notgames.answered')}</p>}
    </article>
  )
}

/** Cómo fue la pregunta anterior: quién contestó primero, la buena y quién movió. */
function LastQuestion({ room, me }: { room: TurnRoom; me: string }) {
  const { t } = useI18n()
  const last = room.last

  if (last === null) return null

  const winner = room.players.find((p) => p.side === last.winner)?.login ?? ''
  const right = last.options.find((option) => option.id === last.answer)?.text ?? ''
  const first = last.first
  // Cada caso con su frase: el verbo cambia si eres tú («aciertas», «mueves»).
  const message =
    first === null
      ? winner === me
        ? t('notgames.chess.nobodyMe')
        : t('notgames.chess.nobody', { login: winner })
      : first.correct
        ? first.login === me
          ? t('notgames.chess.firstRightMe')
          : t('notgames.chess.firstRight', { login: first.login })
        : first.login === me
          ? t('notgames.chess.firstWrongMe', { other: winner })
          : winner === me
            ? t('notgames.chess.firstWrongYouMove', { login: first.login })
            : t('notgames.chess.firstWrong', { login: first.login, other: winner })

  return (
    <article
      className={`card turn-last ${first?.correct === false ? 'wrong' : 'right'}`}
      role="status"
    >
      <strong>{message}</strong>
      <p className="hint">
        <CodeText text={last.prompt} /> →{' '}
        <strong>
          <CodeText text={right} />
        </strong>
      </p>
      <p className="hint">
        <CodeText text={last.why} />
      </p>
    </article>
  )
}

/** Segundos que se queda la partida acabada en pantalla antes de volver a las salas. */
const LEAVE_S = 20

function TurnFinal({
  room,
  me,
  frames,
  step,
  onStep,
}: {
  room: TurnRoom
  me: string
  /** Las posiciones para repasar la partida, o `null` si no se guardaron. */
  frames: string[] | null
  step: number | null
  onStep: (step: number | null) => void
}) {
  const { t } = useI18n()
  const [left, setLeft] = useState(LEAVE_S)
  const end = room.end

  // Al acabar se vuelve sola a las salas (#89), salvo que se esté repasando la partida.
  useEffect(() => {
    if (step !== null) return undefined
    if (left <= 0) {
      window.location.hash = notGamesHref()

      return undefined
    }

    const timer = setTimeout(() => {
      setLeft((value) => value - 1)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [left, step])

  if (end === null) return null

  const winner = room.players.find((p) => p.side === end.winner)?.login ?? null
  const total = frames === null ? 0 : frames.length - 1
  const history = room.board?.history ?? []

  return (
    <article className="card quiz-final">
      <span className="eyebrow">
        {t('notgames.over')} · {t(`notgames.end.${end.reason}`)}
      </span>
      <strong className="quiz-winner">
        {winner === null
          ? t('notgames.end.drawResult')
          : winner === me
            ? t('notgames.youWon')
            : t('notgames.winner', { names: winner })}
      </strong>
      {step === null ? (
        <>
          <p className="hint">{t('notgames.chess.leaving', { n: left })}</p>
          <div className="actions">
            <a className="primary small" href={notGamesHref()}>
              {t('notgames.again')}
            </a>
            {frames !== null && total > 0 && (
              <button
                type="button"
                className="pill"
                onClick={() => {
                  onStep(0)
                }}
              >
                {t('notgames.chess.review')}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="turn-replay">
          <p aria-live="polite">
            {step === 0
              ? t('notgames.chess.reviewStart')
              : t('notgames.chess.reviewStep', { n: step, total, move: history[step - 1] ?? '' })}
          </p>
          <div className="actions">
            <button
              type="button"
              className="pill"
              disabled={step === 0}
              onClick={() => {
                onStep(step - 1)
              }}
            >
              ‹ {t('notgames.chess.reviewPrev')}
            </button>
            <button
              type="button"
              className="pill"
              disabled={step >= total}
              onClick={() => {
                onStep(step + 1)
              }}
            >
              {t('notgames.chess.reviewNext')} ›
            </button>
            <a className="primary small" href={notGamesHref()}>
              {t('notgames.again')}
            </a>
          </div>
        </div>
      )}
    </article>
  )
}
