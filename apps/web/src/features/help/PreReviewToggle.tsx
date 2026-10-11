import { useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

/**
 * "Me ofrezco a preevaluar": quien ya aprobó un proyecto puede revisar el de
 * otra persona cuando lo tiene terminado, como ensayo de la corrección de
 * verdad. En la sala de espera sale marcado en los proyectos que ya aprobó.
 */
export function PreReviewToggle() {
  const { t } = useI18n()
  const profile = useAsync(() => api.getProfile(), [])
  const { busy, error, run } = useAction()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const on = chosen ?? profile.data?.preReview ?? false

  return (
    <div className="pre-review">
      <label className="duty-check">
        <input
          type="checkbox"
          checked={on}
          disabled={busy || profile.loading}
          onChange={(event) => {
            const next = event.target.checked

            setChosen(next)
            void run(() => api.updateSettings({ preReview: next })).then((ok) => {
              if (!ok) setChosen(!next)
            })
          }}
        />
        {t('help.preReview')}
      </label>
      <p className="hint">{t('help.preReview.hint')}</p>
      <ErrorNote error={error} />
    </div>
  )
}
