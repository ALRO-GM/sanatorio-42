import { unitIn, UNITS } from '@sanatorio/shellsim'

import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'

type ShellTour = {
  /** La primera unidad, elegida. */
  picked: boolean
  /** Letras escritas de la orden. */
  typed: number
  /** La orden, ejecutada: sale su salida y el objetivo se marca. */
  ran: boolean
  /** Segundos que le quedan al jefe. */
  left: number
}

const START: ShellTour = { picked: false, typed: 0, ran: false, left: 180 }

const COMMAND = 'grep -c ERROR app.log'

export const TOUR = defineTour<ShellTour>(
  'shellCourse',
  START,
  [
    ...click<ShellTour>(900, 'unit', { picked: true }),
    ...cut<ShellTour>(2800, { scene: 1, caption: 2, cursor: 'rest' }),
    ...cut<ShellTour>(6000, { scene: 2, caption: 3 }),
    ...typing<ShellTour>(6800, 'typed', COMMAND.length),
    [8400, { ran: true }],
    ...cut<ShellTour>(11000, { scene: 3, caption: 4 }),
    [12000, { left: 179 }],
    [13000, { left: 178 }],
    [14000, { left: 177 }],
    [15000, { left: 176 }],
  ],
  // De qué sitio de la página habla cada paso: soltando ahí el interrogante,
  // la demostración empieza en él.
  {
    1: '.shell-stop.unit',
    4: '.shell-stop.boss, .shell-stop.final',
  },
)

/**
 * Cómo se juega el curso de shell: eliges la siguiente unidad, lees la
 * teoría y el ejemplo, lo haces en la terminal y, al final de cada bloque,
 * te espera un jefe contrarreloj.
 */
export function ShellCourseTour() {
  const { t, lang } = useI18n()

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.aprender')}
      // El curso va en su pestaña dentro de Not-games: «Ayuda › Not-games › Curso de shell».
      sub={() => t('nav.cursoshell')}
    >
      {(shot) => {
        if (shot.scene === 0)
          return (
            <div className="tour-card">
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
              <span className="tour-code">$ ls -l /var/log</span>
            </div>
          )
        if (shot.scene === 2)
          return (
            <div className="tour-card">
              <span className="tour-code">$ {COMMAND.slice(0, shot.typed)}</span>
              {shot.ran && <span className="tour-code tour-in">11</span>}
              <span className={`tour-item ${shot.ran ? 'on' : ''}`}>
                {shot.ran ? '✓' : '○'} {t('shell.obj.output')}
              </span>
            </div>
          )

        return (
          <div className="tour-card">
            <strong>{t('shell.kind.boss')}</strong>
            <span className="tour-notice">
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
