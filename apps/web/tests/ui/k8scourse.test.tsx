import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { unitOf } from '@sanatorio/k8ssim'

import { UnitView } from '../../src/features/k8scourse/UnitView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('curso de Kubernetes', () => {
  it('sugiere antes el de Docker sin bloquear, y la unidad se juega en la terminal', async () => {
    const user = userEvent.setup()

    // Alguien que aún no ha hecho el nivel principiante de Docker.
    vi.spyOn(api, 'getDockerCourse').mockResolvedValue({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await openApp('#/cursok8s')

    const hint = await screen.findByRole('note', {}, { timeout: 5000 })

    expect(hint.textContent).toContain(
      text('course.order.hint').replace('{before}', text('k8s.order.before')),
    )
    expect(
      within(hint)
        .getByRole('link', {
          name: text('course.order.go').replace('{course}', text('nav.cursodocker')),
        })
        .getAttribute('href'),
    ).toBe('#/cursodocker')

    // No bloquea: la siguiente unidad (en la demostración, el bloque 1 ya está hecho) se abre igual.
    const next = await screen.findByRole('button', { name: 'Deployments: que se cuide solo' })

    expect(next.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Escalar' }).hasAttribute('disabled')).toBe(true)
    await user.click(next)
    expect(screen.getByText(text('shell.theory.what'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toExample') }))
    // El ejemplo lo ejecuta el motor: el Deployment de prueba se crea de verdad.
    expect(
      await screen.findByText(/deployment\.apps\/demo created/, {}, { timeout: 5000 }),
    ).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toTest') }))

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    // Mirar no cuenta; una opción mal escrita da el error de kubectl.
    await user.type(input, 'kubectl get pods{Enter}')
    expect(screen.getByText(text('course.count.many').replace('{n}', '0'))).toBeTruthy()
    await user.type(input, 'kubectl create deployment web --imag=nginx:1.27{Enter}')
    expect(screen.getByText(/unknown flag: 'imag'/)).toBeTruthy()
    await user.type(input, 'kubectl create deployment web --image=nginx:1.27 --replicas=2{Enter}')
    expect(await screen.findByText(new RegExp(text('shell.won')))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: new RegExp(text('shell.back')) }))
    expect((await screen.findByRole('button', { name: 'Escalar' })).hasAttribute('disabled')).toBe(
      false,
    )
  }, 30_000)

  it('con el nivel principiante de Docker hecho, no sugiere nada', async () => {
    vi.spyOn(api, 'getDockerCourse').mockResolvedValue({
      stars: {},
      best: {},
      runs: {},
      certificates: [{ tier: 'beginner', stars: 3, seconds: 300, at: '' }],
    })
    await openApp('#/cursok8s')
    expect(
      await screen.findByRole(
        'button',
        { name: 'Deployments: que se cuide solo' },
        { timeout: 5000 },
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  }, 30_000)

  it('un jefe va contra el reloj y enseña su tiempo al acabar', async () => {
    const user = userEvent.setup()
    const boss = must(unitOf('k8s-jefe-primer-dia'), 'el jefe 1')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <UnitView
          unit={boss}
          course={await api.getK8sCourse()}
          onCourse={() => undefined}
          onBack={() => undefined}
        />
      </I18nProvider>,
    )
    expect(screen.getByText(/Te pasan el kubeconfig de staging/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Empezar el contrarreloj/ }))
    expect(await screen.findByRole('timer')).toBeTruthy()

    const objectives = screen.getByRole('list', { name: text('shell.objectives') })

    expect(within(objectives).getByText(/prueba-de-alguien ya no está/)).toBeTruthy()

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    for (const line of boss.solution) await user.type(input, `${line}{Enter}`)
    await settle(400)
    expect(
      within(await screen.findByRole('status')).getByText(/Jefe superado en 0:0\d/),
    ).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  }, 30_000)
})
