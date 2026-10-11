import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type ReportButtonProps = {
  /** Qué se denuncia: `message:12`, `board:3`, `doubt:5`. */
  target: string
  /** Un resumen de lo denunciado, para que quien administra lo sitúe sin buscarlo. */
  summary: string
}

/**
 * "Denunciar": avisa a quien administra de que un mensaje, una pizarra o una
 * duda es problemática. Pide el motivo y lo manda al buzón.
 */
export function ReportButton({ target, summary }: ReportButtonProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [why, setWhy] = useState('')

  if (sent) {
    return <small className="report-sent">{t('report.sent')}</small>
  }

  if (!open) {
    return (
      <button
        type="button"
        className="link report-link"
        onClick={() => {
          setOpen(true)
        }}
      >
        ⚑ {t('report.button')}
      </button>
    )
  }

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    const ok = await run(() =>
      api.openTicket({
        kind: 'report',
        subject: summary.slice(0, 110),
        body: why,
        target,
      }),
    )

    if (ok) setSent(true)
  }

  return (
    <form className="report-form" onSubmit={(event) => void submit(event)}>
      <input
        value={why}
        maxLength={500}
        placeholder={t('report.why')}
        aria-label={t('report.why')}
        onChange={(event) => {
          setWhy(event.target.value)
        }}
      />
      <button type="submit" className="pill" disabled={busy || why.trim().length < 5}>
        {t('report.send')}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => {
          setOpen(false)
        }}
      >
        {t('report.cancel')}
      </button>
      <ErrorNote error={error} />
    </form>
  )
}
