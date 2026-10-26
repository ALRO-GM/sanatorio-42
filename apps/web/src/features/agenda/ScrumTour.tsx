import { useI18n } from '../../shared/i18n'
import { click, defineTour, Tour } from '../../shared/tour/Tour'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { Icon } from '../../shared/ui/Icon'

/**
 * Lo que cambia en el decorado: la meta puesta, el checkpoint marcado, la
 * cuenta atrás fijada, el daily (abierto, su desplegable, el atasco elegido y
 * guardado) y el tablero del sprint.
 */
type Scrum = {
  goal: boolean
  checked: boolean
  pinned: boolean
  entry: boolean
  menu: boolean
  picked: boolean
  saved: boolean
  board: boolean
}

const START: Scrum = {
  goal: false,
  checked: false,
  pinned: false,
  entry: false,
  menu: false,
  picked: false,
  saved: false,
  board: false,
}

export const TOUR = defineTour<Scrum>('scrum', START, [
  ...click<Scrum>(900, 'new', { goal: true }),
  [2600, { caption: 2 }],
  ...click<Scrum>(2600, 'leaks', { checked: true }),
  [4400, { caption: 3 }],
  ...click<Scrum>(4400, 'pin', { pinned: true }),
  [6400, { caption: 4 }],
  ...click<Scrum>(6400, 'write', { entry: true }),
  ...click<Scrum>(7500, 'problem', { menu: true }),
  ...click<Scrum>(8500, 'memory', { menu: false, picked: true }),
  ...click<Scrum>(9500, 'save', { saved: true }),
  [10200, { entry: false }],
  [11000, { caption: 5 }],
  ...click<Scrum>(11000, 'board', { board: true }),
])

const CHECKS = ['works', 'subject', 'leaks', 'slots'] as const

/** Cada dato de la meta: su rótulo encima y el valor debajo. */
const FACT = { display: 'grid', gap: '0.3em', alignContent: 'start' } as const

/** Las filas del tablero del sprint de mentira: login, avance y si está atascado. */
const BOARD = [
  { login: 'ana-dev', progress: 85, stuck: false, me: false },
  { login: 'nora-c', progress: 60, stuck: true, me: true },
  { login: 'kiko42', progress: 20, stuck: false, me: false },
] as const

/** Lo que falta para la entrega en la cuenta atrás de mentira (ms). */
const DUE = (4 * 24 * 3600 + 6 * 3600 + 41 * 60 + 12) * 1000

/**
 * Cómo funciona la agenda: una meta por proyecto con su fecha, cuánto llevas y
 * sus checkpoints; su entrega fijada como cuenta atrás; un daily con el atasco
 * elegido de la lista, y el tablero del sprint, donde tu grupo lo ve.
 */
