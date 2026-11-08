import { useEffect, useState } from 'react'

import { useI18n } from '../i18n'
import { expectedTotals } from '../loadMemory'
import { ErrorNote } from './ErrorNote'
import { LoadingActivity, progressAt } from './LoadingActivity'

/** Las fases genéricas de algo que se calcula en el servidor: claves de texto. */
const HEAVY_STEPS = [
  'app.heavy.ask',
  'app.heavy.analyse',
  'app.heavy.draw',
  'app.heavy.slow',
] as const

/** Cada cuánto se mueve la barra. */
const TICK_MS = 150

/**
 * Lo que se ve mientras se recarga algo que ya estaba en pantalla (otra
 * escuela, otra piscina, otros filtros): una franja con la fase en la que va y
 * una barra que avanza, encima de lo de antes. Se pinta solo mientras recarga. Pedido por Alberto el
 * 2026-11-08: que nada que tarde parezca bloqueado.
 */
export function Refreshing({
  steps = HEAVY_STEPS,
  expectedMs = 6_000,
  delayMs = 0,
}: {
  steps?: readonly string[]
  expectedMs?: number
  /** No sale hasta pasado este rato: lo que llega enseguida no hace parpadear nada. */
  delayMs?: number
}) {
  const { t } = useI18n()
  const [started] = useState(Date.now)
  const [elapsed, setElapsed] = useState(0)

  // Se monta al empezar la recarga y se desmonta al acabar: cuenta desde que aparece.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - started)
    }, TICK_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [started])

  if (elapsed < delayMs) return null

  const progress = progressAt(elapsed - delayMs, expectedMs)
  const step = steps[Math.min(steps.length - 1, Math.floor((progress / 0.97) * steps.length))]

  return (
    <div className="refreshing" role="status">
      <span className="refreshing-text">{step === undefined ? t('app.loading') : t(step)}</span>
      <span className="activity-bar" aria-hidden="true">
        <span style={{ width: `${String(Math.round(progress * 100))}%` }} />
      </span>
    </div>
  )
}

/**
 * La primera carga de algo pesado: la animación de actividad con las fases
 * genéricas (y lo que tardó la última vez, si se apuntó con `timedLoad(id, …)`)
 * o, si falló, el error con «Volver a probar».
 */
export function HeavyLoad({ id, error }: { id: string; error: unknown }) {
  if (error !== null && error !== undefined) return <ErrorNote error={error} retry />

  const { ms } = expectedTotals(id, {})

  return <LoadingActivity steps={HEAVY_STEPS} {...(ms === undefined ? {} : { expectedMs: ms })} />
}

/**
 * Lo que se pinta encima de unos datos que ya se ven: la franja si se está
 * recargando y el error si la recarga falló (antes quedaba escondido detrás de
 * los datos viejos).
 */
export function ReloadState({ loading, error }: { loading: boolean; error: unknown }) {
  if (loading) return <Refreshing />

  return <ErrorNote error={error} retry />
}
