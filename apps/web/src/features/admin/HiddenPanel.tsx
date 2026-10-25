import { useState } from 'react'

import type { HiddenPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonInput } from '../../shared/ui/PersonInput'

/** De qué grupos se oculta: se elige uno de los tres. */
const FROM = ['students', 'pool', 'both'] as const

type From = (typeof FROM)[number]

const fromOf = (entry: Pick<HiddenPerson, 'fromStudents' | 'fromPool'>): From =>
  entry.fromStudents && entry.fromPool ? 'both' : entry.fromPool ? 'pool' : 'students'

/**
 * Panel de gestión: personas ocultas (`docs/personas-ocultas.md`). Se busca a
 * alguien de cualquier grupo y se oculta a los estudiantes, a los piscineros
 * o a los dos: para ese grupo deja de existir en toda la web. El motivo solo
 * se ve aquí.
 */
export function HiddenPanel() {
  const { t } = useI18n()
  const { dateTime } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getHiddenPeople(), [])
  const [list, setList] = useState<HiddenPerson[] | null>(null)
  const [login, setLogin] = useState('')
  const [from, setFrom] = useState<From>('both')
  const [reason, setReason] = useState('')
  const action = useAction()
  const shown = list ?? data

  if (loading && shown === undefined) return <p className="estado">{t('app.loading')}</p>
  if (shown === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const hide = (): void => {
    void action
      .run(async () => {
        setList(
          await api.hidePerson(login.trim().toLowerCase(), {
            fromStudents: from !== 'pool',
            fromPool: from !== 'students',
            ...(reason.trim() === '' ? {} : { reason: reason.trim() }),
          }),
        )
      })
      .then((ok) => {
        if (ok) {
          setLogin('')
          setReason('')
        }
      })
  }

  return (
    <article className="card hidden-panel">
      <span className="eyebrow">{t('admin.hidden.title')}</span>
      <p className="hint">{t('admin.hidden.hint')}</p>
      <form
        className="admin-inline"
        onSubmit={(event) => {
          event.preventDefault()
          hide()
        }}
      >
        <PersonInput
          value={login}
          label={t('admin.hidden.login')}
          placeholder={t('admin.hidden.login')}
          search={api.searchHiddenCandidates}
          onChange={setLogin}
          onPick={setLogin}
        />
        <select
          value={from}
          aria-label={t('admin.hidden.from')}
          onChange={(event) => {
            setFrom(event.target.value as From)
          }}
        >
          {FROM.map((option) => (
            <option key={option} value={option}>
              {t(`admin.hidden.from.${option}`)}
            </option>
          ))}
        </select>
        <input
          value={reason}
          maxLength={500}
          placeholder={t('admin.hidden.reason')}
          aria-label={t('admin.hidden.reason')}
          onChange={(event) => {
            setReason(event.target.value)
          }}
        />
        <button type="submit" className="pill" disabled={action.busy || login.trim() === ''}>
          {t('admin.hidden.add')}
        </button>
      </form>
      <ErrorNote error={action.error} />

      {shown.length === 0 ? (
        <p className="hint">{t('admin.hidden.empty')}</p>
      ) : (
        <ul className="rows" aria-label={t('admin.hidden.title')}>
          {shown.map((entry) => (
            <li key={entry.login} className="row plain">
              <span>
                <strong>{entry.login}</strong>
                <small>
                  {t(`admin.hidden.group.${entry.group ?? 'unknown'}`)} ·{' '}
                  {t(`admin.hidden.hiddenFrom.${fromOf(entry)}`)} ·{' '}
                  {t('admin.hidden.by', { by: entry.by, date: dateTime(entry.at) })}
                  {entry.reason === null ? '' : ` · ${entry.reason}`}
                </small>
              </span>
              <button
                type="button"
                className="pill row-count"
                disabled={action.busy}
                aria-label={t('admin.hidden.removeOne', { login: entry.login })}
                onClick={() => {
                  void action.run(async () => {
                    setList(await api.revealPerson(entry.login))
                  })
                }}
              >
                {t('admin.hidden.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
