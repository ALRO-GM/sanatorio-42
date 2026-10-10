import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type DoubtFormProps = {
  projectId: number
  onCancel: () => void
  onCreated: () => void
}

/** El post-it en blanco donde se escribe una duda nueva. */
export function DoubtForm({ projectId, onCancel, onCreated }: DoubtFormProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [body, setBody] = useState('')

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    if (await run(() => api.createDoubt(projectId, body))) onCreated()
  }

  return (
    <form className="postit color-0 writing" onSubmit={(event) => void submit(event)}>
      <textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
        }}
        placeholder={t('board.doubtHint')}
        aria-label={t('board.newDoubt')}
        maxLength={280}
        rows={4}
        autoFocus
        required
      />
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy || body.trim().length < 5}>
          {t('board.post')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('board.cancel')}
        </button>
      </div>
    </form>
  )
}
