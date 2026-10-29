/**
 * El gesto de las burbujas de la cabecera (`docs/sugerencias.md`): se coge una
 * burbuja, se lleva hasta un sitio de la web y, al soltarla, se hace algo con
 * ese sitio. Lo comparten la del bicho (contar un fallo o una mejora) y la del
 * interrogante (ver cómo se usa).
 *
 * Con el dedo o el lápiz se arrastra y se suelta; un toque sin arrastrar es un
 * `onTap`. Con el ratón, arrastrar es raro: un clic la engancha al puntero y el
 * siguiente la deja donde esté. Con el teclado, Intro o Espacio son un `onTap`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

import { detect } from './detect'
import type { Spot } from './detect'

/** Lo que hay que mover el puntero para que una pulsación sea un arrastre. */
const DRAG_PX = 6

/** Lo que tarda en volver a la cabecera (como la transición de `suggest.css`). */
const RETURN_MS = 380

export type Point = { x: number; y: number }

/** `true` si quien mira prefiere menos movimiento. */
function stillPreferred(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** El elemento bajo un punto (jsdom no tiene `elementFromPoint`). */
function under(point: Point): Element | null {
  return typeof document.elementFromPoint === 'function'
    ? document.elementFromPoint(point.x, point.y)
    : null
}

/** El centro de un elemento en la pantalla. */
function centerOf(element: Element | null): Point | null {
  if (element === null) return null

  const rect = element.getBoundingClientRect()

  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

type CarryOptions = {
  /** Se ha soltado sobre `spot` (o sobre nada que señalar) en `at`. */
  onDrop: (spot: Spot | null, at: Point) => void
  /** Un toque, Intro o Espacio: sin llevarla a ningún sitio. */
  onTap: () => void
  /**
   * Un clic mientras hay algo abierto (`busy`): lo cierra. Sin él, el clic
   * hace lo de siempre.
   */
  onBusyClick?: () => void
  /** Hay algo abierto (el panel): no se coge hasta que se cierre. */
  busy?: boolean
  /** Al empezar a llevarla (para quitar avisos que estorben). */
  onStart?: () => void
}

export function useCarry({ onDrop, onTap, onBusyClick, busy = false, onStart }: CarryOptions) {
  const button = useRef<HTMLButtonElement>(null)
  /** Dónde empezó la pulsación, mientras dura. */
  const press = useRef<Point | null>(null)
  /** Si la pulsación en curso (o la que acaba de terminar) fue un arrastre. */
  const dragged = useRef(false)
  /** Con qué se pulsó la burbuja la última vez (`mouse`, `touch`, `pen`). */
  const pointer = useRef('')
  /** La burbuja va enganchada al ratón, esperando el clic que la deja. */
  const [carrying, setCarrying] = useState(false)
  /** La burbuja suelta: dónde está, o `null` si está en la cabecera. */
  const [ghost, setGhost] = useState<Point | null>(null)
  const [returning, setReturning] = useState(false)
  /** Lo que hay debajo mientras se arrastra. */
  const [hover, setHover] = useState<Spot | null>(null)

  /** Devuelve la burbuja a la cabecera: volando, o de golpe si se prefiere quieto. */
  const goHome = useCallback(() => {
    setHover(null)
    setCarrying(false)

    const home = centerOf(button.current)

    if (stillPreferred() || home === null) {
      setGhost(null)
      setReturning(false)

      return
    }
    setReturning(true)
    setGhost((now) => (now === null ? null : home))
    window.setTimeout(() => {
      setGhost(null)
      setReturning(false)
    }, RETURN_MS)
  }, [])

  /** Se suelta: la burbuja se queda ahí hasta que quien la usa la devuelva. */
  const drop = useCallback(
    (point: Point) => {
      setCarrying(false)
      setHover(null)
      setGhost(point)
      onDrop(detect(under(point)), point)
    },
    [onDrop],
  )

  // Escape mientras se arrastra: se suelta sin hacer nada.
  useEffect(() => {
    if (ghost === null || busy || returning) return undefined

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      press.current = null
      goHome()
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [ghost, busy, returning, goHome])

  // Enganchada al ratón: sigue al puntero y el siguiente clic la deja ahí. Ese
  // clic es solo para dejarla: no llega a lo que haya debajo. Un clic sobre la
  // burbuja de la cabecera la devuelve sin hacer nada.
  useEffect(() => {
    if (!carrying) return undefined

    const swallow = (event: Event): void => {
      event.preventDefault()
      event.stopPropagation()
    }
    const onMove = (event: PointerEvent): void => {
      const point = { x: event.clientX, y: event.clientY }

      setGhost(point)
      setHover(detect(under(point)))
    }
    const onDown = (event: PointerEvent): void => {
      swallow(event)
      window.addEventListener('click', swallow, { capture: true, once: true })

      const target = event.target instanceof Node ? event.target : null

      if (event.button !== 0 || (target !== null && button.current?.contains(target) === true)) {
        goHome()

        return
      }
      drop({ x: event.clientX, y: event.clientY })
    }

    document.body.classList.add('suggest-carrying')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown, true)

    return () => {
      document.body.classList.remove('suggest-carrying')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [carrying, goHome, drop])

  const handlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>): void => {
      pointer.current = event.pointerType
      if (event.button !== 0 || busy || returning) return
      press.current = { x: event.clientX, y: event.clientY }
      dragged.current = false
      // Así los movimientos siguen llegando aunque el dedo salga del botón.
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>): void => {
      const start = press.current

      if (start === null) return

      const point = { x: event.clientX, y: event.clientY }

      if (!dragged.current && Math.hypot(point.x - start.x, point.y - start.y) < DRAG_PX) return
      if (!dragged.current) onStart?.()
      dragged.current = true
      setGhost(point)
      setHover(detect(under(point)))
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>): void => {
      if (press.current === null) return
      press.current = null
      if (!dragged.current) return
      drop({ x: event.clientX, y: event.clientY })
    },
    onPointerCancel: (): void => {
      if (press.current === null) return
      press.current = null
      if (dragged.current) goHome()
    },
    onClick: (event: ReactMouseEvent<HTMLButtonElement>): void => {
      // El clic que llega al soltar un arrastre ya hizo lo suyo.
      if (dragged.current) {
        dragged.current = false

        return
      }
      if (busy) {
        onBusyClick?.()

        return
      }
      // Un clic de ratón (no Intro ni Espacio, que no traen `detail`) la engancha.
      if (pointer.current === 'mouse' && event.detail > 0 && !returning) {
        onStart?.()
        setGhost({ x: event.clientX, y: event.clientY })
        setCarrying(true)

        return
      }
      onTap()
    },
  }

  return { button, ghost, returning, hover, carrying, goHome, handlers }
}
