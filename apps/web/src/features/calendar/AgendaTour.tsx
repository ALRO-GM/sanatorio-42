import type { CalendarKind } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import type { Cue } from '../../shared/tour/Tour'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { Icon } from '../../shared/ui/Icon'
import { iconOf } from './kinds'

type Agenda = {
  /** Los sprints, ocultos con su filtro de tipo. */
  hidden: boolean
  sheet: boolean
  going: boolean
  /** La cuenta atrás del evento, fijada desde su ficha. */
  pinned: boolean
  /** La pestaña Cuentas atrás, abierta. */
  countdowns: boolean
  /** La meta de la agenda, fijada también. */
  goal: boolean
  /** Segundos que han pasado en el reloj de las cuentas atrás. */
  tick: number
}

const START: Agenda = {
  hidden: false,
  sheet: false,
  going: false,
  pinned: false,
  countdowns: false,
  goal: false,
  tick: 0,
}

/** El reloj corre de segundo en segundo mientras se ven las cuentas atrás. */
const TICKS: Cue<Agenda>[] = Array.from({ length: 7 }, (_, index) => [
  11200 + index * 1000,
  { tick: index + 1 },
])

export const TOUR = defineTour<Agenda>('agenda', START, [
  [1600, { caption: 2 }],
  ...click<Agenda>(1600, 'kind', { hidden: true }),
  ...click<Agenda>(3100, 'kind', { hidden: false }),
  [4600, { caption: 3 }],
  ...click<Agenda>(4600, 'ev', { sheet: true }),
  [6600, { caption: 4 }],
  ...click<Agenda>(6600, 'going', { going: true }),
  [8400, { caption: 5 }],
  ...click<Agenda>(8400, 'pin', { pinned: true }),
  [10400, { caption: 6 }],
  ...click<Agenda>(10400, 'tabCountdowns', { countdowns: true, sheet: false }),
  ...TICKS,
  [13200, { caption: 7 }],
  ...click<Agenda>(13200, 'goal', { goal: true }),
])

/** Los filtros que salen: los de aquí y dos de 42 (los demás, en la web, igual). */
const KINDS = ['help', 'therapy', 'board', 'evaluation', 'exam'] as const satisfies CalendarKind[]

type Kind = (typeof KINDS)[number]

/** La semana de mentira: qué hay cada día. */
const WEEK: readonly (readonly { kind: Kind; at: string }[])[] = [
  [{ kind: 'therapy', at: '16:00' }],
  [
    { kind: 'evaluation', at: '11:15' },
    { kind: 'help', at: '17:00' },
  ],
  [{ kind: 'board', at: '17:00' }],
  [{ kind: 'therapy', at: '16:00' }],
  [
    { kind: 'exam', at: '10:00' },
    { kind: 'evaluation', at: '18:30' },
  ],
]

const countOf = (kind: Kind): number => WEEK.flat().filter((event) => event.kind === kind).length

/** Cuánto falta para cada cuenta atrás (ms) al abrir la pestaña: el reloj empieza en 0. */
const BOARD_AT = (2 * 24 * 3600 + 4 * 3600 + 12 * 60 + 9) * 1000
const GOAL_AT = (9 * 24 * 3600 + 7 * 3600 + 30 * 60) * 1000

/**
 * Cómo funciona el calendario: todo lo tuyo junto, filtros de tipo que se
 * encienden y apagan, la ficha de un evento para decir si vas y fijar su
 * cuenta atrás, y la pestaña Cuentas atrás, donde también se fija la entrega
 * de una meta de la agenda.
 */
