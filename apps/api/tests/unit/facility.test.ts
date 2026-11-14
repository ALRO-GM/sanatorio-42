/**
 * Avisos al staff de problemas del edificio o de los ordenadores.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { toText } from '../../src/core/db/rows.js'
import { createFacilityService } from '../../src/modules/facility/facility.service.js'
import { actor, expectCode, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('avisos del edificio', () => {
  const community = useCommunity()
  let services: Community['services']
  let seat: Community['seat']
  let db: Community['db']

  beforeEach(() => {
    ;({ services, seat, db } = community)
  })

  it('sin decir dónde, es tu puesto; se ve en el panel y en la página del staff', async () => {
    const { facility } = services

    await seat({ ana: 'c1r2s3' })
    const report = await facility.report(actor('ana'), {
      category: 'computer',
      note: 'no enciende',
    })

    expect(report).toMatchObject({
      login: 'ana',
      place: 'c1r2s3',
      category: 'computer',
      note: 'no enciende',
    })
    expect(report.campusName).toBe('Madrid')
    expect((await facility.forStaff()).map((r) => r.id)).toEqual([report.id])
    expect((await facility.forAdmin(actor('jefa', { admin: true }))).map((r) => r.id)).toEqual([
      report.id,
    ])
  })

  it('un ordenador o sus periféricos que fallan dejan el puesto tachado en el mapa', async () => {
    const { facility } = services
    const broken = async (): Promise<string[]> =>
      (await db.execute({ sql: 'SELECT host FROM broken_seats ORDER BY host', args: [] })).rows.map(
        (row) => toText(row.host),
      )

    await facility.report(actor('ana'), { category: 'peripheral', place: 'c1r2s4' })
    expect(await broken()).toEqual(['c1r2s4'])
    // Lo que no es un puesto (un pasillo, los baños) no toca el mapa.
    await facility.report(actor('ana'), { category: 'computer', place: 'la sala del fondo' })
    await facility.report(actor('ana'), { category: 'toilets', place: 'c1r2s5' })
    expect(await broken()).toEqual(['c1r2s4'])
  })

  describe('desde el mapa (#82)', () => {
    /** Lo que dice el mapa de un puesto roto, visto por `leo`. */
    const brokenOf = async (host: string) =>
      (await services.map.forCampus(actor('leo'))).clusters
        .flatMap((cluster) => cluster.seats)
        .find((one) => one.host === host)?.broken

    beforeEach(async () => {
      // Con alguien a cada lado, los puestos de en medio salen en el plano.
      await seat({ eva: 'c1r1s1', leo: 'c1r1s5' })
      await services.repositories.replica.setState(`delta:${MADRID}`, {
        cursor: new Date(community.clock.now()).toISOString(),
        at: community.clock.now(),
      })
    })

    it('dice qué falla, llega al staff y, resuelto, el puesto vuelve a estar libre', async () => {
      const { map, facility } = services

      await map.reportProblem(actor('ana'), 'C1R1S2', { kind: 'peripheral' })
      await map.reportProblem(actor('ana'), 'c1r1s3', { kind: 'computer' })

      expect(await brokenOf('c1r1s2')).toMatchObject({ by: 'ana', kind: 'peripheral' })
      expect(await brokenOf('c1r1s3')).toMatchObject({ kind: 'computer' })

      const staff = await facility.forStaff()

      expect(staff.map((report) => [report.category, report.place])).toEqual([
        ['computer', 'c1r1s3'],
        ['peripheral', 'c1r1s2'],
      ])
      await facility.resolveAsStaff('bocal', staff[1]?.id ?? 0)
      expect(await brokenOf('c1r1s2')).toBeNull()
      expect(await brokenOf('c1r1s3')).not.toBeNull()
    })

    it('sin decir qué falla, el ordenador; lo de antes del aviso, sin saberlo, sale sin tipo', async () => {
      const { map } = services

      await map.reportProblem(actor('ana'), 'c1r1s2', undefined)
      await map.reportProblem(actor('ana'), 'c1r1s3', null)
      await map.reportBroken(actor('ana'), 'c1r1s4')

      expect(await brokenOf('c1r1s2')).toMatchObject({ kind: 'computer' })
      expect(await brokenOf('c1r1s3')).toMatchObject({ kind: 'computer' })
      expect(await brokenOf('c1r1s4')).toMatchObject({ kind: null })
    })

    it('lo que no es un tipo ni un puesto no se guarda ni llega al staff', async () => {
      const { map, facility } = services

      await expectCode(map.reportProblem(actor('ana'), 'c1r1s2', { kind: 'fire' }), 'invalid_input')
      await expectCode(map.reportProblem(actor('ana'), 'c1r1s2', 'peripheral'), 'invalid_input')
      await expectCode(
        map.reportProblem(actor('ana'), `c1r1s${'9'.repeat(10_000)}`, { kind: 'computer' }),
        'invalid_input',
      )
      await expectCode(map.reportProblem(actor('ana'), '../x', {}), 'invalid_input')
      expect(await facility.forStaff()).toEqual([])
      expect(await brokenOf('c1r1s2')).toBeNull()
    })

    it('quien no administra no lo resuelve, y el puesto sigue tachado', async () => {
      const { map, facility } = services

      await map.reportProblem(actor('ana'), 'c1r1s2', { kind: 'computer' })
      const [report] = await facility.forStaff()

      await expectCode(facility.resolveAsAdmin(actor('leo'), report?.id ?? 0), 'forbidden')
      expect(await brokenOf('c1r1s2')).toMatchObject({ kind: 'computer' })
    })
  })

  it('sin puesto hay que decir dónde; «otro» necesita una nota', async () => {
    const { facility } = services

    await expectCode(facility.report(actor('leo'), { category: 'toilets' }), 'invalid_input')
    await expect(
      facility.report(actor('leo'), { category: 'toilets', place: 'Baños de la planta 1' }),
    ).resolves.toMatchObject({
      place: 'Baños de la planta 1',
    })
    await expectCode(
      facility.report(actor('leo'), { category: 'other', place: 'Entrada' }),
      'invalid_input',
    )
    await expectCode(
      facility.report(actor('leo'), { category: 'fire', place: 'Entrada' }),
      'invalid_input',
    )
  })

  it('resolver lo quita de los abiertos; solo admins (o el staff) y una vez', async () => {
    const { facility } = services
    const { id } = await facility.report(actor('leo'), { category: 'light', place: 'cluster 2' })

    await expectCode(facility.forAdmin(actor('leo')), 'forbidden')
    await expectCode(facility.resolveAsAdmin(actor('leo'), id), 'forbidden')
    await facility.resolveAsStaff('bocal', id)
    expect(await facility.forStaff()).toEqual([
      expect.objectContaining({ id, resolvedBy: 'staff:bocal' }),
    ])
    await expectCode(facility.resolveAsAdmin(actor('jefa', { admin: true }), id), 'not_found')
  })

  it('como mucho diez al día por persona, y van a Slack si hay webhook', async () => {
    const slack = vi.fn(async () => undefined)
    const facility = createFacilityService({ db, seatOf: async () => 'c3r1s1', slack })

    for (let i = 0; i < 10; i++)
      await facility.report(actor('uma', { campusId: MADRID }), { category: 'network' })
    await expectCode(facility.report(actor('uma'), { category: 'network' }), 'rate_limited')
    expect(slack).toHaveBeenCalledTimes(10)
    expect(slack.mock.calls[0]).toEqual(['*Red o wifi* en c3r1s1 (avisa uma)'])
  })
})
