import { useState } from 'react'

import { api } from '../../shared/api'
import { saveFile } from '../../shared/download'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { InfoTip } from '../../shared/ui/InfoTip'

const DAY = 24 * 60 * 60_000

const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)

/**
 * Descarga de las horas validadas con códigos (pizarras y sesiones de ayuda) en
 * un periodo, como CSV. Es lo que se puede enseñar al staff de 42.
 *
 * El fichero lo hace la API: aquí solo se eligen las fechas. Se pide por `POST`
 * porque cada descarga emite un documento verificable.
 *
 * @param everyone Para el panel de gestión: las de todo el mundo, no solo las tuyas.
 */
export function HoursReport({ everyone = false }: { everyone?: boolean }) {
  const { t } = useI18n()
  const [from, setFrom] = useState(() => dayOf(Date.now() - 30 * DAY))
  const [to, setTo] = useState(() => dayOf(Date.now()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const download = async (): Promise<void> => {
    setBusy(true)
    setError(null)

    try {
      const { fileName, data } = await api.attendanceReport({
        from,
        to,
        ...(everyone ? { login: 'all' } : {}),
      })

      saveFile(data, fileName)
    } catch (cause) {
      setError(cause)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hours-report">
      <span className="eyebrow">
        {t('hours.title')}
        <InfoTip title={t('hours.title')}>
          <p>{t(everyone ? 'hours.hintAll' : 'hours.hint')}</p>
        </InfoTip>
      </span>
      <div className="hours-form">
        <label>
          {t('common.from')}
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => {
              setFrom(event.target.value)
            }}
          />
        </label>
        <label>
          {t('common.to')}
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => {
              setTo(event.target.value)
            }}
          />
        </label>
        <button className="link" disabled={busy} onClick={() => void download()}>
          {t('hours.download')}
        </button>
      </div>
      <ErrorNote error={error} />
    </div>
  )
}
