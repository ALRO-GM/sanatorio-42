/**
 * Avisos al staff de problemas del edificio o de los ordenadores.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
