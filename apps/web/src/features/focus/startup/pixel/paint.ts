import { BUBBLE_HEIGHT, BUBBLE_WIDTH, drawBubble } from './bubbles'
import { drawFloor } from './floor'
import type { Floor } from './floor'
import type { Office, Piece } from './layout'
import { airLights, floorLights, garland, motes, tinted } from './light'
import type { AirLight, Daylight } from './light'
import { poseAt } from './life'
import type { Bubble, Plan, Pose } from './life'
import { MODELS } from './models'
import type { ModelId, Props } from './models'
import { petHeading } from './models/pets'
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

let painting: boolean | null = null

/**
 * Si este navegador sabe pintar en un lienzo. Sin él (un navegador muy
 * cerrado o los tests en jsdom) no se calcula ningún dibujo: cuesta y no se vería.
 */
export function canPaint(): boolean {
  painting ??=
    typeof document !== 'undefined' && document.createElement('canvas').getContext('2d') !== null

  return painting
}

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

/**
 * La sombra de un dibujo (sus píxeles a medio transparentar, `Sprite.finish`)
 * como una máscara opaca: lo que hace sombra no se aclara con las luces.
 */
function shadeOf(sprite: Sprite): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  let any = false

  canvas.width = sprite.pw
  canvas.height = sprite.ph
  if (context === null) return null
  for (let y = 0; y < sprite.ph; y += 1) {
    for (let x = 0; x < sprite.pw; x += 1) {
      const color = sprite.at(x, y)

      if (color?.startsWith('rgba') !== true) continue

      const alpha = Number(color.slice(color.lastIndexOf(',') + 1, -1))

      context.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha * 4).toFixed(2)})`
      context.fillRect(x, y, 1, 1)
      any = true
    }
  }

  return any ? canvas : null
}

/** Un fotograma dibujado: su lienzo y su recorte (lo pintado, en píxeles de verdad), guardado para no recorrerlo otra vez. */
type Drawn = {
  canvas: HTMLCanvasElement
  bounds: [number, number, number, number] | null
  /** Solo su sombra en el suelo, opaca: dónde no llega la luz (`paintOffice`). */
  shade: HTMLCanvasElement | null
  /** El dibujo con el tono de cada hora, hecho la primera vez que hace falta. */
  tints: Partial<Record<Daylight, HTMLCanvasElement>>
}

/** Un fotograma dibujado con el tono de la hora. */
function shownAt(found: Drawn, light: Daylight): HTMLCanvasElement {
  const done = found.tints[light]

  if (done !== undefined) return done

  const made = tinted(found.canvas, light)

  found.tints[light] = made

  return made
}

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

    found = { canvas: toCanvas(sprite), bounds: sprite.bounds(), shade: shadeOf(sprite), tints: {} }
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

function floorOf(size: number, floor: Floor, light: Daylight): HTMLCanvasElement {
  const key = `${String(size)}|${floor}|${light}`
  let canvas = floors.get(key)

  if (canvas === undefined) {
    const { width, height } = sceneSize(size)
    const sprite = new Sprite(width, height, size * TILE + 4, HEADROOM, DENSITY)

    drawFloor(sprite, size, floor, light)
    canvas = tinted(toCanvas(sprite), light)
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
  /** La hora (`daylightOf`): lo que se ve por las ventanas y la luz; de día si no se dice. */
  light?: Daylight | undefined
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
  return a.depth - b.depth || (a.tie === b.tie ? 0 : a.tie < b.tie ? -1 : 1)
}

/**
 * Pinta la oficina en el fotograma `frame`: el suelo con la luz de las
 * ventanas y las lámparas, lo colocado y quien anda por ella, de atrás
 * adelante; luego el tono de la hora, los haces de luz y lo que emite luz, y los
 * bocadillos por encima de todo, para que se lean.
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
  const settled = packed === 0 && dropped >= 1
  const light = extras.light ?? 'day'
  const point = (x: number, y: number, z = 0) => scenePoint(office.size, x, y, z)
  // Con la luz de la pantalla en la cara, quien se sienta a la mesa al caer la tarde.
  const glowing = light === 'dusk' || light === 'night'
  const propsOf = (piece: Piece): Props => {
    const seated = piece.seat === undefined ? null : poses[piece.seat]
    // Quien se ha levantado deja la silla vacía.
    const props =
      seated !== null && seated !== undefined && !seated.seated
        ? Object.fromEntries(Object.entries(piece.props).filter(([name]) => name !== 'look'))
        : piece.props

    return cleanProps(
      glowing && piece.model === 'workstation' && props.look !== undefined
        ? { ...props, glow: true }
        : props,
    )
  }
  const put: Put = (found, x, y) => {
    place(context, shownAt(found, light), x, y)
  }

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(floorOf(office.size, office.floor, light), 0, 0, width, height)

  // Quien anda: dónde y cómo, antes de nada (su sombra se quita de la luz del suelo).
  const walkers = settled
    ? office.people.flatMap((person, index) => {
        const pose = poses[index]

        if (pose === null || pose === undefined || pose.seated || pose.away) return []

        const [x, y] = at(pose.gx, pose.gy)
        const model: ModelId = person.pet ?? 'walker'
        const props: Props =
          person.pet !== undefined
            ? petHeading(person.pet, pose)
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

        return [
          {
            person,
            pose,
            model,
            found: drawn(model, props, frame),
            x: Math.round(x),
            y: Math.round(y),
          },
        ]
      })
    : []

  // La luz (`light.ts`) se calcula una vez por oficina y hora y se guarda: la
  // del suelo, en un lienzo; la del aire, cada una en el suyo. Al recoger o
  // montar la oficina (cambia en cada fotograma), no se guarda.
  const ready =
    settled &&
    baked?.office === office &&
    baked.light === light &&
    baked.width === context.canvas.width
      ? baked
      : null
  const lights = ready ?? bake(context, office, light, frame, propsOf, point)

  if (settled && ready === null) baked = lights

  // La luz del suelo, debajo de todo lo demás: lo que hay encima la tapa.
  // Las sombras de quien anda tampoco se aclaran.
  const breathe = 0.94 + Math.sin(frame * 0.15) * 0.06

  if (lights.floor !== null) {
    let source = lights.floor
    const shades = walkers.flatMap(({ found, x, y }) =>
      found.shade === null ? [] : [{ shade: found.shade, x, y }],
    )
    const work = shades.length > 0 ? layer('work', context) : null

    if (work !== null) {
      work.setTransform(1, 0, 0, 1, 0, 0)
      work.drawImage(lights.floor, 0, 0)
      work.setTransform(DENSITY, 0, 0, DENSITY, 0, 0)
      work.globalCompositeOperation = 'destination-out'
      for (const { shade, x, y } of shades) place(work, shade, x, y)
      source = work.canvas
    }
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'screen'
    context.globalAlpha = breathe
    context.drawImage(source, 0, 0)
    context.restore()
  }

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
    const share = index / Math.max(1, pieces.length)

    if (packed > share) {
      items.push(
        paintPiece(
          put,
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
        put,
        at,
        { ...piece, props: propsOf(piece) },
        frame,
        Math.round((1 - fall) ** 2 * 40),
      ),
    )

    if (seated?.seated === true && seated.bubble !== null) {
      const [x, y] = at(piece.gx, piece.gy)

      said.push({ x, y: y - 16, bubble: seated.bubble })
    }
  })

  for (const { person, pose, model, found, x, y } of walkers) {
    items.push({
      depth: depthOf(model, pose.gx, pose.gy),
      tie: pose.gx + 0.001,
      paint: () => {
        put(found, x, y)
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
  }

  // La luz del aire, en su sitio del orden: después de su pieza y de lo que
  // tiene detrás, antes de lo que tiene delante (que la tapa). La de los
  // monitores, antes que su mesa: el monitor y quien se sienta la tapan.
  for (const air of lights.air) {
    items.push({
      depth: air.depth,
      tie: air.before ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      paint: () => {
        context.save()
        context.globalCompositeOperation = 'screen'
        context.globalAlpha = breathe
        context.drawImage(
          air.canvas,
          air.x,
          air.y,
          air.canvas.width / DENSITY,
          air.canvas.height / DENSITY,
        )
        context.restore()
      },
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

  motes(context, office.size, light, frame, point)
  garland(context, office.size, light, frame, point)

  for (const { x, y, bubble } of said) {
    context.drawImage(
      bubbleOf(bubble),
      Math.round(x - BUBBLE_WIDTH / 2),
      Math.round(y - BUBBLE_HEIGHT),
    )
  }
}

/** La luz calculada de una oficina a una hora: la del suelo y la del aire. */
type Baked = {
  office: Office
  light: Daylight
  width: number
  floor: HTMLCanvasElement | null
  air: AirLight[]
}

/** La última luz calculada (`paintOffice`). */
let baked: Baked | null = null

/**
 * Calcula la luz de una oficina a una hora: la del suelo, sin las sombras de
 * lo que hay colocado (ahí no llega), y la del aire, cada una en su lienzo.
 */
function bake(
  context: CanvasRenderingContext2D,
  office: Office,
  light: Daylight,
  frame: number,
  propsOf: (piece: Piece) => Props,
  point: Point,
): Baked {
  const glow = layer('glow', context)
  let floor: HTMLCanvasElement | null = null

  if (glow !== null) {
    floorLights(glow, office.size, office.pieces, light, point, DENSITY)

    const shadows = layer('shadows', context)

    if (shadows !== null) {
      for (const piece of office.pieces) {
        const { shade } = drawn(piece.model, propsOf(piece), frame)
        const [x, y] = tileOrigin(office.size, piece.gx, piece.gy)

        if (shade !== null) place(shadows, shade, x, y)
      }
      glow.setTransform(1, 0, 0, 1, 0, 0)
      glow.globalCompositeOperation = 'destination-out'
      glow.drawImage(shadows.canvas, 0, 0)
    }

    floor = document.createElement('canvas')
    floor.width = glow.canvas.width
    floor.height = glow.canvas.height
    floor.getContext('2d')?.drawImage(glow.canvas, 0, 0)
  }

  return {
    office,
    light,
    width: context.canvas.width,
    floor,
    air: airLights(office.size, office.pieces, light, point, DENSITY),
  }
}

/** Pone un fotograma dibujado en la escena (y su sombra en la capa de sombras). */
type Put = (found: Drawn, x: number, y: number) => void

/** Un punto del mundo en la escena (`scenePoint` de una oficina). */
type Point = (x: number, y: number, z?: number) => [number, number]

const layers = new Map<string, HTMLCanvasElement>()

/**
 * Un lienzo aparte del tamaño de la escena de `context`, vacío y con su misma
 * escala (`DENSITY`): para las sombras y para la luz. Sin lienzo, `null`.
 */
function layer(name: string, context: CanvasRenderingContext2D): CanvasRenderingContext2D | null {
  const canvas = layers.get(name) ?? document.createElement('canvas')

  layers.set(name, canvas)
  if (canvas.width !== context.canvas.width) canvas.width = context.canvas.width
  if (canvas.height !== context.canvas.height) canvas.height = context.canvas.height

  const found = canvas.getContext('2d')

  if (found === null) return null
  found.setTransform(1, 0, 0, 1, 0, 0)
  found.globalCompositeOperation = 'source-over'
  found.filter = 'none'
  found.clearRect(0, 0, canvas.width, canvas.height)
  found.setTransform(DENSITY, 0, 0, DENSITY, 0, 0)
  found.imageSmoothingEnabled = false

  return found
}

/** Un punto del mundo (en unidades, baldosa de 16) en la escena de una oficina de `size`. */
function scenePoint(size: number, x: number, y: number, z = 0): [number, number] {
  return [size * TILE + 4 + x - y, HEADROOM + (x + y) / 2 - z]
}

/** Sin lo que vale `undefined`: así la clave de lo guardado es la misma. */
function cleanProps(props: Props): Props {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))
}

function paintPiece(
  put: Put,
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
      put(drawn(piece.model, piece.props, frame), x, y - lift)
    },
  }
}

/** El recorte de un modelo: el rectángulo que ocupa en cualquiera de sus fotogramas. */
export function boundsOf(
  model: ModelId,
  props: Props,
): { x: number; y: number; width: number; height: number } {
  let box: [number, number, number, number] = [WIDTH * DENSITY, HEIGHT * DENSITY, 0, 0]
  const count = MODELS[model].frames
  // Cuatro fotogramas repartidos, no todos: dibujarlos es lo que cuesta, y lo
  // que se anima se mueve poco (con un píxel del dibujo de margen, abajo).
  const sample = [...new Set([0, 1, 2, 3].map((part) => Math.floor((count * part) / 4)))]

  for (const frame of sample) {
    const found = drawn(model, props, frame).bounds

    if (found !== null) {
      box = [
        Math.min(box[0], found[0]),
        Math.min(box[1], found[1]),
        Math.max(box[2], found[2]),
        Math.max(box[3], found[3]),
      ]
    }
  }

  const [x0, y0] = [Math.max(0, box[0] - DENSITY), Math.max(0, box[1] - DENSITY)]
  const [x1, y1] = [
    Math.min(WIDTH * DENSITY - 1, box[2] + DENSITY),
    Math.min(HEIGHT * DENSITY - 1, box[3] + DENSITY),
  ]

  return { x: x0, y: y0, width: Math.max(1, x1 - x0 + 1), height: Math.max(1, y1 - y0 + 1) }
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
