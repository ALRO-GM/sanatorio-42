import { useState } from 'react'

import { seatName } from '../map/seats'
import type { GroupView, ProjectSummary } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { shortDay, today } from './days'
import { GroupForm } from './GroupForm'

type GroupCardProps = {
  group: GroupView
  /** Proyectos entre los que se puede elegir al editar el grupo. */
  projects: readonly ProjectSummary[]
  /** Algo ha cambiado (alguien entra, sale o se cierra): hay que volver a pedir la lista. */
  onChange: () => void
}

export function GroupCard({ group, projects, onChange }: GroupCardProps) {
  const { t, lang } = useI18n()
  const { busy, error, run } = useAction()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
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
        {group.members.map((member) => (
          <li key={member.login}>
            <Avatar login={member.login} image={member.image} size={32} />
            <strong>{member.login}</strong>
          </li>
        ))}
      </ul>

      <p className="hint">
        {t(group.seats.length > 0 ? 'therapy.attendance' : 'therapy.attendanceNoSeats')}
      </p>

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
            onClick={() => void act(() => api.joinGroup(group.id))}
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
      </div>
      <ErrorNote error={error} />
    </article>
  )
}
