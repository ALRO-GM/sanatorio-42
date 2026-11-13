import { unitIn, UNITS } from '@sanatorio/ragsim'

import { clock } from '../../shared/course/Stars'
import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour } from '../../shared/tour/Tour'

/** Lo que cambia en el decorado a lo largo del guion. */
type RagTour = {
  /** La primera unidad, elegida. */
  picked: boolean
  /** Etapas de la tubería que ya se han encendido en el ejemplo. */
  lit: number
  /** El tamaño del trozo en el mando del banco de pruebas. */
  size: number
  /** Comprobado: el objetivo se marca. */
  checked: boolean
  /** Segundos que le quedan al jefe. */
  left: number
}

const START: RagTour = { picked: false, lit: 0, size: 10, checked: false, left: 240 }

const STAGES = ['chunks', 'lexical', 'prompt', 'answer'] as const

/**
 * El guion: eliges la unidad, teoría y ejemplo con la tubería encendiéndose,
 * el banco de pruebas (mover el mando es gratis; comprobar cuenta) y el jefe.
 */
export const TOUR = defineTour<RagTour>(
  'ragCourse',
  START,
  [
    ...click<RagTour>(1200, 'unit', { picked: true }),
    ...cut<RagTour>(3200, { scene: 1, caption: 2, cursor: 'rest' }),
    [4400, { lit: 1 }],
    [5000, { lit: 2 }],
    [5600, { lit: 3 }],
    [6200, { lit: 4 }],
    ...cut<RagTour>(7600, { scene: 2, caption: 3 }),
    [8600, { cursor: 'size' }],
    [9300, { size: 30 }],
    [9900, { size: 50 }],
    ...click<RagTour>(11_000, 'check', { checked: true }),
    ...cut<RagTour>(13_600, { scene: 3, caption: 4, cursor: 'rest' }),
    [14_600, { left: 239 }],
    [15_600, { left: 238 }],
    [16_600, { left: 237 }],
  ],
  // De qué sitio de la página habla cada paso.
  {
    1: '.rag-course .shell-stop.unit',
    3: '.rag-bench',
    4: '.rag-course .shell-stop.boss, .rag-course .shell-stop.final',
  },
)

/** Cómo se juega el curso de RAG: unidad, teoría y ejemplo, el banco de pruebas y los jefes. */
export function RagCourseTour() {
  const { t, lang } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.cursorag')}>
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
                <span className="tour-pill">1. {t('shell.step.theory')}</span>
                <span className="tour-pill on">2. {t('shell.step.example')}</span>
                <span className="tour-pill">3. {t('shell.step.test')}</span>
              </div>
              <div className="tour-row">
                {STAGES.map((stage, index) => (
                  <span key={stage} className={`tour-pill ${index < shot.lit ? 'on' : ''}`}>
                    {t(`rag.focus.${stage}`)}
                  </span>
                ))}
              </div>
            </div>
          )
        if (shot.scene === 2)
          return (
            <div className="tour-card">
              <span className="tour-row">
                {t('rag.knob.size')}: <strong>{shot.size}</strong>
              </span>
              <span className="tour-row">
                <span className="tour-range" data-tour="size">
                  <i style={{ left: `${shot.size}%` }} />
                </span>
              </span>
              <span className={`tour-item ${shot.checked ? 'on' : ''}`}>
                {shot.checked ? '✓' : '○'} {t('rag.metric.whole')}
              </span>
              <span className="tour-button" data-tour="check">
                {t('rag.bench.check')}
              </span>
            </div>
          )

        return (
          <div className="tour-card">
            <strong>{t('shell.kind.boss')}</strong>
            <span className="tour-notice tour-timer">
              {t('shell.boss.left', { time: clock(shot.left) })}
            </span>
          </div>
        )
      }}
    </Tour>
  )
}
