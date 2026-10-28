import { LEAF, POT, SOIL } from '../palette'
import type { Model } from './model'

const [DEEP, MID, LIGHT, BRIGHT] = LEAF

/** Una monstera en su maceta: la copa se mece un píxel. */
export const monstera: Model = {
  frames: 8,
  draw(sprite, frame) {
    sprite.box(5, 5, 0, 6, 6, 6, POT)
    sprite.faceZ(6.01, 5.5, 10.5, 5.5, 10.5, SOIL)

    const leaves = [
      '.....g.......',
      '....gGg..g...',
      '...gGLGg.gg..',
      '..gGLLGggGg..',
      '.gGLGGgGLGg..',
      '..gGGgGLLGGg.',
      '.gGLgGGLGGgg.',
      'gGLGg.gGLGGg.',
      '.gGg..gGGgg..',
      '..g....gg....',
      '......g......',
      '......g......',
    ]
    const sway = frame >= 4 ? 1 : 0
    const [x, y] = sprite.project(8, 8, 6)

    leaves.forEach((row, index) => {
      sprite.grid(
        [row],
        { g: DEEP, G: MID, L: LIGHT },
        Math.round(x) - 6 + (index < 5 ? sway : 0),
        Math.round(y) - 12 + index,
      )
    })
  },
}

/** Un cactus pequeño: lo primero que entra en el garaje. */
export const cactus: Model = {
  frames: 1,
  draw(sprite) {
    sprite.box(6, 6, 0, 4, 4, 4, POT)
    sprite.faceZ(4.01, 6.5, 9.5, 6.5, 9.5, SOIL)

    const [x, y] = sprite.project(8, 8, 4)

    sprite.grid(
      ['...g...', '..gLg..', '..gGg.g', 'g.gGg.G', 'G.gGggG', 'GggGGg.', '.gGGg..', '..gGg..'],
      { g: DEEP, G: MID, L: BRIGHT },
      Math.round(x) - 3,
      Math.round(y) - 8,
    )
  },
}
