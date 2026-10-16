import { useEffect, useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { Qr } from '../../shared/ui/Qr'

/** El secreto que lleva el QR, para quien prefiera escribirlo a mano. */
function secretOf(uri: string): string {
  try {
    return new URL(uri).searchParams.get('secret') ?? ''
  } catch {
    return ''
  }
}

/**
 * La cerradura del panel de gestión: hasta escribir el código de la app de
 * autenticación no se ve nada. La primera vez, se da de alta con un QR.
 *
 * La API es quien manda (rechaza todo lo de `/admin` sin el código); esto solo
 * evita enseñar un panel lleno de errores.
 */
export function PanelLock({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n()
  const status = useAsync(() => api.getSecondFactor(), [])
  const { busy, error, run } = useAction()
  const [uri, setUri] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const until = status.data?.elevatedUntil ?? null

  // Cuando se cumplen las 12 horas, se vuelve a cerrar sin recargar.
  useEffect(() => {
    if (until === null) return undefined

    const timer = setTimeout(
      () => void status.reload(),
      Math.min(2 ** 31 - 1, Math.max(0, Date.parse(until) - Date.now()) + 1000),
    )

    return () => {
      clearTimeout(timer)
    }
  }, [until, status])

  if (status.loading) return <p className="estado">{t('app.loading')}</p>
  if (status.data === undefined) {
    return <ErrorNote error={status.error} onRetry={() => void status.reload()} />
  }

  if (until !== null) {
    return (
      <>
        <p className="hint panel-open">
          <Icon name="escudo" size={14} />{' '}
          {t('admin.lock.openUntil', {
            time: new Date(until).toLocaleTimeString(localeOf(lang), {
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}{' '}
          <button
            type="button"
            className="link"
            onClick={() =>
              void run(async () => {
                await api.lockPanel()
                await status.reload()
              })
            }
          >
            {t('admin.lock.close')}
          </button>
        </p>
        {children}
      </>
    )
  }

  const enrolled = status.data.enrolled

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    const ok = await run(() =>
      enrolled ? api.verifySecondFactor(code) : api.confirmSecondFactor(code),
    )

    setCode('')
    if (ok) await status.reload()
  }

  return (
    <article className="card form panel-lock">
      <h3>
        <Icon name="escudo" /> {t(enrolled ? 'admin.lock.title' : 'admin.lock.enrollTitle')}
      </h3>
      <p className="hint">{t(enrolled ? 'admin.lock.ask' : 'admin.lock.enrollAsk')}</p>

      {!enrolled && uri === null && (
        <button
          type="button"
          className="primary small"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              setUri((await api.setupSecondFactor()).uri)
            })
          }
        >
          {t('admin.lock.generate')}
        </button>
      )}
      {!enrolled && uri !== null && (
        <div className="panel-lock-qr">
          <Qr text={uri} label={t('admin.lock.qr')} />
          <small className="hint">
            {t('admin.lock.manual')} <code>{secretOf(uri)}</code>
          </small>
        </div>
      )}

      {(enrolled || uri !== null) && (
        <form className="actions" onSubmit={(event) => void submit(event)}>
          <input
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            aria-label={t('admin.lock.code')}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''))
            }}
          />
          <button type="submit" className="primary small" disabled={busy || code.length !== 6}>
            {t(enrolled ? 'admin.lock.open' : 'admin.lock.confirm')}
          </button>
        </form>
      )}
      <ErrorNote error={error} />
    </article>
  )
}
