/**
 * El plano de un campus grande como el de París: clústeres `f*`, cuentas de
 * gente sentada por clúster, «puestos» de broma del staff y erratas.
 */

import { describe, expect, it } from 'vitest'

import { createMapService } from '../../src/modules/map/map.service.js'
import { seatHeatOf } from '../../src/modules/network/seating.heat.js'
import type { MapServiceOptions } from '../../src/modules/map/map.service.js'

type Person = { login: string; host: string }

/** El servicio con una réplica de mentira: puestos conocidos y quién está sentado. */
function serviceWith(known: string[], present: Person[]) {
  const replica = {
    knownSeats: () => Promise.resolve(known),
    presenceIn: () =>
      Promise.resolve(present.map((person) => ({ ...person, image: null, beginAt: null }))),
    projectsOf: () => Promise.resolve([]),
    activeProjectsOf: () => Promise.resolve(new Map<string, string[]>()),
    bestMarksIn: () => Promise.resolve(new Map<string, number>()),
  } as unknown as MapServiceOptions['replica']

  return createMapService({
    replica,
    sync: {
      ensureFresh: () => Promise.resolve({ partial: false }),
    } as unknown as MapServiceOptions['sync'],
    peers: {} as MapServiceOptions['peers'],
    therapy: {
      reservations: () => Promise.resolve(new Map()),
    } as unknown as MapServiceOptions['therapy'],
  })
}

const ACTOR = { login: 'yo', campusId: 1, admin: true }

describe('plano de un campus como el de París', () => {
  it('cuenta la gente sentada en cada clúster f*, y los vacíos con 0', async () => {
    const map = await serviceWith(
      ['f0r13s23', 'f1r13s23', 'f1br10s21', 'f2r12s23'],
      [
        { login: 'ana', host: 'f1r11s15' },
        { login: 'bea', host: 'f1r12s8' },
        { login: 'carla', host: 'f1br2s8' },
        { login: 'dani', host: 'f2r10s17' },
      ],
    ).forCampus(ACTOR)

    expect(map.clusters.map((cluster) => [cluster.id, cluster.occupied])).toEqual([
      ['f0', 0],
      ['f1', 2],
      ['f1b', 1],
      ['f2', 1],
    ])
    expect(map.clusters.find((cluster) => cluster.id === 'f1')).toMatchObject({
      rows: 13,
      seatsPerRow: 23,
    })
    expect(map.clusters.find((cluster) => cluster.id === 'f1')?.seats).toHaveLength(13 * 23)
  })

  it('los «puestos» del staff y de los bots no forman clúster: salen sin colocar', async () => {
    const map = await serviceWith(
      ['f1r2s2', 'POISSON POISSON POISSON 🐟🐟🐟', 'Hogwarts', 'Frozen 🥶', 'bocal'],
      [
        { login: 'pez', host: 'POISSON POISSON POISSON 🐟🐟🐟' },
        { login: 'mago', host: 'Hogwarts' },
        { login: 'frio', host: 'Frozen 🥶' },
        { login: 'ana', host: 'f1r1s1' },
      ],
    ).forCampus(ACTOR)

    expect(map.clusters.map((cluster) => cluster.id)).toEqual(['f1'])
    expect(map.unplaced.map((person) => person.login).sort()).toEqual(['frio', 'mago', 'pez'])
  })

  it('una errata en el número no hace una cuadrícula gigante', async () => {
    const known = Array.from({ length: 23 }, (_, index) => `f1r13s${String(index + 1)}`)
    const map = await serviceWith(
      [...known, 'f1r13s93', 'f1r91s1', 'f1r45s2'],
      [{ login: 'errata', host: 'f1r13s93' }],
    ).forCampus(ACTOR)
    const f1 = map.clusters.find((cluster) => cluster.id === 'f1')

    expect(f1).toMatchObject({ rows: 13, seatsPerRow: 23, occupied: 0 })
    expect(f1?.seats).toHaveLength(13 * 23)
    // Quien está en el puesto mal escrito no se pierde: sale en la lista.
    expect(map.unplaced).toEqual([{ login: 'errata', host: 'f1r13s93', duty: null }])
  })

  it('el mapa de calor tampoco: la errata cuenta en el clúster, pero sin casilla', () => {
    const known = Array.from({ length: 23 }, (_, index) => `f1r13s${String(index + 1)}`)
    const heat = seatHeatOf(
      [
        { login: 'ana', host: 'f1r13s93', begin: 0, end: 3_600_000 },
        { login: 'pez', host: 'POISSON POISSON 🐟', begin: 0, end: 3_600_000 },
      ],
      [...known, 'z9r1s77'],
    )

    expect(heat.clusters.map((cluster) => [cluster.id, cluster.rows, cluster.seatsPerRow])).toEqual(
      [['f1', 13, 23]],
    )
    expect(heat.clusters[0]).toMatchObject({ hours: 1, people: 1 })
  })
})
