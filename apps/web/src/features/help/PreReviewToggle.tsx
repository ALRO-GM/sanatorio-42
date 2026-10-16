import { useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

/**
 * Preevaluar: quien ya aprobó un proyecto puede revisar el de otra persona
 * cuando lo tiene terminado, como ensayo de la corrección de verdad. Es de lo
 * principal de la guardia, así que va en grande y la primera: el interruptor,
 * su icono y en cuántos proyectos sales (los que aprobaste). En la sala de
 * espera se te ve marcado en esos proyectos.
 */
export function PreReviewToggle() {
  const { t } = useI18n()
  const profile = useAsync(() => api.getProfile(), [])
  const mine = useAsync(() => api.getMyProjects(true), [])
  const { busy, error, run } = useAction()
  const [chosen, setChosen] = useState<boolean | null>(null)
  const on = chosen ?? profile.data?.preReview ?? false
  const passed = (mine.data ?? []).filter((project) => project.status === 'finished').length

  const toggle = (): void => {
    const next = !on

    setChosen(next)
    void run(() => api.updateSettings({ preReview: next })).then((ok) => {
      if (!ok) setChosen(!next)
    })
  }

  return (
    <article className={`card pre-review ${on ? 'on' : ''}`}>
      <span className="pre-review-icon" aria-hidden="true">
        <Icon name="preevaluar" size={34} />
      </span>
      <div className="pre-review-text">
        <h3>{t('help.preReview.title')}</h3>
        <p>
          {on
            ? passed > 0
              ? t('help.preReview.on', { n: passed })
              : t('help.preReview.onNone')
            : t('help.preReview.off')}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t('help.preReview')}
        className="pre-review-switch"
        disabled={busy || profile.loading}
        onClick={toggle}
      >
        <span aria-hidden="true" />
        {t(on ? 'help.preReview.yes' : 'help.preReview.no')}
      </button>
      <ErrorNote error={error} />
    </article>
  )
}
