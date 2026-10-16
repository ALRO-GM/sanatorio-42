import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * Una sanción a mano en Code Clicker: le deja el código que se diga y, si se
 * marca, sin edificios ni mejoras. Lo verá en el juego con el mensaje.
 */
export function SanctionForm({ login, onDone }: { login: string; onDone: () => void }) {
  const { t } = useI18n()
  const [code, setCode] = useState('1000000000')
  const [wipe, setWipe] = useState(true)
  const [note, setNote] = useState('')
  const action = useAction()

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    if (!window.confirm(t('admin.clicker.sanctionAsk', { login }))) return
    if (
      await action.run(() =>
        api.sanctionClicker({ login, code: Number(code), wipe, note: note.trim() }),
      )
    ) {
      setNote('')
      onDone()
    }
  }

  return (
    <form className="card form" onSubmit={(submitted) => void submit(submitted)}>
      <h3>{t('admin.clicker.sanction')}</h3>
      <label>
        {t('admin.clicker.sanctionCode')}
        <input
          type="number"
          min={0}
          step="any"
          value={code}
          required
          onChange={(event) => {
            setCode(event.target.value)
          }}
        />
      </label>
      <label className="duty-check">
        <input
          type="checkbox"
          checked={wipe}
          onChange={(event) => {
            setWipe(event.target.checked)
          }}
        />
        {t('admin.clicker.sanctionWipe')}
      </label>
      <label>
        {t('admin.clicker.sanctionNote')}
        <textarea
          rows={3}
          value={note}
          maxLength={500}
          required
          onChange={(event) => {
            setNote(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={action.error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={action.busy}>
          {t('admin.clicker.sanctionSend')}
        </button>
      </div>
    </form>
  )
}
