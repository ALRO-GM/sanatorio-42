import { emptyRepo, levelIn, LEVELS, runAll } from '@sanatorio/gitsim'
import type { World } from '@sanatorio/gitsim'

import { useI18n } from '../../shared/i18n'
import { click, cut, defineTour, Tour, typing } from '../../shared/tour/Tour'
import { WorldGraphs } from './GitGraph'

type GitCourse = {
  /** El primer punto del camino, elegido. */
  picked: boolean
  /** La animación ya ha dado su paso. */
  grown: boolean
  /** Letras escritas del comando. */
  typed: number
  /** El comando, ejecutado: el repositorio cambia y salen las estrellas. */
  ran: boolean
  /** Misiones de la prueba de grupo marcadas. */
  missions: number
}

const START: GitCourse = { picked: false, grown: false, typed: 0, ran: false, missions: 0 }

const COMMAND = 'git commit -m dos'

export const TOUR = defineTour<GitCourse>('gitCourse', START, [
  ...click<GitCourse>(900, 'level', { picked: true }),
  ...cut<GitCourse>(2600, { scene: 1, caption: 2, cursor: 'rest' }),
  [4000, { grown: true }],
  ...cut<GitCourse>(6200, { scene: 2, caption: 3 }),
  ...typing<GitCourse>(7000, 'typed', COMMAND.length),
  [8300, { ran: true }],
  [9600, { caption: 4 }],
  ...cut<GitCourse>(12000, { scene: 3, caption: 5 }),
  [13600, { missions: 1 }],
  [15000, { missions: 2 }],
  [16200, { missions: 3 }],
])

/** Los dos momentos del repositorio de mentira: antes y después del comando. */
const step = (lines: string[]): World => {
  const result = runAll({ repo: emptyRepo(), remote: null }, [
    'git commit -m uno',
    'git switch -c ana',
    ...lines,
  ])

  return { repo: result.repo, remote: null }
}
const BEFORE = step([])
const AFTER = step([COMMAND])

/**
 * Cómo se juega el curso de git: eliges un punto del camino, ves la animación
 * y la teoría, lo resuelves en la terminal y, en las pruebas de grupo, cada
 * cual cumple todas las misiones.
 */
export function GitCourseTour() {
  const { t, lang } = useI18n()

  return (
    <Tour
      tour={TOUR}
      tab={() => t('nav.cat.ayuda')}
      // El curso va en su pestaña dentro de Not-games: «Ayuda › Not-games › Curso de git».
      sub={() => `${t('nav.notgames')} › ${t('notgames.tab.git')}`}
    >
      {(shot) => {
        if (shot.scene === 0) {
          return (
            <div className="tour-card">
              {LEVELS.slice(0, 3).map((level, index) => (
                <span
                  key={level.id}
                  data-tour={index === 0 ? 'level' : undefined}
                  className={`tour-item ${index === 0 && shot.picked ? 'on' : ''}`}
                >
                  <span className="tour-chip">{index === 0 ? '●' : '○'}</span>
                  {levelIn(level, lang).title}
                </span>
              ))}
            </div>
          )
        }

        if (shot.scene === 1) {
          return (
            <div className="tour-card">
              <div className="tour-row">
                <span className="tour-pill on">1. {t('git.step.animation')}</span>
                <span className="tour-pill">2. {t('git.step.theory')}</span>
                <span className="tour-pill">3. {t('git.step.challenge')}</span>
              </div>
              <WorldGraphs world={shot.grown ? AFTER : BEFORE} small />
            </div>
          )
        }

        if (shot.scene === 2) {
          return (
            <div className="tour-split">
              <div className="tour-card">
                <span className="tour-code">$ {COMMAND.slice(0, shot.typed)}</span>
                {shot.ran && <span className="tour-notice tour-in">★★★ {t('git.won')}</span>}
              </div>
              <WorldGraphs world={shot.ran ? AFTER : BEFORE} small />
            </div>
          )
        }

        return (
          <div className="tour-card">
            <strong>{t('git.room.missions')}</strong>
            {['ana', 'mgarcia', 'lperez'].map((login, index) => (
              <span key={login} className={`tour-item ${shot.missions > index ? 'on' : ''}`}>
                {shot.missions > index ? '✓' : '○'} origin/{login}
              </span>
            ))}
          </div>
        )
      }}
    </Tour>
  )
}
