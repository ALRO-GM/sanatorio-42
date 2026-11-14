/**
 * Tu estado de salud (#94, #106 y #87 del buzón): actualizar el pace y el plazo
 * está arriba, a la vista sin desplegar nada; se dice hasta qué día hay que
 * terminar para subir de pace; y en el perfil de otra persona no se puede
 * cambiar nada.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Health } from '@sanatorio/contracts'

import { HealthCard } from '../../src/features/profile/HealthCard'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const DAY = 86_400_000

/** `YYYY-MM-DD` de hoy más `days` días, en la hora local (como el campo de fecha). */
function dayIn(days: number): string {
  const date = new Date(Date.now() + days * DAY)
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** El texto de una clave con sus huecos cambiados por «lo que sea». */
const pattern = (key: string): RegExp =>
  new RegExp(
    text(key)
      .split(/\{\w+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.+'),
  )

async function show(health?: Health): Promise<HTMLElement> {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <HealthCard {...(health === undefined ? {} : { health })} />
    </I18nProvider>,
  )

  return must(
    (await screen.findByText(text('health.title'))).closest<HTMLElement>('article'),
    'la tarjeta',
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// En la API de mentira empezaste hace 146 días y estás en el círculo 3. Con un
// plazo de pace 12 a 8 días, tu día cero cae 20 días después del inicio (días
// de bonus): hoy es el día 126 y el plazo de pace 8 del círculo 4 es el 141.
const PACE_12 = { pace: 12, deadline: dayIn(8) }

describe('Tu estado de salud', () => {
  it('el botón de actualizar está arriba, sin desplegar nada, y abre el formulario', async () => {
    const user = userEvent.setup()

    await api.declarePace(PACE_12)
    const card = await show()
    const update = await within(card).findByRole('button', { name: text('health.update') })

    // Arriba: en la cabecera de la tarjeta, no en lo plegado.
    expect(update.closest('.card-head')).not.toBeNull()
    expect(card.querySelector('#health-detail')).toBeNull()
    await user.click(update)
    expect(within(card).getByRole('button', { name: text('health.formSave') })).toBeTruthy()
    // Mientras se edita, el botón no se repite.
    expect(within(card).queryByRole('button', { name: text('health.update') })).toBeNull()
    await user.click(within(card).getByRole('button', { name: text('common.cancel') }))
    expect(within(card).getByRole('button', { name: text('health.update') })).toBeTruthy()
  })

  it('dice hasta cuándo terminar para subir de pace', async () => {
    await api.declarePace(PACE_12)
    const card = await show()

    // A pace 12 en el círculo 3: el 8 del círculo 3 ya pasó, el del 4 llega a tiempo.
    const climb = await within(card).findByText(pattern('health.climb.many'))

    expect(climb.textContent).toContain('pace 8')
    expect(climb.textContent).toContain('círculo 4')
  })

  it('si hoy vas más deprisa que en tu intra, terminar a tiempo te sube', async () => {
    // Pace 18 en la intra, con el mismo día cero (el 201 de pace 18 en el círculo 3).
    await api.declarePace({ pace: 18, deadline: dayIn(75) })
    const card = await show()

    expect(await within(card).findByText(pattern('health.summaryUp.many'))).toBeTruthy()
    expect(within(card).queryByText(pattern('health.climb.many'))).toBeNull()
  })

  it('sin pace anotado, pregunta y no hay botón de actualizar arriba', async () => {
    const health = await api.getHealth()

    vi.spyOn(api, 'getHealth').mockResolvedValue({ ...health, declared: null })
    const card = await show()

    expect(await within(card).findByText(text('health.ask'))).toBeTruthy()
    expect(within(card).queryByRole('button', { name: text('health.update') })).toBeNull()
  })

  it('en el perfil de otra persona no se puede actualizar nada', async () => {
    await api.declarePace(PACE_12)
    const card = await show(await api.getHealth())

    expect(await within(card).findByText(pattern('health.climbOther.many'))).toBeTruthy()
    expect(within(card).queryByRole('button', { name: text('health.update') })).toBeNull()
  })
})
