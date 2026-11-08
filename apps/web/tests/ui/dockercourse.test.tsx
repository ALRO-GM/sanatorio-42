import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { unitOf } from '@sanatorio/dockersim'

import { UnitView } from '../../src/features/dockercourse/UnitView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('curso de Docker', () => {
  it('sugiere antes el de shell sin bloquear, y la unidad se juega en la terminal', async () => {
    const user = userEvent.setup()

    // Alguien que aún no ha hecho el nivel principiante de shell.
    vi.spyOn(api, 'getShellCourse').mockResolvedValue({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await openApp('#/cursodocker')

    const hint = await screen.findByRole('note', {}, { timeout: 5000 })

    expect(hint.textContent).toContain(
      text('course.order.hint').replace('{before}', text('docker.order.before')),
    )
    expect(
      within(hint)
        .getByRole('link', {
          name: text('course.order.go').replace('{course}', text('nav.cursoshell')),
        })
        .getAttribute('href'),
    ).toBe('#/cursoshell')

    // No bloquea: la siguiente unidad (en la demostración, el bloque 1 ya está hecho) se abre igual.
    const next = await screen.findByRole('button', { name: 'Configurar con variables' })

    expect(next.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Inspeccionar' }).hasAttribute('disabled')).toBe(true)
    await user.click(next)
    expect(screen.getByText(text('shell.theory.what'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toExample') }))
    // El ejemplo lo ejecuta el motor: postgres se cae sin contraseña.
    expect(
      await screen.findByText(/superuser password is not specified/, {}, { timeout: 5000 }),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toTest') }))

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    // Mirar no cuenta; lo que no existe da el error de Docker.
    await user.type(input, 'docker ps -a{Enter}')
    expect(screen.getByText(text('course.count.many').replace('{n}', '0'))).toBeTruthy()
    await user.type(input, 'docker run -d --name db postgress:16{Enter}')
    expect(screen.getByText(/pull access denied for postgress/)).toBeTruthy()
    await user.type(
      input,
      'docker run -d --name db -e POSTGRES_PASSWORD=secreto postgres:16{Enter}',
    )
    expect(await screen.findByText(new RegExp(text('shell.won')))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: new RegExp(text('shell.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'Inspeccionar' })).hasAttribute('disabled'),
    ).toBe(false)
  }, 30_000)

  it('con el nivel principiante de shell hecho, no sugiere nada', async () => {
    await openApp('#/cursodocker')
    expect(
      await screen.findByRole('button', { name: 'Configurar con variables' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  }, 30_000)

  it('un jefe va contra el reloj y enseña su tiempo al acabar', async () => {
    const user = userEvent.setup()
    const boss = must(unitOf('docker-boss-oncall'), 'el jefe 1')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <UnitView
          unit={boss}
          course={await api.getDockerCourse()}
          onCourse={() => undefined}
          onBack={() => undefined}
        />
      </I18nProvider>,
    )
    expect(screen.getByText(/Te llaman de guardia/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Empezar el contrarreloj/ }))
    expect(await screen.findByRole('timer')).toBeTruthy()

    const objectives = screen.getByRole('list', { name: text('shell.objectives') })

    expect(within(objectives).getByText(/old-web ya no existe/)).toBeTruthy()

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    for (const line of boss.solution) await user.type(input, `${line}{Enter}`)
    await settle(400)
    expect(
      within(await screen.findByRole('status')).getByText(/Jefe superado en 0:0\d/),
    ).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  }, 30_000)
})
