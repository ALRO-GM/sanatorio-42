import { canPlace, moodOf, spaceOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { officeOf } from './layout'
import type { Office } from './layout'
import { lifeOf } from './life'
import { lengthOf, moveSize, paintMove } from './move'
import type { Move } from './move'
import { paintOffice, sceneSize, tileAt, toCanvas } from './paint'
import { drawTower, towerOf, towerSize } from './tower'
import type { Tower } from './tower'
import { useAnimated, useFrame } from './useFrame'

/** Lo más que se agranda cada píxel: más, y la escena se come la pestaña. */
const MAX_SCALE = 4

/** De noche (de las 21 a las 7, en tu reloj), la oficina con la luz baja y más ventanas encendidas. */
const isNight = (): boolean => {
  const hour = new Date().getHours()

  return hour >= 21 || hour < 7
}

/** Colocar a mano: qué pieza está elegida y qué hacer al elegir o soltar. */
export type Editing = {
  selected: number | null
  onSelect: (index: number | null) => void
  onDrop: (index: number, gx: number, gy: number) => void
}

/**
 * La oficina de la startup en pixel art isométrico: crece con lo comprado, la
 * gente va y viene (`pixel/life.ts`), lo ganado se va colocando alrededor
 * (`pixel/layout.ts`) y, al cambiar de sitio, hay mudanza (`pixel/move.ts`).
 * Sin texto, salvo el nombre que le haya puesto cada cual y un «+N» si no
 * cabe toda la plantilla. Con `editing`, se toca una pieza para elegirla y se
 * arrastra (o se toca otra baldosa) para moverla.
 *
 * @param me El aspecto de quien la fundó: sale de su login.
 */
export function PixelScene({
  state,
  me,
  compact = false,
  editing,
}: {
  state: StartupState
  me: number
  compact?: boolean
  editing?: Editing | undefined
}) {
  const office = useMemo(() => officeOf(state, me), [state, me])
  const plans = useMemo(() => lifeOf(office, moodOf(state)), [office, state])
  const tower = useMemo(() => towerOf(state), [state])
  const frame = useFrame()
  const animated = useAnimated()
  const move = useMove(state, office, tower, frame, animated)
  const { width, height } = move === null ? sceneSize(office.size) : moveSize(move)
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(2)
  const [ghost, setGhost] = useState<{ gx: number; gy: number; ok: boolean } | null>(null)
  const dragging = useRef(false)

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

    if (context === null || context === undefined) return

    if (move !== null) paintMove(context, move, frame, plans)
    else
      paintOffice(context, office, frame, {
        plans,
        night: isNight(),
        selected: editing?.selected,
        ghost,
      })
  }, [office, plans, frame, move, editing?.selected, ghost])

  /** La baldosa bajo el puntero, en la oficina. */
  const tileOf = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] | null => {
    const rect = event.currentTarget.getBoundingClientRect()

    return tileAt(
      office.size,
      (event.clientX - rect.left) / scale,
      (event.clientY - rect.top) / scale,
    )
  }
  const pieceAt = (tile: [number, number] | null): number | undefined =>
    tile === null
      ? undefined
      : office.pieces.find(
          (piece) => piece.decor !== undefined && piece.gx === tile[0] && piece.gy === tile[1],
        )?.decor

  const pointer =
    editing === undefined || move !== null
      ? {}
      : {
          onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => {
            const tile = tileOf(event)
            const found = pieceAt(tile)

            if (found !== undefined) {
              editing.onSelect(found)
              dragging.current = true
              event.currentTarget.setPointerCapture(event.pointerId)
            } else if (tile !== null && editing.selected !== null) {
              // Con una pieza elegida, tocar otra baldosa la lleva allí.
              if (canPlace(state, editing.selected, tile[0], tile[1])) {
                editing.onDrop(editing.selected, tile[0], tile[1])
              }
            } else {
              editing.onSelect(null)
            }
          },
          onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => {
            if (!dragging.current || editing.selected === null) return

            const tile = tileOf(event)

            setGhost(
              tile === null
                ? null
                : {
                    gx: tile[0],
                    gy: tile[1],
                    ok: canPlace(state, editing.selected, tile[0], tile[1]),
                  },
            )
          },
          onPointerUp: () => {
            dragging.current = false

            if (ghost !== null && ghost.ok && editing.selected !== null) {
              editing.onDrop(editing.selected, ghost.gx, ghost.gy)
            }

            setGhost(null)
          },
        }

  return (
    <div className={`su-world ${compact ? 'compact' : ''}`.trim()}>
      <div
        ref={box}
        className={`su-office ${compact ? 'compact' : ''} ${editing === undefined ? '' : 'editing'}`.trim()}
        aria-hidden="true"
      >
        <canvas
          ref={canvas}
          width={width}
          height={height}
          style={{ width: `${String(width * scale)}px`, height: `${String(height * scale)}px` }}
          {...pointer}
        />
        {state.name !== null && <span className="su-office-name">{state.name}</span>}
        {office.hidden > 0 && <span className="su-office-more">+{office.hidden}</span>}
      </div>
      {!compact && tower !== null && move === null && <TowerView tower={tower} frame={frame} />}
    </div>
  )
}

/**
 * La mudanza o el epílogo en curso, si toca. Empieza al ver que el espacio
 * crece (mudanza) o que se ha vuelto a empezar (epílogo), y acaba sola; sin
 * movimiento no empieza.
 */
function useMove(
  state: StartupState,
  office: Office,
  tower: Tower | null,
  frame: number,
  animated: boolean,
): Move | null {
  const [move, setMove] = useState<Move | null>(null)
  const [last, setLast] = useState({ state, office, tower })

  // Lo de antes se guarda en el estado y se compara al cambiar (como pide React).
  if (last.state !== state) {
    const epilogue = state.legacy > last.state.legacy
    const bigger = spaceOf(state) > spaceOf(last.state)

    setLast({ state, office, tower })

    if (animated && (epilogue || bigger)) {
      setMove({
        kind: epilogue ? 'epilogue' : 'move',
        from: last.office,
        to: office,
        tower: last.tower,
        start: frame,
      })
    }
  }

  if (move !== null && (frame - move.start >= lengthOf(move) || !animated)) {
    setMove(null)
  }

  return move
}

const towers = new Map<string, HTMLCanvasElement>()

/** El edificio visto de fuera, al lado de la planta: sus luces y servidores parpadean. */
function TowerView({ tower, frame }: { tower: Tower; frame: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const night = isNight()
  const key = `${JSON.stringify(tower)}|${String(frame % 24)}|${String(night)}`

  useEffect(() => {
    const context = canvas.current?.getContext('2d')

    if (context === null || context === undefined) return

    let drawn = towers.get(key)

    if (drawn === undefined) {
      if (towers.size > 60) towers.clear()
      drawn = toCanvas(drawTower(tower, frame, night))
      towers.set(key, drawn)
    }

    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, drawn.width, drawn.height)
    context.drawImage(drawn, 0, 0)
  }, [key, tower, frame, night])

  const size = towerSize(tower)

  return (
    <canvas
      ref={canvas}
      className="su-tower"
      width={size.width}
      height={size.height}
      style={{ width: `${String(size.width * 2)}px`, height: `${String(size.height * 2)}px` }}
      aria-hidden="true"
    />
  )
}
