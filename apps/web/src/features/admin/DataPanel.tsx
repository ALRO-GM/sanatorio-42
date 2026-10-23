import { useEffect, useRef, useState } from 'react'

import type { DataPreview, DataWipe } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { cellValue } from '../../shared/table-sort'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonInput } from '../../shared/ui/PersonInput'

const RANGES = ['all', 'before', 'from'] as const

type Range = (typeof RANGES)[number]

/**
 * Limpiar datos. La web no borra nada por viejo: aquí se elige qué quitar (un
 * tipo de dato), de quién (de todo el mundo o de una persona) y de cuándo
 * (todo, lo anterior a un día o lo de ese día en adelante).
 *
 * De cada tipo se dice qué es y qué incluye. Antes de borrar se abre una
 * ventana con las filas que se irían, y solo desde ella se borra: lo borrado no
 * vuelve.
 */
export function DataPanel() {
  const { t } = useI18n()
  const { number } = useFormat()
  const { data, error, loading, reload } = useAsync(() => api.getAdminData(), [])
  const action = useAction()
  const [kind, setKind] = useState('')
  const [login, setLogin] = useState('')
  const [range, setRange] = useState<Range>('all')
  const [day, setDay] = useState('')
  // Lo que se está revisando en la ventana, y lo último que se borró.
  const [review, setReview] = useState<{ scope: DataWipe; preview: DataPreview } | null>(null)
  const [deleted, setDeleted] = useState<number | null>(null)

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

  const see = async (): Promise<void> => {
    setDeleted(null)
    await action.run(async () => {
      setReview({ scope, preview: await api.previewAdminData(scope) })
    })
  }
  const erase = async (): Promise<void> => {
    if (review === null) return

    await action.run(async () => {
      const { rows } = await api.deleteAdminData(review.scope)

      setReview(null)
      setDeleted(rows)
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
                setKind(event.target.value)
              }}
            >
              <option value="">{t('admin.data.choose')}</option>
              {data.kinds.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {t(`admin.data.kind.${entry.id}`)} ({number(entry.rows)})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin.data.who')}
            <PersonInput
              value={login}
              label={t('admin.data.who')}
              placeholder={t('admin.data.everyone')}
              onChange={setLogin}
              onPick={setLogin}
            />
          </label>
          <label>
            {t('admin.data.range')}
            <select
              value={range}
              onChange={(event) => {
                setRange(event.target.value as Range)
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
                  setDay(event.target.value)
                }}
              />
            </label>
          )}
        </div>

        {kind !== '' && (
          <div className="data-about">
            <strong>{t(`admin.data.kind.${kind}.summary`)}</strong>
            <span className="eyebrow">{t('admin.data.includes')}</span>
            <p>{t(`admin.data.kind.${kind}.detail`)}</p>
          </div>
        )}

        <div className="data-actions">
          <button
            type="button"
            className="primary"
            disabled={!ready || action.busy}
            onClick={() => void see()}
          >
            {t('admin.data.see')}
          </button>
          {deleted !== null && <span role="status">{t('admin.data.deleted', { n: deleted })}</span>}
        </div>
        <ErrorNote error={action.error} />
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.data.kind')}</span>
        <dl className="data-kinds">
          {data.kinds.map((entry) => (
            <div key={entry.id}>
              <dt>
                {t(`admin.data.kind.${entry.id}`)}
                <small>{t('admin.data.total', { n: number(entry.rows) })}</small>
              </dt>
              <dd>{t(`admin.data.kind.${entry.id}.summary`)}</dd>
            </div>
          ))}
        </dl>
      </article>

      {review !== null && (
        <Review
          title={t('admin.data.reviewScope', {
            kind: t(`admin.data.kind.${review.scope.kind}`),
            who: review.scope.login ?? t('admin.data.scope.everyone'),
            when:
              review.scope.before !== undefined
                ? t('admin.data.scope.before', { day: review.scope.before })
                : review.scope.from !== undefined
                  ? t('admin.data.scope.from', { day: review.scope.from })
                  : t('admin.data.scope.all'),
          })}
          preview={review.preview}
          busy={action.busy}
          onDelete={() => void erase()}
          onClose={() => {
            setReview(null)
          }}
        />
      )}
    </section>
  )
}

/**
 * La ventana que enseña lo que se va a borrar: cuántas filas son y las más
 * recientes, para comprobar que es lo que se busca. Solo desde aquí se borra.
 */
function Review({
  title,
  preview,
  busy,
  onDelete,
  onClose,
}: {
  title: string
  preview: DataPreview
  busy: boolean
  onDelete: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="layout-dialog data-review"
      aria-label={t('admin.data.review')}
      onClose={onClose}
    >
      <span className="eyebrow">{t('admin.data.review')}</span>
      <h3>{title}</h3>
      <p>
        <strong>{t('admin.data.total', { n: number(preview.rows) })}</strong>
        {preview.rows > preview.sample.length &&
          ` ${t('admin.data.showing', { n: preview.sample.length })}`}
      </p>

      {preview.rows === 0 ? (
        <p className="estado">{t('admin.data.none')}</p>
      ) : (
        <div className="data-sample">
          <DataTable<{ row: (string | number | null)[]; index: number }>
            id="data-sample"
            rows={preview.sample.map((row, index) => ({ row, index }))}
            rowKey={({ index }) => String(index)}
            columns={preview.columns.map((column, at) => ({
              id: column,
              label: column,
              sort: ({ row }) => cellValue(row[at]),
              first: 'asc' as const,
              cell: ({ row }) => row[at] ?? '—',
            }))}
          />
        </div>
      )}

      <div className="data-actions">
        <button
          type="button"
          className="pill danger"
          disabled={busy || preview.rows === 0}
          onClick={onDelete}
        >
          {t('admin.data.deleteN', { n: number(preview.rows) })}
        </button>
        <button
          type="button"
          className="pill"
          onClick={() => {
            dialog.current?.close()
          }}
        >
          {t('admin.data.close')}
        </button>
      </div>
    </dialog>
  )
}
