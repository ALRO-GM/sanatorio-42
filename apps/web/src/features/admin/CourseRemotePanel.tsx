import { useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Async } from '../../shared/ui/Async'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonInput } from '../../shared/ui/PersonInput'

/**
 * Quién puede hacer el curso de git fuera de los puestos del clúster, y que le
 * cuente. Al jugar así dice dónde está; aquí se ve lo último que dijo.
 */
export function CourseRemotePanel() {
  const { t } = useI18n()
  const { date } = useFormat()
  const access = useAsync(() => api.getCourseRemote(), [])
  const action = useAction()
  const [login, setLogin] = useState('')

  const change = async (who: string, allowed: boolean): Promise<void> => {
    if (await action.run(() => api.setCourseRemote(who, allowed))) {
      setLogin('')
      await access.reload()
    }
  }

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.remote.title')}</span>
      <p className="hint">{t('admin.remote.hint')}</p>
      <ErrorNote error={action.error} />
      <Async state={access}>
        {(data) => (
          <>
            {data.people.length === 0 && <p className="hint">{t('admin.remote.none')}</p>}
            <ul className="rows">
              {data.people.map((person) => (
                <li key={person.login} className="row plain">
                  <span>
                    <strong>{person.login}</strong>{' '}
                    <small className="muted">
                      {person.place === null || person.placeAt === null
                        ? t('admin.remote.noPlace')
                        : t('admin.remote.place', {
                            place: t(`git.place.${person.place}`),
                            day: date(person.placeAt),
                          })}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="pill row-count"
                    disabled={action.busy}
                    onClick={() => void change(person.login, false)}
                  >
                    {t('admin.people.revoke')}
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="admin-inline"
              onSubmit={(event) => {
                event.preventDefault()
                void change(login, true)
              }}
            >
              <PersonInput
                value={login}
                label={t('admin.people.login')}
                placeholder={t('admin.people.login')}
                onChange={setLogin}
                onPick={setLogin}
              />
              <button type="submit" className="pill" disabled={action.busy || login.trim() === ''}>
                {t('admin.remote.grant')}
              </button>
            </form>
          </>
        )}
      </Async>
    </article>
  )
}
