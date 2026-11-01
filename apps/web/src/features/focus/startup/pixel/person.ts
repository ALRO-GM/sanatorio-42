import type { Axis, Role } from '@sanatorio/startup'

import { AXIS_SHADES, CARDBOARD, HAIR, METAL, PANTS, PLAIN, SHOE, SKIN, UNIFORM } from './palette'
import { INK } from './sprite'
import type { Sprite } from './sprite'

/** Lo que mide una persona dibujada, en píxeles: medio cuerpo (sentada) y entera (de pie). */
export const PERSON_WIDTH = 10
export const PERSON_HEIGHT = 13
export const WALKER_HEIGHT = 18

/**
 * Medio cuerpo, de frente, escrito píxel a píxel: `h` pelo, `s` piel, `n`
 * sombra de la piel, `e` ojos, `c` ropa y `a` su sombra. Los peinados
 * (`HAIRCUTS`) añaden pelo encima.
 */
const BODY = [
  '..........',
  '...hhhh...',
  '..hhhhhh..',
  '..hhhhhh..',
  '..hssssh..',
  '..sesses..',
  '..ssssss..',
  '...snns...',
  '....nn....',
  '..cccccc..',
  '.acccccca.',
  '.acccccca.',
  '.sccccccs.',
]

/** De espaldas: el pelo tapa la cara. */
const BACK_FACE = ['..hhhhhh..', '..hhhhhh..', '..hhhhhh..', '...hhhh...']

/**
 * Las piernas de quien camina, por paso (quieto, un pie delante, el otro):
 * `p` pantalón, `q` su sombra y `k` zapatos.
 */
const LEGS = [
  ['..pppppp..', '..pq..pq..', '..pq..pq..', '..pq..pq..', '..kk..kk..'],
  ['..pppppp..', '..pq..pq..', '.pq....pq.', '.pq....pq.', '.kk.....kk'],
  ['..pppppp..', '...pqpq...', '...pqpq...', '...pqpq...', '...kkkk...'],
]

type Cells = string[][]

/** Pelo donde no hay nada. */
const grow = (cells: Cells, row: number, column: number): void => {
  const line = cells[row]

  if (line?.[column] === '.') line[column] = 'h'
}

/** Los peinados: corto, media melena, moño y rizos. Para añadir uno, otra función aquí. */
const HAIRCUTS: readonly ((cells: Cells) => void)[] = [
  () => undefined,
  (cells) => {
    for (let row = 3; row <= 9; row += 1) {
      grow(cells, row, 1)
      grow(cells, row, 8)
    }
  },
  (cells) => {
    grow(cells, 0, 4)
    grow(cells, 0, 5)
  },
  (cells) => {
    for (let row = 1; row <= 6; row += 1) {
      grow(cells, row, 1)
      grow(cells, row, 8)
    }
    grow(cells, 0, 3)
    grow(cells, 0, 6)
  },
]

/**
 * Lo que lleva en la cabeza cada oficio (`t` es el gorro, `T` su sombra):
 * la gorra de reparto y de seguridad, el gorro de cocina y el casco.
 */
const HATS: Partial<Record<Role, { rows: readonly string[]; colors: [string, string] }>> = {
  delivery: { rows: ['..tttttt..', '..tttttttT'], colors: ['#7a522c', '#5a3a1e'] },
  security: { rows: ['..tttttt..', '.TttttttT.'], colors: ['#20263c', '#11152a'] },
  kitchen: {
    rows: ['..tttttt..', '.tttttttt.', '..TTTTTT..'],
    colors: ['#ffffff', '#d6d2e0'],
  },
  maintenance: { rows: ['...tttt...', '..tttttt..', '.TTTTTTTT.'], colors: ['#ffd04d', '#d9a420'] },
}

const pick = <T>(list: readonly T[], look: number, step = 1): T =>
  list[Math.floor(look / step) % list.length] as T

