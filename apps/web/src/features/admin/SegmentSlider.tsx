import type { Segment } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { RangeSlider } from '../../shared/ui/RangeSlider'

/** De cuánto en cuánto se mueve el tramo, en tantos por ciento. */
const STEP = 5

/** El tramo de gente que se mira: del `low` % al `high` %, de menos a más activa. */
export type SegmentRange = { low: number; high: number }

export const EVERYONE: SegmentRange = { low: 0, high: 100 }

/**
 * Para mirar solo a un tipo de usuario: deja fuera a la gente más activa, a la
 * menos activa o a las dos, en tantos por ciento. Un puñado de personas que no
 * sueltan la web (o que la abren una vez y no vuelven) se comen las medias; sin
 * ellas se ve cómo la usa el resto.
 *
 * @param told Lo que la API dice del tramo: cuánta gente entra y de cuánta.
 */
export function SegmentSlider({
  value,
  onChange,
  told,
}: {
  value: SegmentRange
  onChange: (next: SegmentRange) => void
  told: Segment | undefined
}) {
  const { t } = useI18n()

  return (
    <div className="segment-slider">
      <span>
        {value.low === 0 && value.high === 100
          ? t('admin.segment.all')
          : t('admin.segment.some', { low: value.low, high: value.high })}
        {told !== undefined && (
          <small> · {t('admin.segment.people', { n: told.people, of: told.of })}</small>
        )}
      </span>
      <RangeSlider
        max={100 / STEP}
        low={value.low / STEP}
        high={value.high / STEP}
        lowLabel={t('admin.segment.low')}
        highLabel={t('admin.segment.high')}
        onChange={(low, high) => {
          // Un tramo vacío no enseña nada: los tiradores no llegan a tocarse.
          if (high > low) onChange({ low: low * STEP, high: high * STEP })
        }}
      />
      <small className="segment-ends">
        <span>{t('admin.segment.least')}</span>
        <span>{t('admin.segment.most')}</span>
      </small>
    </div>
  )
}
