import type { Axis } from '@sanatorio/startup'

import { AXIS_SHADES, HAIR, PLAIN, SKIN } from './palette'
import { INK } from './sprite'
import type { Sprite } from './sprite'

/** Lo que mide una persona dibujada, en píxeles. */
export const PERSON_WIDTH = 10
export const PERSON_HEIGHT = 13

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

const pick = <T>(list: readonly T[], look: number, step = 1): T =>
  list[Math.floor(look / step) % list.length] as T

/**
 * Una persona a partir de (x, y) del lienzo. Piel, pelo y peinado salen de
 * `look` (0-999, del login o del candidato); la ropa, del modelo de negocio en
 * el que es especialista. Con `blink`, los ojos cerrados.
 */
export function drawPerson(
  sprite: Sprite,
  x: number,
  y: number,
  { look, axis, blink = false }: { look: number; axis: Axis | null; blink?: boolean },
): void {
  const cells = BODY.map((row) => row.split(''))

  pick(HAIRCUTS, look, 30)(cells)

  const [skin, shade] = pick(SKIN, look)
  const [, shirt, fold] = axis === null ? PLAIN : AXIS_SHADES[axis]

  sprite.grid(
    cells.map((row) => row.join('')),
    { h: pick(HAIR, look, 5), s: skin, n: shade, e: blink ? skin : INK, c: shirt, a: fold },
    x,
    y,
  )
}
