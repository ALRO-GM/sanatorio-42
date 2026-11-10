/**
 * Ver los dibujos en píxeles de la startup sin abrir la web: los pinta con el
 * mismo motor (`features/focus/startup/pixel`) y los guarda en PNG.
 *
 *   npm run pixel -w @sanatorio/web               → todo, en `apps/web/.pixel/`
 *   npm run pixel -w @sanatorio/web -- rack       → un modelo: cada nivel, todos sus fotogramas
 *
 * Sale:
 *
 * - `modelos.png`: todos los modelos, una fila cada uno, del nivel 0 al 5.
 * - `oficina-<etapa>.png`: la oficina de seis partidas de ejemplo, del garaje
 *   al control global.
 * - `<modelo>.png`: con un nombre, sus fotogramas (columnas) por nivel (filas).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

import {
  AVATAR_KEYS,
  AVATAR_PARTS,
  EMPTY_STARTUP,
  avatarKey,
  avatarOf,
  moodOf,
} from '@sanatorio/startup'
import type { Avatar, StartupState } from '@sanatorio/startup'

import { drawBubble } from '../src/features/focus/startup/pixel/bubbles'
import { drawFloor } from '../src/features/focus/startup/pixel/floor'
import { officeOf } from '../src/features/focus/startup/pixel/layout'
import { lifeOf, poseAt } from '../src/features/focus/startup/pixel/life'
import { MODELS } from '../src/features/focus/startup/pixel/models'
import { petHeading } from '../src/features/focus/startup/pixel/models/pets'
import type { ModelId, Props } from '../src/features/focus/startup/pixel/models'
import { DENSITY, depthOf } from '../src/features/focus/startup/pixel/paint'
import { Sprite, TILE } from '../src/features/focus/startup/pixel/sprite'
import { toonOf } from '../src/features/focus/startup/pixel/toon'
import { drawTower, towerOf } from '../src/features/focus/startup/pixel/tower'

const BACKGROUND: readonly [number, number, number] = [0xe7, 0xe3, 0xec]
/** Lo que mide el lienzo de un modelo, como en `paint.ts` (en píxeles del dibujo). */
const CELL = { width: 40, height: 76, ox: 20, oy: 58 }
const HEADROOM = 46
const LEVELS = [0, 1, 2, 3, 4, 5]
/** Lo que llevan los modelos de ejemplo: alguien sentado, de IA, tecleando. */
const SAMPLE: Props = { look: 123, axis: 'ai', busy: true }

const out = join(import.meta.dirname, '..', '.pixel')

function model(id: ModelId, props: Props, frame: number): Sprite {
  const sprite = new Sprite(CELL.width, CELL.height, CELL.ox, CELL.oy, DENSITY)
  const { frames, draw } = MODELS[id]

  sprite.turned = props.turn === true
  draw(sprite, frame % frames, props)

  return sprite.finish()
}

/** Una imagen RGBA en la que se pegan dibujos (con su transparencia, para las sombras). */
class Picture {
  readonly data: Uint8Array

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 3)
    for (let i = 0; i < width * height; i += 1) this.data.set(BACKGROUND, i * 3)
  }

  /** Pega los píxeles de `from` (de verdad) con su esquina en (x, y), `zoom` veces más grandes. */
  paste(from: Sprite, x: number, y: number, zoom = 1): void {
    for (let row = 0; row < from.ph; row += 1) {
      for (let column = 0; column < from.pw; column += 1) {
        const color = from.at(column, row)

        if (color === null) continue

        const [rgb, alpha] = parse(color)

        for (let b = 0; b < zoom; b += 1) {
          for (let a = 0; a < zoom; a += 1)
            this.blend(x + column * zoom + a, y + row * zoom + b, rgb, alpha)
        }
      }
    }
  }

  private blend(x: number, y: number, rgb: readonly number[], alpha: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return

    const at = (y * this.width + x) * 3

    for (let c = 0; c < 3; c += 1) {
      this.data[at + c] = Math.round((this.data[at + c] ?? 0) * (1 - alpha) + (rgb[c] ?? 0) * alpha)
    }
  }
}

/** Un color `#rrggbb` o `rgba(r, g, b, a)` en sus canales y su opacidad. */
function parse(color: string): [number[], number] {
  if (color.startsWith('#')) {
    const value = parseInt(color.slice(1, 7), 16)

    return [[(value >> 16) & 255, (value >> 8) & 255, value & 255], 1]
  }

  const parts = color.slice(5, -1).split(',').map(Number)

  return [parts.slice(0, 3), parts[3] ?? 1]
}

