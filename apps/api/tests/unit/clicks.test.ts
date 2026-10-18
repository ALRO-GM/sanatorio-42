/**
 * Mapa de calor de clics: se suman por día, sección y forma de pantalla, sin
 * login, y quien administra los ve por sección.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { createClicksService } from '../../src/modules/usage/clicks.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const admin = actor('jefa', { admin: true })

describe('mapa de calor de clics', () => {
  const community = useCommunity()
  let db: Community['db']
  let clock: Community['clock']

  beforeEach(() => {
    ;({ db, clock } = community)
  })

  it('suma casillas y elementos de quien sea, y los enseña por sección', async () => {
    const clicks = createClicksService(db, clock.now)
    const batch = {
      section: 'expediente',
      layout: 'desktop',
      cells: [{ x: 3, y: 2, n: 2 }],
      elements: [
        { element: 'img.avatar', interactive: false, n: 2 },
        { element: 'button.pill', interactive: true, n: 1 },
      ],
    }

    await clicks.record(actor('ana'), batch)
    await clicks.record(actor('leo'), batch)
    await clicks.record(actor('leo'), { ...batch, section: 'tablon', elements: [] })

    const map = await clicks.heatmap(admin, { section: 'expediente' })

    expect(map.cells).toEqual([{ x: 3, y: 2, n: 4 }])
    expect(map.elements).toEqual([
      { element: 'img.avatar', interactive: false, n: 4 },
      { element: 'button.pill', interactive: true, n: 2 },
    ])
    expect(map.sections).toEqual(['expediente', 'tablon'])
    // En el móvil no hay nada: cada forma de pantalla va aparte.
    expect(
      (await clicks.heatmap(admin, { section: 'expediente', layout: 'mobile' })).cells,
    ).toEqual([])
    // Ni rastro de quién: las tablas no tienen login.
    const columns = await db.execute('PRAGMA table_info(usage_click_cells)')

    expect(columns.rows.map((row) => row.name)).not.toContain('login')
  })

  it('no admite texto en los elementos ni casillas fuera de la rejilla; el mapa, solo admins', async () => {
    const clicks = createClicksService(db, clock.now)
    const base = { section: 'expediente', layout: 'desktop', cells: [], elements: [] }

    await expectCode(
      clicks.record(actor('ana'), {
        ...base,
        elements: [{ element: 'span.Hola soy ana', interactive: false, n: 1 }],
      }),
      'invalid_input',
    )
    await expectCode(
      clicks.record(actor('ana'), { ...base, cells: [{ x: 24, y: 0, n: 1 }] }),
      'invalid_input',
    )
    await expectCode(clicks.record(actor('ana'), { ...base, section: '../x' }), 'invalid_input')
    await expect(clicks.record(actor('ana'), base)).resolves.toBeUndefined()
    await expectCode(clicks.heatmap(actor('ana'), {}), 'forbidden')
  })
})
