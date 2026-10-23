import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import { Icon } from './Icon'

/**
 * «Concentrado hasta las 17:40 · no me distraigas, por favor»: lo que ven los
 * demás de quien está en modo Pomodoro. No sale si ya ha acabado.
 */
export function FocusBadge({ until }: { until: string | null }) {
  const { t } = useI18n()
  const format = useFormat()

  if (until === null || Date.parse(until) <= Date.now()) return null

  const time = format.time(until)

  return (
    <span className="badge focus-badge" title={t('focus.badgeHint')}>
      <Icon name="reloj" size={13} /> {t('focus.badge', { time })}
    </span>
  )
}
