/**
 * Ordenar una lista arrastrando, con el ratón, el dedo o el teclado. Es lo que
 * usa el estudio de Personalizar para mover categorías, pestañas y bloques.
 *
 * - Ratón y dedo (eventos `pointer`): se coge por el asa (con el ratón, también
 *   por el resto del elemento). Hasta que no se mueve unos píxeles no empieza el
 *   arrastre, para que un clic siga siendo un clic. Mientras se arrastra, una
 *   copia flotante sigue al puntero y la lista se recoloca debajo.
 * - Teclado: con el foco en el asa, Espacio o Intro lo cogen, las flechas lo
 *   mueven, Espacio o Intro lo sueltan y Escape lo devuelve a su sitio.
 *
 * Nada se guarda hasta soltar: entonces se llama a `onDrop` con el orden nuevo.
 * Cada paso se cuenta con `announce`, para los lectores de pantalla.
 *
 * Los demás elementos se deslizan a su sitio nuevo (técnica FLIP: se mide dónde
 * estaban, se pinta el orden nuevo y se les anima desde allí), salvo con
 * movimiento reducido.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/** Qué se cuenta a quien no ve la pantalla. */
export type SortStep = 'lift' | 'move' | 'drop' | 'cancel'

type Options = {
  /** El orden de ahora (el guardado). */
  ids: readonly string[]
  /** Al soltar, si el orden ha cambiado. */
  onDrop: (order: string[]) => void
  /** Cuenta un paso: qué elemento, en qué posición (desde 1) y de cuántas. */
  announce: (step: SortStep, id: string, position: number, total: number) => void
  /**
   * Cuánto de alto puede quedar el puntero por debajo del borde de la copia
   * flotante. Los bloques se pliegan al cogerlos: la copia es una barra baja y
   * el puntero tiene que quedar dentro de ella.
   */
  ghostGrip?: number
}

type Drag = {
  id: string
  via: 'pointer' | 'keyboard'
  /** El orden mientras se arrastra (el que se ve). */
  order: string[]
  /** El de antes de cogerlo: al que se vuelve con Escape. */
  start: string[]
}

/** La copia flotante: su ancho y dónde se coge (respecto al puntero). */
type Ghost = { id: string; width: number; dx: number; dy: number }

/** Píxeles que hay que mover el puntero para que un clic pase a ser un arrastre. */
const THRESHOLD = 5

const reducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Mueve `id` a la posición `to` de `order`. */
function placeAt(order: readonly string[], id: string, to: number): string[] {
  const next = order.filter((other) => other !== id)

  next.splice(Math.max(0, Math.min(to, next.length)), 0, id)

  return next
}

