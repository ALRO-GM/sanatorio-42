import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import type {
  QuizDifficulty,
  QuizKinds,
  QuizLobby,
  QuizMode,
  QuizPool,
  QuizSettings,
  TurnLobby,
  TurnSettings,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { notGamesHref, turnGameHref } from '../../shared/links'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { GitCourseTab } from '../gitcourse/GitCourseTab'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { NotGamesTour } from './NotGamesTour'
import { RoomView } from './RoomView'
import { ChessTour } from './ChessTour'
import { ReviewTab } from './ReviewTab'
import { TurnRoomView } from './TurnRoomView'
import { settingsText } from './settings-text'

const MODES: readonly QuizMode[] = ['duel', 'teams', 'ffa', 'survival']
const KINDS: readonly QuizKinds[] = ['mixed', 'quick', 'long']
const DIFFICULTIES: readonly QuizDifficulty[] = ['rising', 'easy', 'medium', 'hard']
const POOLS: readonly QuizPool[] = ['common', 'general']
const GAMES = ['quiz', 'chess'] as const
const MINUTES: readonly TurnSettings['minutes'][] = [3, 5, 10, 15]

type Game = (typeof GAMES)[number]

type NotGamesPageProps = {
  me: string
  /** El id de la sala de la dirección (`#/notgames/12`), o `null` para la lista. */
  room: string | null
}

/**
 * Not-games: preguntas de programación para aprender con más gente. La lista
 * de salas abiertas del campus y el formulario para crear una; con una sala en
 * la dirección, la sala.
 */
export function NotGamesPage({ me, room }: NotGamesPageProps) {
  const { t } = useI18n()
  // `t12` es una partida por turnos (ajedrez); un número solo, una sala de preguntas.
  const turn = room?.startsWith('t') === true
  const id = room === null ? null : Number(turn ? room.slice(1) : room)
  const valid = id !== null && Number.isInteger(id) && id > 0

  return (
    <section className="notgames">
      <h2>
        {t('nav.notgames')}
        <InfoTip title={t('nav.notgames')}>
          <NotGamesTour />
        </InfoTip>
      </h2>
      {valid && turn && <TurnRoomView id={id} me={me} />}
      {valid && !turn && <RoomView id={id} me={me} />}
      {!valid && <Lobby me={me} initial={room === 'git' ? 'git' : 'rooms'} />}
    </section>
  )
}

const TABS = ['rooms', 'review', 'git'] as const

type Tab = (typeof TABS)[number]

/** La portada de Not-games: las salas, tu Repaso o el curso de git (`#/notgames/git`). */
function Lobby({ me, initial }: { me: string; initial: Tab }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>(initial)

  return (
    <>
      <div className="filter-pills" role="tablist" aria-label={t('nav.notgames')}>
        {TABS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            className={`pill ${tab === option ? 'active' : ''}`}
            aria-selected={tab === option}
            onClick={() => {
              setTab(option)
            }}
          >
            {t(`notgames.tab.${option}`)}
          </button>
        ))}
      </div>
      {tab === 'rooms' && <Rooms />}
      {tab === 'review' && <ReviewTab />}
      {tab === 'git' && (
        <GitCourseTab
          me={me}
          onReview={() => {
            setTab('review')
          }}
        />
      )}
    </>
  )
}

/** Cada cuánto se vuelve a pedir la lista de salas mientras se mira. */
const LIST_REFRESH_MS = 5000

