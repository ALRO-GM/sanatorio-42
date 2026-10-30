import { useEffect, useState } from 'react'

import type { PoolKey, PoolSettings } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { switchPoolPreview, usePoolAccess } from '../../shared/pool'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { GROUPS, sectionsOf } from './pool-tree'

/**
 * Panel de gestión: la piscina (`docs/piscineros.md`). Solo entran
 * estudiantes; aquí se abre o se cierra la entrada a piscineros de una piscina
 * en curso, el aviso que ven con ella cerrada y, pestaña a pestaña y elemento a
 * elemento, lo que pueden ver. Un elemento solo vale con su pestaña marcada.
 * Y desde aquí se entra en la vista de piscinero.
 */
export function PoolPanel() {
  const { t } = useI18n()
  const { data, error, reload } = useAsync(() => api.getPoolSettings(), [])
  const [draft, setDraft] = useState<PoolSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const save = useAction()
  const preview = useAction()
  const { owner } = usePoolAccess()

  useEffect(() => {
    if (data !== undefined) setDraft(data)
  }, [data])

  const change = (next: Partial<PoolSettings>): void => {
    setSaved(false)
    setDraft((current) => (current === null ? current : { ...current, ...next }))
  }
  const has = (key: PoolKey): boolean => draft?.allow.includes(key) === true
  const toggle = (key: PoolKey): void => {
    if (draft === null) return
    change({
      allow: has(key) ? draft.allow.filter((each) => each !== key) : [...draft.allow, key],
    })
  }
  const box = (key: PoolKey, disabled = false) => (
    <label key={key} className={`duty-check ${disabled ? 'muted' : ''}`}>
      <input
        type="checkbox"
        checked={has(key)}
        disabled={disabled}
        onChange={() => {
          toggle(key)
        }}
      />
      {t(`pool.key.${key}`)}
    </label>
  )

  return (
    <article className="card pool-panel">
      <span className="eyebrow">{t('admin.pool.title')}</span>
      <p className="hint">{t('admin.pool.who')}</p>
      <ErrorNote error={error} onRetry={() => void reload()} />
      {draft !== null && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            setSaved(false)
            void save
              .run(async () => {
                setDraft(await api.updatePoolSettings(draft))
              })
              .then((ok) => {
                setSaved(ok)
              })
          }}
        >
          <label className="duty-check pool-open">
            <input
              type="checkbox"
              checked={draft.open}
              onChange={(event) => {
                change({ open: event.target.checked })
              }}
            />
            <strong>{t('admin.pool.openLabel')}</strong>
          </label>
          <label>
            {t('admin.pool.message')}
            <textarea
              rows={3}
              value={draft.message}
              maxLength={2000}
              placeholder={t('login.poolClosed')}
              onChange={(event) => {
                change({ message: event.target.value })
              }}
            />
          </label>
          <p className="hint">{t('admin.pool.messageHint')}</p>

          <h3>{t('admin.pool.allow')}</h3>
          <p className="hint">{t('admin.pool.allowHint')}</p>
          <div className="pool-tree">
            {GROUPS.map((group) => (
              <fieldset key={group} className="pool-group">
                <legend>{t(`pool.group.${group}`)}</legend>
                {sectionsOf(group).map(({ key, items }) => (
                  <div key={key} className="pool-section">
                    {box(key)}
                    {items.length > 0 && (
                      <div className="pool-items">{items.map((item) => box(item, !has(key)))}</div>
                    )}
                  </div>
                ))}
              </fieldset>
            ))}
          </div>

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
      {/* La web como la vería un piscinero de tu campus, con lo guardado; funciona
          aunque la piscina esté cerrada. Se vuelve desde la franja de arriba. */}
      <div className="pool-preview">
        <button
          type="button"
          disabled={preview.busy}
          onClick={() => {
            void preview.run(() => switchPoolPreview(true))
          }}
        >
          {t('admin.pool.preview')}
        </button>
        <p className="hint">{t('admin.pool.previewHint')}</p>
        {/* Sin límites: un piscinero con todo lo de un estudiante. Solo el
            dueño (`core/owner.ts` en la API, que es quien corta). */}
        {owner === true && (
          <>
            <button
              type="button"
              disabled={preview.busy}
              onClick={() => {
                void preview.run(() => switchPoolPreview(true, true))
              }}
            >
              {t('admin.pool.previewFull')}
            </button>
            <p className="hint">{t('admin.pool.previewFullHint')}</p>
          </>
        )}
        <ErrorNote error={preview.error} />
      </div>
    </article>
  )
}
