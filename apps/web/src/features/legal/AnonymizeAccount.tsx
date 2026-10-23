import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * Anonimizar la cuenta (derecho de supresión). Primero se abre, después hay que
 * escribir el propio login: no se hace por un clic suelto. Al acabar la API ha
 * cerrado la sesión, así que se recarga y sale la pantalla de entrada.
 */
export function AnonymizeAccount({ login }: { login: string }) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    if (await run(() => api.anonymizeMe(typed))) window.location.reload()
  }

  if (!open) {
    return (
      <button
        type="button"
        className="pill"
        onClick={() => {
          setOpen(true)
        }}
      >
        {t('legal.anonymize')}
      </button>
    )
  }

  return (
    <form className="anonymize" onSubmit={(event) => void submit(event)}>
      <p className="hint">{t('legal.anonymizeHint')}</p>
      <label>
        {t('legal.anonymizeConfirm', { login })}
        <input
          value={typed}
          autoComplete="off"
          onChange={(event) => {
            setTyped(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={error} />
      <button
        type="submit"
        className="primary small"
        disabled={busy || typed.trim().toLowerCase() !== login}
      >
        {t('legal.anonymizeGo')}
      </button>
    </form>
  )
}
