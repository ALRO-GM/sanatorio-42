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

import { EMPTY_STARTUP } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import { drawFloor } from '../src/features/focus/startup/pixel/floor'
import { officeOf } from '../src/features/focus/startup/pixel/layout'
import { MODELS } from '../src/features/focus/startup/pixel/models'
import type { ModelId, Props } from '../src/features/focus/startup/pixel/models'
import { Sprite, TILE } from '../src/features/focus/startup/pixel/sprite'

/** Cada píxel, de 3 × 3 en el PNG. */
const SCALE = 3
const BACKGROUND = 0xe7e3ec
/** Lo que mide el lienzo de un modelo, como en `paint.ts`. */
const CELL = { width: 40, height: 76, ox: 20, oy: 58 }
const HEADROOM = 46
const LEVELS = [0, 1, 2, 3, 4, 5]
/** Lo que llevan los modelos de ejemplo: alguien sentado, de IA, tecleando. */
const SAMPLE: Props = { look: 123, axis: 'ai', busy: true }

const out = join(import.meta.dirname, '..', '.pixel')

function model(id: ModelId, props: Props, frame: number): Sprite {
  const sprite = new Sprite(CELL.width, CELL.height, CELL.ox, CELL.oy)
  const { frames, draw } = MODELS[id]

  draw(sprite, frame % frames, props)

  return sprite.outline()
}

/** Copia `from` encima de `to`, con su esquina en (x, y). */
function paste(to: Sprite, from: Sprite, x: number, y: number): void {
  for (let row = 0; row < from.height; row += 1) {
    for (let column = 0; column < from.width; column += 1) {
      const color = from.at(column, row)

      if (color !== null) to.set(x + column, y + row, color)
    }
  }
}

function office(state: StartupState): Sprite {
  const { size, floor, pieces } = officeOf(state, 500)
  const sx = size * TILE + 4
  const scene = new Sprite(size * 2 * TILE + 8, size * TILE + HEADROOM + 6, sx, HEADROOM)

  drawFloor(scene, size, floor)

  for (const piece of [...pieces].sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx)) {
    paste(
      scene,
      model(piece.model, piece.props, 1),
      sx + (piece.gx - piece.gy) * TILE - CELL.ox,
      HEADROOM + ((piece.gx + piece.gy) * TILE) / 2 - CELL.oy,
    )
  }

  return scene
}

/** Una tabla de modelos: `cells[fila][columna]`. */
function grid(cells: Sprite[][]): Sprite {
  const columns = Math.max(...cells.map((row) => row.length))
  const sheet = new Sprite(columns * (CELL.width + 2), cells.length * (CELL.height + 2), 0, 0)

  cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      paste(sheet, cell, x * (CELL.width + 2), y * (CELL.height + 2))
    })
  })

  return sheet
}

function save(name: string, sprite: Sprite): void {
  const width = sprite.width * SCALE
  const height = sprite.height * SCALE
  const raw = Buffer.alloc((width * 4 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = sprite.at(Math.floor(x / SCALE), Math.floor(y / SCALE))
      const value = color === null ? BACKGROUND : parseInt(color.slice(1), 16)
      const at = y * (width * 4 + 1) + 1 + x * 4

      raw.writeUInt32BE(((value << 8) | 0xff) >>> 0, at)
    }
  }

  const header = Buffer.alloc(13)

  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(6, 9)

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
  global: {
    ...EMPTY_STARTUP,
    name: 'Pixelwork',
    levels: { 'learn-ai': 5, 'learn-infra': 5, 'learn-data': 5, computer: 5, space: 5, servers: 6 },
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

  for (const [name, state] of Object.entries(GAMES)) save(`oficina-${name}`, office(state))
}
