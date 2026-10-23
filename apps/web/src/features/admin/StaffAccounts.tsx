import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * Las cuentas de staff: las que solo sirven para validar documentos en
 * `#/validar`. Al crear una se enseña su clave una sola vez; después no se
 * puede recuperar, solo retirar la cuenta y crear otra.
 */
export function StaffAccounts() {
  const { t } = useI18n()
  const { date } = useFormat()
  const { data, loading, error, reload } = useAsync(() => api.getStaffAccounts(), [])
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const action = useAction()
  const day = (iso: string): string => date(iso)

  const create = (event: SyntheticEvent): void => {
    event.preventDefault()
    setCopied(false)
    void action.run(async () => {
      const created = await api.createStaffAccount(name.trim())

      setFresh({ name: created.account.name, key: created.key })
      setName('')
      await reload()
    })
  }

  const copy = (key: string): void => {
    void navigator.clipboard.writeText(key).then(
      () => {
        setCopied(true)
      },
      () => {
        // Sin permiso para el portapapeles, la clave sigue a la vista para copiarla a mano.
        setCopied(false)
      },
    )
  }

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.staff.title')}</span>
      <p className="hint">
        {t('admin.staff.hint', { url: `${window.location.origin}/#/validar` })}
      </p>
      <ErrorNote error={action.error} />
      {loading && <p className="estado">{t('app.loading')}</p>}
      {data === undefined ? (
        !loading && <ErrorNote error={error} onRetry={() => void reload()} />
      ) : (
        <>
          {data.accounts.length === 0 && <p className="hint">{t('admin.staff.none')}</p>}
          <ul className="rows">
            {data.accounts.map((account) => (
              <li key={account.id} className="row plain">
                <span>
                  <strong>{account.name}</strong>
                  <small>
                    {t('admin.staff.created', {
                      date: day(account.createdAt),
                      by: account.createdBy,
                    })}
                    {' · '}
                    {account.lastUsedAt === null
                      ? t('admin.staff.unused')
                      : t('admin.staff.used', { date: day(account.lastUsedAt) })}
                  </small>
                </span>
                {account.revokedAt === null ? (
                  <button
                    type="button"
                    className="pill row-count"
                    disabled={action.busy}
                    onClick={() =>
                      void action
                        .run(() => api.revokeStaffAccount(account.id))
                        .then((ok) => (ok ? reload() : undefined))
                    }
                  >
                    {t('admin.staff.revoke')}
                  </button>
                ) : (
                  <small className="row-count">
                    {t('admin.staff.revoked', { date: day(account.revokedAt) })}
                  </small>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {fresh !== null && (
        <div className="staff-key" role="status">
          <strong>{t('admin.staff.keyOf', { name: fresh.name })}</strong>
          <code>{fresh.key}</code>
          <p className="hint">{t('admin.staff.keyOnce')}</p>
          <div className="staff-key-actions">
            <button
              type="button"
              className="pill"
              onClick={() => {
                copy(fresh.key)
              }}
            >
              {t(copied ? 'admin.staff.copied' : 'admin.staff.copy')}
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => {
                setFresh(null)
              }}
            >
              {t('admin.staff.hide')}
            </button>
          </div>
        </div>
      )}

      <form className="admin-inline" onSubmit={create}>
        <input
          value={name}
          maxLength={40}
          placeholder={t('admin.staff.name')}
          aria-label={t('admin.staff.name')}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <button type="submit" className="pill" disabled={action.busy || name.trim().length < 3}>
          {t('admin.staff.create')}
        </button>
      </form>
    </article>
  )
}
