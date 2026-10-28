import { drawFloor } from './floor'
import type { Floor } from './floor'
import type { Office } from './layout'
import { MODELS } from './models'
import type { ModelId, Props } from './models'
import { Sprite, TILE } from './sprite'

/**
 * Pintar en un lienzo lo que dibuja el motor: cada fotograma de cada modelo se
 * dibuja una vez y se guarda en su propio lienzo pequeño; la escena solo los
 * copia. Los dibujos van a su tamaño (un píxel, un píxel) y el CSS los agranda
 * sin suavizar (`image-rendering: pixelated`).
 */

/** El lienzo de un modelo: cabe lo más alto (un armario lleno) y el contorno. */
const WIDTH = 40
const HEIGHT = 76
/** Dónde cae en ese lienzo la esquina de arriba de su baldosa. */
const OX = WIDTH / 2
const OY = HEIGHT - 18

/** Lo que sobresale lo más alto por encima de la fila de atrás, en píxeles. */
const HEADROOM = 46

/** Copia los píxeles de un dibujo a un lienzo nuevo de su tamaño. */
function toCanvas(sprite: Sprite): HTMLCanvasElement {
  const canvas = document.createElement('canvas')

  canvas.width = sprite.width
  canvas.height = sprite.height

  const context = canvas.getContext('2d')

  if (context === null) return canvas

  // Tiras del mismo color seguidas: pocas órdenes y ningún `ImageData`.
  for (let y = 0; y < sprite.height; y += 1) {
    let x = 0

    while (x < sprite.width) {
      const color = sprite.at(x, y)
      let end = x + 1

      while (end < sprite.width && sprite.at(end, y) === color) end += 1

      if (color !== null) {
        context.fillStyle = color
        context.fillRect(x, y, end - x, 1)
      }

      x = end
    }
  }

  return canvas
}

type Drawn = { canvas: HTMLCanvasElement; sprite: Sprite }

const frames = new Map<string, Drawn>()

/** Un fotograma de un modelo, dibujado la primera vez y guardado. */
function drawn(model: ModelId, props: Props, frame: number): Drawn {
  const { frames: count, draw } = MODELS[model]
  const key = `${model}|${JSON.stringify(props)}|${String(frame % count)}`
  let found = frames.get(key)

  if (found === undefined) {
    // No crece sin fin: si se llena, se vuelve a dibujar lo que se vea.
    if (frames.size > 800) frames.clear()

    const sprite = new Sprite(WIDTH, HEIGHT, OX, OY)

    draw(sprite, frame % count, props)
    sprite.outline()
    found = { canvas: toCanvas(sprite), sprite }
    frames.set(key, found)
  }

  return found
}

/** Lo que mide la escena de una oficina de `size` baldosas, en píxeles. */
export function sceneSize(size: number): { width: number; height: number } {
  return { width: size * 2 * TILE + 8, height: size * TILE + HEADROOM + 6 }
}

const floors = new Map<string, HTMLCanvasElement>()

function floorOf(size: number, floor: Floor): HTMLCanvasElement {
  const key = `${String(size)}|${floor}`
  let canvas = floors.get(key)

  if (canvas === undefined) {
    const { width, height } = sceneSize(size)
    const sprite = new Sprite(width, height, size * TILE + 4, HEADROOM)

    drawFloor(sprite, size, floor)
    canvas = toCanvas(sprite)
    floors.set(key, canvas)
  }

  return canvas
}

/** Pinta la oficina en el fotograma `frame`: el suelo y lo colocado, de atrás adelante. */
export function paintOffice(
  context: CanvasRenderingContext2D,
  office: Office,
  frame: number,
): void {
  const { width, height } = sceneSize(office.size)
  const sx = office.size * TILE + 4

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(floorOf(office.size, office.floor), 0, 0)

  const ordered = [...office.pieces].sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx)

  for (const piece of ordered) {
    const { canvas } = drawn(piece.model, piece.props, frame)
    const x = sx + (piece.gx - piece.gy) * TILE
    const y = HEADROOM + ((piece.gx + piece.gy) * TILE) / 2

    context.drawImage(canvas, x - OX, y - OY)
  }
}

/** El recorte de un modelo: el rectángulo que ocupa en cualquiera de sus fotogramas. */
export function boundsOf(
  model: ModelId,
  props: Props,
): { x: number; y: number; width: number; height: number } {
  let box: [number, number, number, number] = [WIDTH, HEIGHT, 0, 0]

  for (let frame = 0; frame < MODELS[model].frames; frame += 1) {
    const found = drawn(model, props, frame).sprite.bounds()

    if (found !== null) {
      box = [
        Math.min(box[0], found[0]),
        Math.min(box[1], found[1]),
        Math.max(box[2], found[2]),
        Math.max(box[3], found[3]),
      ]
    }
  }

  return {
    x: box[0],
    y: box[1],
    width: Math.max(1, box[2] - box[0] + 1),
    height: Math.max(1, box[3] - box[1] + 1),
  }
}

/** Pinta un modelo solo, recortado, en el fotograma `frame`: el dibujo de una tarjeta. */
export function paintModel(
  context: CanvasRenderingContext2D,
  model: ModelId,
  props: Props,
  frame: number,
): void {
  const { x, y, width, height } = boundsOf(model, props)

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(drawn(model, props, frame).canvas, x, y, width, height, 0, 0, width, height)
}
