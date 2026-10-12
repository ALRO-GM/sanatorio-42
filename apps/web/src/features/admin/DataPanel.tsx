import { useState } from 'react'

import type { DataWipe } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

const RANGES = ['all', 'before', 'from'] as const

type Range = (typeof RANGES)[number]

/**
 * Borrado de datos a mano. La web no borra nada por viejo: aquí se elige qué
 * quitar (un tipo de dato), de quién (de todo el mundo o de una persona) y de
 * cuándo (todo, lo anterior a un día o lo de ese día en adelante).
 *
 * Antes de borrar se cuenta, y lo borrado no vuelve.
 */
export function DataPanel() {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getAdminData(), [])
  const action = useAction()
  const [kind, setKind] = useState('')
  const [login, setLogin] = useState('')
  const [range, setRange] = useState<Range>('all')
  const [day, setDay] = useState('')
  // Lo último que se contó o se borró, para decirlo.
  const [result, setResult] = useState<{ rows: number; deleted: boolean } | null>(null)

  if (loading) return <p className="estado">{t('app.loading')}</p>
  if (data === undefined) return <ErrorNote error={error} onRetry={() => void reload()} />

  const who = login.trim().toLowerCase()
  const ready = kind !== '' && (range === 'all' || day !== '')
  const scope: DataWipe = {
    kind,
    ...(who === '' ? {} : { login: who }),
    ...(range === 'before' ? { before: day } : {}),
    ...(range === 'from' ? { from: day } : {}),
  }
  /** Cualquier cambio en lo elegido deja sin valor la cuenta anterior. */
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T): void => {
      set(value)
      setResult(null)
    }

  const count = async (): Promise<void> => {
    await action.run(async () => {
      setResult({ ...(await api.countAdminData(scope)), deleted: false })
    })
  }
  const erase = async (): Promise<void> => {
    await action.run(async () => {
      const { rows } = await api.countAdminData(scope)

      if (rows === 0) {
        setResult({ rows, deleted: false })

        return
      }
      if (!window.confirm(t('admin.data.ask', { n: rows, kind: t(`admin.data.kind.${kind}`) }))) {
        return
      }

      setResult({ ...(await api.deleteAdminData(scope)), deleted: true })
      await reload()
    })
  }

  return (
    <section>
      <h2>{t('admin.data.title')}</h2>
      <p className="hint">{t('admin.data.about')}</p>

      <article className="card">
        <div className="data-form">
          <label>
            {t('admin.data.kind')}
            <select
              value={kind}
              onChange={(event) => {
                change(setKind)(event.target.value)
              }}
            >
              <option value="">{t('admin.data.choose')}</option>
              {data.kinds.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {t(`admin.data.kind.${entry.id}`)} ({entry.rows.toLocaleString()})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin.data.who')}
            <input
              value={login}
              placeholder={t('admin.data.everyone')}
              onChange={(event) => {
                change(setLogin)(event.target.value)
              }}
            />
          </label>
          <label>
            {t('admin.data.range')}
            <select
              value={range}
              onChange={(event) => {
                change(setRange)(event.target.value as Range)
              }}
            >
              {RANGES.map((option) => (
                <option key={option} value={option}>
                  {t(`admin.data.range.${option}`)}
                </option>
              ))}
            </select>
          </label>
          {range !== 'all' && (
            <label>
              {t('admin.data.day')}
              <input
                type="date"
                value={day}
                onChange={(event) => {
                  change(setDay)(event.target.value)
                }}
              />
            </label>
          )}
        </div>

        <div className="data-actions">
          <button
            type="button"
            className="pill"
            disabled={!ready || action.busy}
            onClick={() => void count()}
          >
            {t('admin.data.count')}
          </button>
          <button
            type="button"
            className="pill danger"
            disabled={!ready || action.busy}
            onClick={() => void erase()}
          >
            {t('admin.data.delete')}
          </button>
          {result !== null && (
            <span role="status">
              {t(result.deleted ? 'admin.data.deleted' : 'admin.data.found', { n: result.rows })}
            </span>
          )}
        </div>
        <ErrorNote error={action.error} />
      </article>
    </section>
  )
}
