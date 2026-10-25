import { useEffect, useLayoutEffect, useRef } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'

import { useI18n } from '../i18n'
import type { Translate } from '../i18n'
import { Icon } from '../ui/Icon'
import {
  dockedOrder,
  dockLayout,
  endDrag,
  floatingAt,
  foldedOf,
  grab,
  measure,
  moveDrag,
  nudge,
  redock,
  register,
  release,
  say,
  setFolded,
  startDrag,
  useDock,
} from './store'
import type { Size } from './layout'

/** Lo que la ventanita recibe para pintarse dentro de su hueco. */
type DockParts = {
  folded: boolean
  /** El asa: se arrastra con el ratón o el dedo; con el teclado, Espacio y flechas. */
  grip: ReactNode
  /** «Volver a la esquina» (si flota) y plegar o desplegar. */
  controls: ReactNode
  /** Solo «Volver a la esquina», para la que se pliega con un botón suyo (`toggle`). */
  back: ReactNode
  toggle: () => void
}

/** Lo que se deja libre arriba para no tapar la cabecera. */
const TOP_ROOM = 72
/** Hasta que el puntero no se mueve esto, es un clic y no un arrastre. */
const DRAG_AFTER = 4

/** Lo que se pulsa dentro de una ventanita (salvo el asa) no la arrastra. */
const PRESSABLE = 'button:not(.dock-grip), a, input, select, textarea, label, summary'

/**
 * Una ventanita flotante gestionada por el gestor de la esquina
 * (`shared/dock/store.ts`): se apunta mientras se monta, y el gestor la pone
 * en su hueco de la pila, sin tapar a las demás.
 *
 * - Se arrastra por el asa o por lo marcado con `data-dock-handle`. Soltada
 *   cerca de la pila, entra en el hueco que se le abre (así se cambia el
 *   orden); lejos, se queda flotando donde se deja, hasta «Volver a la
 *   esquina», que la devuelve a su sitio de antes.
 * - Con el teclado, en el asa: Espacio la coge, las flechas la mueven y
 *   Espacio la suelta (Escape lo deshace). Cada paso se dice en voz alta.
 * - Plegada ocupa poco; en el móvil empiezan plegadas.
 *
 * @param size Lo que mide desplegada, hasta poder medirla.
 * @param foldedSize Lo que mide plegada, hasta poder medirla.
 */
