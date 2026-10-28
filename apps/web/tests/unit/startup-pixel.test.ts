/**
 * Los dibujos en píxeles de la startup (`features/focus/startup/pixel`): el
 * motor, la oficina que sale de cada partida y que ningún modelo se salga de
 * su lienzo, sea cual sea su nivel o su fotograma.
 */
import { EMPTY_STARTUP } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'
import { describe, expect, it } from 'vitest'

import { officeOf, ROOM } from '../../src/features/focus/startup/pixel/layout'
import { MODELS } from '../../src/features/focus/startup/pixel/models'
import type { ModelId } from '../../src/features/focus/startup/pixel/models'
import { INK, Sprite } from '../../src/features/focus/startup/pixel/sprite'

const hires = (count: number): StartupState['team'] =>
  Array.from({ length: count }, (_, index) => ({ axis: 'ai', stars: 1, look: index % 1000 }))

const filled = (sprite: Sprite): number => sprite.pixels.filter((color) => color !== null).length

describe('motor de píxeles', () => {
  it('una caja pinta sus tres caras y el contorno la rodea', () => {
    const sprite = new Sprite(40, 40, 20, 20)

    sprite.box(0, 0, 0, 16, 16, 8, ['#ffffff', '#888888', '#444444'])

    const colors = new Set(sprite.pixels)

    expect(colors).toEqual(new Set([null, '#ffffff', '#888888', '#444444']))

    const before = filled(sprite)

    sprite.outline()

    expect(filled(sprite)).toBeGreaterThan(before)
    expect(sprite.pixels).toContain(INK)
  })

  // Con el centro de cada píxel, el rombo sale un pelo más estrecho: las juntas cierran el hueco.
  it('una baldosa del suelo mide unos 32 × 16 píxeles', () => {
    const sprite = new Sprite(40, 24, 20, 2)

    sprite.faceZ(0, 0, 16, 0, 16, '#123456')

    const box = sprite.bounds()

    expect(box).not.toBeNull()

    const [x0, y0, x1, y1] = box ?? [0, 0, 0, 0]

    expect(x1 - x0 + 1).toBeGreaterThanOrEqual(30)
    expect(x1 - x0 + 1).toBeLessThanOrEqual(33)
    expect(y1 - y0 + 1).toBeGreaterThanOrEqual(14)
    expect(y1 - y0 + 1).toBeLessThanOrEqual(17)
  })

  it('vacío, sin recorte; fuera del lienzo, no pinta ni rompe', () => {
    const sprite = new Sprite(8, 8, 4, 4)

    expect(sprite.bounds()).toBeNull()

    sprite.set(-5, 3, '#000000')
    sprite.set(100, 100, '#000000')
    sprite.box(500, 500, 0, 16, 16, 16, ['#111111', '#222222', '#333333'])
    // Una cara sin grosor (de canto) tampoco rompe.
    sprite.faceY(4, 0, 0, 0, 10, '#444444')

    expect(sprite.at(-1, 0)).toBeNull()
    expect(sprite.bounds()).toBeNull()
  })

  it('los píxeles escritos a mano respetan los huecos', () => {
    const sprite = new Sprite(4, 2, 0, 0)

    sprite.grid(['a.b', '.?a'], { a: '#aa0000', b: '#0000bb' }, 0, 0)

    expect(sprite.at(0, 0)).toBe('#aa0000')
    expect(sprite.at(1, 0)).toBeNull()
    expect(sprite.at(2, 0)).toBe('#0000bb')
    // Una letra sin color en la paleta no pinta.
    expect(sprite.at(1, 1)).toBeNull()
  })
})

