import { useI18n } from '../../shared/i18n'
import { clock } from '../../shared/time'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

type Exams = {
  /** La pestaña de Exámenes, abierta. */
  opened: boolean
  /** Segundos que faltan para que la lista se ponga al día sola. */
  refresh: number
  /** Las notas ya se han puesto al día. */
  marked: boolean
  /** Solo el plan nuevo. */
  next: boolean
}

const START: Exams = { opened: false, refresh: 4, marked: false, next: false }

export const TOUR = defineTour<Exams>('exams', START, [
  ...click<Exams>(900, 'tab', { opened: true }),
  ...cut<Exams>(2500, { scene: 1, caption: 2, cursor: 'rest' }),
  [4800, { caption: 3, refresh: 3 }],
  [5800, { refresh: 2 }],
  [6800, { refresh: 1 }],
  [7800, { refresh: 0, marked: true }],
  [8300, { refresh: 300 }],
  [9400, { caption: 4 }],
  ...click<Exams>(9400, 'trackNext', { next: true }),
  ...cut<Exams>(11400, { scene: 2, caption: 5, cursor: 'rest' }),
])

/**
 * Inventadas: quién está en el examen, de qué plan y círculo, y cómo está antes
 * y después de ponerse al día (estado y nota; de quien sigue dentro, su mejor nota).
 */
const PEOPLE = [
  {
    login: 'mgarcia',
    hue: 200,
    circle: 3,
    track: 'classic',
    exam: 'Exam Rank 03',
    before: { status: 'inProgress', mark: null },
    after: { status: 'passed', mark: 100 },
  },
  {
    login: 'lperez',
    hue: 30,
    circle: 3,
    track: 'next',
    exam: 'Exam Rank 03',
    before: { status: 'inProgress', mark: 25 },
    after: { status: 'inProgress', mark: 25 },
  },
  {
    login: 'ahernan',
    hue: 280,
    circle: 4,
    track: 'next',
    exam: 'Exam Rank 04',
    before: { status: 'inProgress', mark: null },
    after: { status: 'failed', mark: 50 },
  },
] as const

const BARS = [12, 30, 18, 8, 4]

/** Las pestañas de la segunda fila de Datos, como en la cabecera. */
const SUBS = ['red', 'avance', 'examenes'] as const

/**
 * Cómo se usa Exámenes: la pestaña avisa en vivo cuando hay examen; dentro,
 * quién está, de qué examen y su estado, que se pone al día solo; se filtra
 * por plan; y debajo, en qué intento se suele aprobar.
 */
export function ExamsTour() {
  const { t } = useI18n()

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.datos')}
      sub={(shot) => t(shot.opened ? 'nav.examenes' : 'nav.red')}
    >
      {(shot) => {
        if (shot.scene === 0) {
          return (
            <div className="tour-row">
              {SUBS.map((sub) => (
                <span
                  key={sub}
                  data-tour={sub === 'examenes' ? 'tab' : undefined}
                  className={`tour-pill ${(sub === 'examenes') === shot.opened ? 'on' : ''}`}
                >
                  {t(`nav.${sub}`)}{' '}
                  {sub === 'examenes' && (
                    <span className="tour-chip tour-live">{t('nav.examenesLive')}</span>
                  )}
                </span>
              ))}
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <span className="tour-row">
                <span className="tour-chip tour-live">{t('exams.live')}</span>
                <strong>Exam Rank 03</strong>
              </span>
              <span className="tour-row">
                <span className="tour-timer">{t('exams.endsIn', { time: '1:12:09' })}</span>
                <span key={shot.refresh} className="tour-timer tour-in">
                  {t('exams.nextRefresh', { time: clock(shot.refresh) })}
                </span>
              </span>
              <span className="tour-row">
                {(['all', 'classic', 'next'] as const).map((track) => (
                  <span
                    key={track}
                    data-tour={track === 'next' ? 'trackNext' : undefined}
                    className={`tour-pill ${track === (shot.next ? 'next' : 'all') ? 'on' : ''}`}
                  >
                    {t(`exams.track.${track}`)}
                  </span>
                ))}
              </span>
              {PEOPLE.filter((person) => !shot.next || person.track === 'next').map((person) => {
                const now = shot.marked ? person.after : person.before

                return (
                  <span key={person.login} className="tour-item">
                    <span className="tour-avatar" style={{ ['--hue' as string]: person.hue }}>
                      {person.login.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{person.login}</strong>
                      <span className="tour-muted">
                        {person.exam} · {t('graph.circle', { n: person.circle })}
                      </span>
                    </span>
                    <span key={now.status} className="tour-chip tour-end tour-in">
                      {t(`exams.status.${now.status}`)}
                    </span>
                    <strong key={String(shot.marked)} className="tour-in">
                      {now.status !== 'inProgress'
                        ? now.mark
                        : now.mark === null
                          ? t('exams.markLater')
                          : t('exams.bestMark', { n: now.mark })}
                    </strong>
                  </span>
                )
              })}
            </div>
          )
        }

        return (
          <div className="tour-card tour-in">
            <strong>Exam Rank 03</strong>
            <span className="tour-muted">{t('exams.toPass')}</span>
            <ul className="exam-bars">
              {BARS.map((count, index) => (
                <li key={index}>
                  <span>{index === 4 ? '5+' : index + 1}</span>
                  <i style={{ width: `${(count / 30) * 100}%` }} />
                  <small>{count}</small>
                </li>
              ))}
            </ul>
          </div>
        )
      }}
    </Tour>
  )
}
