import { useState } from 'react'

import { seatName } from '../../shared/seats'
import type { GroupView, ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { useConfirm } from '../../shared/ui/useConfirm'
import { ChatRoom } from '../../shared/chat/Chat'
import { shortDay, today } from './days'
import { GroupForm } from './GroupForm'
import { Icon } from '../../shared/ui/Icon'

type GroupCardProps = {
  group: GroupView
  /** Proyectos entre los que se puede elegir al editar el grupo. */
  projects: readonly ProjectSummary[]
  /** Algo ha cambiado (alguien entra, sale o se cierra): hay que volver a pedir la lista. */
  onChange: () => void
  /** Login de quien mira, para su chat. */
  me: string
}

/** Cuántas personas se ven del grupo antes de «y N más». */
const MEMBERS_SHOWN = 4

export function GroupCard({ group, projects, onChange, me }: GroupCardProps) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()
  const confirm = useConfirm()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  // Al apuntarse se pregunta cómo se lleva el proyecto; en uno de repaso, ya está al 100.
  const [joining, setJoining] = useState(false)
  const [progress, setProgress] = useState(group.kind === 'review' ? 100 : 50)
  const [chat, setChat] = useState(false)
  const [allMembers, setAllMembers] = useState(false)
  const now = today()
  const full = group.members.length >= group.capacity

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    if (await run(fn)) onChange()
  }

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(group.members.map((member) => member.login).join(' '))
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  if (editing) {
    return (
      <GroupForm
        // Que no falte en la lista el proyecto del propio grupo.
        projects={
          projects.some((project) => project.id === group.projectId)
            ? projects
            : [
                ...projects,
                { id: group.projectId, name: group.projectName ?? `#${group.projectId}` },
              ]
        }
        defaultProject={group.projectId}
        group={group}
        onCancel={() => {
          setEditing(false)
        }}
        onSaved={() => {
          setEditing(false)
          onChange()
        }}
      />
    )
  }

  return (
    <article className="card group-card">
      <header className="card-head">
        <h3>{group.projectName ?? `#${group.projectId}`}</h3>
        {group.kind === 'review' && (
          <span className="badge specialist" title={t('therapy.kind.review.hint')}>
            {t('therapy.kind.review')}
          </span>
        )}
        <span className={`badge ${full ? 'off' : 'on plain'}`}>
          {full
            ? t('therapy.full', { capacity: group.capacity })
            : t('therapy.open', { taken: group.members.length, capacity: group.capacity })}
        </span>
        {group.inSession && <span className="badge on">{t('therapy.inSession')}</span>}
      </header>

      <div className="tiles">
        <div className="tile">
          <span className="eyebrow">{t('therapy.where')}</span>
          <strong>{group.place}</strong>
          {group.note !== null && <span>{group.note}</span>}
        </div>
        <div className="tile">
          <span className="eyebrow">{t('therapy.when')}</span>
          <strong>{t('therapy.timeRange', { start: group.start, end: group.end })}</strong>
        </div>
      </div>

      <span className="eyebrow">{t('therapy.days')}</span>
      {group.dates.length === 0 ? (
        <p className="hint">{t('therapy.noDates')}</p>
      ) : (
        <ul className="date-chips">
          {group.dates.map((day) => (
            <li key={day}>
              <span className={`chip date-chip ${day < now ? 'past' : day === now ? 'today' : ''}`}>
                {shortDay(day, lang)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {group.seats.length > 0 && (
        <>
          <span className="eyebrow">{t('therapy.seats')}</span>
          <div className="chips">
            {group.seats.map((host) => (
              <span key={host} className="chip seat-chip" title={host}>
                {seatName(host, t)}
              </span>
            ))}
          </div>
        </>
      )}

      <span className="eyebrow">{t('therapy.members')}</span>
      <ul className="members">
        {(allMembers ? group.members : group.members.slice(0, MEMBERS_SHOWN)).map((member) => (
          <li key={member.login}>
            <Avatar login={member.login} image={member.image} size={32} />
            <strong>{member.login}</strong>
            {member.progress !== null && (
              <span className="member-progress" title={t('therapy.progress')}>
                <span style={{ width: `${member.progress}%` }} />
                <small>{member.progress} %</small>
              </span>
            )}
          </li>
        ))}
      </ul>
      {/* Con mucha gente la tarjeta se hacía larguísima: el resto, a un clic. */}
      {!allMembers && group.members.length > MEMBERS_SHOWN && (
        <button
          type="button"
          className="link"
          onClick={() => {
            setAllMembers(true)
          }}
        >
          {t('therapy.moreMembers', { n: group.members.length - MEMBERS_SHOWN })}
        </button>
      )}

      <p className="hint">
        {t(group.seats.length > 0 ? 'therapy.attendance' : 'therapy.attendanceNoSeats')}
      </p>

      {joining && !group.joined && (
        <div className="join-box">
          <label>
            {t('therapy.progressAsk', { n: progress })}
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              disabled={group.kind === 'review'}
              onChange={(event) => {
                setProgress(Number(event.target.value))
              }}
            />
          </label>
          {group.kind === 'review' && <p className="hint">{t('therapy.kind.review.join')}</p>}
          <button
            className="primary small"
            disabled={busy}
            onClick={() => void act(() => api.joinGroup(group.id, progress))}
          >
            {t('therapy.joinConfirm')}
          </button>
        </div>
      )}

      {group.joined && (
        <button
          type="button"
          className="link"
          aria-expanded={chat}
          onClick={() => {
            setChat(!chat)
          }}
        >
          <Icon name="chat" /> {t(chat ? 'therapy.chatHide' : 'therapy.chatShow')}
        </button>
      )}
      {group.joined && chat && <ChatRoom chatId={`group:${group.id}`} me={me} />}

      <div className="actions">
        {group.joined ? (
          <>
            <button
              className="pill"
              disabled={busy}
              onClick={() => void act(() => api.leaveGroup(group.id))}
            >
              {t('therapy.leave')}
            </button>
          </>
        ) : (
          <button
            className="primary small"
            disabled={busy || full}
            aria-expanded={joining}
            onClick={() => {
              setJoining(!joining)
            }}
          >
            {t('therapy.join')}
          </button>
        )}
        <button className="pill" onClick={() => void copy()}>
          {copied ? t('therapy.copied') : t('therapy.copy')}
        </button>
        {group.mine && (
          <>
            <button
              className="pill"
              onClick={() => {
                setEditing(true)
              }}
            >
              {t('edit.edit')}
            </button>
            <button
              className="pill"
              disabled={busy}
              onClick={() => void act(() => api.closeGroup(group.id))}
            >
              {t('therapy.close')}
            </button>
          </>
        )}
        {/* Quien lo abrió puede avisar, una vez, a quien hace el proyecto. */}
        {group.mine && group.invited === null && (
          <button
            className="pill"
            disabled={busy}
            onClick={() => {
              void confirm
                .ask({
                  body: t('therapy.inviteAsk', { project: group.projectName ?? '' }),
                  okText: t('therapy.invite'),
                })
                .then((ok) => (ok ? act(() => api.inviteGroup(group.id)) : undefined))
            }}
          >
            <Icon name="campana" /> {t('therapy.invite')}
          </button>
        )}
        {group.mine && group.invited !== null && (
          <span className="hint">{t('therapy.invited', { n: group.invited })}</span>
        )}
        {/* Quien modera puede retirar el de otra persona, pero no cambiarlo. */}
        {!group.mine && group.canClose && (
          <button
            className="link"
            disabled={busy}
            onClick={() => {
              void confirm
                .ask({
                  body: t('therapy.removeAsk', { creator: group.creator }),
                  okText: t('therapy.remove'),
                  danger: true,
                })
                .then((ok) => (ok ? act(() => api.closeGroup(group.id)) : undefined))
            }}
          >
            {t('therapy.remove')}
          </button>
        )}
      </div>
      <ErrorNote error={error} />
      {confirm.dialog}
    </article>
  )
}