export function AgendaTour() {
  const { t } = useI18n()
  const days = t('tour.days').split(',')

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.yo')}>
      {(shot) => {
        const now = shot.tick * 1000

        return (
          <>
            <div className="tour-tabs">
              <span className={shot.countdowns ? '' : 'on'}>
                <Icon name="calendario" size={13} /> {t('agenda.tab.calendar')}
              </span>
              <span className={shot.countdowns ? 'on' : ''} data-tour="tabCountdowns">
                <Icon name="reloj" size={13} /> {t('agenda.tab.countdowns')}
              </span>
            </div>
            {shot.countdowns ? (
              <div className="tour-split tour-in">
                <div className="tour-card">
                  <strong>{t('countdown.mine')}</strong>
                  {shot.goal && (
                    <span className="tour-item tour-in">
                      <span className="tour-chip">{t('countdown.kind.custom')}</span>
                      <span>
                        <strong>{t('scrum.pin.title', { project: 'ft_printf' })}</strong>
                        <CountdownClock className="tour-timer" at={GOAL_AT} now={now} />
                      </span>
                    </span>
                  )}
                  <span className="tour-item">
                    <span className="tour-chip">{t('countdown.kind.event')}</span>
                    <span>
                      <strong>{t('tour.boards.topic')}</strong>
                      <CountdownClock className="tour-timer" at={BOARD_AT} now={now} />
                    </span>
                  </span>
                </div>
                <div className="tour-card">
                  <strong>{t('countdown.add')}</strong>
                  <span className="tour-muted">{t('countdown.goals')}</span>
                  <span className="tour-row">
                    <span className={`tour-pill ${shot.goal ? 'on' : ''}`} data-tour="goal">
                      <Icon name="chincheta" size={12} /> ft_printf
                    </span>
                  </span>
                  <span className="tour-row">
                    <span className="tour-pill">
                      <Icon name="calendario" size={12} /> {t('countdown.pinNext')}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="tour-row">
                  <span className="tour-muted">{t('agenda.kindsShow')}</span>
                  {KINDS.map((kind) => (
                    <span
                      key={kind}
                      data-tour={kind === 'therapy' ? 'kind' : undefined}
                      className={`tour-pill kind-${kind} ${kind === 'therapy' && shot.hidden ? 'off' : ''}`}
                      style={{ borderColor: 'var(--kind)' }}
                    >
                      <Icon name={iconOf(kind)} size={12} /> {t(`agenda.kind.${kind}`)}
                      <span className="tour-count">{countOf(kind)}</span>
                    </span>
                  ))}
                </div>
                <div className="tour-week">
                  {WEEK.map((events, day) => (
                    <div key={day}>
                      <span className="tour-muted">{days[day]}</span>
                      {events.map(({ kind, at }) => (
                        <span
                          key={at}
                          data-tour={kind === 'board' ? 'ev' : undefined}
                          className={`tour-ev kind-${kind} ${kind === 'therapy' && shot.hidden ? 'off' : ''}`}
                        >
                          {at}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
            {shot.sheet && (
              <div className="tour-pop tour-alert kind-board" style={{ top: '30%' }}>
                <span className="tour-kind">
                  <Icon name={iconOf('board')} size={13} /> {t('agenda.kind.board')}
                </span>
                <strong>{t('tour.boards.topic')}</strong>
                <span>17:00 · {t('map.cluster', { n: 2 })} · mgarcia</span>
                <span className="tour-row">
                  {shot.going ? (
                    <span className="tour-saved">
                      <Icon name="hecho" size={13} /> {t('meet.seen')}
                    </span>
                  ) : (
                    <>
                      <span className="tour-button" data-tour="going">
                        {t('meet.seen')}
                      </span>
                      <span className="tour-pill">{t('meet.late')}</span>
                      <span className="tour-pill">{t('meet.absent')}</span>
                    </>
                  )}
                </span>
                <span className="tour-row">
                  <span className={`tour-pill ${shot.pinned ? 'on' : ''}`} data-tour="pin">
                    <Icon name="chincheta" size={12} />{' '}
                    {t(shot.pinned ? 'countdown.unpinEvent' : 'countdown.pinEvent')}
                  </span>
                </span>
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
