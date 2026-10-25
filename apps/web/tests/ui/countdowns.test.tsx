/**
 * Mantenimiento y avisos con cuenta atrás (`docs/mantenimiento.md`,
 * `docs/avisos-cuenta-atras.md`), como los usaría una persona: la pantalla de
 * mantenimiento, la ventanita con la limpieza de taquillas, fijar un evento
 * del calendario y el próximo compromiso, y el panel de quien administra.
 */

import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
/** Un texto con huecos, relleno. */
const fill = (key: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (done, [name, value]) => done.replace(`{${name}}`, value),
    text(key),
  )

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const dock = (): Promise<HTMLElement> =>
  screen.findByRole('complementary', { name: text('countdown.title') }, WAIT)

describe('avisos con cuenta atrás', () => {
  it('la limpieza de taquillas sale a la vista, se pliega y se cierra para siempre', async () => {
    const user = userEvent.setup()

    await openApp('#/')

    const window_ = await dock()

    expect(within(window_).getByText(text('countdown.lockers.title'))).toBeTruthy()
    expect(within(window_).getByText(text('countdown.lockers.body'))).toBeTruthy()
    expect(within(window_).getAllByRole('timer').length).toBeGreaterThan(0)

    // Plegada se queda la píldora con lo más cercano; se vuelve a abrir.
    await user.click(within(window_).getByRole('button', { name: text('countdown.fold') }))
    expect(within(window_).queryByText(text('countdown.lockers.body'))).toBeNull()
    await user.click(within(window_).getByRole('button', { name: text('countdown.unfold') }))

    await user.click(
      within(window_).getByRole('button', {
        name: fill('countdown.dismiss', { title: text('countdown.lockers.title') }),
      }),
    )
    await waitFor(() => {
      expect(screen.queryByText(text('countdown.lockers.title'))).toBeNull()
    }, WAIT)
    expect(await api.getCountdowns()).toEqual([])
  }, 20_000)

  it('un evento del calendario se fija desde su ficha y se quita desde la ventanita', async () => {
    const user = userEvent.setup()
    const now = new Date()
    const { events } = await api.getCalendar(
      now.toISOString(),
      new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    )
    const event = must(
      events.find((each) => each.id.startsWith('board:') && Date.parse(each.start) > Date.now()),
      'una pizarra que aún no ha empezado',
    )

    await openApp(`#/calendario/${encodeURIComponent(event.id)}`)

    const dialog = await screen.findByRole('dialog', { name: event.title }, WAIT)

    await user.click(within(dialog).getByRole('button', { name: text('countdown.pinEvent') }))
    expect(
      await within(dialog).findByRole('button', { name: text('countdown.unpinEvent') }, WAIT),
    ).toBeTruthy()

    const window_ = await dock()

    expect(within(window_).getByText(event.title)).toBeTruthy()
    await user.click(
      within(window_).getByRole('button', {
        name: fill('countdown.unpin', { title: event.title }),
      }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: text('countdown.title') })).toBeNull()
    }, WAIT)
  }, 20_000)

  it('desde la vista de cuentas atrás del calendario: el próximo, una propia y un evento', async () => {
    const user = userEvent.setup()

    await openApp('#/calendario')
    await user.click(await screen.findByRole('tab', { name: text('agenda.tab.countdowns') }, WAIT))

    const mine = (): HTMLElement => screen.getByRole('region', { name: text('countdown.mine') })

    await user.click(await screen.findByRole('button', { name: text('countdown.pinNext') }, WAIT))
    expect(await within(mine()).findByText(text('countdown.kind.next'), {}, WAIT)).toBeTruthy()

    await user.type(screen.getByLabelText(text('countdown.customTitle')), 'Entrega')
    // Mañana a esta hora, como lo escribiría el navegador.
    const tomorrow = new Date(Date.now() + 86_400_000)
    const pad = (value: number): string => String(value).padStart(2, '0')

    await user.type(
      screen.getByLabelText(text('countdown.day')),
      `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`,
    )
    await user.type(screen.getByLabelText(text('countdown.time')), '10:30')
    await user.click(screen.getByRole('button', { name: text('countdown.pin') }))

    expect(await within(mine()).findByText('Entrega', {}, WAIT)).toBeTruthy()
    expect(within(mine()).getByText(text('countdown.kind.custom'))).toBeTruthy()

    // Un evento de lo que viene, con su botón, sin buscarlo en el calendario.
    const coming = screen.getByRole('region', { name: fill('countdown.coming', { n: '30' }) })
    const [first] = await within(coming).findAllByRole(
      'button',
      { name: text('countdown.pinEvent') },
      WAIT,
    )

    await user.click(must(first, 'un evento que fijar'))
    expect(await within(mine()).findByText(text('countdown.kind.event'), {}, WAIT)).toBeTruthy()

    // Fuera de esta vista vuelve la ventanita, con lo mismo.
    expect(document.documentElement.dataset.countdownsPage).toBe('')
    await user.click(screen.getByRole('tab', { name: text('agenda.tab.calendar') }))
    expect(document.documentElement.dataset.countdownsPage).toBeUndefined()

    const window_ = await dock()

    expect(within(window_).getByText('Entrega')).toBeTruthy()
  }, 20_000)
})

