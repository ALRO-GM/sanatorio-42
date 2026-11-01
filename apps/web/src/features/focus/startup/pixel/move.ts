/**
 * Las transiciones de la oficina, a 6 fotogramas por segundo:
 *
 * - **Mudanza** (`move`), al pasar a un espacio más grande: lo de la oficina
 *   vieja se mete en cajas una a una, pasa el camión, la oficina vieja se
 *   desvanece y la nueva se monta pieza a pieza, cayendo cada una a su sitio.
 * - **Epílogo** (`epilogue`), al terminar el edificio y volver a empezar: el
 *   edificio de noche, un cohete que despega de la azotea, todo a negro y tu
 *   cuarto que se vuelve a montar con lo que se conserva.
 *
 * Con movimiento reducido no se llama: se pasa directamente a lo nuevo.
 */
import type { Office } from './layout'
import type { Plan } from './life'
import { paintAt, paintOffice, sceneSize, toCanvas } from './paint'
import type { Extras } from './paint'
import { drawTower, towerSize } from './tower'
import type { Tower } from './tower'

export type Move = {
  kind: 'move' | 'epilogue'
  from: Office
  to: Office
  /** El edificio de antes, para el epílogo. */
  tower: Tower | null
  /** El fotograma en el que empezó. */
  start: number
}

/** Lo que dura cada una, en fotogramas (6 y 9 segundos). */
export const MOVE_FRAMES = 36
export const EPILOGUE_FRAMES = 54

export const lengthOf = (move: Move): number =>
  move.kind === 'move' ? MOVE_FRAMES : EPILOGUE_FRAMES

let scratch: HTMLCanvasElement | null = null

/** Un lienzo de trabajo del tamaño que haga falta, para pintar la oficina vieja aparte. */
function scratchOf(width: number, height: number): CanvasRenderingContext2D | null {
  scratch ??= document.createElement('canvas')
  scratch.width = width
  scratch.height = height

  return scratch.getContext('2d')
}

/** Pinta una oficina centrada abajo en el lienzo (que puede ser más grande), con su transparencia. */
function paintCentered(
  context: CanvasRenderingContext2D,
  office: Office,
  frame: number,
  extras: Extras,
  alpha = 1,
): void {
  const own = sceneSize(office.size)
  const other = scratchOf(own.width, own.height)

  if (other === null || scratch === null) return

  paintOffice(other, office, frame, extras)
  context.globalAlpha = Math.max(0, Math.min(1, alpha))
  context.drawImage(
    scratch,
    Math.round((context.canvas.width - own.width) / 2),
    context.canvas.height - own.height,
  )
  context.globalAlpha = 1
}

/** Lo que mide el lienzo durante la transición: cabe lo de antes, lo de después y el edificio. */
export function moveSize(move: Move): { width: number; height: number } {
  const sizes = [sceneSize(move.from.size), sceneSize(move.to.size)]

  if (move.kind === 'epilogue' && move.tower !== null) sizes.push(towerSize(move.tower))

  return {
    width: Math.max(...sizes.map((size) => size.width)),
    height: Math.max(...sizes.map((size) => size.height)),
  }
}

/** Pinta el fotograma `frame` de la transición, en un lienzo de `moveSize`. */
export function paintMove(
  context: CanvasRenderingContext2D,
  move: Move,
  frame: number,
  plans: readonly Plan[],
): void {
  const t = frame - move.start
  const { width, height } = context.canvas

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)

  if (move.kind === 'move') {
    if (t < 18) {
      paintCentered(
        context,
        move.from,
        frame,
        { packed: t < 12 ? (t + 1) / 10 : 1.1 },
        t < 12 ? 1 : 1 - (t - 12) / 6,
      )

      // El camión pasa por delante, de izquierda a derecha.
      paintAt(context, 'truck', { turn: true }, frame, -30 + (t / 17) * (width + 60), height - 12)

      return
    }

    paintCentered(context, move.to, frame, {
      dropped: (t - 18) / 16,
      plans: t >= 34 ? plans : undefined,
    })

    return
  }

  // El epílogo: el edificio de noche y el cohete.
  if (t < 30) {
    context.fillStyle = '#141838'
    context.fillRect(0, 0, width, height)

    for (let star = 0; star < 24; star += 1) {
      const seed = Math.imul(star + 1, 2654435761) >>> 0

      if ((seed >>> 3) % 5 !== frame % 5) {
        context.fillStyle = '#f4f0fa'
        context.fillRect(seed % width, (seed >>> 8) % Math.max(1, height - 20), 1, 1)
      }
    }

    if (move.tower !== null) {
      const sprite = drawTower(move.tower, frame, true)
      const y = height - sprite.height

      context.drawImage(toCanvas(sprite), Math.round((width - sprite.width) / 2), y)
      // El cohete despega de la azotea.
      paintAt(context, 'rocket', {}, frame, width / 2, y + 26 - Math.max(0, t - 6) * 5)
    } else {
      paintCentered(context, move.from, frame, {})
    }

    if (t >= 24) {
      context.fillStyle = `rgba(0, 0, 0, ${String((t - 23) / 6)})`
      context.fillRect(0, 0, width, height)
    }

    return
  }

  paintCentered(context, move.to, frame, {
    dropped: (t - 30) / 20,
    plans: t >= 50 ? plans : undefined,
  })
}
