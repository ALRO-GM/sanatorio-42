import type { StartupState } from '@sanatorio/startup'
import { useEffect, useMemo, useRef, useState } from 'react'

import { officeOf } from './layout'
import { paintOffice, sceneSize } from './paint'
import { useFrame } from './useFrame'

/** Lo más que se agranda cada píxel: más, y la escena se come la pestaña. */
const MAX_SCALE = 4

/**
 * La oficina de la startup en pixel art isométrico: crece con lo comprado, la
 * plantilla teclea en sus mesas y lo ganado se va colocando alrededor
 * (`pixel/layout.ts`). Sin texto, salvo el nombre que le haya puesto cada cual
 * y un «+N» si no cabe toda la plantilla.
 *
 * @param me El aspecto de quien la fundó: sale de su login.
 */
export function PixelScene({
  state,
  me,
  compact = false,
}: {
  state: StartupState
  me: number
  compact?: boolean
}) {
  const office = useMemo(() => officeOf(state, me), [state, me])
  const { width, height } = sceneSize(office.size)
  const frame = useFrame()
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(2)

  // Siempre a un múltiplo entero, para que ningún píxel salga más gordo que otro.
  useEffect(() => {
    const element = box.current

    if (element === null) return undefined

    const fit = (): void => {
      const room = element.clientWidth / width

      setScale(room >= 1 ? Math.min(compact ? 2 : MAX_SCALE, Math.floor(room)) : room)
    }
    const observer = new ResizeObserver(fit)

    fit()
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [width, compact])

  useEffect(() => {
    const context = canvas.current?.getContext('2d')

    if (context !== null && context !== undefined) paintOffice(context, office, frame)
  }, [office, frame])

  return (
    <div ref={box} className={`su-office ${compact ? 'compact' : ''}`.trim()} aria-hidden="true">
      <canvas
        ref={canvas}
        width={width}
        height={height}
        style={{ width: `${String(width * scale)}px`, height: `${String(height * scale)}px` }}
      />
      {state.name !== null && <span className="su-office-name">{state.name}</span>}
      {office.hidden > 0 && <span className="su-office-more">+{office.hidden}</span>}
    </div>
  )
}
