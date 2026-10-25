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
      focusUntil: null,
      // Sin XP ni título elegido: el primero, y con él su banner.
      title: 'paciente',
    })
    await expectCode(services.map.personCard(actor('ana'), '../etc'), 'invalid_input')
    await expectCode(services.map.personCard(actor('ana'), ''), 'invalid_input')
  })

  it('lleva el título que luce: el elegido si le vale, y si no el más alto que tiene', async () => {
    const { xp, map } = services

    // 25 + 25 XP: nivel 2, "interno".
    await xp.award('leo', 'doubt_solved', 'doubt:1')
    await xp.award('leo', 'doubt_solved', 'doubt:2')
    expect((await map.personCard(actor('ana'), 'leo')).title).toBe('interno')

    // Elige el de nivel 1: su ficha (y su banner) cambian con él.
    await xp.updateSettings(actor('leo'), { title: 'paciente' })
    expect((await map.personCard(actor('ana'), 'leo')).title).toBe('paciente')
    expect((await xp.expediente(actor('leo'))).title).toBe('paciente')

    // Uno bloqueado no se puede elegir, y la ficha sigue igual.
    await expectCode(xp.updateSettings(actor('leo'), { title: 'jefe' }), 'forbidden')
    await expectCode(xp.updateSettings(actor('leo'), { title: 'inventado' }), 'forbidden')
    expect((await map.personCard(actor('ana'), 'leo')).title).toBe('paciente')
  })
})
