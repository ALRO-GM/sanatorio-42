import { BUBBLE_HEIGHT, BUBBLE_WIDTH, drawBubble } from './bubbles'
import { drawFloor } from './floor'
import type { Floor } from './floor'
import type { Office, Piece } from './layout'
import { poseAt } from './life'
import type { Bubble, Plan, Pose } from './life'
import { MODELS } from './models'
import type { ModelId, Props } from './models'
import { targetOf } from '../target'
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
/**
 * Píxeles de verdad por píxel del dibujo: una sola calidad, la más fina (el
 * estilo sin delineado necesita sus tonos y sus biseles). Si algún día hay
 * otras, se elegirían aquí.
 */
export const DENSITY = 4

/** Lo que mide de alto quien anda, en píxeles del dibujo (para poner encima su bocadillo). */
const WALKER_HEIGHT = 20

/** Dónde cae en ese lienzo la esquina de arriba de su baldosa. */
const OX = WIDTH / 2
const OY = HEIGHT - 18

/** Lo que sobresale lo más alto por encima de la fila de atrás, en píxeles. */
const HEADROOM = 46

/** Copia los píxeles de un dibujo a un lienzo nuevo de su tamaño. */
export function toCanvas(sprite: Sprite): HTMLCanvasElement {
  const canvas = document.createElement('canvas')

  canvas.width = sprite.pw
  canvas.height = sprite.ph

  const context = canvas.getContext('2d')

  if (context === null) return canvas

  // Tiras del mismo color seguidas: pocas órdenes y ningún `ImageData`.
  for (let y = 0; y < sprite.ph; y += 1) {
    let x = 0

    while (x < sprite.pw) {
      const color = sprite.at(x, y)
      let end = x + 1

      while (end < sprite.pw && sprite.at(end, y) === color) end += 1

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

/** Un modelo dibujado en un lienzo de modelo, girado si toca y con su acabado (sombras). */
function modelSprite(model: ModelId, props: Props, frame: number): Sprite {
  const sprite = new Sprite(WIDTH, HEIGHT, OX, OY, DENSITY)
  const found = MODELS[model]

  sprite.turned = props.turn === true
  found.draw(sprite, frame % found.frames, props)

  return sprite.finish()
}

/** Un fotograma de un modelo, dibujado la primera vez y guardado. */
function drawn(model: ModelId, props: Props, frame: number): Drawn {
  const { frames: count, same } = MODELS[model]
  // Los fotogramas que se ven igual comparten dibujo (`Model.same`).
  const shown = same === undefined ? String(frame % count) : same(frame % count, props)
  const key = `${model}|${JSON.stringify(props)}|${shown}`
  let found = frames.get(key)

  if (found === undefined) {
    // No crece sin fin: si se llena, se vuelve a dibujar lo que se vea.
    if (frames.size > 1500) frames.clear()

    const sprite = modelSprite(model, props, frame)

    found = { canvas: toCanvas(sprite), sprite }
    frames.set(key, found)
  }

  return found
}

/** Copia un modelo en la escena con la esquina de su baldosa en (x, y): a su tamaño, sea cual sea la calidad. */
function place(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): void {
  context.drawImage(canvas, x - OX, y - OY, WIDTH, HEIGHT)
}

/** Lo que mide la escena de una oficina de `size` baldosas, en píxeles. */
export function sceneSize(size: number): { width: number; height: number } {
  return { width: size * 2 * TILE + 8, height: size * TILE + HEADROOM + 6 }
}

/** Dónde cae en la escena la esquina de arriba de la baldosa (gx, gy). */
export function tileOrigin(size: number, gx: number, gy: number): [number, number] {
  return [size * TILE + 4 + (gx - gy) * TILE, HEADROOM + ((gx + gy) * TILE) / 2]
}

/**
 * La baldosa bajo un punto de la escena (en píxeles del dibujo), o `null` si
 * cae fuera del suelo: lo contrario de `tileOrigin`, para tocar y arrastrar.
 */
export function tileAt(size: number, x: number, y: number): [number, number] | null {
  const u = (x - size * TILE - 4) / TILE
  const v = ((y - HEADROOM) * 2) / TILE
  const gx = Math.floor((u + v) / 2)
  const gy = Math.floor((v - u) / 2)

  return gx >= 0 && gy >= 0 && gx < size && gy < size ? [gx, gy] : null
}

const floors = new Map<string, HTMLCanvasElement>()

function floorOf(size: number, floor: Floor): HTMLCanvasElement {
  const key = `${String(size)}|${floor}`
  let canvas = floors.get(key)

  if (canvas === undefined) {
    const { width, height } = sceneSize(size)
    const sprite = new Sprite(width, height, size * TILE + 4, HEADROOM, DENSITY)

    drawFloor(sprite, size, floor)
    canvas = toCanvas(sprite)
    floors.set(key, canvas)
  }

  return canvas
}

const marks = new Map<string, HTMLCanvasElement>()

/** El rombo de una baldosa marcada (elegida, se puede o no se puede dejar ahí). */
function markOf(color: string): HTMLCanvasElement {
  let canvas = marks.get(color)

  if (canvas === undefined) {
    const sprite = new Sprite(2 * TILE + 2, TILE + 2, TILE + 1, 1)

    sprite.faceZ(0, 0, TILE, 0, TILE, color)
    canvas = toCanvas(sprite)
    marks.set(color, canvas)
  }

  return canvas
}

const bubbles = new Map<Bubble, HTMLCanvasElement>()

function bubbleOf(bubble: Bubble): HTMLCanvasElement {
  let canvas = bubbles.get(bubble)

  if (canvas === undefined) {
    const sprite = new Sprite(BUBBLE_WIDTH + 2, BUBBLE_HEIGHT + 2, 0, 0)

    drawBubble(sprite, 1, 1, bubble)
    canvas = toCanvas(sprite.outline())
    bubbles.set(bubble, canvas)
  }

  return canvas
}

/** Lo que se pinta encima de la oficina: la vida, la noche y lo de colocar a mano. */
export type Extras = {
  /** Los planes de cada persona (`lifeOf`); sin ellos, todo el mundo en su sitio. */
  plans?: readonly Plan[] | undefined
  night?: boolean | undefined
  /** La pieza de decoración elegida (su número) y dónde se dejaría al soltarla. */
  /** Lo elegido para moverlo (`target.ts`). */
  selected?: string | null | undefined
  ghost?: { gx: number; gy: number; ok: boolean } | null | undefined
  /** Para la mudanza: cada pieza, una caja; y cuánto ha caído cada pieza (0 arriba, 1 en su sitio). */
  packed?: number | undefined
  dropped?: number | undefined
}

type Drawable = { depth: number; tie: number; paint: () => void }

/** Lo que va pegado al suelo: se pinta antes que todo lo demás, y se puede pisar. */
const FLAT: ReadonlySet<ModelId> = new Set<ModelId>(['rug'])

/**
 * Dónde va en el orden de pintado algo que ocupa una baldosa con su esquina de
 * atrás en (gx, gy), aunque esté a medio camino entre dos (quien anda): la
 * suma de esa esquina. Entre dos cuadrados de una baldosa que no se pisan, el
 * de suma mayor está siempre delante o al lado sin taparse; por eso quien anda
 * no lleva medio punto de más (con él, al pasar junto a una mesa que tiene
 * delante, se le pintaba encima). Lo plano (alfombras) va antes que nada.
 */
export function depthOf(model: ModelId, gx: number, gy: number): number {
  return FLAT.has(model) ? -1 : gx + gy
}

/** De atrás adelante; a la par, primero lo de más a la izquierda y lo quieto antes que quien anda. */
export function byDepth(a: Drawable, b: Drawable): number {
  return a.depth - b.depth || a.tie - b.tie
}

/**
 * Pinta la oficina en el fotograma `frame`: el suelo, lo colocado y quien
 * anda por ella, de atrás adelante; luego los bocadillos y, de noche, la luz
 * baja. Los bocadillos van por encima de la noche, para que se lean.
 */
export function paintOffice(
  context: CanvasRenderingContext2D,
  office: Office,
  frame: number,
  extras: Extras = {},
): void {
  const { width, height } = sceneSize(office.size)
  const at = (gx: number, gy: number) => tileOrigin(office.size, gx, gy)
  const poses: (Pose | null)[] = office.people.map((_, index) => {
    const plan = extras.plans?.[index]

    return plan === undefined ? null : poseAt(plan, frame)
  })
  const items: Drawable[] = []
  const said: { x: number; y: number; bubble: Bubble }[] = []
  const pieces = office.pieces
  const packed = extras.packed ?? 0
  const dropped = extras.dropped ?? 1

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(floorOf(office.size, office.floor), 0, 0, width, height)

  if (extras.selected !== undefined && extras.selected !== null) {
    const chosen = pieces.find((piece) => targetOf(piece) === extras.selected)

    if (chosen !== undefined) {
      const [x, y] = at(chosen.gx, chosen.gy)

      context.globalAlpha = 0.6
      context.drawImage(markOf('#5cc8ff'), x - TILE - 1, y - 1)
      context.globalAlpha = 1
    }
  }

  pieces.forEach((piece, index) => {
    const seated = piece.seat === undefined ? null : poses[piece.seat]
    // Quien se ha levantado deja la silla vacía.
    const props: Props =
      seated !== null && seated !== undefined && !seated.seated
        ? Object.fromEntries(Object.entries(piece.props).filter(([name]) => name !== 'look'))
        : piece.props
    const share = index / Math.max(1, pieces.length)

    if (packed > share) {
      items.push(
        paintPiece(
          context,
          at,
          { ...piece, model: 'crate', props: { level: 1 + (index % 3) } },
          frame,
          0,
        ),
      )
      return
    }

    // Al montar la oficina nueva, cada pieza cae a su sitio por turnos.
    const fall = Math.min(1, Math.max(0, (dropped - share * 0.6) / 0.4))

    if (fall <= 0) return

    items.push(
      paintPiece(
        context,
        at,
        { ...piece, props: cleanProps(props) },
        frame,
        Math.round((1 - fall) ** 2 * 40),
      ),
    )

    if (seated?.seated === true && seated.bubble !== null) {
      const [x, y] = at(piece.gx, piece.gy)

      said.push({ x, y: y - 16, bubble: seated.bubble })
    }
  })

  if (packed === 0 && dropped >= 1) {
    office.people.forEach((person, index) => {
      const pose = poses[index]

      if (pose === null || pose === undefined || pose.seated || pose.away) return

      const [x, y] = at(pose.gx, pose.gy)
      const model: ModelId = person.pet ?? 'walker'
      const props: Props =
        person.pet !== undefined
          ? { step: pose.step, turn: pose.turn }
          : cleanProps({
              look: person.look,
              avatar: person.avatar,
              axis: person.axis,
              role: person.role,
              step: pose.step,
              back: pose.back,
              turn: pose.turn,
              carry: pose.carry,
            })

      items.push({
        depth: depthOf(model, pose.gx, pose.gy),
        tie: pose.gx + 0.001,
        paint: () => {
          place(context, drawn(model, props, frame).canvas, Math.round(x), Math.round(y))
        },
      })

      if (pose.bubble !== null) {
        said.push({
          x,
          y: y + 8 - (person.pet === undefined ? WALKER_HEIGHT : 8),
          bubble: pose.bubble,
        })
      }

      // Quien charla con alguien sentado: le contesta.
      const partner = pose.with === null ? undefined : office.people[pose.with]
      const answer = pose.with === null ? null : poses[pose.with]

      if (pose.bubble !== null && partner?.desk !== undefined && answer?.seated === true) {
        const [px, py] = at(partner.desk[0], partner.desk[1])

        said.push({ x: px, y: py - 16, bubble: pose.bubble === 'heart' ? 'heart' : 'chat' })
      }
    })
  }

  items.sort(byDepth)
  for (const item of items) item.paint()

  if (extras.ghost !== undefined && extras.ghost !== null) {
    const [x, y] = at(extras.ghost.gx, extras.ghost.gy)

    context.globalAlpha = 0.55
    context.drawImage(markOf(extras.ghost.ok ? '#53ff8f' : '#ff5d5d'), x - TILE - 1, y - 1)
    context.globalAlpha = 1
  }

  if (extras.night === true) {
    context.fillStyle = 'rgba(20, 24, 66, 0.32)'
    context.fillRect(0, 0, width, height)
  }

  for (const { x, y, bubble } of said) {
    context.drawImage(
      bubbleOf(bubble),
      Math.round(x - BUBBLE_WIDTH / 2),
      Math.round(y - BUBBLE_HEIGHT),
    )
  }
}

/** Sin lo que vale `undefined`: así la clave de lo guardado es la misma. */
function cleanProps(props: Props): Props {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))
}

function paintPiece(
  context: CanvasRenderingContext2D,
  at: (gx: number, gy: number) => [number, number],
  piece: Piece,
  frame: number,
  lift: number,
): Drawable {
  const [x, y] = at(piece.gx, piece.gy)

  return {
    depth: depthOf(piece.model, piece.gx, piece.gy),
    tie: piece.gx,
    paint: () => {
      place(context, drawn(piece.model, piece.props, frame).canvas, x, y - lift)
    },
  }
}

/** El recorte de un modelo: el rectángulo que ocupa en cualquiera de sus fotogramas. */
export function boundsOf(
  model: ModelId,
  props: Props,
): { x: number; y: number; width: number; height: number } {
  let box: [number, number, number, number] = [WIDTH * DENSITY, HEIGHT * DENSITY, 0, 0]

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

/**
 * Pinta un modelo solo, recortado, en el fotograma `frame`: el dibujo de una
 * tarjeta. El recorte va en píxeles de verdad (`boundsOf` con la misma calidad).
 */
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

/** Pinta un modelo suelto en (x, y) de un lienzo, con la esquina de su baldosa ahí: la mudanza. */
export function paintAt(
  context: CanvasRenderingContext2D,
  model: ModelId,
  props: Props,
  frame: number,
  x: number,
  y: number,
): void {
  place(context, drawn(model, props, frame).canvas, Math.round(x), Math.round(y))
}
