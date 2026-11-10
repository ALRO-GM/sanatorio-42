/**
 * Los dibujos en píxeles de la startup (`features/focus/startup/pixel`): el
 * motor, la oficina que sale de cada partida y que ningún modelo se salga de
 * su lienzo, sea cual sea su nivel o su fotograma.
 */
import { DECOR, EMPTY_STARTUP, canPlace } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'
import { describe, expect, it } from 'vitest'

import { officeOf, ROOM } from '../../src/features/focus/startup/pixel/layout'
import { friendsOf, lifeOf, poseAt } from '../../src/features/focus/startup/pixel/life'
import { MODELS } from '../../src/features/focus/startup/pixel/models'
import type { ModelId } from '../../src/features/focus/startup/pixel/models'
import { byDepth, depthOf, tileAt, tileOrigin } from '../../src/features/focus/startup/pixel/paint'
import { INK, Sprite } from '../../src/features/focus/startup/pixel/sprite'
import { drawTower, towerOf, towerSize } from '../../src/features/focus/startup/pixel/tower'

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
    vida: {
      ...EMPTY_STARTUP,
      levels: { 'learn-ai': 5, computer: 4, space: 3, servers: 3 },
      milestones: ['side', 'mvp', 'founded'],
      team: [
        ...hires(5),
        ...(
          ['reception', 'cleaning', 'delivery', 'kitchen', 'security', 'maintenance'] as const
        ).map((role, look) => ({ axis: 'ai' as const, stars: 1, look, role })),
      ],
      decor: [
        { id: 'sofa', at: [7, 4], turn: true },
        { id: 'rug', at: [6, 6], turn: false },
        { id: 'arcade', at: [0, 6], turn: false },
        { id: 'cat', at: null, turn: false },
        { id: 'dog', at: null, turn: false },
      ],
    },
    // Decoración por todas partes: la gente se queda sin camino y no pasa nada.
    llena: {
      ...EMPTY_STARTUP,
      team: [...hires(1), { axis: 'ai', stars: 1, look: 3, role: 'cleaning' }],
      decor: Array.from({ length: 16 }, (_, at) => ({
        id: 'cactus',
        at: [at % 4, Math.floor(at / 4)] as const,
        turn: false,
      })),
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
    const walking = office.people.filter((person) => person.desk === undefined).length
    const counters = office.pieces.filter(({ model }) => model === 'reception').length
    const pets = state.decor.filter((piece) => ['cat', 'dog', 'robot'].includes(piece.id)).length

    expect(desks + counters + walking + office.hidden).toBe(state.team.length + 1 + pets)
  })

  it.each(Object.entries(games))(
    '%s: la gente anda por baldosas libres y vuelve a su sitio',
    (_name, state) => {
      const office = officeOf(state, 321)
      const plans = lifeOf(office, 1.2)
      const blocked = new Set(
        office.pieces
          .filter(({ model }) => model !== 'rug')
          .map(({ gx, gy }) => `${String(gx)},${String(gy)}`),
      )

      expect(plans).toHaveLength(office.people.length)

      for (const [index, plan] of plans.entries()) {
        expect(plan.total).toBeGreaterThan(0)

        for (let frame = 0; frame < plan.total; frame += 1) {
          const pose = poseAt(plan, frame)

          // Mismo fotograma, misma postura; el plan se repite.
          expect(poseAt(plan, frame + plan.total)).toEqual(pose)

          if (pose.away) continue
          if (pose.seated) {
            expect(office.people[index]?.desk).toEqual([pose.gx, pose.gy])
            continue
          }

          // Andando: en una baldosa de la oficina y nunca dentro de algo (sí al levantarse de su mesa).
          const tile = `${String(Math.round(pose.gx))},${String(Math.round(pose.gy))}`
          const desk = office.people[index]?.desk

          expect(pose.gx).toBeGreaterThanOrEqual(0)
          expect(pose.gx).toBeLessThan(office.size)
          if (desk === undefined || tile !== `${String(desk[0])},${String(desk[1])}`) {
            if (Number.isInteger(pose.gx) && Number.isInteger(pose.gy))
              expect(blocked.has(tile), tile).toBe(false)
          }
        }
      }
    },
  )

  it('al empezar: tu cuarto de madera, quien fundó en su mesa y un cactus', () => {
    const office = officeOf(EMPTY_STARTUP, 321)

    expect(office.size).toBe(ROOM[0])
    expect(office.floor).toBe('planks')
    expect(office.pieces).toContainEqual({
      model: 'workstation',
      gx: 1,
      gy: 1,
      props: { level: 0, look: 321, axis: null, busy: true },
      seat: 0,
      fixture: 'desk:0',
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

describe('el mundo vivo', () => {
  it('cada pieza de decoración tiene su dibujo', () => {
    for (const item of DECOR) expect(item.id in MODELS, item.id).toBe(true)
  })

  it('la decoración colocada sale donde dice la partida, girada si lo está', () => {
    const state: StartupState = {
      ...EMPTY_STARTUP,
      decor: [
        { id: 'lamp', at: [0, 2], turn: true },
        { id: 'guitar', at: null, turn: false },
      ],
    }
    const office = officeOf(state, 1)

    expect(office.pieces).toContainEqual({
      model: 'lamp',
      gx: 0,
      gy: 2,
      props: { turn: true },
      decor: 0,
    })
    expect(office.pieces.some(({ model }) => model === 'guitar')).toBe(false)
    // Lo ganado no se pone encima de lo colocado a mano.
    expect(office.pieces.filter(({ gx, gy }) => gx === 0 && gy === 2)).toHaveLength(1)
    // Lo que el motor deja colocar es lo que la oficina tiene libre.
    expect(canPlace(state, 0, 1, 1)).toBe(false)
  })

  it('girar un modelo lo refleja y le cambia la luz', () => {
    const plain = new Sprite(40, 76, 20, 58)
    const turned = new Sprite(40, 76, 20, 58)

    turned.turned = true
    MODELS.sofa.draw(plain, 0, {})
    MODELS.sofa.draw(turned, 0, {})

    expect(turned.pixels).not.toEqual(plain.pixels)
    expect(new Set(turned.pixels)).toEqual(new Set(plain.pixels))
  })

  it('tocar una baldosa da esa baldosa; fuera del suelo, nada', () => {
    for (const [gx, gy] of [
      [0, 0],
      [3, 1],
      [5, 5],
    ] as const) {
      const [x, y] = tileOrigin(6, gx, gy)

      // El centro del rombo de la baldosa.
      expect(tileAt(6, x, y + 8)).toEqual([gx, gy])
    }
    expect(tileAt(6, 0, 0)).toBeNull()
    expect(tileAt(6, 9999, 9999)).toBeNull()
  })

  it('las relaciones salen siempre igual y nadie es su propia amistad', () => {
    const office = officeOf({ ...EMPTY_STARTUP, team: hires(4) }, 9)
    const friends = friendsOf(office.people)

    expect(friendsOf(office.people)).toEqual(friends)
    friends.forEach((one, index) => {
      expect(one?.friend).not.toBe(index)
      expect(one?.affinity).toBeGreaterThanOrEqual(0)
    })
    expect(friendsOf(officeOf(EMPTY_STARTUP, 9).people)).toEqual([null])
  })

  it('el edificio crece con lo comprado y cabe en su dibujo', () => {
    expect(towerOf({ ...EMPTY_STARTUP, levels: { space: 3 } })).toBeNull()

    const tower = towerOf({
      ...EMPTY_STARTUP,
      levels: { space: 5, floors: 4, basement: 3, solar: 2, rooftop: 2 },
    })

    expect(tower).toEqual({ storeys: 8, basements: 3, solar: 2, rooftop: 2 })

    for (const night of [false, true]) {
      const sprite = drawTower(
        tower ?? { storeys: 2, basements: 0, solar: 0, rooftop: 0 },
        5,
        night,
      )
      const [x0, y0, x1, y1] = sprite.bounds() ?? [0, 0, 0, 0]
      const { width, height } = towerSize(
        tower ?? { storeys: 2, basements: 0, solar: 0, rooftop: 0 },
      )

      expect(x0).toBeGreaterThan(0)
      expect(y0).toBeGreaterThan(0)
      expect(x1).toBeLessThan(width - 1)
      expect(y1).toBeLessThan(height - 1)
    }
  })
})

describe('16 bits (2026-11-09)', () => {
  const render = (scale: 1 | 2, frame: number, step = 1) => {
    const sprite = new Sprite(40, 76, 20, 58, scale, scale === 2)
    const model = MODELS.walker
    const props = { look: 412, axis: 'front' as const, step }

    if (scale === 2 && model.hd !== undefined) model.hd.draw(sprite, frame, props)
    else model.draw(sprite, frame, props)

    return sprite.outline()
  }

  it('el mismo modelo sale al doble de resolución y del mismo tamaño', () => {
    const low = render(1, 0).bounds()
    const high = render(2, 0).bounds()

    expect(low).not.toBeNull()
    expect(high).not.toBeNull()
    // Lo pintado ocupa lo mismo (en píxeles del dibujo), con un píxel de margen.
    expect(Math.abs((high?.[3] ?? 0) / 2 - (low?.[3] ?? 0))).toBeLessThanOrEqual(1)
    expect(Math.abs((high?.[2] ?? 0) / 2 - (low?.[2] ?? 0))).toBeLessThanOrEqual(1)
  })

  it('quien anda en 16 bits tiene cuatro fases distintas; quieto, una', () => {
    const shots = [0, 1, 2, 3].map((frame) => render(2, frame).pixels.join(','))

    expect(new Set(shots).size).toBe(4)
    expect(new Set([0, 1, 2, 3].map((frame) => render(2, frame, 0).pixels.join(','))).size).toBe(1)
  })

  it('cualquier modelo se dibuja en 16 bits sin dibujo propio', () => {
    for (const id of Object.keys(MODELS) as (keyof typeof MODELS)[]) {
      const sprite = new Sprite(40, 76, 20, 58, 2, true)

      MODELS[id].draw(sprite, 0, {})
      expect(sprite.outline().bounds(), id).not.toBeNull()
    }
  })
})

describe('el orden de pintado', () => {
  /** Un cuadrado de una baldosa con la esquina de atrás en (gx, gy): quieto o andando. */
  const square = (
    name: string,
    gx: number,
    gy: number,
    model: ModelId = 'sofa',
    walking = false,
  ) => ({
    name,
    depth: depthOf(model, gx, gy),
    tie: gx + (walking ? 0.001 : 0),
    paint: () => undefined,
    gx,
    gy,
  })
  const order = (...items: ReturnType<typeof square>[]) =>
    [...items].sort(byDepth).map((item) => item.name)

  it('quien pasa junto a una mesa que tiene delante no se le pinta encima', () => {
    // Bajando de (3, 3) a (3, 4), a medio camino, con una mesa en (4, 3): la mesa está delante.
    expect(order(square('mesa', 4, 3), square('andando', 3, 3.5, 'walker', true))).toEqual([
      'andando',
      'mesa',
    ])
    // Y una que queda detrás, en (2, 3), se pinta antes.
    expect(order(square('andando', 3, 3.5, 'walker', true), square('mesa', 2, 3))).toEqual([
      'mesa',
      'andando',
    ])
  })

  it('las alfombras van debajo de todo, también de quien está detrás', () => {
    expect(order(square('andando', 2, 2, 'walker', true), square('alfombra', 3, 3, 'rug'))).toEqual(
      ['alfombra', 'andando'],
    )
    expect(order(square('alfombra', 1, 1, 'rug'), square('encima', 1, 1, 'walker', true))).toEqual([
      'alfombra',
      'encima',
    ])
  })

  it('de dos cuadrados que no se pisan y se tapan en pantalla, el de delante va después', () => {
    // Delante en el mundo: separado por x o por y hacia abajo. Se tapan si están cerca en pantalla.
    for (let i = 0; i < 400; i += 1) {
      const a = square('a', (i * 7) % 6, (i * 11) % 6)
      const b = square('b', ((i * 13) % 50) / 10, ((i * 17) % 50) / 10, 'walker', true)
      const apart = Math.abs(a.gx - b.gx) >= 1 || Math.abs(a.gy - b.gy) >= 1
      const near = Math.abs(a.gx - a.gy - (b.gx - b.gy)) < 2

      if (!apart || !near) continue

      const front = a.gx >= b.gx + 1 || a.gy >= b.gy + 1 ? 'a' : 'b'

      expect(order(a, b)[1]).toBe(front)
    }
  })
})
