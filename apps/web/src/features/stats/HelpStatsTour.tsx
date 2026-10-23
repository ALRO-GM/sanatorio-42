import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

type HelpStats = {
  /** «Siempre» en vez de «este mes». */
  all: boolean
  /** Ficha del login pulsado, abierta. */
  open: boolean
}

const START: HelpStats = { all: false, open: false }

export const TOUR = defineTour<HelpStats>('helpStats', START, [
  ...click<HelpStats>(900, 'all', { all: true }),
  [2600, { caption: 2 }],
  ...cut<HelpStats>(4600, { scene: 1, caption: 3, cursor: 'rest' }),
  [7000, { caption: 4 }],
  ...click<HelpStats>(9000, 'login', { open: true }),
  [10400, { caption: 5 }],
])

const ROWS = [
  { login: 'mgarcia', value: 11, extra: 25, hue: 200 },
  { login: 'jdoe', value: 8, extra: 19, hue: 30 },
  { login: 'lsoto', value: 6, extra: 9, hue: 280 },
]

/**
 * Cómo funcionan las estadísticas de Ayuda: eliges el periodo, ves las cifras
 * de cada sección y su clasificación, con tu fila marcada; un nombre lleva a
 * su expediente.
 */
export function HelpStatsTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.estadisticas')}>
      {(shot) => {
        const scale = shot.all ? 4 : 1

        return shot.scene === 0 ? (
          <div className="tour-card">
            <div className="tour-row">
              <strong>{t('nav.tablon')}</strong>
              <span className={`tour-pill tour-end ${shot.all ? '' : 'on'}`}>
                {t('rank.month')}
              </span>
              <span className={`tour-pill ${shot.all ? 'on' : ''}`} data-tour="all">
                {t('rank.all')}
              </span>
            </div>
            <div className="tour-row">
              {(
                [
                  ['doubts', 64],
                  ['answers', 141],
                  ['solved', 39],
                ] as const
              ).map(([key, value]) => (
                <span key={key} className="tour-item">
                  <span className="tour-muted">{t(`stats.tablon.${key}`)}</span>
                  <strong>{value * scale}</strong>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="tour-split">
            <div className="tour-card">
              <span className="tour-muted">{t('stats.tablon.rank')}</span>
              {ROWS.map((row, index) => (
                <span key={row.login} className="tour-item">
                  <strong>{index + 1}</strong>
                  <span className="tour-avatar" style={{ ['--hue' as string]: row.hue }}>
                    {row.login.charAt(0).toUpperCase()}
                  </span>
                  <span data-tour={index === 0 ? 'login' : undefined}>{row.login}</span>
                  <span className="tour-chip tour-end">
                    {t('stats.tablon.value', { n: row.value })}
                  </span>
                </span>
              ))}
              <span className={`tour-item ${shot.caption >= 4 ? 'on' : ''}`}>
                <strong>9</strong>
                <span className="tour-avatar">P</span>
                <span>plopez-l</span>
                <span className="tour-chip">{t('rank.you')}</span>
                <span className="tour-chip tour-end">{t('stats.tablon.value', { n: 2 })}</span>
              </span>
            </div>
            {shot.open && (
              <div className="tour-card tour-in">
                <span className="tour-avatar">M</span>
                <strong>mgarcia</strong>
                <span className="tour-muted">{t('stats.tablon.extra', { n: 25 })}</span>
              </div>
            )}
          </div>
        )
      }}
    </Tour>
  )
}
