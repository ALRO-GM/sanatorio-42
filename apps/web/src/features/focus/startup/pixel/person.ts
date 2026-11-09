import type { Axis, Role } from '@sanatorio/startup'

import { AXIS_SHADES, CARDBOARD, HAIR, METAL, PANTS, PLAIN, SHOE, SKIN, UNIFORM } from './palette'
import { INK, scale2x, tint } from './sprite'
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

  drawCarry(sprite, x, y + bob, who.carry)
}

// --- 16 bits ------------------------------------------------------------------

/**
 * Las piernas en 16 bits (el doble de finas), por fase del paso: quieta, un
 * pie delante, cruzando y el otro delante (la cuarta, la segunda al revés).
 * `p` pantalón, `q` su sombra, `k` zapato y `K` su brillo.
 */
const LEGS_HD: readonly (readonly string[])[] = [
  [
    '....pppppppppppp....',
    '....ppppppqppppq....',
    '....pppq....pppq....',
    '....pppq....pppq....',
    '....pppq....pppq....',
    '....pppq....pppq....',
    '....pppq....pppq....',
    '....pppq....pppq....',
    '...Kkkkk...Kkkkk....',
    '...kkkkk...kkkkk....',
  ],
  [
    '....pppppppppppp....',
    '....pppqppppppqq....',
    '...pppq.....pppq....',
    '...pppq......pppq...',
    '..pppq.......pppq...',
    '..pppq........pppq..',
    '..pppq........pppq..',
    '.pppq..........pppq.',
    'Kkkkk..........Kkkkk',
    '.kkkk...........kkkk',
  ],
  [
    '....pppppppppppp....',
    '....pppqpppppppq....',
    '.....pppq..pppq.....',
    '.....pppq..pppq.....',
    '.....pppq..pppq.....',
    '.....pppq..pppq.....',
    '.....pppq...ppq.....',
    '.....pppq...Kkkk....',
    '....Kkkkk...kkkk....',
    '....kkkkk...........',
  ],
]

/** Las celdas de la fase `phase` (0 quieta; 1 a 4, andando). */
function legsHd(phase: number): string[][] {
  const pick = [0, 1, 2, 1, 2][phase % 5] ?? 0
  const rows = (LEGS_HD[pick] ?? []).map((row) => row.split(''))

  // La cuarta fase es la segunda con la otra pierna levantada.
  return phase === 4 ? rows.map((row) => [...row].reverse()) : rows
}

/**
 * Una persona andando en 16 bits, dibujada píxel a píxel (`Sprite.paint`):
 * el medio cuerpo de siempre agrandado con Scale2x y luego retocado (luz
 * desde la izquierda en la ropa, brillo en el pelo, ojos más finos) y unas
 * piernas propias con cuatro fases de paso, los brazos que se balancean y
 * un rebote de medio píxel del 8 bits. Es el ejemplo de modelo hecho a mano
 * para 16 bits (`Model.hd`); los demás salen del motor.
 *
 * @param x, y La esquina de arriba a la izquierda, en píxeles del dibujo.
 * @param phase 0 quieta; 1 a 4, la fase del paso.
 */
export function drawWalkerHd(
  sprite: Sprite,
  x: number,
  y: number,
  who: Who & { phase: number; back: boolean; carry: Carry },
): void {
  const colors = colorsOf(who, false)
  const body = scale2x(upperBody(who, who.back))

  body.forEach((row, j) => {
    row.forEach((cell, i) => {
      // La luz viene de la izquierda: la mitad derecha de la ropa, en sombra.
      if (cell === 'c' && i >= 12) row[i] = 'a'
      // Un brillo en el pelo, arriba a la izquierda.
      if (cell === 'h' && j >= 2 && j <= 5 && i >= 5 && i <= 9) row[i] = 'H'
      // Los ojos, de un píxel de alto: la mitad de arriba es piel.
      if (cell === 'e' && body[j + 1]?.[i] === 'e') row[i] = 's'
      // Las manos se pintan aparte, para balancearlas.
      if (cell === 's' && j >= 24 && (i <= 3 || i >= 16)) row[i] = '.'
    })
  })

  const walking = who.phase > 0
  // Al cruzar las piernas, el cuerpo sube un píxel de 16 bits (medio del de 8).
  const bob = who.phase === 2 || who.phase === 4 ? -1 : 0
  const swing = !walking ? 0 : who.phase === 1 ? 1 : who.phase === 3 ? -1 : 0
  const px = Math.floor(x) * 2
  const py = Math.floor(y) * 2 + bob
  const palette: Record<string, string> = {
    ...colors,
    H: tint(colors.h ?? INK, 0.3),
    K: tint(SHOE, 0.35),
  }
  const put = (cells: readonly (readonly string[])[], ox: number, oy: number): void => {
    cells.forEach((row, j) => {
      row.forEach((cell, i) => {
        const color = palette[cell]
        // Girada, se refleja entera en su ancho (20 píxeles de 16 bits).
        const column = sprite.turned ? 19 - (ox + i) : ox + i

        if (color !== undefined) sprite.paint(px + column, py + oy + j, color)
      })
    })
  }

  put(body, 0, 0)
  put(legsHd(who.phase), 0, 26)
  // Las manos: una adelante y la otra atrás, al revés en cada paso.
  put(
    [
      ['s', 's'],
      ['n', 'n'],
    ],
    2,
    23 + swing,
  )
  put(
    [
      ['s', 's'],
      ['n', 'n'],
    ],
    16,
    23 - swing,
  )

  // Lo que lleva, como en 8 bits (el motor lo suaviza).
  if (who.carry !== null) {
    drawCarry(sprite, x, y, who.carry)
  }
}

/** Lo que alguien lleva en las manos, con la esquina de la persona en (x, y). */
function drawCarry(sprite: Sprite, x: number, y: number, carry: Carry): void {
  switch (carry) {
    case 'box':
      sprite.grid(
        ['.bbbbbb.', 'BbbbbbbB', 'BbbBBbbB', 'BbbbbbbB'],
        { b: CARDBOARD[0], B: CARDBOARD[2] },
        x + 1,
        y + 9,
      )
      break
    case 'tray':
      sprite.grid(['mmmmmmmm', '.w..w...'], { m: METAL[0], w: '#ffffff' }, x + 1, y + 10)
      break
    case 'mop':
      sprite.grid(
        ['.m', '.m', '.m', '.m', '.m', '.m', '.m', 'yyy'],
        { m: '#a8743a', y: '#f2c95c' },
        x + 9,
        y + 9,
      )
      break
    case 'wrench':
      sprite.grid(['mm', '.m', '.m'], { m: METAL[1] }, x + 9, y + 11)
      break
    default:
      break
  }
}
