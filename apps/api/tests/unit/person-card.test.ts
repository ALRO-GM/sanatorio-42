/**
 * La ficha de una persona al pasar el ratón por su login: dónde está sentada,
 * sus proyectos en curso, si está de guardia y si tiene la web abierta.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('ficha de una persona', () => {
  const community = useCommunity()
  let services: Community['services']
  let seat: Community['seat']

  beforeEach(() => {
    ;({ services, seat } = community)
  })

  it('sentada y de guardia: su puesto, sus proyectos y la marca de guardia', async () => {
    await seat({ leo: 'c1r2s3' })
    await services.repositories.availability.set('leo', true)

    expect(await services.map.personCard(actor('ana'), 'leo')).toMatchObject({
      login: 'leo',
      seat: 'c1r2s3',
      projects: ['ft_printf'],
      onDuty: true,
      me: false,
    })
  })

  it('sin sentar no está de guardia aunque tenga el interruptor; y quien mira se reconoce', async () => {
    await services.repositories.availability.set('eva', true)

    expect(await services.map.personCard(actor('eva'), 'EVA')).toMatchObject({
      login: 'eva',
      seat: null,
      onDuty: false,
      me: true,
    })
  })

  it('alguien de quien no se sabe nada: ficha vacía; un login raro: error', async () => {
    expect(await services.map.personCard(actor('ana'), 'nadie')).toEqual({
      login: 'nadie',
      image: null,
      seat: null,
      circle: null,
      projects: [],
      onDuty: false,
      online: false,
      me: false,
    })
    await expectCode(services.map.personCard(actor('ana'), '../etc'), 'invalid_input')
    await expectCode(services.map.personCard(actor('ana'), ''), 'invalid_input')
  })
})
