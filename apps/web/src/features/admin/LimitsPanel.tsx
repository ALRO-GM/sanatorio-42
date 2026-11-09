import { useState } from 'react'

import type { ActionLimit, ActionLimitKey, ActionLimits } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { Async } from '../../shared/ui/Async'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonInput } from '../../shared/ui/PersonInput'

/**
 * Topes por persona (`docs/limites.md`): lo de fábrica, lo puesto para todo el
 * mundo y, eligiendo a alguien, lo suyo. Manda lo más concreto. Los cortes del
 * plan (el 90 % de Oracle, el cupo de 42) no salen aquí: no se regulan.
 */
export function LimitsPanel() {
  const { t } = useI18n()
  const [person, setPerson] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const limits = useAsync(() => api.getActionLimits(person), [person])
  const action = useAction()

  // La API devuelve cómo quedan: se pinta eso, sin volver a pedirlo.
  const apply = (change: () => Promise<ActionLimits>) =>
    action.run(async () => {
      limits.setData(await change())
    })
  const save = (key: ActionLimitKey, value: number | null) =>
    apply(() => api.setActionLimit(key, value, person))

  const choose = (login: string): void => {
    const clean = login.trim().toLowerCase()

    if (clean !== '') setPerson(clean)
    setTyped('')
  }

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.limits.title')}</span>
      <p className="hint">{t('admin.limits.hint')}</p>
      <form
        className="admin-inline"
        onSubmit={(event) => {
          event.preventDefault()
          choose(typed)
        }}
      >
        <PersonInput
          value={typed}
          label={t('admin.limits.person')}
          placeholder={t('admin.people.login')}
          onChange={setTyped}
          onPick={choose}
        />
        <button type="submit" className="pill" disabled={typed.trim() === ''}>
          {t('admin.limits.see')}
        </button>
        {person !== null && (
          <button
            type="button"
            className="pill"
            onClick={() => {
              setPerson(null)
            }}
          >
            {t('admin.limits.everyone')}
          </button>
        )}
      </form>
      <ErrorNote error={action.error} />
      <Async state={limits}>
        {(data) => (
          <>
            {data.people.length > 0 && (
              <p className="hint">
                {t('admin.limits.withOwn')}{' '}
                {data.people.map((who) => (
                  <button
                    key={who.login}
                    type="button"
                    className="pill"
                    aria-pressed={who.login === data.login}
                    onClick={() => {
                      setPerson(who.login)
                    }}
                  >
                    {who.login} ({who.count})
                  </button>
                ))}
              </p>
            )}
            <h3>
              {data.login === null
                ? t('admin.limits.editingEveryone')
                : t('admin.limits.editingPerson', { login: data.login })}
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin.limits.col.limit')}</th>
                  <th scope="col">{t('admin.limits.col.default')}</th>
                  <th scope="col">{t('admin.limits.col.everyone')}</th>
                  {data.login !== null && <th scope="col">{t('admin.limits.col.person')}</th>}
                  <th scope="col">{t('admin.limits.col.change')}</th>
                </tr>
              </thead>
              <tbody>
                {data.limits.map((limit) => (
                  <LimitRow
                    // Con lo guardado en la clave, el campo vuelve a empezar al cambiarlo.
                    key={`${data.login ?? ''}:${limit.key}:${(data.login === null ? limit.global : limit.user) ?? ''}`}
                    limit={limit}
                    forPerson={data.login !== null}
                    busy={action.busy}
                    onSave={(value) => void save(limit.key, value)}
                  />
                ))}
              </tbody>
            </table>
            {data.login !== null && (
              <button
                type="button"
                className="pill"
                disabled={action.busy || data.limits.every((limit) => limit.user === null)}
                onClick={() => {
                  const login = data.login

                  if (login !== null) void apply(() => api.resetActionLimits(login))
                }}
              >
                {t('admin.limits.resetPerson')}
              </button>
            )}
          </>
        )}
      </Async>
    </article>
  )
}

/** Una fila: el tope, lo que vale en cada nivel y el campo para cambiar el que se edita. */
function LimitRow({
  limit,
  forPerson,
  busy,
  onSave,
}: {
  limit: ActionLimit
  forPerson: boolean
  busy: boolean
  onSave: (value: number | null) => void
}) {
  const { t } = useI18n()
  const mine = forPerson ? limit.user : limit.global
  const [draft, setDraft] = useState(mine === null ? '' : String(mine))
  const value = Number(draft)
  const valid = draft !== '' && Number.isInteger(value) && value >= limit.min && value <= limit.max
  const label = t(`admin.limits.key.${limit.key}`)

  return (
    <tr>
      <th scope="row">
        {label} <small className="muted">{t(`admin.limits.unit.${limit.unit}`)}</small>
      </th>
      <td>{limit.default}</td>
      <td>{limit.global ?? '—'}</td>
      {forPerson && <td>{limit.user ?? '—'}</td>}
      <td>
        <form
          className="admin-inline"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) onSave(value)
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            aria-label={label}
            min={limit.min}
            max={limit.max}
            step={1}
            value={draft}
            placeholder={String(limit.effective)}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
          />
          <button type="submit" className="pill" disabled={busy || !valid || value === mine}>
            {t('admin.limits.save')}
          </button>
          <button
            type="button"
            className="pill"
            disabled={busy || mine === null}
            onClick={() => {
              onSave(null)
            }}
          >
            {t('admin.limits.reset')}
          </button>
        </form>
      </td>
    </tr>
  )
}
