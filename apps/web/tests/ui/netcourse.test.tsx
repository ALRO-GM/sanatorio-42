import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { solutionOf, unitOf } from '@sanatorio/netsim'

import { UnitView } from '../../src/features/netcourse/UnitView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const WAIT = { timeout: 5000 }

/** Quien pide menos movimiento ve el viaje del paquete de golpe: así el test no espera a la animación. */
function still(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

async function open(id: string): Promise<void> {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <UnitView
        unit={must(unitOf(id), `la unidad ${id}`)}
        course={await api.getNetCourse()}
        onCourse={() => undefined}
        onBack={() => undefined}
      />
    </I18nProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('curso de NetPractice', () => {
  it('del camino a la prueba: teoría, ejemplo que muere y se arregla, y el esquema que se comprueba', async () => {
    const user = userEvent.setup()

    still()
    await openApp('#/cursonet')
    expect(
      await screen.findByRole('heading', { name: text('nav.cursonet'), level: 2 }, WAIT),
    ).toBeTruthy()
    // No sugiere hacer antes otro curso: las redes no dependen de ninguno.
    expect(screen.queryByRole('note')).toBeNull()

    // En la demostración el bloque 1 (las cuentas) ya está hecho: toca el primer esquema.
    const next = await screen.findByRole('button', { name: 'Dos máquinas en el mismo cable' }, WAIT)

    expect(next.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'El switch' }).hasAttribute('disabled')).toBe(true)
    await user.click(next)

    // 1. Teoría, con los rótulos de siempre.
    expect(screen.getByText(text('shell.theory.what'))).toBeTruthy()
    expect(screen.getByText(text('net.stars.three'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toExample') }))

    // 2. Ejemplo: primero la predicción; al lanzarlo, el motor dice dónde muere y por qué.
    expect(screen.getByText(/^Antes de verlo: si leo tuviera 192\.168\.2\.20/)).toBeTruthy()
    expect(screen.getByRole('img', { name: text('net.diagram') })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('net.example.send') }))
    expect(screen.getByText(/ana no tiene ruta hacia 192\.168\.2\.20/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('net.example.fix') }))
    expect(screen.getByText(text('net.ok').replace('{from}', 'ana'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toTest') }))

    // 3. Prueba: lo bloqueado se lee, lo que falta se rellena.
    const field = screen.getByRole('textbox', { name: 'IP de cache' })
    const goals = screen.getByRole('list', { name: text('net.goals') })

    expect(screen.queryByRole('textbox', { name: 'IP de api' })).toBeNull()
    expect(within(goals).getByText('api alcanza a cache')).toBeTruthy()
    expect(screen.getByText(text('net.trip.empty'))).toBeTruthy()

    // Una dirección de otra red: el paquete muere en el origen y se explica.
    await user.type(field, '10.0.6.2')
    await user.click(screen.getByRole('button', { name: text('net.check') }))
    expect(screen.getByText(/api no tiene ruta hacia 10\.0\.6\.2/)).toBeTruthy()
    expect(screen.getByText(text('net.notYet'))).toBeTruthy()
    expect(screen.getByText(text('net.count.one').replace('{n}', '1'))).toBeTruthy()

    // Arreglado (con Intro también se comprueba): llega, y la API pone dos estrellas por el fallo.
    await user.clear(field)
    await user.type(field, '10.0.5.77{Enter}')
    const won = await screen.findByText(new RegExp(text('shell.won')), {}, WAIT)

    expect(must(won.closest('.git-won'), 'el aviso de conseguido').textContent).toContain('★★☆')
    expect(screen.getByText(text('net.ok').replace('{from}', 'api'))).toBeTruthy()
    expect(screen.getByText(/Lo has conseguido en 2 comprobaciones/)).toBeTruthy()
    expect((field as HTMLInputElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: new RegExp(text('shell.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'El switch' }, WAIT)).hasAttribute('disabled'),
    ).toBe(false)
  }, 30_000)

  it('las cuentas: los bits se tocan y cada campo dice si coincide', async () => {
    const user = userEvent.setup()

    await open('net-octets')
    await user.click(screen.getByRole('tab', { name: `3. ${text('shell.step.test')}` }))

    // Tres direcciones, cada una con sus 32 bits.
    const boards = screen.getAllByRole('group', { name: text('net.bits.title') })

    expect(boards).toHaveLength(3)
    expect(within(must(boards[0], 'los bits')).getAllByRole('button')).toHaveLength(32)
    expect(screen.getByText('Ahora: 192.168.1.42')).toBeTruthy()
    // La máquina a 0 es la dirección de red; un bit suelto cambia su octeto.
    await user.click(
      must(screen.getAllByRole('button', { name: text('net.bits.host0') })[0], 'el botón'),
    )
    expect(screen.getByText('Ahora: 192.168.1.0')).toBeTruthy()
    await user.click(
      within(must(boards[0], 'los bits')).getByRole('button', { name: 'Bit 32: 0 (máquina)' }),
    )
    expect(screen.getByText('Ahora: 192.168.1.1')).toBeTruthy()

    const answers = screen.getAllByRole('textbox')

    expect(answers).toHaveLength(3)
    await user.type(must(answers[0], 'el campo 1'), '192.168.1.0')
    await user.type(must(answers[1], 'el campo 2'), '172.20.7.0')
    await user.type(must(answers[2], 'el campo 3'), '10.0.0.0')
    await user.click(screen.getByRole('button', { name: text('net.check') }))
    // La segunda está mal (con /16 la red es 172.20.0.0) y se dice cuál.
    expect(screen.getByText(text('net.calc.notYet'))).toBeTruthy()
    expect(must(answers[1], 'el campo 2').getAttribute('aria-invalid')).toBe('true')
    expect(must(answers[0], 'el campo 1').getAttribute('aria-invalid')).toBe('false')

    await user.clear(must(answers[1], 'el campo 2'))
    await user.type(must(answers[1], 'el campo 2'), '172.20.0.0')
    await user.click(screen.getByRole('button', { name: text('net.check') }))
    expect(await screen.findByText(new RegExp(text('shell.won')), {}, WAIT)).toBeTruthy()
    expect(screen.getByText(/Lo has conseguido en 2 comprobaciones/)).toBeTruthy()
  }, 30_000)

  it('el ejemplo de una cuenta se destapa después de pensarlo', async () => {
    const user = userEvent.setup()

    await open('net-cut')
    await user.click(screen.getByRole('tab', { name: `2. ${text('shell.step.example')}` }))
    expect(screen.getByText(/^Antes de verlo: 192\.168\.1\.77 con \/26/)).toBeTruthy()
    expect(screen.queryByText('192.168.1.127')).toBeNull()
    await user.click(screen.getByRole('button', { name: text('net.example.reveal') }))
    // Lo calcula el motor: red, broadcast, rango y cuántas caben.
    for (const value of ['192.168.1.64', '192.168.1.127', '192.168.1.65', '192.168.1.126', '62'])
      expect(screen.getByText(value)).toBeTruthy()
  }, 30_000)

  it('un esquema con routers: fichas con candado, rutas y objetivos que se miran uno a uno', async () => {
    const user = userEvent.setup()

    still()
    await open('net-default')
    await user.click(screen.getByRole('tab', { name: `3. ${text('shell.step.test')}` }))

    const dest = screen.getByRole('textbox', { name: 'Destino de la ruta 1 de r1' })
    const via = screen.getByRole('textbox', { name: 'Siguiente salto de la ruta 1 de r1' })

    // La tabla de r2 se lee (con su candado), no se toca.
    expect(screen.getByText('10.1.0.0/24')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: /r2/ })).toBeNull()
    // Media solución: una ruta que solo cubre la red de git.
    await user.type(dest, '10.2.0.0/24')
    await user.type(via, '10.9.9.2')
    await user.click(screen.getByRole('button', { name: text('net.check') }))

    const goals = screen.getByRole('list', { name: text('net.goals') })
    const [git, wiki] = within(goals).getAllByRole('listitem')

    expect(must(git, 'el objetivo de git').className).toContain('ok')
    expect(must(wiki, 'el objetivo de wiki').className).not.toContain('ok')
    // Se enseña solo el que falla: r1 no sabe llegar a la red de wiki.
    expect(screen.getByText(/r1 no tiene ruta hacia 10\.3\.0\.10/)).toBeTruthy()
    // Y el que llega se puede mirar con su ojo.
    await user.click(screen.getByRole('button', { name: 'Ver el paquete de oficina a git' }))
    expect(screen.getByText(text('net.ok').replace('{from}', 'oficina'))).toBeTruthy()
    expect(
      screen.getAllByText(/por su ruta a 10\.2\.0\.0\/24, siguiente salto 10\.9\.9\.2/),
    ).not.toHaveLength(0)
  }, 30_000)

  it('un jefe va contra el reloj y enseña su tiempo al acabar', async () => {
    const user = userEvent.setup()
    const boss = must(unitOf('net-boss-inventory'), 'el jefe 1')

    await open(boss.id)
    expect(screen.getByText(/nadie apuntó qué red es cada una/)).toBeTruthy()
    // Sin empezar no hay nada que rellenar.
    expect(screen.queryByRole('textbox')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Empezar el contrarreloj/ }))
    expect(await screen.findByRole('timer')).toBeTruthy()

    const answers = Object.values(solutionOf(boss))
    const fields = screen.getAllByRole('textbox')

    expect(fields).toHaveLength(answers.length)
    for (const [index, field] of fields.entries())
      await user.type(field, must(answers[index], 'la respuesta'))
    await user.click(screen.getByRole('button', { name: text('net.check') }))
    await settle(400)
    expect(
      within(await screen.findByRole('status')).getByText(/Jefe superado en 0:0\d/),
    ).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  }, 30_000)
})
