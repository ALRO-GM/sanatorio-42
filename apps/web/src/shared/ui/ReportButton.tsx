import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { ReportReason } from '@sanatorio/contracts'

import { api } from '../api'
import { useAction } from '../hooks/useAsync'
import { useI18n } from '../i18n'
import { ErrorNote } from './ErrorNote'
import { Icon } from './Icon'
import { REPORT_REASONS, reportIsReady } from '../report'

type ReportButtonProps = {
  /** Qué se denuncia: `message:12`, `board:3`, `doubt:5`. */
  target: string
  /** Un resumen de lo denunciado, para que quien administra lo sitúe sin buscarlo. */
  summary: string
}

/**
 * "Denunciar": avisa a quien administra de que un mensaje, una pizarra o una
 * duda es problemática. Se elige el motivo (spam, acoso, insultos u otro) y, si
 * es «otro», se explica; lo manda al buzón.
 */
export function ReportButton({ target, summary }: ReportButtonProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [why, setWhy] = useState('')
  const [reason, setReason] = useState<ReportReason>('insults')

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
        <Icon name="bandera" size={13} /> {t('report.button')}
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
        reason,
        target,
      }),
    )

    if (ok) setSent(true)
  }

  return (
    <form className="report-form" onSubmit={(event) => void submit(event)}>
      <select
        value={reason}
        aria-label={t('report.reason')}
        onChange={(event) => {
          setReason(event.target.value as ReportReason)
        }}
      >
        {REPORT_REASONS.map((option) => (
          <option key={option} value={option}>
            {t(`report.reason.${option}`)}
          </option>
        ))}
      </select>
      <input
        value={why}
        maxLength={500}
        placeholder={t(reason === 'other' ? 'report.why' : 'report.whyOptional')}
        aria-label={t('report.why')}
        onChange={(event) => {
          setWhy(event.target.value)
        }}
      />
      <button type="submit" className="pill" disabled={busy || !reportIsReady(reason, why)}>
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
