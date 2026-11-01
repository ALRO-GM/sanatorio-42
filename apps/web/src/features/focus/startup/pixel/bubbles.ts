/**
 * Los bocadillos: lo que se dice sin palabras encima de una cabeza (café,
 * charla, corazón, idea…). Cada uno es un dibujo de 7 × 7 dentro de un globo
 * blanco con su piquito, escrito a mano.
 */
import type { Bubble } from './life'
import { AXIS_SHADES, CARDBOARD, GOLD, LEAF, METAL, RED, STEAM } from './palette'
import { INK } from './sprite'
import type { Sprite } from './sprite'

/** Lo que mide un bocadillo, piquito incluido. */
export const BUBBLE_WIDTH = 11
export const BUBBLE_HEIGHT = 11

const ICONS: Record<Bubble, { rows: readonly string[]; colors: Record<string, string> }> = {
  coffee: {
    rows: ['.s.s...', '..s.s..', '.......', 'ccccc..', 'ccccccc', 'ccccc.c', '.ccc...'],
    colors: { s: '#b9b4c6', c: '#8a5a31' },
  },
  chat: {
    rows: ['.......', '.......', '.......', 'd.d.d..', '.......', '.......', '.......'],
    colors: { d: INK },
  },
  heart: {
    rows: ['.......', '.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'],
    colors: { h: RED },
  },
  idea: {
    rows: ['..yyy..', '.yyyyy.', '.yyyyy.', '..yyy..', '..ggg..', '..ggg..', '.......'],
    colors: { y: GOLD.mid, g: METAL[1] },
  },
  music: {
    rows: ['...nnnn', '...n..n', '...n..n', '...n..n', '.nnn.nn', 'nnnn.nn', '.nn....'],
    colors: { n: AXIS_SHADES.ai[1] },
  },
  zzz: {
    rows: ['....zzz', '.....z.', '....zzz', 'zzz....', '..z....', '.z.....', 'zzz....'],
    colors: { z: AXIS_SHADES.front[1] },
  },
  box: {
    rows: ['.......', 'bbbbbbb', 'bbbtbbb', 'BBBtBBB', 'BBBtBBB', 'BBBBBBB', '.......'],
    colors: { b: CARDBOARD[0], B: CARDBOARD[1], t: '#c9a45a' },
  },
  sparkle: {
    rows: ['...s...', '...s...', '.s.s.s.', 'sssssss', '.s.s.s.', '...s...', '...s...'],
    colors: { s: AXIS_SHADES.front[0] },
  },
  shield: {
    rows: ['sssssss', 'sSSSSSs', 'sSSsSSs', 'sSsssSs', '.sSSSs.', '..sSs..', '...s...'],
    colors: { s: AXIS_SHADES.front[2], S: AXIS_SHADES.front[0] },
  },
  wrench: {
    rows: ['.....ww', '....w.w', '....ww.', '...w...', '..w....', '.w.....', 'w......'],
    colors: { w: METAL[1] },
  },
  happy: {
    rows: ['.ggggg.', 'ggggggg', 'gkgggkg', 'ggggggg', 'gkgggkg', 'ggkkkgg', '.ggggg.'],
    colors: { g: LEAF[2], k: INK },
  },
}

const BALLOON = [
  '.wwwwwwwww.',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  'wwwwwwwwwww',
  '.wwwwwwwww.',
  '...ww......',
  '...w.......',
]

/** Un bocadillo con su esquina de arriba a la izquierda en (x, y) del lienzo. */
export function drawBubble(sprite: Sprite, x: number, y: number, bubble: Bubble): void {
  const icon = ICONS[bubble]

  sprite.grid(BALLOON, { w: STEAM }, x, y)
  sprite.grid(icon.rows, icon.colors, x + 2, y + 1)
}
