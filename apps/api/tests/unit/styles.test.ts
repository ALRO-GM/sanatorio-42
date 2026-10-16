/**
 * Estilos exclusivos y el estilo del expediente: solo su dueña se pone el suyo,
 * y quien visita su expediente lo ve con él.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  canUseStyle,
  EXCLUSIVE_STYLES,
  exclusiveStyleOf,
  PUBLIC_STYLES,
  recordStyleOf,
} from '../../src/modules/profile/styles.rules.js'
import { projectUser } from '../helpers/fixtures.js'
import { MADRID, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('reglas de los estilos', () => {
  it('son los mismos que los de la web', async () => {
    // La web es la que tiene los estilos: si cambian allí, que se note aquí.
    const path = '../../../web/src/themes/ids.ts'
    const web = (await import(/* @vite-ignore */ path)) as {
      PUBLIC_STYLES: readonly string[]
      EXCLUSIVE_STYLES: Record<string, readonly string[]>
    }

    expect(web.PUBLIC_STYLES).toEqual(PUBLIC_STYLES)
    expect(web.EXCLUSIVE_STYLES).toEqual(EXCLUSIVE_STYLES)
  })

  it('un estilo exclusivo solo es de su dueña; los demás, de todo el mundo', () => {
    expect(canUseStyle('bichota', 'acamelo')).toBe(true)
    expect(canUseStyle('bichota', 'ana')).toBe(false)
    expect(canUseStyle('espacio', 'ana')).toBe(true)
    expect(canUseStyle('no-existe', 'ana')).toBe(false)
    expect(exclusiveStyleOf('acamelo')).toBe('bichota')
    expect(exclusiveStyleOf('ana')).toBeNull()
  })

  it('el expediente se ve con lo elegido; sin elegir, con el exclusivo si lo hay', () => {
    expect(recordStyleOf('acamelo', null)).toBe('bichota')
    expect(recordStyleOf('acamelo', 'none')).toBeNull()
    expect(recordStyleOf('acamelo', 'terminal')).toBe('terminal')
    expect(recordStyleOf('ana', null)).toBeNull()
    expect(recordStyleOf('ana', 'espacio')).toBe('espacio')
    // Lo guardado que ya no vale (de otra persona, o que se quitó) es como no elegir.
    expect(recordStyleOf('ana', 'bichota')).toBeNull()
    expect(recordStyleOf('acamelo', 'retirado')).toBe('bichota')
  })
})

describe('estilo del expediente', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(async () => {
    ;({ services } = community)
    await services.repositories.replica.ingestProjectUsers([projectUser('acamelo')], MADRID)
  })

  it('quien visita el expediente de acamelo lo ve con su estilo, sin que ella haga nada', async () => {
    const { xp } = services

    expect((await xp.publicProfile('acamelo')).recordStyle).toBe('bichota')
    expect((await xp.expediente(actor('acamelo'))).recordStyle).toBe('bichota')
    expect((await xp.publicProfile('ana')).recordStyle).toBeNull()
    // El expediente público pide a 42 los hitos de cada cual: es lo esperado.
    community.api.calls.length = 0
  })

  it('cada cual elige con cuál se ve el suyo, pero no uno de otra persona', async () => {
    const { xp } = services

    await xp.updateSettings(actor('ana'), { recordStyle: 'espacio' })
    expect((await xp.publicProfile('ana')).recordStyle).toBe('espacio')
    await expectCode(xp.updateSettings(actor('ana'), { recordStyle: 'bichota' }), 'forbidden')
    expect((await xp.publicProfile('ana')).recordStyle).toBe('espacio')

    // Vuelta a «cada cual con el suyo», y a lo de fábrica.
    await xp.updateSettings(actor('ana'), { recordStyle: 'none' })
    expect((await xp.publicProfile('ana')).recordStyle).toBeNull()
    await xp.updateSettings(actor('acamelo'), { recordStyle: 'none' })
    expect((await xp.publicProfile('acamelo')).recordStyle).toBeNull()
    await xp.updateSettings(actor('acamelo'), { recordStyle: 'default' })
    expect((await xp.publicProfile('acamelo')).recordStyle).toBe('bichota')

    // Lo que no es un estilo no entra; y cambiar el estilo no toca lo demás.
    for (const wrong of ['inventado', 'Bichota', '', '../x', 'a'.repeat(40), 7]) {
      await expectCode(xp.updateSettings(actor('ana'), { recordStyle: wrong }), 'invalid_input')
    }
    await xp.updateSettings(actor('ana'), { title: 'paciente' })
    expect((await xp.publicProfile('ana')).recordStyle).toBeNull()
    community.api.calls.length = 0
  })
})
