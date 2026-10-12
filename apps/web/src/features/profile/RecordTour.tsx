import { localeOf, useI18n } from '../../shared/i18n'
import { click, cut, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Rec = {
  /** XP acumulada, sobre los 500 del nivel. */
  xp: number
  menu: boolean
  pace: number | null
  date: boolean
  calc: boolean
}

const START: Rec = { xp: 310, menu: false, pace: null, date: false, calc: false }

export const SCRIPT: readonly Cue<Rec>[] = [
  [1800, { caption: 2, xp: 350 }],
  ...cut<Rec>(4300, { scene: 1, caption: 3, cursor: 'rest' }),
  ...click<Rec>(5500, 'pace', { menu: true }),
  ...click<Rec>(6400, 'opt15', { menu: false, pace: 15 }),
  ...click<Rec>(7400, 'date', { date: true }),
  [8500, { caption: 4 }],
  ...click<Rec>(8500, 'save', { calc: true }),
]

/** Los plazos que salen en la demostración: pace y fecha. `0` es el black hole. */
const STEPS = [
  { pace: 15, date: new Date(2026, 10, 11) },
  { pace: 18, date: new Date(2026, 11, 14) },
  { pace: 0, date: new Date(2027, 2, 29) },
] as const

/**
 * Cómo funciona el expediente: la XP sube al ayudar, y en el estado de salud
 * se anotan el pace y el plazo para ver todas las fechas.
 */
export function RecordTour() {
  const { t, lang } = useI18n()
  const day = (date: Date): string =>
    date.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })

  return (
    <Tour
      name="record"
      start={START}
      script={SCRIPT}
      steps={[1, 2, 3, 4]}
      tab={() => t('nav.expediente')}
    >
      {(shot) =>
        shot.scene === 0 ? (
          <div className="tour-card">
            <div className="tour-row">
              <span className="tour-avatar">A</span>
              <strong>{t('xp.level')} 4</strong>
              {shot.xp > 310 && <span className="tour-saved">+40 XP</span>}
            </div>
            <div className="tour-xp">
              <i style={{ width: `${((shot.xp - 250) / 250) * 100}%` }} />
            </div>
            <span className="tour-muted">{t('xp.progress', { xp: shot.xp, next: 500 })}</span>
            <div className="tour-row">
              <span className="tour-chip star">
                <Icon name="medalla" size={12} /> ×3
              </span>
              <span className="tour-chip">
                <Icon name="corazon" size={12} /> ×12
              </span>
            </div>
          </div>
        ) : (
          <div className="tour-card">
            <strong>{t('health.title')}</strong>
            <div className="tour-row">
              <span className="tour-select" data-tour="pace">
                {shot.pace === null ? t('health.formPace') : t('pace.option', { n: shot.pace })} ▾
                {shot.menu && (
                  <span className="tour-menu">
                    <span>{t('pace.option', { n: 12 })}</span>
                    <span className="pick" data-tour="opt15">
                      {t('pace.option', { n: 15 })}
                    </span>
                    <span>{t('pace.option', { n: 18 })}</span>
                  </span>
                )}
              </span>
              <span className="tour-input" data-tour="date">
                {shot.date ? (
                  day(STEPS[0].date)
                ) : (
                  <span className="tour-muted">Milestone Deadline</span>
                )}
              </span>
              <span className="tour-button" data-tour="save">
                {t('health.formSave')}
              </span>
            </div>
            {shot.calc &&
              STEPS.map(({ pace, date }) => (
                <span key={pace} className={`tour-item tour-in ${pace === 15 ? 'on' : ''}`}>
                  {pace === 0 ? <Icon name="pozo" size={15} /> : <strong>{pace}</strong>}
                  <span>
                    {pace === 0
                      ? t('health.hole', { date: day(date) })
                      : t('health.stepUntil', { date: day(date) })}
                  </span>
                </span>
              ))}
          </div>
        )
      }
    </Tour>
  )
}
