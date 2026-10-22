import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

type Exams = {
  /** La pestaña de Exámenes, abierta. */
  opened: boolean
  /** Las notas ya se han puesto al día. */
  marked: boolean
}

const START: Exams = { opened: false, marked: false }

export const TOUR = defineTour<Exams>('exams', START, [
  ...click<Exams>(900, 'tab', { opened: true }),
  ...cut<Exams>(2600, { scene: 1, caption: 2, cursor: 'rest' }),
  [5200, { caption: 3 }],
  [6400, { marked: true }],
  ...cut<Exams>(9000, { scene: 2, caption: 4 }),
])

/** Inventadas: quién está en el examen y su nota antes y después. */
const PEOPLE = [
  { login: 'mgarcia', hue: 200, circle: 2, exam: 'Exam Rank 03', before: null, after: 100 },
  { login: 'lperez', hue: 30, circle: 2, exam: 'Exam Rank 03', before: 25, after: 50 },
  { login: 'ahernan', hue: 280, circle: 4, exam: 'Exam Rank 04', before: null, after: 75 },
]

const BARS = [12, 30, 18, 8, 4]

/**
 * Cómo se usa Exámenes: la pestaña avisa en vivo cuando hay examen; dentro,
 * quién está, de qué examen y su nota, que se pone al día sola; y debajo, en
 * qué intento se suele aprobar.
 */
export function ExamsTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.examenes')}>
      {(shot) => {
        if (shot.scene === 0) {
          return (
            <div className="tour-row">
              <span data-tour="tab" className={`tour-pill ${shot.opened ? 'on' : ''}`}>
                {t('nav.examenes')} <span className="tour-chip">{t('nav.examenesLive')}</span>
              </span>
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <span className="tour-chip">● {t('exams.live')}</span>
              {PEOPLE.map((person) => {
                const mark = shot.marked ? person.after : person.before

                return (
                  <span key={person.login} className="tour-item">
                    <span className="tour-avatar" style={{ ['--hue' as string]: person.hue }}>
                      {person.login.charAt(0).toUpperCase()}
                    </span>
                    <strong>{person.login}</strong>
                    <span className="tour-muted">
                      {person.exam} · {t('graph.circle', { n: person.circle })}
                    </span>
                    <strong className={`tour-end ${shot.marked ? 'tour-in' : ''}`}>
                      {mark ?? '—'}
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
