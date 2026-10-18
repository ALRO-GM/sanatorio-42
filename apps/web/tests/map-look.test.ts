import { describe, expect, it } from 'vitest'

import type { MapSeat } from '@sanatorio/contracts'

import {
  DEFAULT_LOOK,
  loadLook,
  lookClasses,
  matesOf,
  order,
  saveLook,
} from '../src/features/map/look'

const me = { circle: 2, projects: ['ft_printf'] }

/** Quien ocupa un puesto de prueba. */
const who = (
  occupant: Partial<NonNullable<MapSeat['occupant']>>,
): NonNullable<MapSeat['occupant']> => {
  const found = seat(occupant).occupant

  if (found === null) throw new Error('sin ocupante')

  return found
}

const seat = (occupant: Partial<NonNullable<MapSeat['occupant']>> | null): MapSeat => ({
  host: 'c1r1s1',
  row: 1,
  seat: 1,
  reservation: null,
  broken: null,
  occupant:
    occupant === null
      ? null
      : {
          login: 'ana',
          image: null,
          projects: [],
          duty: null,
          me: false,
          online: false,
          circle: null,
          finishedMine: null,
          focusUntil: null,
          ...occupant,
        },
})

describe('cómo se ve el mapa', () => {
  it('sabe qué comparte cada persona con quien mira', () => {
    expect(
      matesOf(who({ circle: 2, projects: ['ft_printf', 'push_swap'], finishedMine: 100 }), me),
    ).toEqual(['circle', 'project', 'done'])
    expect(matesOf(who({ circle: 3, projects: ['minishell'] }), me)).toEqual([])
    // Sin círculo propio conocido no hay «mi círculo».
    expect(matesOf(who({ circle: null }), { circle: null, projects: [] })).toEqual([])
    // Una misma no se resalta.
    expect(matesOf(who({ me: true, circle: 2 }), me)).toEqual([])
  })

  it('resalta lo marcado, apaga lo demás y da brillo a quien sacó un 125', () => {
    const look = { ...DEFAULT_LOOK, mates: ['circle' as const, 'done' as const] }

    expect(lookClasses(seat({ circle: 2 }), me, DEFAULT_LOOK)).toEqual([])
    expect(lookClasses(seat({ circle: 2 }), me, look)).toEqual(['mate-circle'])
    expect(lookClasses(seat({ circle: 5, projects: ['ft_printf'] }), me, look)).toEqual(['dim'])
    expect(lookClasses(seat({ finishedMine: 125 }), me, look)).toEqual(['mate-done', 'perfect'])
    expect(lookClasses(seat({ finishedMine: 100 }), me, look)).toEqual(['mate-done'])
    // Los libres no se tocan.
    expect(lookClasses(seat(null), me, look)).toEqual([])
  })

  it('da la vuelta al plano y recuerda cómo se dejó', () => {
    expect(order(3, false)).toEqual([1, 2, 3])
    expect(order(3, true)).toEqual([3, 2, 1])

    const saved = new Map<string, string>()
    const store = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    }

    expect(loadLook(store)).toEqual(DEFAULT_LOOK)
    saveLook({ flip: true, circles: true, mates: ['project'] }, store)
    expect(loadLook(store)).toEqual({ flip: true, circles: true, mates: ['project'] })
    // Lo que no se entiende se queda fuera.
    saved.set('sanatorio_map_look', '{"flip":"sí","mates":["x","done"]}')
    expect(loadLook(store)).toEqual({ flip: false, circles: false, mates: ['done'] })
    saved.set('sanatorio_map_look', 'no es json')
    expect(loadLook(store)).toEqual(DEFAULT_LOOK)
  })
})
