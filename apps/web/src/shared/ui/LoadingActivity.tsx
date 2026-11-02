import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import { Avatar } from './Avatar'

/** Una cifra que sube mientras carga: la clave de su texto (con `.one`/`.many` y `{n}`) y adónde llega. */
type ActivityStat = { key: string; target: number }

type LoadingActivityProps = {
  /** Las fases, en orden: claves de texto. Se pasa de una a otra según avanza. */
  steps: readonly string[]
  /** Las cifras que suben. */
  stats?: readonly ActivityStat[]
  /** Quien mira: su burbuja va en el centro, como el primer nodo del grafo. */
  who?: { login: string; image: string | null }
  /** Lo que se espera que tarde, en ms (lo que tardó la última vez). */
  expectedMs?: number
}

/** Cada cuánto se mueven las cifras. */
const TICK_MS = 120

/**
 * Lo que va de la carga, de 0 a 1: deprisa al principio y cada vez más
 * despacio, sin llegar nunca al final. Si tarda más de lo esperado, sigue
 * moviéndose en vez de quedarse parado en el 100 %.
 */
export function progressAt(elapsed: number, expected: number): number {
  return 0.97 * (1 - Math.exp((-2.2 * elapsed) / Math.max(500, expected)))
}

/**
 * El aviso de una carga larga: en vez de un «Cargando…» quieto, tu burbuja
 * latiendo, la fase en la que va y unas cifras que suben hacia las de la
 * última vez (`shared/loadMemory.ts`). Pedido por Alberto (2026-11-02): que se
 * vea que algo está pasando y no parezca que la web se ha quedado colgada.
 */
export function LoadingActivity({
  steps,
  stats = [],
  who,
  expectedMs = 5_000,
}: LoadingActivityProps) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const started = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - started.current)
    }, TICK_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const progress = progressAt(elapsed, expectedMs)
  const step = steps[Math.min(steps.length - 1, Math.floor((progress / 0.97) * steps.length))]

  return (
    <div className="activity">
      {who !== undefined && (
        <div className="activity-me" aria-hidden="true">
          <span className="activity-ring" />
          <Avatar login={who.login} image={who.image} size={56} />
        </div>
      )}
      <p className="activity-step" role="status">
        {step === undefined ? t('app.loading') : t(step)}
      </p>
      {stats.length > 0 && (
        // Cambian cada décima de segundo: un lector de pantalla no las lee una a una.
        <ul className="activity-stats" aria-hidden="true">
          {stats.map((stat, index) => {
            // Cada cifra empieza un poco después de la anterior, como si fueran pasos.
            const own = Math.max(0, Math.min(1, (progress - index * 0.12) / (0.97 - index * 0.12)))

            const value = Math.round(stat.target * own)

            return <li key={stat.key}>{tn(stat.key, value, { n: number(value) })}</li>
          })}
        </ul>
      )}
      <div className="activity-bar" aria-hidden="true">
        <span style={{ width: `${String(Math.round(progress * 100))}%` }} />
      </div>
    </div>
  )
}
