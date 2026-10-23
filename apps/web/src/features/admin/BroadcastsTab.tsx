import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { BroadcastAudience, BroadcastReport } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PersonInput } from '../../shared/ui/PersonInput'

type Kind = BroadcastAudience['kind']

const KINDS = ['all', 'campus', 'logins'] as const satisfies readonly Kind[]

/** Trozos de un texto separados por comas, espacios o saltos de línea, sin vacíos. */
const pieces = (text: string, separator: RegExp): string[] =>
  text
    .split(separator)
    .map((piece) => piece.trim())
    .filter((piece) => piece !== '')

/**
 * Comunicados: escribir a una persona, a varias, a un campus o a todo el mundo
 * algo que les sale en pantalla, con opciones entre las que elegir si hace
 * falta, y ver qué ha contestado cada quien.
 */
export function BroadcastsTab({ campusId }: { campusId: number | undefined }) {
  const { t } = useI18n()
  const sent = useAsync(() => api.getAdminBroadcasts(), [])
  const sending = useAction()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [logins, setLogins] = useState('')
  const [adding, setAdding] = useState('')
  const [options, setOptions] = useState('')
  const [required, setRequired] = useState(false)

  const audience = (): BroadcastAudience =>
    kind === 'logins'
      ? { kind, logins: pieces(logins, /[\s,;]+/) }
      : kind === 'campus'
        ? { kind, campusId: campusId ?? 0 }
        : { kind }

  const submit = async (submitted: SyntheticEvent): Promise<void> => {
    submitted.preventDefault()

    const ok = await sending.run(() =>
      api.sendBroadcast({
        title,
        body,
        options: pieces(options, /\n+/),
        required,
        audience: audience(),
      }),
    )

    if (ok) {
      setTitle('')
      setBody('')
      setOptions('')
      setRequired(false)
      void sent.reload()
    }
  }

  return (
    <>
      <form className="card form" onSubmit={(submitted) => void submit(submitted)}>
        <h3>{t('admin.cast.new')}</h3>
        <label>
          {t('admin.cast.to')}
          <select
            value={kind}
            onChange={(event) => {
              setKind(KINDS.find((option) => option === event.target.value) ?? 'all')
            }}
          >
            {KINDS.map((option) => (
              <option key={option} value={option}>
                {t(`admin.cast.to.${option}`)}
              </option>
            ))}
          </select>
        </label>
        {kind === 'logins' && (
          <PersonInput
            value={adding}
            label={t('admin.cast.addPerson')}
            placeholder={t('admin.cast.addPerson')}
            onChange={setAdding}
            onPick={(login) => {
              setLogins((current) =>
                pieces(current, /[\s,;]+/).includes(login)
                  ? current
                  : [...pieces(current, /[\s,;]+/), login].join(', '),
              )
              setAdding('')
            }}
          />
        )}
        {kind === 'logins' && (
          <label>
            {t('admin.cast.logins')}
            <textarea
              rows={2}
              value={logins}
              required
              placeholder="login1, login2"
              onChange={(event) => {
                setLogins(event.target.value)
              }}
            />
          </label>
        )}
        <label>
          {t('admin.cast.title')}
          <input
            value={title}
            maxLength={120}
            required
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
        </label>
        <label>
          {t('admin.cast.body')}
          <textarea
            rows={4}
            value={body}
            maxLength={2000}
            required
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
        </label>
        <label>
          {t('admin.cast.options')}
          <textarea
            rows={3}
            value={options}
            onChange={(event) => {
              setOptions(event.target.value)
            }}
          />
        </label>
        <label className="duty-check">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => {
              setRequired(event.target.checked)
            }}
          />
          {t('admin.cast.required')}
        </label>
        <ErrorNote error={sending.error} />
        <div className="actions">
          <button type="submit" className="primary small" disabled={sending.busy}>
            {t('common.send')}
          </button>
        </div>
      </form>

      {sent.loading && <p className="estado">{t('app.loading')}</p>}
      {sent.data === undefined ? (
        <ErrorNote error={sent.error} onRetry={() => void sent.reload()} />
      ) : (
        <>
          {sent.data.length === 0 && <p className="estado">{t('admin.cast.none')}</p>}
          <ul className="stack">
            {sent.data.map((report) => (
              <li key={report.id}>
                <Sent report={report} onRemoved={() => void sent.reload()} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

/** Un comunicado ya mandado: a quién fue y qué se ha contestado. */
function Sent({ report, onRemoved }: { report: BroadcastReport; onRemoved: () => void }) {
  const { t, lang } = useI18n()
  const removing = useAction()
  const { audience } = report
  const reached = report.answers.length

  return (
    <article className="card">
      <div className="card-head">
        <h3>{report.title}</h3>
        <span className="badge subtle">
          {audience.kind === 'logins'
            ? audience.logins.join(', ')
            : t(`admin.cast.to.${audience.kind}`)}
        </span>
      </div>
      <p className="broadcast-body">{report.body}</p>
      <small className="hint">
        {report.from} · {new Date(report.at).toLocaleString(localeOf(lang))} ·{' '}
        {t(report.required ? 'admin.cast.wasRequired' : 'admin.cast.wasOptional')}
      </small>

      <ul className="rows">
        {report.options.map((option, index) => (
          <li key={option} className="row plain">
            <span>{option}</span>
            <strong className="row-count">{report.counts[index] ?? 0}</strong>
          </li>
        ))}
        <li className="row plain">
          <span>{t('admin.cast.seen')}</span>
          <strong className="row-count">{report.seen}</strong>
        </li>
      </ul>

      {reached > 0 && (
        <details>
          <summary>{t('admin.cast.who', { n: reached })}</summary>
          <ul className="rows">
            {report.answers.map((answer) => (
              <li key={answer.login} className="row plain">
                <span>{answer.login}</span>
                <span className="row-count">
                  {answer.option === null
                    ? t('admin.cast.seen')
                    : (report.options[answer.option] ?? '?')}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <ErrorNote error={removing.error} />
      <div className="actions">
        <button
          type="button"
          className="pill"
          disabled={removing.busy}
          onClick={() =>
            void removing
              .run(() => api.removeBroadcast(report.id))
              .then((ok) => {
                if (ok) onRemoved()
              })
          }
        >
          {t('common.withdraw')}
        </button>
      </div>
    </article>
  )
}
