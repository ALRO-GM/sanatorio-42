import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { blockedForStudent } from '../../src/app/sections'
import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const defaults = await api.getPoolSettings()

afterEach(() => {
  cleanup()
})

describe('el abandono de la piscina (docs/abandono.md)', () => {
  it('quien administra ve la pestaña, las cifras y la tabla, de entrada los más probables', async () => {
    const user = userEvent.setup()

    await openApp('#/abandono')

    expect(
      await screen.findByRole('heading', { name: new RegExp(text('dropout.title')) }, WAIT),
    ).toBeTruthy()
    // La pestaña sale cuando se sabe que administra (el perfil llega después).
    expect(await screen.findByRole('button', { name: text('nav.abandono') }, WAIT)).toBeTruthy()
    expect(
      await screen.findByRole('list', { name: text('dropout.summary.label') }, WAIT),
    ).toBeTruthy()
    expect(screen.getByRole('img', { name: /^Gráfica de abandonos/ })).toBeTruthy()

    // «Más probables»: solo quien lo dejó o lo deja seguro.
    const table = must(
      screen
        .getAllByRole('table')
        .find((each) => within(each).queryByText(text('dropout.col.risk')) !== null),
      'la tabla de piscineros',
    )
    const statuses = within(table)
      .getAllByText(
        new RegExp(`^(${text('dropout.status.gone')}|${text('dropout.status.likely')})$`),
      )
      .map((each) => each.textContent)

    expect(statuses.length).toBe(within(table).getAllByRole('row').length - 1)

    // Con todos, la piscina entera: los cuarenta.
    await user.click(screen.getByRole('button', { name: text('dropout.filter.all') }))
    expect(within(table).getAllByRole('row')).toHaveLength(41)
  }, 20_000)

  it('elegir a alguien que lo dejó enseña sus horas y entre qué dos días lo dejó', async () => {
    const user = userEvent.setup()

    await openApp('#/abandono')

    const first = await screen.findAllByRole('button', { pressed: false, name: /pisci\d\d$/ }, WAIT)

    await user.click(must(first[0], 'el primer piscinero'))
    expect(
      screen.getByText(/^(Lo dejó|Pudo dejarlo) del \S+ \d+ al \S+ \d+ \(semana \d\)$/),
    ).toBeTruthy()
    expect(screen.getByRole('img', { name: /^Horas de pisci\d\d cada día/ })).toBeTruthy()
  }, 20_000)

  it('la tabla de correlaciones dibuja la dispersión de la casilla que se pulsa', async () => {
    const user = userEvent.setup()

    await openApp('#/abandono')

    const matrix = await screen.findByRole(
      'table',
      { name: text('dropout.correlations.title') },
      WAIT,
    )
    const cell = within(matrix).getByRole('button', {
      name: new RegExp(`^${text('dropout.factor.isolation')} y ${text('dropout.factor.passed')}:`),
    })

    await user.click(cell)
    expect(
      screen.getByRole('img', {
        name: new RegExp(
          `^${text('dropout.factor.isolation')} frente a ${text('dropout.factor.passed')}`,
        ),
      }),
    ).toBeTruthy()

    // Quitar un factor lo saca de la tabla.
    await user.click(screen.getByRole('checkbox', { name: text('dropout.factor.partners') }))
    expect(
      within(matrix).queryByRole('columnheader', { name: text('dropout.factor.partners') }),
    ).toBeNull()
    expect(screen.getByRole('heading', { name: text('dropout.factors.title') })).toBeTruthy()
  }, 20_000)

  it('un piscinero sin el permiso no la ve, y un estudiante que no administra tampoco', async () => {
    await api.updatePoolSettings({ allow: ['avance', 'red'] })
    await openApp('#/avance', { pool: true })
    await screen.findByRole('img', { name: /^Gráfica de tu avance en la piscina/ }, WAIT)
    // Las pestañas de Campus están, pero sin el abandono.
    expect(screen.getByRole('button', { name: text('nav.avance') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: text('nav.abandono') })).toBeNull()
    await api.updatePoolSettings(defaults)

    expect(blockedForStudent('abandono', { pool: false, allow: null }, false)).toBe(true)
    expect(blockedForStudent('abandono', { pool: false, allow: null }, true)).toBe(false)
    expect(blockedForStudent('avance', { pool: false, allow: null }, false)).toBe(false)
  }, 20_000)
})