/** Quién es: su aspecto (0-999), su especialidad o su oficio. */
type Who = { look: number; axis: Axis | null; role?: Role | undefined }

/** La ropa: la del oficio, o la del modelo de negocio de quien programa. */
const clothesOf = ({ axis, role }: Who) =>
  role !== undefined ? UNIFORM[role] : axis === null ? PLAIN : AXIS_SHADES[axis]

/** Las celdas del medio cuerpo, con el peinado, el gorro y, de espaldas, sin cara. */
function upperBody({ look, role }: Who, back: boolean): Cells {
  const cells = BODY.map((row) => row.split(''))

  pick(HAIRCUTS, look, 30)(cells)
  if (back) BACK_FACE.forEach((row, index) => (cells[4 + index] = row.split('')))

  const hat = role === undefined ? undefined : HATS[role]

  hat?.rows.forEach((row, index) => {
    row.split('').forEach((cell, column) => {
      const line = cells[index]

      if (cell !== '.' && line !== undefined) line[column] = cell
    })
  })

  return cells
}

function colorsOf(who: Who, blink: boolean): Record<string, string> {
  const [skin, shade] = pick(SKIN, who.look)
  const [, shirt, fold] = clothesOf(who)
  const hat = who.role === undefined ? undefined : HATS[who.role]

  return {
    h: pick(HAIR, who.look, 5),
    s: skin,
    n: shade,
    e: blink ? skin : INK,
    c: shirt,
    a: fold,
    t: hat?.colors[0] ?? shirt,
    T: hat?.colors[1] ?? fold,
    p: PANTS[0],
    q: PANTS[1],
    k: SHOE,
  }
}

/**
 * Una persona sentada (medio cuerpo) a partir de (x, y) del lienzo. Piel, pelo
 * y peinado salen de `look` (0-999, del login o del candidato); la ropa, del
 * modelo de negocio o del oficio. Con `blink`, los ojos cerrados.
 */
export function drawPerson(
  sprite: Sprite,
  x: number,
  y: number,
  who: Who & { blink?: boolean },
): void {
  sprite.grid(
    upperBody(who, false).map((row) => row.join('')),
    colorsOf(who, who.blink === true),
    x,
    y,
  )
}

/** Lo que alguien lleva en las manos mientras camina. */
export type Carry = 'box' | 'mop' | 'wrench' | 'tray' | null

/**
 * Una persona de pie, entera, con los pies en (x, y + 18): `step` es el paso
 * (0 quieta, 1 y 2 andando), `back` si va de espaldas y `carry` lo que lleva.
 */
export function drawWalker(
  sprite: Sprite,
  x: number,
  y: number,
  who: Who & { step: number; back: boolean; carry: Carry },
): void {
  const legs = LEGS[who.step % LEGS.length] ?? []
  const rows = [...upperBody(who, who.back).map((row) => row.join('')), ...legs]

  // Al andar, un píxel arriba y abajo.
  const bob = who.step === 1 ? -1 : 0

  sprite.grid(rows, colorsOf(who, false), x, y + bob)

  switch (who.carry) {
    case 'box':
      sprite.grid(
        ['.bbbbbb.', 'BbbbbbbB', 'BbbBBbbB', 'BbbbbbbB'],
        { b: CARDBOARD[0], B: CARDBOARD[2] },
        x + 1,
        y + 9 + bob,
      )
      break
    case 'tray':
      sprite.grid(['mmmmmmmm', '.w..w...'], { m: METAL[0], w: '#ffffff' }, x + 1, y + 10 + bob)
      break
    case 'mop':
      sprite.grid(
        ['.m', '.m', '.m', '.m', '.m', '.m', '.m', 'yyy'],
        { m: '#a8743a', y: '#f2c95c' },
        x + 9,
        y + 9 + bob,
      )
      break
    case 'wrench':
      sprite.grid(['mm', '.m', '.m'], { m: METAL[1] }, x + 9, y + 11 + bob)
      break
    default:
      break
  }
}
