import { unitIn, UNITS } from '@sanatorio/dockersim'

import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'

/** Lo que cambia en el decorado a lo largo del guion. */
type DockerTour = {
  /** La primera unidad, elegida. */
  picked: boolean
  /** Letras escritas de la orden. */
  typed: number
  /** La orden, ejecutada: el contenedor corre y el objetivo se marca. */
  ran: boolean
  /** Segundos que le quedan al jefe. */
  left: number
}

const START: DockerTour = { picked: false, typed: 0, ran: false, left: 240 }

const COMMAND = 'docker run -d -p 8080:80 nginx:1.27'

/**
 * El guion: eliges la unidad (la sugerencia de hacer antes el de shell no
 * bloquea), teoría y ejemplo, la orden en la terminal y, al final, el jefe.
 */
export const TOUR = defineTour<DockerTour>(
  'dockerCourse',
  START,
  [
    ...click<DockerTour>(1200, 'unit', { picked: true }),
    ...cut<DockerTour>(3200, { scene: 1, caption: 2, cursor: 'rest' }),
    ...cut<DockerTour>(6400, { scene: 2, caption: 3 }),
    ...typing<DockerTour>(7200, 'typed', COMMAND.length),
    [9800, { ran: true }],
    ...cut<DockerTour>(12_400, { scene: 3, caption: 4 }),
    [13_400, { left: 239 }],
    [14_400, { left: 238 }],
    [15_400, { left: 237 }],
  ],
  // De qué sitio de la página habla cada paso.
  {
    1: '.docker-course .shell-stop.unit',
    4: '.docker-course .shell-stop.boss, .docker-course .shell-stop.final',
  },
)

/** Cómo se juega el curso de Docker: unidad, teoría y ejemplo, la terminal y los jefes. */
export function DockerCourseTour() {
  const { t, lang } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.cursodocker')}>
      {(shot) => {
        if (shot.scene === 0)
          return (
            <div className="tour-card">
              <span className="tour-notice">
                {t('course.order.hint', { before: t('docker.order.before') })}
              </span>
              {UNITS.slice(0, 3).map((unit, index) => (
                <span
                  key={unit.id}
                  data-tour={index === 0 ? 'unit' : undefined}
                  className={`tour-item ${index === 0 && shot.picked ? 'on' : ''}`}
                >
                  <span className="tour-chip">{index + 1}</span>
                  {unitIn(unit, lang).title}
                </span>
              ))}
            </div>
          )
        if (shot.scene === 1)
          return (
            <div className="tour-card">
              <div className="tour-row">
                <span className="tour-pill on">1. {t('shell.step.theory')}</span>
                <span className="tour-pill">2. {t('shell.step.example')}</span>
                <span className="tour-pill">3. {t('shell.step.test')}</span>
              </div>
              <span className="tour-code">FROM nginx:1.27-alpine</span>
              <span className="tour-code">COPY index.html /usr/share/nginx/html/</span>
            </div>
          )
        if (shot.scene === 2)
          return (
            <div className="tour-card">
              <span className="tour-code">$ {COMMAND.slice(0, shot.typed)}</span>
              {shot.ran && <span className="tour-code tour-in">5b23c044f3b7…</span>}
              <span className={`tour-item ${shot.ran ? 'on' : ''}`}>
                {shot.ran ? '✓' : '○'} {t('docker.obj.container', { what: 'web' })}
              </span>
            </div>
          )

        return (
          <div className="tour-card">
            <strong>{t('shell.kind.boss')}</strong>
            <span className="tour-notice tour-timer">
              {t('shell.boss.left', {
                time: `${Math.floor(shot.left / 60)}:${String(shot.left % 60).padStart(2, '0')}`,
              })}
            </span>
          </div>
        )
      }}
    </Tour>
  )
}
