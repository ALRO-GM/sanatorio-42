/**
 * Tests de la velocidad de las demostraciones: lo que hace la gente con el
 * deslizador mueve la velocidad de fábrica.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { meanRate, VOTES_TO_ADJUST } from '../../src/modules/tours/tours.service.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('velocidad de las demostraciones', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  /** `count` personas distintas ven la demostración a esa velocidad. */
  const watch = async (name: string, count: number, rate: number, from = 0): Promise<number> => {
    let speed = 1

    for (let index = 0; index < count; index += 1) {
      ;({ speed } = await services.tours.rate(actor(`p${from + index}`), { name, rate }))
    }

    return speed
  }

  it('la media es geométrica: acelerar al doble y frenar a la mitad se compensan', () => {
    expect(meanRate([])).toBe(1)
    expect(meanRate([2, 0.5])).toBeCloseTo(1)
    expect(meanRate([1.5, 1.5, 1, 1])).toBeCloseTo(Math.sqrt(1.5))
  })

  it('cuando bastante gente la acelera, la de fábrica sube y se vuelve a contar', async () => {
    const { tours } = services
    const boss = actor('eva', { admin: true })

    expect(await tours.speeds()).toEqual({ speeds: {} })

    // Faltando una persona, todavía no se mueve.
    expect(await watch('boards', VOTES_TO_ADJUST - 1, 1.5)).toBe(1)
    expect((await tours.stats(boss)).tours).toEqual([
      {
        name: 'boards',
        speed: 1,
        faster: VOTES_TO_ADJUST - 1,
        slower: 0,
        same: 0,
        mean: 1.5,
        adjustedAt: null,
      },
    ])

    // Verla otra vez no cuenta dos: sigue faltando una persona.
    expect(await watch('boards', 1, 1.5)).toBe(1)
    expect(await tours.votes('boards')).toBe(VOTES_TO_ADJUST - 1)

    // Con la octava, la de fábrica pasa a ir la mitad más rápida.
    expect(await watch('boards', 1, 1.5, VOTES_TO_ADJUST - 1)).toBe(1.5)
    expect(await tours.speeds()).toEqual({ speeds: { boards: 1.5 } })
    expect(await tours.votes('boards')).toBe(0)
    expect((await tours.stats(boss)).tours[0]).toMatchObject({ speed: 1.5, faster: 0, mean: 1 })

    // Y si luego la frenan, baja: cada demostración lleva su cuenta.
    expect(await watch('boards', VOTES_TO_ADJUST, 0.5)).toBe(0.75)
    expect(await watch('network', 3, 2)).toBe(1)
    expect((await tours.speeds()).speeds).toEqual({ boards: 0.75 })
  })

  it('quien no toca el deslizador también cuenta, y frena a quien tiene prisa', async () => {
    // Dos la ponen al doble y seis la dejan como está: sube, pero poco.
    await watch('network', 2, 2)

    const speed = await watch('network', VOTES_TO_ADJUST - 2, 1, 2)

    expect(speed).toBeCloseTo(2 ** (2 / VOTES_TO_ADJUST), 2)
    expect(speed).toBeLessThan(1.25)

    // Si casi nadie la toca, se queda como está, pero se vuelve a contar.
    await watch('guard', 1, 1.25)
    expect(await watch('guard', VOTES_TO_ADJUST - 1, 1, 1)).toBe(1)
    expect(await services.tours.votes('guard')).toBe(0)
  })

  it('no se sale de sus topes ni admite cualquier cosa', async () => {
    const { tours } = services

    // Por mucho que empujen, de fábrica no pasa del triple.
    for (let round = 0; round < 4; round += 1) await watch('network', VOTES_TO_ADJUST, 2)
    expect((await tours.speeds()).speeds.network).toBe(3)

    await expectCode(tours.rate(actor('ana'), { name: 'network', rate: 9 }), 'invalid_input')
    await expectCode(tours.rate(actor('ana'), { name: 'network', rate: 0.1 }), 'invalid_input')
    await expectCode(tours.rate(actor('ana'), { name: 'Red Social', rate: 1 }), 'invalid_input')
    // Solo las demostraciones que hay: un nombre inventado no deja fila.
    await expectCode(tours.rate(actor('ana'), { name: 'inventada', rate: 1 }), 'invalid_input')
    // Y las de nombre con mayúscula, que antes no pasaban.
    expect(await tours.rate(actor('ana'), { name: 'helpStats', rate: 1 })).toEqual({ speed: 1 })
    // Las dos nuevas: la red de asientos y Personalizar.
    expect(await tours.rate(actor('ana'), { name: 'seats', rate: 1 })).toEqual({ speed: 1 })
    expect(await tours.rate(actor('ana'), { name: 'studio', rate: 1 })).toEqual({ speed: 1 })
    await expectCode(tours.stats(actor('ana')), 'forbidden')
  })
})
