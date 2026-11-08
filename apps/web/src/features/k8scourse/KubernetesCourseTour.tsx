import { unitIn, UNITS } from '@sanatorio/k8ssim'

import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'

/** Lo que cambia en el decorado a lo largo del guion. */
type KubernetesCourse = {
  /** La primera unidad, elegida. */
  picked: boolean
  /** Letras escritas de la orden. */
  typed: number
  /** La orden, ejecutada: el Deployment está listo y el objetivo se marca. */
  ran: boolean
  /** Segundos que le quedan al jefe. */
  left: number
}

const START: KubernetesCourse = { picked: false, typed: 0, ran: false, left: 300 }

const COMMAND = 'kubectl create deployment web --image=nginx:1.27 --replicas=2'

/**
 * El guion: eliges la unidad (la sugerencia de hacer antes el de Docker no
 * bloquea), teoría y ejemplo, la orden en la terminal y, al final, el jefe.
 */
export const TOUR = defineTour<KubernetesCourse>(
  'kubernetesCourse',
  START,
  [
    ...click<KubernetesCourse>(1200, 'unit', { picked: true }),
    ...cut<KubernetesCourse>(3200, { scene: 1, caption: 2, cursor: 'rest' }),
    ...cut<KubernetesCourse>(6400, { scene: 2, caption: 3 }),
    ...typing<KubernetesCourse>(7200, 'typed', COMMAND.length),
    [11_000, { ran: true }],
    ...cut<KubernetesCourse>(13_400, { scene: 3, caption: 4 }),
    [14_400, { left: 299 }],
    [15_400, { left: 298 }],
    [16_400, { left: 297 }],
  ],
  // De qué sitio de la página habla cada paso.
  {
    1: '.k8s-course .shell-stop.unit',
    4: '.k8s-course .shell-stop.boss, .k8s-course .shell-stop.final',
  },
)

/** Cómo se juega el curso de Kubernetes: unidad, teoría y ejemplo, la terminal y los jefes. */
export function KubernetesCourseTour() {
  const { t, lang } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.cursok8s')}>
      {(shot) => {
        if (shot.scene === 0)
          return (
            <div className="tour-card">
              <span className="tour-notice">
                {t('course.order.hint', { before: t('k8s.order.before') })}
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
              <span className="tour-code">kind: Deployment</span>
              <span className="tour-code">
                spec: {'{'}replicas: 2{'}'}
              </span>
            </div>
          )
        if (shot.scene === 2)
          return (
            <div className="tour-card">
              <span className="tour-code">$ {COMMAND.slice(0, shot.typed)}</span>
              {shot.ran && <span className="tour-code tour-in">deployment.apps/web created</span>}
              <span className={`tour-item ${shot.ran ? 'on' : ''}`}>
                {shot.ran ? '✓' : '○'} {t('k8s.obj.ready', { what: 'tienda deploy/web' })}
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
