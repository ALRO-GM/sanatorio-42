import { unitIn, UNITS } from '@sanatorio/netsim'

import { clock } from '../../shared/course/Stars'
import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'
import type { Shot } from '../../shared/tour/Tour'

/** Lo que cambia en el decorado a lo largo del guion. */
type NetTour = {
  /** La primera unidad, elegida. */
  chosen: boolean
  /** Un bit de la parte de máquina, tocado. */
  bit: boolean
  /** Cifras escritas de la dirección que falta. */
  typed: number
  /** Comprobado: el paquete llega y el objetivo se marca. */
  sent: boolean
  /** Segundos que le quedan al jefe. */
  left: number
}

const START: NetTour = { chosen: false, bit: false, typed: 0, sent: false, left: 300 }

const ADDRESS = '10.0.5.2'

/** Las tres pestañas de una unidad; en la demostración se está en la primera. */
const STEPS = ['theory', 'example', 'test'] as const

/** El guion: eliges la unidad, tocas los bits, rellenas el esquema y lo compruebas y, al final, el jefe. */
export const TOUR = defineTour<NetTour>(
  'netCourse',
  START,
  [
    ...click<NetTour>(1200, 'unit', { chosen: true }),
    ...cut<NetTour>(3200, { scene: 1, caption: 2, cursor: 'rest' }),
    ...click<NetTour>(4600, 'bit', { bit: true }),
    ...cut<NetTour>(7000, { scene: 2, caption: 3, cursor: 'rest' }),
    ...typing<NetTour>(8000, 'typed', ADDRESS.length, 110),
    ...click<NetTour>(9400, 'check', { sent: true }),
    ...cut<NetTour>(12_600, { scene: 3, caption: 4, cursor: 'rest' }),
    [13_600, { left: 299 }],
    [14_600, { left: 298 }],
    [15_600, { left: 297 }],
  ],
  // De qué sitio de la página habla cada paso.
  { 1: '.net-course .net-stop.unit', 4: '.net-course .net-stop.boss, .net-course .net-stop.final' },
)

type SceneProps = { shot: Shot<NetTour> }

/** Escena 1: el camino, con las primeras unidades. */
function PathScene({ shot }: SceneProps) {
  const { t, lang } = useI18n()
  const [first, ...rest] = UNITS.slice(0, 3)

  return (
    <div className="tour-card">
      <strong>{t('shell.tier.beginner')}</strong>
      {first !== undefined && (
        <span data-tour="unit" className={shot.chosen ? 'tour-item on' : 'tour-item'}>
          <span className="tour-chip">1</span>
          {unitIn(first, lang).title}
        </span>
      )}
      {rest.map((unit, index) => (
        <span key={unit.id} className="tour-item">
          <span className="tour-chip">{index + 2}</span>
          {unitIn(unit, lang).title}
        </span>
      ))}
    </div>
  )
}

/** Escena 2: la teoría y los bits que se tocan (la parte de máquina, a cero). */
function BitsScene({ shot }: SceneProps) {
  const { t } = useI18n()

  return (
    <div className="tour-card">
      <div className="tour-row">
        {STEPS.map((step, index) => (
          <span key={step} className={index === 0 ? 'tour-pill on' : 'tour-pill'}>
            {index + 1}. {t(`shell.step.${step}`)}
          </span>
        ))}
      </div>
      <span className="tour-code">192.168.1.42 /24</span>
      <div className="tour-row">
        <span className="tour-chip">{t('net.bits.net')}</span>
        <span className="tour-code">11000000.10101000.00000001</span>
        <span data-tour="bit" className={`tour-pill ${shot.bit ? 'on' : ''}`}>
          {shot.bit ? '00000000' : '00101010'}
        </span>
      </div>
      <span className="tour-notice">
        {t('net.bits.now', { ip: shot.bit ? '192.168.1.0' : '192.168.1.42' })}
      </span>
    </div>
  )
}

/** Escena 3: el esquema; se escribe la dirección que falta y se comprueba. */
function SchemeScene({ shot }: SceneProps) {
  const { t } = useI18n()

  return (
    <div className="tour-card">
      <div className="tour-row">
        <span className="tour-pill on">api · 10.0.5.1/24</span>
        <span className="tour-code">{shot.sent ? '──●──▶' : '──────'}</span>
        <span className="tour-pill">cache · {ADDRESS.slice(0, shot.typed) || '?'}/24</span>
      </div>
      <span data-tour="check" className={`tour-pill ${shot.sent ? '' : 'on'}`}>
        {t('net.check')}
      </span>
      <span className={`tour-item ${shot.sent ? 'on tour-in' : ''}`}>
        {shot.sent ? '✓' : '○'} {t('net.goal', { from: 'api', to: 'cache' })}
      </span>
    </div>
  )
}

/** Escena 4: el jefe del bloque, con su reloj. */
function BossScene({ shot }: SceneProps) {
  const { t } = useI18n()

  return (
    <div className="tour-card">
      <strong>{t('shell.kind.boss')}</strong>
      <span className="tour-notice tour-timer">
        {t('shell.boss.left', { time: clock(shot.left) })}
      </span>
    </div>
  )
}

const SCENES = [PathScene, BitsScene, SchemeScene, BossScene]

/** Cómo se juega el curso de NetPractice: la unidad, los bits, el esquema que se comprueba y los jefes. */
export function NetCourseTour() {
  const { t } = useI18n()

  return (
    <Tour tour={TOUR} tab={() => t('nav.cat.aprender')} sub={() => t('nav.cursonet')}>
      {(shot) => {
        const Scene = SCENES[shot.scene] ?? BossScene

        return <Scene shot={shot} />
      }}
    </Tour>
  )
}