function Rooms() {
  const { t } = useI18n()
  const rooms = useAsync(async () => {
    const [quiz, turns] = await Promise.all([api.getQuizRooms(), api.getTurnRooms()])

    return [
      ...quiz.map((lobby) => ({ kind: 'quiz' as const, lobby })),
      ...turns.map((lobby) => ({ kind: 'turn' as const, lobby })),
    ]
  }, [])
  const [creating, setCreating] = useState(false)
  const { reload } = rooms

  // La lista se pone al día sola: las salas se llenan y se abren mientras miras.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void reload()
    }, LIST_REFRESH_MS)

    return () => {
      clearInterval(timer)
    }
  }, [reload])

  return (
    <>
      <p className="hint">{t('notgames.pitch')}</p>
      {!creating && (
        <button
          type="button"
          className="primary"
          onClick={() => {
            setCreating(true)
          }}
        >
          <Icon name="mas" size={16} /> {t('notgames.create')}
        </button>
      )}

      {/* Creando una sala, el formulario y las salas abiertas van lado a lado:
          así se ve si ya hay una a la que unirse. */}
      <div className={creating ? 'notgames-split' : undefined}>
        {creating && (
          <CreateRoom
            onCancel={() => {
              setCreating(false)
            }}
          />
        )}
        <div>
          <h3 className="notgames-subtitle">{t('notgames.rooms')}</h3>
          {rooms.loading && rooms.data === undefined && (
            <p className="estado">{t('app.loading')}</p>
          )}
          <ErrorNote error={rooms.error} onRetry={() => void rooms.reload()} />
          {rooms.data?.length === 0 && <p className="estado">{t('notgames.noRooms')}</p>}
          <ul className="quiz-rooms">
            {rooms.data?.map((entry) =>
              entry.kind === 'quiz' ? (
                <RoomCard key={`q${entry.lobby.id}`} lobby={entry.lobby} />
              ) : (
                <TurnCard key={`t${entry.lobby.id}`} lobby={entry.lobby} />
              ),
            )}
          </ul>
        </div>
      </div>
      <button type="button" className="link" onClick={() => void rooms.reload()}>
        {t('agenda.refresh')}
      </button>
    </>
  )
}

function RoomCard({ lobby }: { lobby: QuizLobby }) {
  const { t } = useI18n()

  return (
    <li className="card quiz-room-card">
      <span>
        <strong>{t(`notgames.mode.${lobby.settings.mode}`)}</strong>
        <small>{settingsText(t, lobby.settings)}</small>
        <small>{t('notgames.hostAndPlayers', { host: lobby.host, n: lobby.players })}</small>
      </span>
      {/* Dentro se elige equipo: aquí solo se abre (antes decía «Entrar» y no entraba). */}
      <a className="pill" href={notGamesHref(lobby.id)}>
        {t('notgames.open')}
      </a>
    </li>
  )
}

function TurnCard({ lobby }: { lobby: TurnLobby }) {
  const { t } = useI18n()
  const joining = useAction()
  // Con plaza libre, «Entrar» te sienta en la sala de verdad: antes solo la
  // abría, y quien la creó no veía llegar a nadie hasta que se pulsaba otra vez.
  const canJoin = !lobby.joined && lobby.status === 'lobby' && lobby.players < 2

  return (
    <li className="card quiz-room-card">
      <span>
        <strong>{t(`notgames.game.${lobby.settings.game}`)}</strong>
        <small>
          {t('notgames.minutesN', { n: lobby.settings.minutes })} ·{' '}
          {t(`notgames.pool.${lobby.settings.pool}`)}
          {lobby.settings.minCircle === null
            ? ''
            : ` · ${t('notgames.fromCircle', { n: lobby.settings.minCircle })}`}
        </small>
        <small>{t('notgames.hostAndPlayers', { host: lobby.host, n: lobby.players })}</small>
      </span>
      {canJoin ? (
        <button
          type="button"
          className="pill"
          disabled={joining.busy}
          onClick={() => {
            void joining
              .run(() => api.joinTurnRoom(lobby.id))
              .then((joined) => {
                if (joined) window.location.hash = turnGameHref(lobby.id)
              })
          }}
        >
          {t('notgames.join')}
        </button>
      ) : (
        <a className="pill" href={turnGameHref(lobby.id)}>
          {t('notgames.open')}
        </a>
      )}
      <ErrorNote error={joining.error} />
    </li>
  )
}

