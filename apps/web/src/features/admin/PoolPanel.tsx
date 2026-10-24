import { useEffect, useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * Panel de gestión: la piscina (`docs/piscineros.md`). Solo entran
 * estudiantes; un piscinero de una piscina en curso ve, al volver de 42, el
 * aviso que se escribe aquí.
 */
export function PoolPanel() {
  const { t } = useI18n()
  const { data, error, reload } = useAsync(() => api.getPoolSettings(), [])
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const save = useAction()

  useEffect(() => {
    if (data !== undefined) setMessage(data.message)
  }, [data])

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.pool.title')}</span>
      <p className="hint">{t('admin.pool.who')}</p>
      <ErrorNote error={error} onRetry={() => void reload()} />
      {data !== undefined && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            setSaved(false)
            void save
              .run(() => api.updatePoolSettings({ message }))
              .then((ok) => {
                setSaved(ok)
              })
          }}
        >
          <p>
            <strong>{t(data.open ? 'admin.pool.open' : 'admin.pool.closed')}</strong>
          </p>
          <label>
            {t('admin.pool.message')}
            <textarea
              rows={4}
              value={message}
              maxLength={2000}
              placeholder={t('login.poolClosed')}
              onChange={(event) => {
                setMessage(event.target.value)
                setSaved(false)
              }}
            />
          </label>
          <p className="hint">{t('admin.pool.messageHint')}</p>
          <button type="submit" className="primary" disabled={save.busy}>
            {t('admin.pool.save')}
          </button>
          {saved && (
            <p className="estado ok" role="status">
              {t('admin.pool.saved')}
            </p>
          )}
          <ErrorNote error={save.error} />
        </form>
      )}
    </article>
  )
}
