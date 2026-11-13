import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import { Icon } from '../../shared/ui/Icon'

/**
 * Las pestañas del panel que salen en el decorado, en el orden del panel de
 * verdad: las demás (mensajes, estadísticas, piscina…) no caben y se
 * entienden con estas.
 */
const TABS = [
  'consumption',
  'people',
  'limits',
  'inbox',
  'usage',
  'casts',
  'countdowns',
  'maintenance',
] as const

type Tab = (typeof TABS)[number]

/** Lo que cambia en el decorado: la pestaña abierta y lo que se hace en dos de ellas. */
type Admin = {
  tab: Tab
  /** La incidencia, respondida y cerrada. */
  closed: boolean
  /** La web, puesta en mantenimiento. */
  maintenance: boolean
}

const START: Admin = { tab: 'consumption', closed: false, maintenance: false }

export const TOUR = defineTour<Admin>(
  'admin',
  START,
  [
    ...click<Admin>(1700, 'usage', { tab: 'usage', caption: 2 }),
    ...click<Admin>(4100, 'inbox', { tab: 'inbox', caption: 3 }),
    ...click<Admin>(5400, 'close', { closed: true }),
    ...click<Admin>(7000, 'casts', { tab: 'casts', caption: 4 }),
    ...click<Admin>(9300, 'countdowns', { tab: 'countdowns', caption: 5 }),
    ...click<Admin>(11600, 'people', { tab: 'people', caption: 6 }),
    ...click<Admin>(14000, 'limits', { tab: 'limits', caption: 7 }),
    ...click<Admin>(16300, 'maintenance', { tab: 'maintenance', caption: 8 }),
    ...click<Admin>(17800, 'on', { maintenance: true }),
  ],
  // De qué pestaña del panel habla cada paso: soltando en ella el
  // interrogante, la demostración empieza ahí.
  {
    1: '.admin [data-pill="consumption"]',
    2: '.admin [data-pill="usage"]',
    3: '.admin [data-pill="inbox"]',
    4: '.admin [data-pill="casts"]',
    5: '.admin [data-pill="countdowns"]',
    6: '.admin [data-pill="people"]',
    7: '.admin [data-pill="limits"]',
    8: '.admin [data-pill="maintenance"]',
  },
)

/** Las últimas horas de consumo y lo que se usa cada pestaña, en % del máximo. */
const RECENT = [20, 35, 60, 45, 80, 100, 70, 40, 55, 30] as const
const USAGE = [
  ['consulta', 100],
  ['clusters', 70],
  ['calendario', 45],
] as const

/**
 * El panel de gestión de un vistazo: qué hay en cada grupo de pestañas y lo
 * principal que se hace en ellas (consumo, uso, incidencias, comunicados y
 * cuentas atrás, permisos y límites, mantenimiento).
 */