export function useSortable({ ids, onDrop, announce, ghostGrip }: Options) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const items = useRef(new Map<string, HTMLElement>())
  const handles = useRef(new Map<string, HTMLElement>())
  const ghostRef = useRef<HTMLElement | null>(null)
  /** Dónde está el puntero ahora, para pintar la copia flotante al montarse. */
  const pointerAt = useRef({ x: 0, y: 0 })
  /** Dónde estaba cada elemento justo antes de recolocar la lista (para animarlo). */
  const before = useRef<Map<string, DOMRect> | null>(null)
  /** Cómo dejar de escuchar el puntero. */
  const stop = useRef<(() => void) | null>(null)
  const options = useRef({ onDrop, announce })

  options.current = { onDrop, announce }

  const update = useCallback((next: Drag | null): void => {
    dragRef.current = next
    setDrag(next)
  }, [])

  /** Pinta un orden nuevo mientras se arrastra, recordando dónde estaba todo. */
  const reorder = useCallback(
    (order: string[]): void => {
      const current = dragRef.current

      if (current === null || order.join() === current.order.join()) return
      if (!reducedMotion()) {
        before.current = new Map(
          [...items.current].map(([id, element]) => [id, element.getBoundingClientRect()]),
        )
      }
      update({ ...current, order })
      options.current.announce('move', current.id, order.indexOf(current.id) + 1, order.length)
    },
    [update],
  )

  // FLIP: cada elemento que ha cambiado de sitio sale de donde estaba y se desliza.
  useLayoutEffect(() => {
    const rects = before.current

    before.current = null
    if (rects === null) return

    for (const [id, element] of items.current) {
      const was = rects.get(id)

      if (was === undefined || id === dragRef.current?.id) continue
      element.style.transition = 'none'
      element.style.transform = ''

      const now = element.getBoundingClientRect()
      const dx = was.left - now.left
      const dy = was.top - now.top

      if (dx === 0 && dy === 0) continue
      element.style.transform = `translate(${String(dx)}px, ${String(dy)}px)`
      // Se lee el tamaño para que el navegador pinte el punto de partida antes de animar.
      element.getBoundingClientRect()
      element.style.transition = 'transform 180ms ease'
      element.style.transform = ''
    }
  }, [drag?.order])

  /** Termina el arrastre: guarda (`keep`) o devuelve todo a su sitio. */
  const finish = useCallback(
    (keep: boolean): void => {
      const current = dragRef.current

      stop.current?.()
      stop.current = null
      setGhost(null)
      if (current === null) return

      update(null)

      const order = keep ? current.order : current.start
      const position = order.indexOf(current.id) + 1

      if (keep && current.order.join() !== current.start.join()) options.current.onDrop(order)
      options.current.announce(keep ? 'drop' : 'cancel', current.id, position, order.length)
    },
    [update],
  )

  /** Dónde soltaría el puntero `(x, y)`: sobre qué elemento está y si ha pasado su mitad. */
  const hover = useCallback(
    (x: number, y: number): void => {
      const current = dragRef.current
      const dragged = current === null ? undefined : items.current.get(current.id)

      if (current === null || dragged === undefined) return

      const from = dragged.getBoundingClientRect()

      for (const id of current.order) {
        const element = items.current.get(id)

        if (id === current.id || element === undefined) continue

        const rect = element.getBoundingClientRect()

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue

        const to = current.order.indexOf(id)
        const forward = to > current.order.indexOf(current.id)
        // En la misma fila se mira el eje horizontal y en la misma columna, el
        // vertical: se cambia de sitio al pasar la mitad del otro, para que no
        // baile adelante y atrás. En otra fila y otra columna (una fila que se
        // parte en dos), basta con estar encima.
        const sameRow = Math.abs(rect.top - from.top) < rect.height / 2
        const sameColumn = Math.abs(rect.left - from.left) < rect.width / 2
        const past = sameRow
          ? forward === x > rect.left + rect.width / 2
          : !sameColumn || forward === y > rect.top + rect.height / 2

        if (past) reorder(placeAt(current.order, current.id, to))

        return
      }
    },
    [reorder],
  )

  const moveGhost = (x: number, y: number, at: Ghost): void => {
    const element = ghostRef.current

    pointerAt.current = { x, y }

    if (element !== null) {
      element.style.transform = `translate(${String(x - at.dx)}px, ${String(y - at.dy)}px)`
    }
  }

  /** Empieza a seguir el puntero desde un elemento. */
  const pointerDown = (id: string, event: ReactPointerEvent, fromHandle: boolean): void => {
    if (event.button !== 0 || dragRef.current !== null) return
    // Con el dedo solo se coge por el asa: el resto deja deslizar la lista.
    if (!fromHandle && event.pointerType !== 'mouse') return

    const element = items.current.get(id)

    if (element === undefined) return

    const startX = event.clientX
    const startY = event.clientY
    const pointer = event.pointerId
    let at: Ghost | null = null

    const move = (moved: PointerEvent): void => {
      if (moved.pointerId !== pointer) return
      if (at === null) {
        if (Math.hypot(moved.clientX - startX, moved.clientY - startY) < THRESHOLD) return

        const rect = element.getBoundingClientRect()
        const dy = startY - rect.top

        at = {
          id,
          width: rect.width,
          dx: startX - rect.left,
          dy: ghostGrip === undefined ? dy : Math.min(dy, ghostGrip),
        }
        pointerAt.current = { x: moved.clientX, y: moved.clientY }
        setGhost(at)
        update({ id, via: 'pointer', order: [...ids], start: [...ids] })
        options.current.announce('lift', id, ids.indexOf(id) + 1, ids.length)
      }
      moved.preventDefault()
      moveGhost(moved.clientX, moved.clientY, at)
      hover(moved.clientX, moved.clientY)
    }
    const up = (released: PointerEvent): void => {
      if (released.pointerId !== pointer) return
      if (at !== null) {
        // El clic que sigue a soltar no es un clic: no abre lo que haya debajo.
        const swallow = (click: MouseEvent): void => {
          click.stopPropagation()
          click.preventDefault()
        }

        window.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => {
          window.removeEventListener('click', swallow, { capture: true })
        }, 0)
        finish(true)
      } else {
        stop.current?.()
        stop.current = null
      }
    }
    const cancel = (): void => {
      finish(false)
    }
    const escape = (key: globalThis.KeyboardEvent): void => {
      if (key.key !== 'Escape' || dragRef.current === null) return
      // Cancelado aquí, el navegador no cierra la ventana con este Escape.
      key.preventDefault()
      key.stopPropagation()
      finish(false)
    }
    // Sin esto, en algunos móviles la página se desliza mientras se arrastra.
    const still = (touch: TouchEvent): void => {
      if (dragRef.current !== null) touch.preventDefault()
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', escape, { capture: true })
    window.addEventListener('touchmove', still, { passive: false })
    stop.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', escape, { capture: true })
      window.removeEventListener('touchmove', still)
    }
  }

  // Al desmontarse a medio arrastre, se deja de escuchar.
  useEffect(
    () => () => {
      stop.current?.()
    },
    [],
  )

  // Con el teclado, el asa sigue con el foco aunque la lista se recoloque.
  useLayoutEffect(() => {
    if (drag?.via !== 'keyboard') return

    const handle = handles.current.get(drag.id)

    if (handle !== undefined && document.activeElement !== handle) handle.focus()
  }, [drag])

  const keyDown = (id: string, event: KeyboardEvent): void => {
    const current = dragRef.current
    const pick = event.key === ' ' || event.key === 'Enter'

    if (current === null) {
      if (!pick) return
      event.preventDefault()
      update({ id, via: 'keyboard', order: [...ids], start: [...ids] })
      options.current.announce('lift', id, ids.indexOf(id) + 1, ids.length)

      return
    }
    if (current.id !== id || current.via !== 'keyboard') return

    const index = current.order.indexOf(id)
    const steps: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      Home: 0,
      End: current.order.length - 1,
    }
    const to = steps[event.key]

    if (to !== undefined) {
      event.preventDefault()
      if (to >= 0 && to < current.order.length) reorder(placeAt(current.order, id, to))
    } else if (pick || event.key === 'Tab') {
      if (pick) event.preventDefault()
      finish(true)
    } else if (event.key === 'Escape') {
      // Cancelado aquí, el navegador no cierra la ventana con este Escape.
      event.preventDefault()
      event.stopPropagation()
      finish(false)
    }
  }

  return {
    /** El orden que se ve: el del arrastre, si lo hay. */
    order: drag?.order ?? [...ids],
    /** Lo que se está arrastrando, o `null`. */
    active: drag?.id ?? null,
    /** La copia flotante, mientras se arrastra con el puntero. */
    ghost,
    ghostRef: (element: HTMLElement | null) => {
      ghostRef.current = element
      if (element !== null && ghost !== null) {
        moveGhost(pointerAt.current.x, pointerAt.current.y, ghost)
      }
    },
    /** Lo que lleva cada elemento de la lista. */
    item: (id: string) => ({
      ref: (element: HTMLElement | null) => {
        if (element === null) items.current.delete(id)
        else items.current.set(id, element)
      },
      onPointerDown: (event: ReactPointerEvent) => {
        pointerDown(id, event, false)
      },
    }),
    /** Lo que lleva el asa de cada elemento (un botón). */
    handle: (id: string) => ({
      ref: (element: HTMLElement | null) => {
        if (element === null) handles.current.delete(id)
        else handles.current.set(id, element)
      },
      'aria-pressed': drag?.id === id,
      onPointerDown: (event: ReactPointerEvent) => {
        event.stopPropagation()
        pointerDown(id, event, true)
      },
      onKeyDown: (event: KeyboardEvent) => {
        keyDown(id, event)
      },
    }),
  }
}