describe('modelos', () => {
  const ids = Object.keys(MODELS) as ModelId[]

  it.each(ids)('«%s» cabe en su lienzo en cada nivel y fotograma', (id) => {
    const { frames, draw } = MODELS[id]

    for (const level of [0, 1, 2, 3, 4, 5, 6, 99]) {
      for (let frame = 0; frame < frames; frame += 1) {
        for (const look of [0, 499, 999]) {
          const sprite = new Sprite(40, 76, 20, 58)

          draw(sprite, frame, { level, look, axis: 'data', busy: true })
          sprite.outline()

          const box = sprite.bounds()

          expect(box, `${id} nivel ${String(level)}`).not.toBeNull()

          const [x0, y0, x1, y1] = box ?? [0, 0, 0, 0]

          // Si tocara el borde, estaría cortado.
          expect(x0, `${id} nivel ${String(level)} fotograma ${String(frame)}`).toBeGreaterThan(0)
          expect(y0, `${id} nivel ${String(level)} fotograma ${String(frame)}`).toBeGreaterThan(0)
          expect(x1).toBeLessThan(39)
          expect(y1).toBeLessThan(75)
        }
      }
    }
  })

  it('el mismo fotograma sale siempre igual', () => {
    for (const id of ids) {
      const a = new Sprite(40, 76, 20, 58)
      const b = new Sprite(40, 76, 20, 58)

      MODELS[id].draw(a, 3 % MODELS[id].frames, { level: 2, look: 7 })
      MODELS[id].draw(b, 3 % MODELS[id].frames, { level: 2, look: 7 })

      expect(a.pixels, id).toEqual(b.pixels)
    }
  })
})

describe('la oficina de cada partida', () => {
  const games: Record<string, StartupState> = {
    vacía: EMPTY_STARTUP,
    garaje: { ...EMPTY_STARTUP, levels: { 'learn-front': 2, computer: 1 } },
    fundada: {
      ...EMPTY_STARTUP,
      name: 'Pixelwork',
      levels: { 'learn-ai': 5, computer: 3, space: 2, servers: 3 },
      milestones: ['side', 'mvp', 'founded'],
      team: hires(4),
      rounds: [{ id: 'preseed', luck: 1 }],
    },
    global: {
      ...EMPTY_STARTUP,
      levels: { computer: 5, space: 5, servers: 6, 'learn-infra': 5 },
      milestones: ['side', 'mvp', 'founded', 'global'],
      team: hires(60),
      rounds: (['preseed', 'seed', 'a', 'b', 'c', 'ipo'] as const).map((id) => ({ id, luck: 1 })),
    },
    // Lo que no debería pasar: niveles de más, de menos y una plantilla enorme.
    rara: {
      ...EMPTY_STARTUP,
      levels: { computer: -3, space: 99, servers: 1e6 },
      team: hires(5000),
    },
  }

  it.each(Object.entries(games))('%s: todo dentro y una cosa por baldosa', (_name, state) => {
    const office = officeOf(state, 321)
    const spots = office.pieces.map(({ gx, gy }) => `${String(gx)},${String(gy)}`)

    expect(ROOM).toContain(office.size)
    expect(new Set(spots).size).toBe(spots.length)

    for (const { gx, gy, model } of office.pieces) {
      expect(model in MODELS).toBe(true)
      expect(gx).toBeGreaterThanOrEqual(0)
      expect(gy).toBeGreaterThanOrEqual(0)
      expect(gx).toBeLessThan(office.size)
      expect(gy).toBeLessThan(office.size)
    }

    const desks = office.pieces.filter(({ model }) => model === 'workstation').length

    expect(desks + office.hidden).toBe(state.team.length + 1)
  })

  it('al empezar: el garaje de cemento, quien fundó en su mesa y un cactus', () => {
    const office = officeOf(EMPTY_STARTUP, 321)

    expect(office.size).toBe(ROOM[0])
    expect(office.floor).toBe('concrete')
    expect(office.pieces).toContainEqual({
      model: 'workstation',
      gx: 1,
      gy: 1,
      props: { level: 0, look: 321, axis: null, busy: true },
    })
    expect(office.pieces.map(({ model }) => model)).toContain('cactus')
    expect(office.hidden).toBe(0)
  })

  it('lo ganado se ve: servidores, rondas, bandera y planeta', () => {
    const models = officeOf(games.global ?? EMPTY_STARTUP, 1).pieces.map(({ model }) => model)

    expect(models.filter((model) => model === 'rack')).toHaveLength(3)

    for (const model of ['coins', 'flag', 'globe', 'dashboard', 'whiteboard'] as const) {
      expect(models).toContain(model)
    }
  })

  it('la plantilla quieta no teclea', () => {
    const office = officeOf({ ...EMPTY_STARTUP, team: hires(2) }, 5, false)

    for (const piece of office.pieces.filter(({ model }) => model === 'workstation')) {
      expect(piece.props.busy).toBe(false)
    }
  })
})
