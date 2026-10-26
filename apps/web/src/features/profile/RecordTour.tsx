import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

type Rec = {
  /** XP acumulada, sobre los 500 del nivel. */
  xp: number
  /** Personalizar abierto en su ventana, en la pestaña Orden. */
  studio: boolean
  /** «Tu estado de salud», arrastrado arriba del todo. */
  healthFirst: boolean
  /** Los plazos y el black hole, desplegados. */
  open: boolean
  /** Ya en el Avance, tras pulsar «Compararte en Avance». */
  compare: boolean
}

const START: Rec = { xp: 310, studio: false, healthFirst: false, open: false, compare: false }

export const TOUR = defineTour<Rec>('record', START, [
  [1500, { caption: 2, xp: 350 }],
  [3300, { caption: 3 }],
  ...click<Rec>(3300, 'customize', { studio: true }),
  [4700, { cursor: 'b-health' }],
  [5300, { press: true, drag: true }],
  [5360, { cursor: 'slot0', healthFirst: true }],
  [6400, { press: false, drag: false }],
  ...cut<Rec>(7100, { scene: 1, caption: 4, cursor: 'rest', studio: false }),
  [9300, { caption: 5 }],
  ...click<Rec>(9300, 'toggle', { open: true }),
  [11800, { caption: 6 }],
  ...click<Rec>(11800, 'compare', { compare: true }),
])

/** Los bloques del perfil, en su orden de fábrica (`layout.expediente.*`). */
const BLOCKS = ['record', 'health', 'network', 'achievements', 'ranking'] as const

/** Alto de cada fila de la lista de bloques, en `em`: cada una va en su puesto. */
const SLOT = 2.2

/** Los plazos que salen en la demostración: pace y fecha. `0` es el black hole. */
const STEPS = [
  { pace: 15, date: new Date(2026, 10, 11), left: 16 },
  { pace: 18, date: new Date(2026, 11, 14), left: 49 },
  { pace: 0, date: new Date(2027, 2, 29), left: 154 },
] as const

/** Las líneas del Avance de mentira: dos paces (discontinuas) y la tuya. */
const PACE_LINES = ['M10 90 L230 20', 'M10 90 L230 45'] as const
const MY_LINE = 'M10 90 L60 78 L110 70 L160 52 L200 40'

/**
 * Cómo funciona el perfil: la XP sube al ayudar; los bloques se ordenan en
 * Personalizar, que se abre en su ventana sin salir de aquí; tu estado de
 * salud dice el pace de hoy y el de tu intra, se despliega con los plazos y
 * lleva al Avance para compararte.
 */
export function RecordTour() {
  const { t, tn } = useI18n()
  const { date } = useFormat()
  const day = (value: Date): string => date(value, 'dayMonth')
  const order = (healthFirst: boolean): string[] =>
    healthFirst ? ['health', ...BLOCKS.filter((block) => block !== 'health')] : [...BLOCKS]

  return (
    <Tour
      tour={TOUR}
      tab={(shot) => t(shot.compare ? 'nav.cat.datos' : 'nav.cat.expediente')}
      sub={(shot) => t(shot.compare ? 'nav.avance' : 'nav.expediente')}
    >
      {(shot) => {
        if (shot.compare) {
          return (
            <div className="tour-card tour-in">
              <strong>{t('stats.progress.title')}</strong>
              <svg viewBox="0 0 240 100" style={{ width: '100%' }}>
                {PACE_LINES.map((line) => (
                  <path
                    key={line}
                    d={line}
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    opacity={0.4}
                  />
                ))}
                <path d={MY_LINE} fill="none" stroke="var(--accent)" strokeWidth={3} />
                <circle cx={200} cy={40} r={5} fill="var(--accent)" />
              </svg>
              <span className="tour-row">
                <span className="tour-chip">{t('stats.progress.me')}</span>
                <span className="tour-muted">{t('pace.option', { n: 15 })}</span>
              </span>
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <div className="tour-row">
                <strong>{t('health.title')}</strong>
                <span className="tour-end" data-tour="compare">
                  {t('health.compare')} <Icon name="adelante" size={12} />
                </span>
              </div>
              <div className="tour-row">
                <span className="tour-item on">
                  <span className="tour-muted">{t('health.paceNow')}</span>
                  <strong>15</strong>
                </span>
                <span className="tour-item">
                  <span className="tour-muted">{t('health.paceIntra')}</span>
                  <strong>18</strong>
                </span>
                <span className="tour-select tour-end" data-tour="toggle">
                  {shot.open ? '▴' : '▾'}
                </span>
              </div>
              <span className="tour-muted">
                {tn('health.summary', STEPS[0].left, {
                  circle: 3,
                  pace: 15,
                  date: day(STEPS[0].date),
                  left: STEPS[0].left,
                })}
              </span>
              {shot.open &&
                STEPS.map(({ pace, date: when, left }) => (
                  <span key={pace} className={`tour-item tour-in ${pace === 15 ? 'on' : ''}`}>
                    {pace === 0 ? <Icon name="pozo" size={15} /> : <strong>{pace}</strong>}
                    <span>
                      {pace === 0
                        ? t('health.hole', { date: day(when) })
                        : t('health.stepUntil', { date: day(when) })}
                    </span>
                    <span className="tour-muted tour-end">{tn('pace.left', left)}</span>
                  </span>
                ))}
            </div>
          )
        }

        return (
          <>
            <div className="tour-card">
              <div className="tour-row">
                <span className="tour-avatar">A</span>
                <strong>anavarro</strong>
                <span className="tour-muted">{t('title.residente')}</span>
                <span className="tour-chip tour-end">{t('xp.level')} 4</span>
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
            <span className="tour-muted" data-tour="customize">
              {t('layout.customizeHere')}
            </span>
            {shot.studio && (
              <div className="tour-pop" style={{ top: '6%', left: '12%', right: '12%' }}>
                <strong>{t('layout.title')}</strong>
                <div className="tour-tabs">
                  <span>{t('studio.tab.style')}</span>
                  <span className="on">{t('studio.tab.order')}</span>
                  <span>{t('studio.tab.settings')}</span>
                </div>
                <div className="tour-stack" style={{ height: `${BLOCKS.length * SLOT}em` }}>
                  <span
                    className="tour-anchor"
                    data-tour="slot0"
                    style={{ left: '30%', top: '1em' }}
                  />
                  {BLOCKS.map((block) => (
                    <span
                      key={block}
                      data-tour={`b-${block}`}
                      className={`tour-item tour-slide ${block === 'health' ? 'on' : ''}`}
                      style={{
                        top: `${order(shot.healthFirst).indexOf(block) * SLOT}em`,
                        padding: '0.3em 0.7em',
                      }}
                    >
                      <Icon name="asa" size={13} />
                      <span>{t(`layout.expediente.${block}`)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