/** La oficina de una partida en el fotograma `frame`, con la gente donde esté entonces. */
function office(state: StartupState, frame: number): Picture {
  const room = officeOf(state, 500)
  const { size, floor, pieces, people } = room
  const poses = lifeOf(room, moodOf(state)).map((plan) => poseAt(plan, frame))
  const sx = size * TILE + 4
  const [width, height] = [size * 2 * TILE + 8, size * TILE + HEADROOM + 6]
  const picture = new Picture(width * DENSITY, height * DENSITY)
  const ground = new Sprite(width, height, sx, HEADROOM, DENSITY)
  const at = (gx: number, gy: number): [number, number] => [
    sx + (gx - gy) * TILE,
    HEADROOM + ((gx + gy) * TILE) / 2,
  ]
  const drawables: { depth: number; tie: number; sprite: Sprite; gx: number; gy: number }[] = []

  drawFloor(ground, size, floor)
  picture.paste(ground, 0, 0)

  for (const piece of pieces) {
    const pose = piece.seat === undefined ? undefined : poses[piece.seat]
    const props =
      pose !== undefined && !pose.seated ? { ...piece.props, look: undefined } : piece.props

    drawables.push({
      depth: depthOf(piece.model, piece.gx, piece.gy),
      tie: piece.gx,
      sprite: model(piece.model, props as Props, frame),
      gx: piece.gx,
      gy: piece.gy,
    })
  }

  people.forEach((person, index) => {
    const pose = poses[index]

    if (pose === undefined || pose.seated || pose.away) return

    const id = person.pet ?? 'walker'

    drawables.push({
      depth: depthOf(id, pose.gx, pose.gy),
      tie: pose.gx + 0.001,
      sprite: model(
        id,
        { ...person, step: pose.step, back: pose.back, turn: pose.turn, carry: pose.carry },
        frame,
      ),
      gx: pose.gx,
      gy: pose.gy,
    })
  })

  for (const { sprite, gx, gy } of drawables.sort((a, b) => a.depth - b.depth || a.tie - b.tie)) {
    const [x, y] = at(gx, gy)

    picture.paste(sprite, Math.round((x - CELL.ox) * DENSITY), Math.round((y - CELL.oy) * DENSITY))
  }

  people.forEach((person, index) => {
    const pose = poses[index]

    if (pose?.bubble === null || pose === undefined) return

    const [x, y] = at(pose.gx, pose.gy)
    const head = pose.seated ? y - 16 : y + 8 - (person.pet === undefined ? 20 : 8)
    const bubble = new Sprite(12, 13, 0, 0)

    drawBubble(bubble, 1, 1, pose.bubble)
    picture.paste(
      bubble.outline(),
      Math.round((x - 6) * DENSITY),
      Math.round((head - 12) * DENSITY),
      DENSITY,
    )
  })

  return picture
}

/** Una tabla de dibujos: `cells[fila][columna]`. */
function grid(cells: Sprite[][]): Picture {
  const columns = Math.max(...cells.map((row) => row.length))
  const [w, h] = [(CELL.width + 2) * DENSITY, (CELL.height + 2) * DENSITY]
  const sheet = new Picture(columns * w, cells.length * h)

  cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      sheet.paste(cell, x * w, y * h)
    })
  })

  return sheet
}

function save(name: string, picture: Picture): void {
  const { width, height } = picture
  const raw = Buffer.alloc((width * 3 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    raw.set(picture.data.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  }

  const header = Buffer.alloc(13)

  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(2, 9)

  const file = join(out, `${name}.png`)

  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
  console.warn(file)
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)

  length.writeUInt32BE(data.length)
  sum.writeUInt32BE(crc32(body))

  return Buffer.concat([length, body, sum])
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff

  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }

  return (crc ^ 0xffffffff) >>> 0
}

/**
 * El configurador: cada parte del aspecto (una fila), con todas sus opciones
 * sobre un mismo personaje de base.
 */
function people(): Picture {
  const base: Avatar = avatarOf(412)
  const rows = AVATAR_KEYS.map((part) =>
    Array.from({ length: AVATAR_PARTS[part] }, (_, option) =>
      model('person', { avatar: avatarKey({ ...base, [part]: option }) }, 1),
    ),
  )

  return grid(rows)
}

/**
 * Hacia dónde mira quien anda: una fila por modelo (persona, gato, perro,
 * robot) y una columna por sentido, con `back` y `turn` como en `life.ts`:
 * +x (abajo a la derecha), +y (abajo a la izquierda), -x (arriba a la
 * izquierda) y -y (arriba a la derecha).
 */
function headings(): Picture {
  const moves = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ] as const
  const poseOf = (dx: number, dy: number) => ({
    step: 1,
    back: dx < 0 || dy < 0,
    turn: dx - dy > 0,
  })
  const rows = (['walker', 'cat', 'dog', 'robot'] as const).map((id) =>
    moves.map(([dx, dy]) => {
      const pose = poseOf(dx, dy)

      return model(
        id,
        id === 'walker' ? { ...pose, avatar: avatarKey(avatarOf(412)) } : petHeading(id, pose),
        2,
      )
    }),
  )

  return grid(rows)
}

/**
 * Los retratos del configurador (`AvatarPortrait`): la figura dibujada a ×3,
 * no agrandada, con pecas, gafas y barba para ver los detalles pequeños.
 */