export function DockItem({
  id,
  title,
  size,
  foldedSize,
  className,
  children,
}: {
  id: string
  title: string
  size: Size
  foldedSize: Size
  className?: string
  children: (parts: DockParts) => ReactNode
}) {
  const { t } = useI18n()
  const dock = useDock()
  const box = useRef<HTMLDivElement>(null)
  const press = useRef<{ x: number; y: number; dx: number; dy: number; moving: boolean } | null>(
    null,
  )
  const { width, height } = size
  const { width: foldedWidth, height: foldedHeight } = foldedSize

  useEffect(
    () =>
      register({
        id,
        size: { width, height },
        foldedSize: { width: foldedWidth, height: foldedHeight },
      }),
    [id, width, height, foldedWidth, foldedHeight],
  )

  // Lo que mide de verdad, cada vez que cambia (plegarla, un aviso más…).
  useLayoutEffect(() => {
    const element = box.current

    if (element === null) return undefined

    const update = (): void => {
      measure(id, { width: element.offsetWidth, height: element.offsetHeight })
    }

    update()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(update)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [id])

  const folded = foldedOf(id, dock)
  const floating = floatingAt(id, dock)
  const dragging = dock.drag?.id === id ? dock.drag : null
  const grabbed = dock.grabbed?.id === id
  const order = dockedOrder(dock)
  const slot = dockLayout(dock).slots[id]
  const place = (index: number): string =>
    t('dock.place', { title, pos: index + 1, total: order.length })

  let style: CSSProperties
  let where: 'docked' | 'floating' | 'dragging'

  if (dragging !== null) {
    where = 'dragging'
    style = { left: dragging.at.left, top: dragging.at.top }
  } else if (floating !== null) {
    where = 'floating'
    style = { left: floating.left, top: floating.top, maxHeight: dock.viewport.height - 16 }
  } else {
    where = 'docked'
    const y = slot?.y ?? 16

    style = { left: slot?.x ?? 16, bottom: y, maxHeight: dock.viewport.height - y - TOP_ROOM }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement
    const element = box.current

    if (event.button !== 0 || element === null) return
    if (target.closest(PRESSABLE) !== null) return
    if (target.closest('.dock-grip, [data-dock-handle]') === null) return

    const rect = element.getBoundingClientRect()

    press.current = {
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      moving: false,
    }
    try {
      // Así el arrastre sigue aunque el puntero se salga de la ventanita.
      element.setPointerCapture(event.pointerId)
    } catch {
      // Sin captura (un navegador viejo o un puntero ya soltado) también se arrastra.
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const pressed = press.current
    const element = box.current

    if (pressed === null || element === null) return

    if (!pressed.moving) {
      if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < DRAG_AFTER) return
      pressed.moving = true

      const rect = element.getBoundingClientRect()

      startDrag(id, { left: rect.left, top: rect.top })
    }

    moveDrag({ left: event.clientX - pressed.dx, top: event.clientY - pressed.dy })
  }

  const onPointerUp = (): void => {
    const pressed = press.current

    press.current = null
    if (pressed?.moving !== true) return

    const index = endDrag()

    say(index === null ? t('dock.floated', { title }) : place(index))
  }

  const onGripKey = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    // Flotando no está en la lista: se mueve con el ratón o vuelve con su botón.
    if (floating !== null) return

    const key = event.key

    if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      if (grabbed) {
        release(true)
        say(t('dock.dropped', { title, pos: order.indexOf(id) + 1, total: order.length }))
      } else {
        grab(id)
        say(t('dock.grabbed', { title, pos: order.indexOf(id) + 1, total: order.length }))
      }

      return
    }

    if (!grabbed) return

    if (key === 'Escape') {
      event.preventDefault()
      release(false)
      say(t('dock.cancelled', { title }))

      return
    }

    // Arriba o a la derecha: lejos de la esquina. Abajo o a la izquierda: hacia ella.
    const step =
      key === 'ArrowUp' || key === 'ArrowRight'
        ? 1
        : key === 'ArrowDown' || key === 'ArrowLeft'
          ? -1
          : 0

    if (step === 0) return
    event.preventDefault()
    say(place(nudge(id, step)))
  }

  const grip = (
    <button
      type="button"
      className="icon-btn dock-grip"
      aria-label={t('dock.grip', { title })}
      aria-pressed={grabbed}
      title={t('dock.gripHint')}
      onKeyDown={onGripKey}
      onBlur={() => {
        if (grabbed) release(true)
      }}
    >
      <Icon name="asa" />
    </button>
  )

  const back = floating !== null && (
    <button
      type="button"
      className="icon-btn"
      aria-label={t('dock.back', { title })}
      title={t('dock.back', { title })}
      onClick={() => {
        redock(id)
        say(t('dock.backDone', { title }))
      }}
    >
      <Icon name="chincheta" />
    </button>
  )

  const controls = (
    <>
      {back}
      <FoldButton id={id} title={title} folded={folded} t={t} />
    </>
  )

  return (
    <div
      ref={box}
      className={`dock-slot ${where} ${grabbed ? 'grabbed' : ''} ${className ?? ''}`}
      style={style}
      data-dock={id}
      data-dock-state={where}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children({
        folded,
        grip,
        controls,
        back,
        toggle: () => {
          setFolded(id, !folded)
        },
      })}
    </div>
  )
}

function FoldButton({
  id,
  title,
  folded,
  t,
}: {
  id: string
  title: string
  folded: boolean
  t: Translate
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={t(folded ? 'dock.unfold' : 'dock.fold', { title })}
      aria-expanded={!folded}
      onClick={() => {
        setFolded(id, !folded)
      }}
    >
      <Icon name="abajo" className={folded ? 'flip' : ''} />
    </button>
  )
}

/**
 * Lo común a todas las ventanitas, montado una vez (`Clinic.tsx`): la región
 * que leen los lectores de pantalla y lo que mide la pila, en `--dock-room`,
 * para que en el móvil el final de la página se pueda subir por encima de
 * ella y nada importante quede debajo.
 */
export function DockHost() {
  const dock = useDock()
  const room = dockLayout(dock).height

  useEffect(() => {
    document.documentElement.style.setProperty('--dock-room', `${room}px`)
  }, [room])

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true" data-dock-said="">
      {dock.said}
    </p>
  )
}
