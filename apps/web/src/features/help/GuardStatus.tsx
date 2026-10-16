import type { HelpDay } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { guardStatus } from './status'
import { duration } from './time'

/** Cómo te ve ahora el resto: si sales de guardia y si te pueden reservar (`status.ts`). */
export function GuardStatus({ day }: { day: HelpDay }) {
  const { t } = useI18n()
  const [duty, booking] = guardStatus(day, duration)

  return (
    <article className="card guard-status" aria-live="polite">
      <span className="eyebrow">{t('help.status.title')}</span>
      <p className={`guard-line ${duty.tone}`}>
        <Icon name="guardia" size={16} /> {t(duty.key, duty.vars)}
      </p>
      <p className={`guard-line ${booking.tone}`}>
        <Icon name="calendario" size={16} /> {t(booking.key, booking.vars)}
      </p>
    </article>
  )
}
