import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { clock, durationText } from '../../shared/time'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: los minutos elegidos, lo que se deja a la
 * vista, la sesión en marcha (ventanita y pantalla completa) y su reloj.
 */
type Focus = {
  /** Minutos de concentración elegidos en la rueda. */
  minutes: number
  /** La pestaña Proyectos, marcada para seguir viéndola. */
  projects: boolean
  /** Los mensajes, marcados para que sigan llegando. */
  messages: boolean
  running: boolean
  /** A pantalla completa. */
  screen: boolean
  /** Segundos que lleva la sesión. */
  tick: number
}

const START: Focus = {
  minutes: 25,
  projects: false,
  messages: false,
  running: false,
  screen: false,
  tick: 0,
}

/** El reloj corre de segundo en segundo desde que empieza la sesión. */
const TICKS: Cue<Focus>[] = Array.from({ length: 5 }, (_, index) => [
  9600 + index * 1000,
  { tick: index + 1 },
])

export const TOUR = defineTour<Focus>(
  'focus',
  START,
  [
    ...click<Focus>(700, 'minutes', { minutes: 50 }),
    ...click<Focus>(2400, 'projects', { projects: true, caption: 2 }),
    ...click<Focus>(4800, 'messages', { messages: true, caption: 3 }),
    ...click<Focus>(7900, 'start', { running: true, caption: 4 }),
    ...TICKS,
    ...click<Focus>(10900, 'screen', { screen: true, caption: 5 }),
    ...cut<Focus>(14200, { scene: 1, screen: false, caption: 6, cursor: 'rest' }),
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.focus-minutes',
    2: 'fieldset.focus-choices:first-of-type',
    3: 'fieldset.focus-choices:last-of-type',
    4: '.focus-page .actions, .focus-timer',
    5: '.focus-screen',
    6: '.focus-stats',
  },
)

/** Los minutos de cada día de la semana de mentira, para las barras. */
const DAYS = [50, 25, 75, 0, 100] as const

/**
 * Cómo funciona el Pomodoro: cuánto concentrarse y descansar, qué pestañas y
 * avisos siguen a la vista, el reloj que flota al empezar y que se puede poner
 * a pantalla completa, y la pestaña con tus estadísticas.
 */
export function FocusTour() {
  const { t } = useI18n()
  const days = t('tour.days').split(',')

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.pomodoro')}>
      {(shot) => {
        const left = clock(shot.minutes * 60 - shot.tick)
        const check = (on: boolean, label: string, target?: string) => (
          <span className="tour-row" data-tour={target}>
            <span className={`tour-check ${on ? 'on' : ''}`}>
              {on && <Icon name="hecho" size={11} />}
            </span>
            {label}
          </span>
        )

        return (
          <>
            <div className="tour-tabs">
              <span className={shot.scene === 0 ? 'on' : ''}>{t('focus.tab.settings')}</span>
              <span>{t('focus.tab.startup')}</span>
              <span className={shot.scene === 1 ? 'on' : ''}>{t('focus.tab.stats')}</span>
            </div>
            {shot.scene === 0 ? (
              <>
                <div className="tour-split">
                  <div className="tour-card">
                    <span className="tour-row">
                      <span className="tour-muted">{t('focus.minutes')}</span>
                      <span className="tour-select tour-end" data-tour="minutes">
                        {t('focus.minutesN', { n: shot.minutes })}
                      </span>
                    </span>
                    <span className="tour-row">
                      <span className="tour-muted">{t('focus.break')}</span>
                      <span className="tour-select tour-end">{t('focus.minutesN', { n: 5 })}</span>
                    </span>
                    <span className="tour-row">
                      <span className="tour-button" data-tour="start">
                        <Icon name="reloj" size={12} /> {t('focus.start')}
                      </span>
                    </span>
                  </div>
                  <div className="tour-card">
                    <strong>{t('focus.sections')}</strong>
                    {check(true, t('nav.calendario'))}
                    {check(shot.projects, t('nav.tablon'), 'projects')}
                    <strong>{t('focus.show')}</strong>
                    {check(true, t('focus.show.corrections'))}
                    {check(shot.messages, t('focus.show.messages'), 'messages')}
                  </div>
                </div>
                {shot.running && !shot.screen && (
                  <div className="tour-pop tour-corner">
                    <span className="tour-row">
                      <Icon name="reloj" size={16} />
                      <span>
                        <strong className="tour-timer">{left}</strong>{' '}
                        <span className="tour-muted">{t('focus.focusing')}</span>
                      </span>
                    </span>
                    <span className="tour-row">
                      <span className="tour-pill" data-tour="screen">
                        {t('focus.screen.open')}
                      </span>
                      <span className="tour-pill">{t('focus.stop')}</span>
                    </span>
                  </div>
                )}
                {shot.screen && (
                  <div className="tour-full tour-in">
                    <span className="tour-row">
                      <Icon name="reloj" size={18} /> {t('focus.screen.sign')}
                    </span>
                    <strong className="tour-timer">{left}</strong>
                    <span className="tour-pill">{t('focus.screen.shrink')}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="tour-split tour-in">
                <div className="tour-card">
                  <span className="tour-muted">{t('focus.stats.sessions')}</span>
                  <strong>12</strong>
                  <span className="tour-muted">{t('focus.stats.focusedSeconds')}</span>
                  <strong>{durationText(9 * 3600 + 10 * 60)}</strong>
                  <span className="tour-muted">{t('focus.stats.completed')}</span>
                  <strong>10</strong>
                </div>
                <div className="tour-card">
                  <span className="tour-muted">{t('focus.stats.byDay')}</span>
                  <div className="tour-bars">
                    {DAYS.map((minutes, day) => (
                      <span key={day}>
                        <i style={{ height: `${String(minutes)}%` }} />
                        {days[day]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