function CreateRoom({ onCancel }: { onCancel: () => void }) {
  const { t } = useI18n()
  const [settings, setSettings] = useState<QuizSettings>({
    mode: 'duel',
    competitive: false,
    pool: 'common',
    kinds: 'mixed',
    difficulty: 'rising',
    questions: 10,
    minCircle: null,
  })
  const [game, setGame] = useState<Game>('quiz')
  const [minutes, setMinutes] = useState<TurnSettings['minutes']>(5)
  const { busy, error, run } = useAction()
  const change = (next: Partial<QuizSettings>): void => {
    setSettings((current) => ({ ...current, ...next }))
  }
  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    void run(async () => {
      if (game === 'chess') {
        const room = await api.createTurnRoom({
          game: 'chess',
          minutes,
          pool: settings.pool,
          kinds: settings.kinds,
          minCircle: settings.minCircle,
        })

        window.location.hash = turnGameHref(room.id)

        return
      }

      const room = await api.createQuizRoom(settings)

      window.location.hash = notGamesHref(room.id)
    })
  }

  return (
    <form className="card quiz-create" onSubmit={submit}>
      <span className="eyebrow">{t('notgames.create')}</span>

      <fieldset className="quiz-modes">
        <legend>{t('notgames.game.label')}</legend>
        {GAMES.map((option) => (
          <button
            key={option}
            type="button"
            className={`quiz-mode ${game === option ? 'active' : ''}`}
            aria-pressed={game === option}
            onClick={() => {
              setGame(option)
            }}
          >
            <strong>{t(`notgames.game.${option}`)}</strong>
            <small>{t(`notgames.game.${option}.hint`)}</small>
          </button>
        ))}
        {game === 'chess' && (
          <InfoTip title={t('notgames.game.chess')}>
            <ChessTour />
          </InfoTip>
        )}
      </fieldset>

      {game === 'quiz' && (
        <fieldset className="quiz-modes">
          <legend>{t('notgames.modeLabel')}</legend>
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`quiz-mode ${settings.mode === mode ? 'active' : ''}`}
              aria-pressed={settings.mode === mode}
              onClick={() => {
                change({ mode })
              }}
            >
              <strong>{t(`notgames.mode.${mode}`)}</strong>
              <small>{t(`notgames.mode.${mode}.hint`)}</small>
            </button>
          ))}
        </fieldset>
      )}

      <div className="form-grid">
        {game === 'chess' && (
          <label>
            {t('notgames.minutes')}
            <select
              value={minutes}
              onChange={(event) => {
                setMinutes(Number(event.target.value))
              }}
            >
              {MINUTES.map((option) => (
                <option key={option} value={option}>
                  {t('notgames.minutesN', { n: option })}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t('notgames.pool')}
          <select
            value={settings.pool}
            onChange={(event) => {
              change({ pool: event.target.value as QuizPool })
            }}
          >
            {POOLS.map((pool) => (
              <option key={pool} value={pool}>
                {t(`notgames.pool.${pool}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('notgames.kinds')}
          <select
            value={settings.kinds}
            onChange={(event) => {
              change({ kinds: event.target.value as QuizKinds })
            }}
          >
            {KINDS.map((kinds) => (
              <option key={kinds} value={kinds}>
                {t(`notgames.kinds.${kinds}`)}
              </option>
            ))}
          </select>
        </label>
        {game === 'quiz' && (
          <label>
            {t('notgames.difficulty')}
            <select
              value={settings.difficulty}
              onChange={(event) => {
                change({ difficulty: event.target.value as QuizDifficulty })
              }}
            >
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {t(`notgames.difficulty.${difficulty}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {game === 'quiz' && (
          <label>
            {settings.mode === 'survival' ? t('notgames.questionsMax') : t('notgames.questions')}
            <input
              type="number"
              min={5}
              max={settings.mode === 'survival' ? 60 : 30}
              value={settings.questions}
              onChange={(event) => {
                change({ questions: Number(event.target.value) })
              }}
            />
          </label>
        )}
        <label>
          {t('notgames.minCircle')}
          <select
            value={settings.minCircle ?? ''}
            onChange={(event) => {
              change({ minCircle: event.target.value === '' ? null : Number(event.target.value) })
            }}
          >
            <option value="">{t('notgames.minCircle.any')}</option>
            {[1, 2, 3, 4, 5, 6].map((circle) => (
              <option key={circle} value={circle}>
                {t('graph.circle', { n: circle })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {game === 'quiz' && settings.mode !== 'survival' && (
        <label className="duty-check">
          <input
            type="checkbox"
            checked={settings.competitive}
            onChange={(event) => {
              change({ competitive: event.target.checked })
            }}
          />
          {t('notgames.competitive')}
        </label>
      )}

      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy}>
          {t('notgames.createSend')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('therapy.cancel')}
        </button>
      </div>
    </form>
  )
}