describe('modo mantenimiento', () => {
  it('quien no administra ve «No disponible» con la cuenta atrás, y nada más', async () => {
    const until = new Date(Date.now() + 90 * 60_000).toISOString()

    vi.spyOn(api, 'getMaintenance').mockResolvedValue({
      on: true,
      message: 'Migramos la base de datos',
      until,
      since: new Date().toISOString(),
      exempt: false,
    })
    await openApp('#/')

    expect(await screen.findByRole('heading', { name: text('maint.title') }, WAIT)).toBeTruthy()
    expect(screen.getByText('Migramos la base de datos')).toBeTruthy()
    expect(screen.getByRole('timer', { name: text('maint.backIn') }).textContent).toMatch(
      /1:(29|30):/,
    )
    // Ni la cabecera ni la navegación: la web no se llega a montar.
    expect(screen.queryByRole('navigation')).toBeNull()
  }, 20_000)

  it('quien administra lo pone desde el panel, ve la franja y lo quita', async () => {
    const user = userEvent.setup()

    await openApp('#/gestion')

    // El segundo factor de mentira: vale cualquier código de seis cifras.
    const generate = await screen
      .findByRole('button', { name: text('admin.lock.generate') }, { timeout: 1500 })
      .catch(() => null)

    if (generate !== null) await user.click(generate)

    const code = await screen.findByLabelText(text('admin.lock.code'), {}, WAIT).catch(() => null)

    if (code !== null) {
      await user.type(code, '123456')
      await user.click(
        screen.queryByRole('button', { name: text('admin.lock.confirm') }) ??
          screen.getByRole('button', { name: text('admin.lock.open') }),
      )
    }

    const tabs = await screen.findByRole('tablist', { name: text('admin.title') }, WAIT)

    await user.click(within(tabs).getByRole('tab', { name: text('admin.tab.maintenance') }))
    await user.type(
      await screen.findByLabelText(text('admin.maint.message'), {}, WAIT),
      'Subimos la versión 73',
    )
    await user.click(screen.getByRole('button', { name: fill('admin.maint.quick', { n: '1 h' }) }))
    await user.click(screen.getByRole('button', { name: text('admin.maint.on') }))

    expect(await screen.findByText(text('maint.banner.title'), {}, WAIT)).toBeTruthy()
    expect((await api.getMaintenance()).message).toBe('Subimos la versión 73')

    await user.click(screen.getByRole('button', { name: text('admin.maint.off') }))
    await waitFor(() => {
      expect(screen.queryByText(text('maint.banner.title'))).toBeNull()
    }, WAIT)
    expect((await api.getMaintenance()).on).toBe(false)

    // Y la limpieza de taquillas desde su pestaña: solo el día y la hora.
    await user.click(within(tabs).getByRole('tab', { name: text('admin.tab.countdowns') }))
    await settle(300)

    const form = must(document.querySelector<HTMLElement>('.countdown-form'), 'el formulario')
    const nextWeek = new Date(Date.now() + 7 * 86_400_000)
    const pad = (value: number): string => String(value).padStart(2, '0')

    await user.type(
      within(form).getByLabelText(text('countdown.day')),
      `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}`,
    )
    await user.type(within(form).getByLabelText(text('countdown.time')), '09:00')
    await user.click(within(form).getByRole('button', { name: text('admin.countdown.send') }))

    await waitFor(async () => {
      expect(
        (await api.getAdminCountdowns()).filter((each) => each.preset === 'lockers').length,
      ).toBe(2)
    }, WAIT)
  }, 30_000)
})
