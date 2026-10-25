import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { unitOf } from '@sanatorio/shellsim'

import { UnitView } from '../../src/features/shellcourse/UnitView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('curso de shell', () => {
  it('el camino abre en orden: teoría, ejemplo y prueba en la terminal', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames/shell')

    // En la demostración el nivel principiante ya está hecho (y certificado).
    expect(
      await screen.findByRole('list', { name: text('shell.certs.title') }, { timeout: 5000 }),
    ).toBeTruthy()

    const next = await screen.findByRole('button', { name: 'Columnas y caracteres: cut y tr' })

    expect(next.hasAttribute('disabled')).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Contar y ordenar: sort y uniq' })
        .hasAttribute('disabled'),
    ).toBe(true)
    await user.click(next)

    // Desde el principio se ve cuántos comandos da cada estrella.
    const rules = screen.getByRole('list', { name: text('course.stars.title') })

    expect(rules.textContent).toContain(text('course.stars.three.one').replace('{n}', '1'))
    expect(screen.getByText(text('shell.theory.what'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toExample') }))
    // El ejemplo se ejecuta de verdad en la shell simulada.
    expect(await screen.findByText('HOLA PEERS', {}, { timeout: 4000 })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toTest') }))

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    // Lo que no existe da el error de bash y no cuenta; lo que solo mira, tampoco.
    await user.type(input, 'nmap db1{Enter}')
    expect(screen.getByText('bash: nmap: command not found')).toBeTruthy()
    await user.type(input, 'ls /etc{Enter}')
    expect(screen.getByText(text('course.count.many').replace('{n}', '0'))).toBeTruthy()
    // Una orden a medias pide el resto con «>».
    await user.type(input, "echo 'a{Enter}b'{Enter}")
    expect(screen.getByText('a')).toBeTruthy()
    await user.type(input, 'cut -d: -f1 /etc/passwd | tr a-z A-Z{Enter}')
    expect(await screen.findByText(new RegExp(text('shell.won')))).toBeTruthy()
    expect(
      screen.getByText(text('course.why.three.one').replace('{n}', '1').replace('{three}', '1')),
    ).toBeTruthy()

    // De vuelta en el camino, el siguiente punto ya se puede abrir.
    await user.click(screen.getByRole('button', { name: new RegExp(text('shell.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'Contar y ordenar: sort y uniq' })).hasAttribute(
        'disabled',
      ),
    ).toBe(false)
  }, 30_000)

  it('un jefe va contra el reloj y enseña su tiempo al acabar', async () => {
    const user = userEvent.setup()
    const boss = must(unitOf('boss1'), 'el jefe 1')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <UnitView
          unit={boss}
          course={await api.getShellCourse()}
          onCourse={() => undefined}
          onBack={() => undefined}
        />
      </I18nProvider>,
    )
    // La historia y las tareas, a la vista antes de empezar.
    expect(screen.getByText(/Te toca el busca por primera vez/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Empezar el contrarreloj/ }))
    expect(await screen.findByRole('timer')).toBeTruthy()

    // Lo que se comprueba, sin marcar todavía.
    const objectives = screen.getByRole('list', { name: text('shell.objectives') })

    expect(within(objectives).getAllByText(text('shell.obj.todo'))).toHaveLength(2)

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    for (const line of boss.solution) await user.type(input, `${line}{Enter}`)
    await settle(400)

    const won = await screen.findByRole('status')

    expect(within(won).getByText(/Jefe superado en 0:0\d/)).toBeTruthy()
    // Superado, ya no corre el reloj y se puede repetir para mejorar.
    expect(screen.queryByRole('timer')).toBeNull()
    expect(screen.getByRole('button', { name: text('shell.boss.again') })).toBeTruthy()
  }, 30_000)
})