export function AdminTour() {
  const { t } = useI18n()
  const { number } = useFormat()

  return (
    <Tour tour={TOUR} tab={() => t('nav.gestion')}>
      {(shot) => {
        const body: Record<Tab, ReactNode> = {
          consumption: (
            <>
              <span className="tour-row">
                <span className="tour-muted">{t('admin.cons.perPerson')}</span>
                <strong>{number(120)}</strong>
              </span>
              <span className="tour-row">
                <span className="tour-muted">{t('admin.cons.fortyTwo')}</span>
                <strong>{number(1043)}</strong>
              </span>
              <span className="tour-muted">{t('admin.cons.recent')}</span>
              <div className="tour-bars short">
                {RECENT.map((share, hour) => (
                  <span key={hour}>
                    <i style={{ height: `${String(share)}%` }} />
                  </span>
                ))}
              </div>
            </>
          ),
          usage: (
            <>
              <span className="tour-row">
                <span className="tour-pill on">{t('admin.usage.view.heat')}</span>
                <span className="tour-pill">{t('admin.usage.view.flows')}</span>
                <span className="tour-pill">{t('admin.usage.view.clicks')}</span>
              </span>
              {USAGE.map(([section, share]) => (
                <span key={section} className="tour-row tour-meter">
                  <span>{t(`nav.${section}`)}</span>
                  <i style={{ width: `${String(share * 0.55)}%` }} />
                </span>
              ))}
            </>
          ),
          inbox: (
            <>
              <span className="tour-row">
                <span className={`tour-pill ${shot.closed ? '' : 'on'}`}>
                  {t('admin.inbox.view.pending')}
                </span>
                <span className={`tour-pill ${shot.closed ? 'on' : ''}`}>
                  {t('admin.inbox.view.done')}
                </span>
              </span>
              <span className="tour-item">
                <span className="tour-chip">
                  {t(shot.closed ? 'admin.inbox.status.closed' : 'admin.inbox.status.open')}
                </span>
                <span>
                  <strong>mgarcia</strong>
                  {t('tour.inbox.text')}
                </span>
              </span>
              {shot.closed ? (
                <span className="tour-saved">
                  <Icon name="hecho" size={13} /> {t('tour.inbox.reply')}
                </span>
              ) : (
                <span className="tour-row">
                  <span className="tour-input">{t('tour.inbox.reply')}</span>
                  <span className="tour-button" data-tour="close">
                    {t('admin.inbox.close')}
                  </span>
                </span>
              )}
            </>
          ),
          casts: (
            <>
              <strong>{t('admin.cast.new')}</strong>
              <span className="tour-row">
                <span className="tour-muted">{t('admin.cast.to')}</span>
                <span className="tour-pill on">{t('admin.cast.to.all')}</span>
                <span className="tour-pill">{t('admin.cast.to.logins')}</span>
              </span>
              <span className="tour-input">{t('admin.cast.title')}</span>
              <span className="tour-input">{t('admin.cast.body')}</span>
            </>
          ),
          countdowns: (
            <>
              <strong>{t('admin.countdown.new')}</strong>
              <span className="tour-row">
                <span className="tour-pill on">{t('admin.countdown.kind.lockers')}</span>
                <span className="tour-pill">{t('admin.countdown.kind.custom')}</span>
              </span>
              <span className="tour-row">
                <span className="tour-select">{t('countdown.day')}</span>
                <span className="tour-select">{t('countdown.time')}</span>
                <span className="tour-button tour-end">{t('admin.countdown.send')}</span>
              </span>
            </>
          ),
          people: (
            <>
              <span className="tour-muted">{t('admin.people.admins')}</span>
              <span className="tour-item">
                <span className="tour-avatar" style={{ ['--hue' as string]: '40' }}>
                  M
                </span>
                <span>mgarcia</span>
                <span className="tour-pill tour-end">{t('admin.people.revoke')}</span>
              </span>
              <span className="tour-muted">{t('admin.people.blocks')}</span>
              <span className="tour-row">
                <span className="tour-input">{t('admin.people.login')}</span>
                <span className="tour-pill">{t('admin.people.grant')}</span>
                <span className="tour-pill">{t('admin.people.block')}</span>
              </span>
            </>
          ),
          limits: (
            <>
              <strong>{t('admin.limits.title')}</strong>
              <span className="tour-row">
                <span className="tour-pill on">{t('admin.limits.editingEveryone')}</span>
                <span className="tour-pill">{t('admin.limits.see')}</span>
              </span>
              <span className="tour-row">
                <span>{t('admin.limits.key.doubts.perDay')}</span>
                <span className="tour-select tour-end">5 {t('admin.limits.unit.per_day')}</span>
              </span>
              <span className="tour-row">
                <span>{t('admin.limits.key.countdowns.pins')}</span>
                <span className="tour-select tour-end">10 {t('admin.limits.unit.at_once')}</span>
              </span>
            </>
          ),
          maintenance: (
            <>
              <strong>{t('admin.maint.title')}</strong>
              <span className={shot.maintenance ? 'tour-saved' : 'tour-muted'}>
                {t(shot.maintenance ? 'admin.maint.isOn' : 'admin.maint.isOff')}
              </span>
              <span className="tour-input">{t('admin.maint.messagePlaceholder')}</span>
              <span className="tour-row">
                <span className={shot.maintenance ? 'tour-pill' : 'tour-button'} data-tour="on">
                  {t(shot.maintenance ? 'admin.maint.off' : 'admin.maint.on')}
                </span>
              </span>
            </>
          ),
        }

        return (
          <>
            <div className="tour-row tour-steady">
              {TABS.map((tab) => (
                <span
                  key={tab}
                  className={`tour-pill ${shot.tab === tab ? 'on' : ''}`}
                  data-tour={tab}
                >
                  {t(`admin.tab.${tab}`)}
                </span>
              ))}
            </div>
            <div key={shot.tab} className="tour-card tour-in">
              {body[shot.tab]}
            </div>
          </>
        )
      }}
    </Tour>
  )
}
