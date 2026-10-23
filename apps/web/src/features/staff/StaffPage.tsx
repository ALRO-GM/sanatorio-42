import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { StaffDocument } from '@sanatorio/contracts'

import { api, ApiError } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { cellValue } from '../../shared/table-sort'
import { DataTable } from '../../shared/ui/DataTable'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Logo } from '../../shared/ui/Logo'
import { FacilityList } from '../facility/FacilityList'
import { LangSelect } from '../../shared/ui/LangSelect'
import { ThemeSelect } from '../../shared/ui/ThemeSelect'
import { codeFromName, hoursText } from './code'

/**
 * La pantalla del staff de 42 (`#/validar`). No es parte de la web de la gente:
 * se entra con una clave que da quien administra, y lo único que se puede hacer
 * es escribir el código de un documento y ver cómo se emitió.
 */
export function StaffPage() {
  const { t } = useI18n()
  const me = useAsync(() => api.getStaffMe(), [])

  if (me.loading) return <p className="center">{t('app.loading')}</p>

  // Sin sesión de staff (401) o con la de una persona (403): toca entrar. Otra
  // cosa es que el servidor no conteste.
  const denied =
    me.error instanceof ApiError && (me.error.status === 401 || me.error.status === 403)

  return (
    <main className="staff-page">
      <header className="staff-head">
        <Logo />
        <div>
          <h1>{t('staff.title')}</h1>
          <p className="hint">{t('staff.subtitle')}</p>
        </div>
      </header>

      {me.data !== undefined ? (
        <>
          <Checker name={me.data.name} onLeave={() => void api.logout().then(me.reload)} />
          {/* Los avisos de problemas del edificio y de los ordenadores (#77). */}
          <section className="card">
            <h2>{t('staff.facility')}</h2>
            <FacilityList
              load={() => api.getStaffFacility()}
              resolve={(id) => api.resolveStaffFacility(id)}
              showCampus
            />
          </section>
        </>
      ) : denied ? (
        <KeyForm onEnter={() => void me.reload()} />
      ) : (
        <ErrorNote error={me.error} onRetry={() => void me.reload()} />
      )}

      <footer className="footer">
        <LangSelect />
        <ThemeSelect />
        <a className="link" href="#/">
          {t('staff.back')}
        </a>
      </footer>
    </main>
  )
}

/** La entrada: un campo para la clave. */
function KeyForm({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n()
  const [key, setKey] = useState('')
  const action = useAction()

  const enter = (event: SyntheticEvent): void => {
    event.preventDefault()
    void action
      .run(() => api.staffLogin(key.trim()))
      .then((ok) => {
        if (ok) onEnter()
      })
  }

  return (
    <form className="card staff-card" onSubmit={enter}>
      <span className="eyebrow">{t('staff.enter')}</span>
      <p className="hint">{t('staff.enterHint')}</p>
      {import.meta.env.VITE_DEMO === 'true' && <p className="estado aviso">{t('demo.staff')}</p>}
      <label>
        {t('staff.key')}
        <input
          type="password"
          value={key}
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          onChange={(event) => {
            setKey(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={action.error} />
      <button type="submit" className="primary" disabled={action.busy || key.trim() === ''}>
        {t('staff.enterButton')}
      </button>
    </form>
  )
}

/** Con la sesión abierta: el código, el documento y la comparación con un fichero. */
function Checker({ name, onLeave }: { name: string; onLeave: () => void }) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [found, setFound] = useState<StaffDocument | null>(null)
  const action = useAction()

  const look = (event: SyntheticEvent): void => {
    event.preventDefault()
    setFound(null)
    void action.run(async () => {
      setFound(await api.getStaffDocument(code))
    })
  }

  return (
    <>
      <form className="card staff-card" onSubmit={look}>
        <div className="staff-who">
          <span className="eyebrow">{t('staff.as', { name })}</span>
          <button type="button" className="link" onClick={onLeave}>
            {t('app.logout')}
          </button>
        </div>
        <label>
          {t('staff.code')}
          <input
            className="staff-code"
            value={code}
            placeholder="K7QF"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            onChange={(event) => {
              // Si pegan el nombre entero del fichero, se queda con el código.
              setCode(codeFromName(event.target.value))
            }}
          />
        </label>
        <p className="hint">{t('staff.codeHint')}</p>
        <ErrorNote error={action.error} />
        <button
          type="submit"
          className="primary"
          disabled={action.busy || code.replace(/[\s-]/g, '').length !== 4}
        >
          {t('staff.check')}
        </button>
      </form>

      {found !== null && <Document found={found} />}
    </>
  )
}

function Document({ found }: { found: StaffDocument }) {
  const { t, lang } = useI18n()
  const [verdict, setVerdict] = useState<boolean | null>(null)
  const action = useAction()
  const date = (iso: string): string =>
    new Date(iso).toLocaleString(localeOf(lang), { dateStyle: 'long', timeStyle: 'short' })

  const compare = (file: File | undefined): void => {
    setVerdict(null)

    if (file === undefined) return

    void action.run(async () => {
      setVerdict((await api.compareStaffDocument(found.code, await file.text())).identical)
    })
  }

  return (
    <article className="card staff-card staff-document">
      <p className="estado ok" role="status">
        {t('staff.found', { code: found.code })}
      </p>
      <dl className="staff-facts">
        <div>
          <dt>{t('staff.of')}</dt>
          <dd>{found.login ?? t('staff.everyone')}</dd>
        </div>
        <div>
          <dt>{t('staff.period')}</dt>
          <dd>{t('staff.range', { from: found.from, to: found.to })}</dd>
        </div>
        <div>
          <dt>{t('staff.total')}</dt>
          <dd>
            <strong>{hoursText(found.totalMinutes)}</strong>
            <small> · {t('staff.rows', { n: found.rows })}</small>
          </dd>
        </div>
        <div>
          <dt>{t('staff.issued')}</dt>
          <dd>
            {date(found.issuedAt)}
            <small> · {t('staff.by', { login: found.requestedBy })}</small>
          </dd>
        </div>
        <div>
          <dt>{t('staff.file')}</dt>
          <dd className="staff-file">{found.fileName}</dd>
        </div>
      </dl>

      <div className="staff-compare">
        <label>
          {t('staff.compare')}
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => {
              compare(event.target.files?.[0])
            }}
          />
        </label>
        <p className="hint">{t('staff.compareHint')}</p>
        <ErrorNote error={action.error} />
        {verdict !== null && (
          <p className={`estado ${verdict ? 'ok' : 'error'}`} role="status">
            {t(verdict ? 'staff.same' : 'staff.different')}
          </p>
        )}
      </div>

      <span className="eyebrow">{t('staff.original')}</span>
      {found.lines.length === 0 ? (
        <p className="hint">{t('staff.empty')}</p>
      ) : (
        <DataTable<{ line: string[]; index: number }>
          id="staff-document"
          rows={found.lines.map((line, index) => ({ line, index }))}
          rowKey={({ index }) => String(index)}
          columns={found.header.map((cell, at) => ({
            id: `${at}`,
            label: cell,
            sort: ({ line }) => cellValue(line[at]),
            first: 'asc' as const,
            cell: ({ line }) => line[at],
          }))}
        />
      )}
    </article>
  )
}
