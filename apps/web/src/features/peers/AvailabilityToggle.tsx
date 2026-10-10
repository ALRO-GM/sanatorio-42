import { useEffect, useState } from 'react'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'

type AvailabilityToggleProps = {
  /** Se acaba de poner de guardia: buen momento para abrir sus franjas de hoy. */
  onTurnedOn?: () => void
}

/** El interruptor "de guardia" de la cabecera. */
export function AvailabilityToggle({ onTurnedOn }: AvailabilityToggleProps) {
  const { t } = useI18n()
  // Arranca apagado y se hidrata después: quien no ha marcado nunca no está de
  // guardia, y es el mismo criterio que aplica la API.
  const [available, setAvailable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let current = true

    api.getAvailability().then(
      (saved) => {
        if (current) setAvailable(saved)
      },
      () => {
        // Si no se puede leer, se queda apagado.
      },
    )

    // Si el componente se desmonta antes de responder, se ignora el resultado.
    return () => {
      current = false
    }
  }, [])

  const toggle = async (): Promise<void> => {
    const next = !available
    setAvailable(next)
    setSaving(true)
    setNotice(null)

    try {
      await api.setAvailability(next)
      if (next) onTurnedOn?.()
    } catch {
      // Se revierte y se avisa: dejar el interruptor en un estado que la base no
      // tiene haría que al recargar vuelva a estar apagado sin motivo.
      setAvailable(!next)
      setNotice(t('duty.saveError'))
      setTimeout(() => {
        setNotice(null)
      }, 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="switch-wrap">
      <label className="switch-row">
        <span>{t('duty.label')}</span>
        <input
          type="checkbox"
          className="switch"
          checked={available}
          onChange={() => void toggle()}
          disabled={saving}
        />
        <span
          className="duty-info"
          tabIndex={0}
          role="img"
          aria-label={t('duty.hint')}
          data-tooltip={t('duty.hint')}
        >
          ⓘ
        </span>
      </label>
      {notice !== null && (
        <span className="estado error switch-aviso" role="status">
          {notice}
        </span>
      )}
    </span>
  )
}
