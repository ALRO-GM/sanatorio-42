import { useEffect, useState } from 'react'

import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { CELLS, loadBest, nextCell, ROUND_MS, saveBest, stayMs } from './bugsquash'

type Phase = 'idle' | 'playing' | 'over'

/**
 * «Aplasta bugs» (#104 del buzón): un minijuego para la espera mientras la web
 * no está (mantenimiento, o la API arrancando tras un despliegue). Treinta
 * segundos, un tablero de nueve casillas y un bug que salta de una a otra:
 * cada clic en él lo aplasta. Todo en el navegador, sin pedir nada a la API.
 * Las casillas son botones: se juega igual con el teclado.
 */
export function BugSquash() {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [bug, setBug] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [endsAt, setEndsAt] = useState(0)
  // Cada salto (o aplastado) cuenta: así el temporizador del bug vuelve a empezar.
  const [moves, setMoves] = useState(0)
  const now = useNow(250, { active: phase === 'playing' })
  const left = phase === 'playing' ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0

  // Se acaba el tiempo: récord y fin.
  useEffect(() => {
    if (phase !== 'playing' || now < endsAt) return
    setPhase('over')
    setBug(null)
    setBest(saveBest(score))
  }, [phase, now, endsAt, score])

  // El bug no se queda quieto: salta solo si no se aplasta a tiempo.
  useEffect(() => {
    if (phase !== 'playing') return

    const timer = window.setTimeout(() => {
      setBug((current) => nextCell(Math.random, current))
      setMoves((count) => count + 1)
    }, stayMs(score))

    return () => {
      window.clearTimeout(timer)
    }
  }, [phase, moves, score])

  const start = (): void => {
    setScore(0)
    setEndsAt(Date.now() + ROUND_MS)
    setBug(nextCell(Math.random, null))
    setMoves(0)
    setPhase('playing')
  }

  const hit = (cell: number): void => {
    if (phase !== 'playing' || cell !== bug) return
    setScore((count) => count + 1)
    setBug(nextCell(Math.random, cell))
    setMoves((count) => count + 1)
  }

  return (
    <section className="bugsquash" aria-labelledby="bugsquash-title">
      <h2 id="bugsquash-title">
        <Icon name="bicho" /> {t('bugsquash.title')}
      </h2>
      <p className="bugsquash-score" role="status">
        {phase === 'playing'
          ? t('bugsquash.playing', { n: score, s: left })
          : phase === 'over'
            ? t('bugsquash.over', { n: score })
            : t('bugsquash.hint')}
        {best > 0 && <small> · {t('bugsquash.best', { n: best })}</small>}
      </p>
      <div className="bugsquash-board" role="group" aria-label={t('bugsquash.board')}>
        {Array.from({ length: CELLS }, (_, cell) => (
          <button
            key={cell}
            type="button"
            className={`bugsquash-cell ${cell === bug ? 'bug' : ''}`}
            disabled={phase !== 'playing'}
            aria-label={cell === bug ? t('bugsquash.bug') : t('bugsquash.empty')}
            onClick={() => {
              hit(cell)
            }}
          >
            {cell === bug && <Icon name="bicho" size={28} />}
          </button>
        ))}
      </div>
      {phase !== 'playing' && (
        <button type="button" className="primary small" onClick={start}>
          {t(phase === 'over' ? 'bugsquash.again' : 'bugsquash.start')}
        </button>
      )}
    </section>
  )
}
