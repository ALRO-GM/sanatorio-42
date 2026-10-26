/**
 * La burbuja de sugerencias de la cabecera (`docs/sugerencias.md`): se coge,
 * se lleva hasta lo que mejorarías y, al dejarla, se abre un panel pequeño con
 * el sitio detectado, el problema y tu propuesta. Al mandarla, vuelve volando
 * a su sitio.
 *
 * Con el dedo o el lápiz se arrastra y se suelta (un toque sin arrastrar abre
 * el panel). Con el ratón, arrastrar es raro: un clic la engancha al puntero y
 * el siguiente la deja donde esté. Con el teclado, Intro o Espacio abren el
 * panel sin llevarla a ningún sitio, y el sitio se elige de una lista.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { detect, spotLabel } from './detect'
import type { Spot } from './detect'
import { SuggestPanel } from './SuggestPanel'
import type { Opened } from './SuggestPanel'

/** Lo que hay que mover el puntero para que una pulsación sea un arrastre. */
const DRAG_PX = 6

/** Lo que tarda en volver a la cabecera (como la transición de `suggest.css`). */
const RETURN_MS = 380

/** Cuánto se queda a la vista el «gracias». */
const THANKS_MS = 3500

type Point = { x: number; y: number }

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

export function SuggestBubble({
  section,
  sections,
}: {
  /** La sección abierta: de ella va la sugerencia, salvo que se cambie. */
  section: string
  /** Las secciones que se pueden elegir en el panel. */
  sections: readonly string[]
}) {
  const { t } = useI18n()
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
  const [opened, setOpened] = useState<Opened | null>(null)
  const [thanks, setThanks] = useState(false)
  // Lo que se resalta: lo de debajo mientras se arrastra; con el panel, lo elegido.
  const marked = hover ?? opened?.spot ?? null

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

  const close = useCallback(
    (sent: boolean) => {
      setOpened(null)
      goHome()
      if (sent) {
        setThanks(true)
        window.setTimeout(() => {
          setThanks(false)
        }, THANKS_MS)
      }
      button.current?.focus()
    },
    [goHome],
  )

  // Escape mientras se arrastra: se suelta sin abrir nada.
  useEffect(() => {
    if (ghost === null || opened !== null || returning) return undefined

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      press.current = null
      goHome()
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [ghost, opened, returning, goHome])

  // Enganchada al ratón: sigue al puntero y el siguiente clic la deja ahí. Ese
  // clic es solo para dejarla: no llega a lo que haya debajo. Un clic sobre la
  // burbuja de la cabecera la devuelve sin abrir nada.
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

      const point = { x: event.clientX, y: event.clientY }

      setCarrying(false)
      setHover(null)
      setGhost(point)
      setOpened({ spot: detect(under(point)), at: point })
    }

    document.body.classList.add('suggest-carrying')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown, true)

    return () => {
      document.body.classList.remove('suggest-carrying')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [carrying, goHome])

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    pointer.current = event.pointerType
    if (event.button !== 0 || opened !== null || returning) return
    press.current = { x: event.clientX, y: event.clientY }
    dragged.current = false
    // Así los movimientos siguen llegando aunque el dedo salga del botón.
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const start = press.current

    if (start === null) return

    const point = { x: event.clientX, y: event.clientY }

    if (!dragged.current && Math.hypot(point.x - start.x, point.y - start.y) < DRAG_PX) return
    dragged.current = true
    setThanks(false)
    setGhost(point)
    setHover(detect(under(point)))
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (press.current === null) return
    press.current = null
    if (!dragged.current) return

    const point = { x: event.clientX, y: event.clientY }
    const spot = detect(under(point))

    setHover(null)
    setGhost(point)
    setOpened({ spot, at: point })
  }

  const onPointerCancel = (): void => {
    if (press.current === null) return
    press.current = null
    if (dragged.current) goHome()
  }

  return (
    <>
      <span className="suggest-slot">
        <button
          ref={button}
          type="button"
          className={`icon-btn suggest-bubble ${ghost === null ? '' : 'away'}`}
          aria-label={t('suggest.open')}
          aria-expanded={opened !== null}
          aria-haspopup="dialog"
          title={t('suggest.hint')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={(event) => {
            // El clic que llega al soltar un arrastre ya abrió el panel.
            if (dragged.current) {
              dragged.current = false

              return
            }
            if (opened !== null) {
              close(false)

              return
            }
            setThanks(false)
            // Un clic de ratón (no Intro ni Espacio, que no traen `detail`) la engancha.
            if (pointer.current === 'mouse' && event.detail > 0 && !returning) {
              setGhost({ x: event.clientX, y: event.clientY })
              setCarrying(true)

              return
            }
            setOpened({ spot: null, at: null })
          }}
        >
          <Icon name="idea" size={20} />
        </button>
        {thanks && (
          <span className="suggest-thanks" role="status">
            {t('suggest.thanks')}
          </span>
        )}
      </span>

      {ghost !== null &&
        createPortal(
          <span
            className={`suggest-ghost ${returning ? 'returning' : ''}`}
            style={{ left: ghost.x, top: ghost.y }}
            aria-hidden="true"
          >
            <Icon name="idea" size={20} />
          </span>,
          document.body,
        )}
      {marked !== null &&
        createPortal(
          <Highlight spot={marked} held={hover === null} section={section} />,
          document.body,
        )}
      {opened !== null && (
        <SuggestPanel
          opened={opened}
          section={section}
          sections={sections}
          anchor={button.current}
          onClose={close}
        />
      )}
    </>
  )
}

/** Lo que se resalta bajo la burbuja: un marco con el nombre del sitio. */
function Highlight({ spot, held, section }: { spot: Spot; held: boolean; section: string }) {
  const { t } = useI18n()
  const [rect, setRect] = useState(() => spot.element.getBoundingClientRect())

  // Al bajar por la página con el panel abierto, el marco sigue al sitio.
  useEffect(() => {
    const measure = (): void => {
      setRect(spot.element.getBoundingClientRect())
    }

    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)

    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [spot])

  return (
    <div
      className={`suggest-outline ${held ? 'held' : ''}`}
      style={{
        left: rect.left - 3,
        top: rect.top - 3,
        width: rect.width + 6,
        height: rect.height + 6,
      }}
      aria-hidden="true"
    >
      <span className={`suggest-outline-label ${rect.top < 28 ? 'inside' : ''}`}>
        {spotLabel(spot, section, t)}
      </span>
    </div>
  )
}
