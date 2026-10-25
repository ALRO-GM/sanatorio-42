import type { Segment } from '@sanatorio/contracts'

import { useI18n } from '../i18n'
import { RangeSlider } from './RangeSlider'

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
 * @param texts De dónde salen sus textos: los del panel o, fuera de él, otros
 *   con las mismas claves debajo (el Pomodoro, `focus.band`).
 */
export function SegmentSlider({
  value,
  onChange,
  told,
  texts = 'admin.segment',
}: {
  value: SegmentRange
  onChange: (next: SegmentRange) => void
  told: Segment | undefined
  texts?: 'admin.segment' | 'focus.band'
}) {
  const { t } = useI18n()

  return (
    <div className="segment-slider">
      <span>
        {value.low === 0 && value.high === 100
          ? t(`${texts}.all`)
          : t(`${texts}.some`, { low: value.low, high: value.high })}
        {told !== undefined && (
          <small> · {t(`${texts}.people`, { n: told.people, of: told.of })}</small>
        )}
      </span>
      <RangeSlider
        max={100}
        low={value.low}
        high={value.high}
        // Un tramo vacío no enseña nada: los tiradores no llegan a tocarse.
        minGap={1}
        // Cada cambio pregunta a la API: al soltar, no a cada paso.
        commit="release"
        format={(n) => t('range.percent', { n })}
        lowLabel={t(`${texts}.low`)}
        highLabel={t(`${texts}.high`)}
        onChange={(low, high) => {
          onChange({ low, high })
        }}
      />
      <small className="segment-ends">
        <span>{t(`${texts}.least`)}</span>
        <span>{t(`${texts}.most`)}</span>
      </small>
    </div>
  )
}
