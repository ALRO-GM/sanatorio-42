import { useState } from 'react'

import type { GroupView } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { dayNames } from './days'

type GroupCardProps = {
  group: GroupView
  /** Algo ha cambiado (alguien entra, sale o se cierra): hay que volver a pedir la lista. */
  onChange: () => void
}

export function GroupCard({ group, onChange }: GroupCardProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [copied, setCopied] = useState(false)
  const shortDays = t('days.short').split(',')
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
      <div className="days">
        {shortDays.map((label, index) => (
          <span
            key={label}
            className={`day ${group.days.includes(index + 1) ? 'active' : ''}`}
            aria-hidden="true"
          >
            {label}
          </span>
        ))}
        <span className="days-text">{dayNames(group.days, t)}</span>
      </div>

      {group.seats.length > 0 && (
        <>
          <span className="eyebrow">{t('therapy.seats')}</span>
          <div className="chips">
            {group.seats.map((host) => (
              <span key={host} className="chip seat-chip">
                {host}
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
          <button
            className="pill"
            disabled={busy}
            onClick={() => void act(() => api.closeGroup(group.id))}
          >
            {t('therapy.close')}
          </button>
        )}
      </div>
      <ErrorNote error={error} />
    </article>
  )
}