export function ScrumTour() {
  const { t, tn } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.expediente')} sub={() => t('nav.agenda')}>
      {(shot) => {
        const done = 2 + (shot.checked ? 1 : 0)

        return (
          <>
            <div className="tour-row">
              <span className="tour-button" data-tour="new">
                <Icon name="mas" size={12} /> {t('scrum.new')}
              </span>
              <span className="tour-pill">
                <Icon name="reloj" size={12} /> {t('scrum.countdown')}
              </span>
              <span className="tour-pill">
                <Icon name="calendario" size={12} /> {t('scrum.calendar')}
              </span>
            </div>
            {shot.goal && (
              <div className="tour-card tour-in">
                <div className="tour-row">
                  <strong>ft_printf</strong>
                  <span className="tour-chip">{t('scrum.kindOf.c')}</span>
                </div>
                <div className="tour-row">
                  <Icon name="terapia" size={13} />
                  <span>{tn('scrum.sprint.frame', 3, { place: t('map.cluster', { n: 2 }) })}</span>
                  <span className="tour-pill" data-tour="board">
                    {t(shot.board ? 'scrum.sprint.hide' : 'scrum.sprint.show')}
                  </span>
                </div>
                <div className="tour-split" style={{ gridTemplateColumns: '1fr 1fr 0.7fr' }}>
                  <span style={FACT}>
                    <span className="tour-muted">{t('scrum.targetDay')}</span>
                    <strong>{tn('scrum.due.left', 4)}</strong>
                  </span>
                  <span style={FACT}>
                    <span className="tour-muted">{t('scrum.progress')}</span>
                    <span className="tour-xp">
                      <i style={{ width: '60%' }} />
                    </span>
                  </span>
                  <span style={FACT}>
                    <span className="tour-muted">{t('scrum.checkpoints')}</span>
                    <strong key={done} className="tour-in">
                      {t('scrum.board.doneOf', { done, total: CHECKS.length })}
                    </strong>
                  </span>
                </div>
                <div className="tour-split">
                  {CHECKS.map((key, index) => {
                    const on = index < 2 || (key === 'leaks' && shot.checked)

                    return (
                      <div key={key} className="tour-row">
                        <span className={`tour-check ${on ? 'on' : ''}`} data-tour={key}>
                          {on && <Icon name="hecho" size={11} />}
                        </span>
                        <span>{t(`scrum.check.${key}`)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="tour-row">
                  <span className="tour-button" data-tour="write">
                    {t('scrum.entry.write')}
                  </span>
                  {shot.saved && (
                    <span className="tour-saved">
                      <Icon name="hecho" size={13} />
                    </span>
                  )}
                  <span className={`tour-pill ${shot.pinned ? 'on' : ''}`} data-tour="pin">
                    <Icon name="chincheta" size={12} />{' '}
                    {t(shot.pinned ? 'scrum.unpin' : 'scrum.pin')}
                  </span>
                </div>
              </div>
            )}
            {shot.pinned && (
              <div className="tour-pop" style={{ top: '0.5em', right: '0.8em', width: '36%' }}>
                <span className="tour-muted">{t('countdown.title')}</span>
                <strong>{t('scrum.pin.title', { project: 'ft_printf' })}</strong>
                <CountdownClock className="tour-timer" at={DUE} now={0} />
              </div>
            )}
            {shot.entry && (
              <div className="tour-pop tour-side">
                <div className="tour-tabs">
                  <span className="on">{t('scrum.kind.daily')}</span>
                  <span>{t('scrum.kind.weekly')}</span>
                </div>
                <span className="tour-muted">{t('scrum.entry.problem')}</span>
                <span className="tour-select" data-tour="problem">
                  {t(shot.picked ? 'scrum.problem.memory' : 'scrum.problem.none')} ▾
                  {shot.menu && (
                    <span className="tour-menu">
                      <span>{t('scrum.problem.bug')}</span>
                      <span className="pick" data-tour="memory">
                        {t('scrum.problem.memory')}
                      </span>
                      <span>{t('scrum.problem.other')}</span>
                    </span>
                  )}
                </span>
                <span className="tour-row">
                  <span className="tour-button" data-tour="save">
                    {t('scrum.entry.save')}
                  </span>
                </span>
              </div>
            )}
            {shot.board && (
              <div className="tour-pop tour-side" style={{ width: '56%' }}>
                <strong>{t('scrum.board.title')}</strong>
                {BOARD.map((row) => (
                  <span key={row.login} className={`tour-item tour-in ${row.me ? 'on' : ''}`}>
                    <span className="tour-avatar">{row.login.slice(0, 1).toUpperCase()}</span>
                    <span>
                      <span>
                        {row.login}
                        {row.me && ` · ${t('scrum.board.you')}`}
                      </span>
                      <span className="tour-muted">{row.progress} %</span>
                    </span>
                    <span className="tour-chip tour-end">
                      {t(row.stuck ? 'scrum.problem.memory' : 'scrum.board.flowing')}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </>
        )
      }}
    </Tour>
  )
}
