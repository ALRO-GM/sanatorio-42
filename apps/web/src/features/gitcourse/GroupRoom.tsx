import { useCallback, useEffect, useRef, useState } from 'react'

import type { GitRoom, GitRoomLobby } from '@sanatorio/contracts'
import { filled, MAX_PLAYERS, missionIn, missionItemIn, missionOf } from '@sanatorio/gitsim'
import type { Gate, GroupMission } from '@sanatorio/gitsim'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { clock } from '../../shared/time'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { WorldGraphs } from './GitGraph'
import { Terminal } from './Terminal'
import type { TerminalEntry } from './Terminal'

const LIST_MS = 3000
const PLAYING_MS = 2000
const WAITING_MS = 2500

/**
 * Las salas de una prueba de grupo: las del campus sin empezar y las tuyas.
 * Se entra en una (o se crea) y se juega dentro.
 */
export function GroupRooms({ gate, me }: { gate: Gate; me: string }) {
  const { t, lang } = useI18n()
  const found = missionOf(gate.id)
  const mission = found === undefined ? undefined : missionIn(found, lang)
  const [open, setOpen] = useState<number | null>(null)
  const [rooms, setRooms] = useState<GitRoomLobby[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const action = useAction()

  const load = useCallback(async () => {
    try {
      setRooms(await api.getGitRooms(gate.id))
      setError(null)
    } catch (caught) {
      setError(caught)
    }
  }, [gate.id])

  useEffect(() => {
    if (open !== null) return undefined
    void load()

    const timer = setInterval(() => {
      if (!document.hidden) void load()
    }, LIST_MS)

    return () => {
      clearInterval(timer)
    }
  }, [open, load])

  if (mission === undefined) return null
  if (open !== null) {
    return (
      <GroupRoom
        id={open}
        me={me}
        gate={gate}
        mission={mission}
        onExit={() => {
          setOpen(null)
        }}
      />
    )
  }

  const enter = (task: () => Promise<GitRoom>) => {
    void action.run(async () => {
      setOpen((await task()).id)
    })
  }

  return (
    <section className="git-group">
      <h4>{mission.title}</h4>
      <p>{mission.story}</p>
      <p className="muted">{t('git.room.who', { min: gate.min, max: MAX_PLAYERS })}</p>
      {mission.apart && <p className="notice">{t('git.room.apart')}</p>}
      <ErrorNote error={error ?? action.error} />
      <div className="git-actions">
        <button
          type="button"
          className="primary"
          disabled={action.busy}
          onClick={() => {
            enter(() => api.createGitRoom(gate.id))
          }}
        >
          {t('git.room.create')}
        </button>
      </div>
      {rooms !== null && rooms.length === 0 && <p className="muted">{t('git.room.none')}</p>}
      <ul className="git-room-list">
        {(rooms ?? []).map((room) => (
          <li key={room.id}>
            <span>
              <strong>{room.host}</strong> · {t('git.room.players', { n: room.players })} ·{' '}
              {t(`git.room.status.${room.status}`)}
            </span>
            <button
              type="button"
              className="pill"
              disabled={action.busy}
              onClick={() => {
                enter(() => (room.joined ? api.getGitRoom(room.id) : api.joinGitRoom(room.id)))
              }}
            >
              {t(room.joined ? 'git.room.back' : 'git.room.join')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Una sala de prueba de grupo. Se pide al servidor cada dos segundos: los
 * demás cambian origin mientras juegas. Los comandos van al servidor, que los
 * ejecuta en tu repositorio y comprueba las misiones.
 */
function GroupRoom({
  id,
  me,
  gate,
  mission,
  onExit,
}: {
  id: number
  me: string
  gate: Gate
  mission: GroupMission
  onExit: () => void
}) {
  const { t, lang } = useI18n()
  const [room, setRoom] = useState<GitRoom | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [entries, setEntries] = useState<TerminalEntry[]>([])
  const offset = useRef(0)
  const action = useAction()

  const take = useCallback((next: GitRoom) => {
    offset.current = Date.parse(next.now) - Date.now()
    setRoom(next)
    setError(null)
  }, [])

  const load = useCallback(async () => {
    try {
      take(await api.getGitRoom(id))
    } catch (caught) {
      setError(caught)
    }
  }, [id, take])

  useEffect(() => {
    void load()
  }, [load])

  const status = room?.status
  // Milisegundos que quedan hasta el plazo, con la hora del servidor.
  const deadline = room?.deadline ?? null
  const now = useNow(1000, { active: deadline !== null, offset: offset.current })
  const left = deadline === null ? null : Math.max(0, Date.parse(deadline) - now)

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
      <p className="muted">{t('app.loading')}</p>
    ) : (
      <ErrorNote error={error} onRetry={() => void load()} />
    )
  }

  const leave = () => {
    void action.run(async () => {
      await api.leaveGitRoom(id)
      onExit()
    })
  }
  const myNumber = room.mine?.n ?? null
  const mySeat = room.players.find((p) => p.login === me)?.seat ?? null
  const repo = room.mine?.repo ?? null
  const branch = repo === null ? '' : repo.head.kind === 'branch' ? repo.head.name : repo.head.id

  function onRun(line: string) {
    void action.run(async () => {
      const result = await api.runGitRoom(id, line)

      setEntries((before) => [...before, { line, output: result.output, ok: result.ok }])
      take(result.room)
    })
  }

  return (
    <section className="git-group git-room">
      <div className="quiz-room-bar">
        <button type="button" className="ghost" onClick={onExit}>
          ← {t('git.room.list')}
        </button>
        <span className="git-room-tools">
          {left !== null && room.status === 'playing' && (
            <span className={`git-gate-clock ${left < 5 * 60_000 ? 'late' : ''}`}>
              ⏱ {clock(left / 1000)}
            </span>
          )}
          <button type="button" className="pill" disabled={action.busy} onClick={leave}>
            {t('git.room.leave')}
          </button>
        </span>
      </div>
      <h4>{mission.title}</h4>
      <ErrorNote error={error ?? action.error} />
      {room.result === 'passed' && (
        <p className="git-won" role="status">
          ★ {t('git.room.passed')}
        </p>
      )}
      {room.result === 'expired' && <p className="notice">{t('git.room.expired')}</p>}

      {room.status === 'lobby' ? (
        <>
          <p>{mission.story}</p>
          <ul className="git-room-people">
            {room.players.map((p) => (
              <li key={p.login}>
                <Avatar login={p.login} image={p.image} size={32} />
                <strong>{p.login}</strong> · {t('git.room.number', { n: p.n })}
                {p.seat === null && <span className="notice"> {t('git.room.standing')}</span>}
              </li>
            ))}
          </ul>
          {room.host === me ? (
            <div className="git-actions">
              <button
                type="button"
                className="primary"
                disabled={action.busy || room.players.length < gate.min}
                onClick={() => {
                  void action.run(async () => {
                    take(await api.startGitRoom(id))
                  })
                }}
              >
                {t('git.room.start')}
              </button>
              {room.players.length < gate.min && (
                <span className="muted">
                  {t('git.room.missing', { n: gate.min - room.players.length })}
                </span>
              )}
            </div>
          ) : (
            <p className="muted">{t('git.room.waiting', { host: room.host })}</p>
          )}
        </>
      ) : (
        <div className="git-challenge-grid">
          <div>
            {myNumber !== null && (
              <details className="git-tasks" open>
                <summary>
                  {t('git.room.tasks')} · <strong>{t('git.room.number', { n: myNumber })}</strong>
                </summary>
                <ol>
                  {mission.tasks.map((task) => (
                    <li key={task}>
                      <code>{filled(task, { login: me, n: myNumber })}</code>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <Terminal
              entries={entries}
              prompt={`${mySeat ?? 'pc'}:~/repo (${branch})$`}
              disabled={room.status !== 'playing' || action.busy}
              onRun={onRun}
              onClear={() => {
                setEntries([])
              }}
            />
            <p className="muted">{t('git.room.hints', { hints: mission.hints.join(' · ') })}</p>
          </div>
          <div>
            <h5>{t('git.room.missions')}</h5>
            <ul className="git-missions">
              {room.missions.map((item) => (
                <li key={item.text} className={item.done ? 'done' : ''}>
                  {item.done ? '✓' : '○'} {missionItemIn(item, lang)}
                </li>
              ))}
            </ul>
            {repo !== null && room.remote !== null && (
              <WorldGraphs world={{ repo, remote: room.remote }} />
            )}
            <h5>{t('git.room.people')}</h5>
            <ul className="git-room-people">
              {room.players.map((p) => (
                <li key={p.login}>
                  <Avatar login={p.login} image={p.image} size={28} />
                  <span>
                    <strong>{p.login}</strong> · {t('git.room.number', { n: p.n })} ·{' '}
                    {p.seat ?? t('git.room.standing')} · {t('git.room.commands', { n: p.commands })}
                    {p.last !== null && (
                      <>
                        <br />
                        <code>$ {p.last}</code>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
