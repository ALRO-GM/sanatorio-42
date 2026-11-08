import type { FortyTwoSecretStatus } from '@sanatorio/contracts'

import { Icon } from '../../shared/ui/Icon'
import { useI18n } from '../../shared/i18n'

/**
 * Aviso del secreto de la app de 42: sale mientras no haya un «Next secret»
 * puesto en el servidor, porque sin él la web se queda sin login cuando caduque.
 */
export function SecretCard({ status }: { status: FortyTwoSecretStatus }) {
  const { t } = useI18n()

  if (status.hasNext) return null

  const day = status.expiresOn ?? '—'

  return (
    <article className="card">
      <span className="eyebrow">{t('admin.secret.title')}</span>
      <p>
        <Icon name="aviso" />{' '}
        {status.usingNext ? t('admin.secret.rotated', { day }) : t('admin.secret.noNext', { day })}
      </p>
      <p className="hint">{t('admin.secret.how')}</p>
    </article>
  )
}
