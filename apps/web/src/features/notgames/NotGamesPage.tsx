import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type {
  QuizDifficulty,
  QuizKinds,
  QuizLobby,
  QuizMode,
  QuizPool,
  QuizSettings,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { notGamesHref } from '../../shared/links'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { NotGamesTour } from './NotGamesTour'
import { RoomView } from './RoomView'
import { settingsText } from './settings-text'

const MODES: readonly QuizMode[] = ['duel', 'teams', 'ffa', 'survival']
const KINDS: readonly QuizKinds[] = ['mixed', 'quick', 'long']
const DIFFICULTIES: readonly QuizDifficulty[] = ['rising', 'easy', 'medium', 'hard']
const POOLS: readonly QuizPool[] = ['common', 'general']

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
  const id = room === null ? null : Number(room)

  return (
    <section className="notgames">
      <h2>
        {t('nav.notgames')}
        <InfoTip title={t('nav.notgames')}>
          <NotGamesTour />
        </InfoTip>
      </h2>
      {id !== null && Number.isInteger(id) && id > 0 ? <RoomView id={id} me={me} /> : <Lobby />}
    </section>
  )
}

function Lobby() {
  const { t } = useI18n()
  const rooms = useAsync(() => api.getQuizRooms(), [])
  const [creating, setCreating] = useState(false)

  return (
    <>
      <p className="hint">{t('notgames.pitch')}</p>
      {creating ? (
        <CreateRoom
          onCancel={() => {
            setCreating(false)
          }}
        />
      ) : (
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

      <h3 className="notgames-subtitle">{t('notgames.rooms')}</h3>
      {rooms.loading && rooms.data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={rooms.error} onRetry={() => void rooms.reload()} />
      {rooms.data?.length === 0 && <p className="estado">{t('notgames.noRooms')}</p>}
      <ul className="quiz-rooms">
        {rooms.data?.map((lobby) => (
          <RoomCard key={lobby.id} lobby={lobby} />
        ))}
      </ul>
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
      <a className="pill" href={notGamesHref(lobby.id)}>
        {lobby.joined || lobby.status !== 'lobby' ? t('notgames.open') : t('notgames.join')}
      </a>
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
  const { busy, error, run } = useAction()
  const change = (next: Partial<QuizSettings>): void => {
    setSettings((current) => ({ ...current, ...next }))
  }
  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    void run(async () => {
      const room = await api.createQuizRoom(settings)

      window.location.hash = notGamesHref(room.id)
    })
  }

  return (
    <form className="card quiz-create" onSubmit={submit}>
      <span className="eyebrow">{t('notgames.create')}</span>

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

      <div className="form-grid">
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

      {settings.mode !== 'survival' && (
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