function portraits(): Picture {
  const zoom = 3
  const looks = [412, 77, 905, 260]
  const cells = looks.map((look) => {
    const toon = toonOf({
      avatar: { ...avatarOf(look), freckles: 1, glasses: look % 2 },
      k: (zoom * DENSITY) / 2,
    })
    const sprite = new Sprite(20 * zoom, 22 * zoom, 10 * zoom, 21 * zoom, DENSITY)

    sprite.figure(toon.pixels, toon.w, toon.h, 0, 0, 0)

    return sprite
  })
  const width = 20 * zoom * DENSITY
  const sheet = new Picture(cells.length * width, 22 * zoom * DENSITY)

  cells.forEach((cell, index) => {
    sheet.paste(cell, index * width, 0)
  })

  return sheet
}

/** Seis partidas, del garaje al control global. */
const GAMES: Record<string, StartupState> = {
  garaje: { ...EMPTY_STARTUP, levels: { 'learn-front': 2, computer: 1 } },
  proyecto: { ...EMPTY_STARTUP, levels: { 'learn-front': 3, computer: 2 }, milestones: ['side'] },
  mvp: {
    ...EMPTY_STARTUP,
    levels: { 'learn-front': 4, 'learn-back': 3, computer: 3, servers: 1 },
    milestones: ['side', 'mvp'],
    team: [{ axis: 'back', stars: 2, look: 77 }],
  },
  fundada: {
    ...EMPTY_STARTUP,
    name: 'Pixelwork',
    levels: { 'learn-ai': 5, 'learn-back': 3, computer: 3, space: 2, servers: 3 },
    milestones: ['side', 'mvp', 'founded'],
    team: [77, 412, 905, 260].map((look, index) => ({
      axis: index % 2 === 0 ? 'ai' : 'data',
      stars: 2,
      look,
    })),
    rounds: [
      { id: 'preseed', luck: 1 },
      { id: 'seed', luck: 1.2 },
    ],
  },
  // La oficina grande con el resto de la plantilla, decoración y mascotas.
  vida: {
    ...EMPTY_STARTUP,
    name: 'Pixelwork',
    levels: { 'learn-ai': 5, computer: 4, space: 3, servers: 3, 'product-bot': 1 },
    milestones: ['side', 'mvp', 'founded'],
    team: [
      ...[77, 412, 905, 260, 640].map((look) => ({ axis: 'ai' as const, stars: 2, look })),
      ...(['reception', 'cleaning', 'delivery', 'kitchen', 'security'] as const).map(
        (role, index) => ({
          axis: 'ai' as const,
          stars: 1,
          look: 100 + index * 151,
          role,
        }),
      ),
    ],
    decor: [
      { id: 'sofa', at: [7, 4], turn: true },
      { id: 'rug', at: [6, 6], turn: false },
      { id: 'arcade', at: [0, 6], turn: false },
      { id: 'aquarium', at: [3, 7], turn: false },
      { id: 'neon', at: [4, 0], turn: false },
      { id: 'cat', at: null, turn: false },
      { id: 'robot', at: null, turn: false },
    ],
  },
  global: {
    ...EMPTY_STARTUP,
    name: 'Pixelwork',
    levels: {
      'learn-ai': 5,
      'learn-infra': 5,
      'learn-data': 5,
      computer: 5,
      space: 5,
      servers: 6,
      floors: 2,
      basement: 2,
      solar: 2,
      rooftop: 2,
    },
    milestones: ['side', 'mvp', 'founded', 'global'],
    team: Array.from({ length: 30 }, (_, index) => ({
      axis: index % 3 === 0 ? 'infra' : 'ai',
      stars: 3,
      look: (index * 137) % 1000,
    })),
    rounds: (['preseed', 'seed', 'a', 'b', 'c', 'ipo'] as const).map((id) => ({ id, luck: 1 })),
  },
}

mkdirSync(out, { recursive: true })

const only = process.argv[2] as ModelId | undefined

if (only !== undefined) {
  if (!(only in MODELS))
    throw new Error(`No hay ningún modelo «${only}»: ${Object.keys(MODELS).join(', ')}`)

  const frames = Array.from({ length: MODELS[only].frames }, (_, frame) => frame)

  save(
    only,
    grid(LEVELS.map((level) => frames.map((frame) => model(only, { ...SAMPLE, level }, frame)))),
  )
} else {
  const ids = Object.keys(MODELS) as ModelId[]

  save('modelos', grid(ids.map((id) => LEVELS.map((level) => model(id, { ...SAMPLE, level }, 1)))))
  save('gente', people())
  save('sentidos', headings())
  save('retratos', portraits())

  for (const [name, state] of Object.entries(GAMES)) {
    // Tres momentos de cada oficina: la gente se mueve.
    for (const frame of [0, 40, 120]) save(`oficina-${name}-${String(frame)}`, office(state, frame))

    const tower = towerOf(state)

    if (tower !== null) {
      const building = drawTower(tower, 0, true)
      const picture = new Picture(building.pw, building.ph)

      picture.paste(building, 0, 0)
      save(`edificio-${name}`, picture)
    }
  }
}
