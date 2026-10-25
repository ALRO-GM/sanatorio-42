/**
 * La agenda (`docs/agenda.md`) como la usaría una persona, contra la API de
 * mentira: poner una meta quitando un checkpoint de fábrica, marcar uno,
 * apuntar un daily con un atasco de la lista y otro con «Otro», fijar la
 * entrega como cuenta atrás y abrir el tablero del sprint, con el atasco de
 * cada cual a la vista.
 */

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const fill = (key: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (done, [name, value]) => done.replace(`{${name}}`, String(value)),
    text(key),
  )

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const goal = (project: string): Promise<HTMLElement> =>
  screen.findByRole('article', { name: fill('scrum.goal.label', { project }) }, WAIT)

describe('agenda', () => {
  it('se pone una meta con sus checkpoints y se apunta un daily con un atasco de la lista', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(api, 'createAgendaGoal')

    await openApp('#/agenda')

    expect(await screen.findByRole('heading', { name: text('scrum.title') }, WAIT)).toBeTruthy()
    expect(await goal('ft_printf')).toBeTruthy()

    // Una meta nueva: proyecto del plan, y fuera un checkpoint de fábrica.
    await user.click(screen.getByRole('button', { name: text('scrum.new') }))

    const form = screen.getByRole('form', { name: text('scrum.new') })

    await user.selectOptions(within(form).getByLabelText(text('scrum.project')), 'minitalk')
    await user.selectOptions(within(form).getByLabelText(text('scrum.progress')), '20')
    await user.type(within(form).getByLabelText(text('scrum.note')), 'Falta el bonus')
    await user.click(
      within(form).getByRole('button', {
        name: fill('scrum.check.remove', { name: text('scrum.check.slots') }),
      }),
    )
    await user.click(within(form).getByRole('button', { name: text('scrum.create') }))

    await waitFor(() => {
      expect(create).toHaveBeenCalled()
    }, WAIT)
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      progress: 20,
      note: 'Falta el bonus',
      checkpoints: ['works', 'subject', 'sheet', 'norminette', 'leaks', 'breakers', 'git'],
    })

    const minitalk = await goal('minitalk')

    // Marcar un checkpoint.
    await user.click(within(minitalk).getByRole('checkbox', { name: text('scrum.check.works') }))
    await waitFor(() => {
      expect(
        within(minitalk).getByRole('checkbox', { name: text('scrum.check.works') }),
      ).toHaveProperty('checked', true)
    }, WAIT)

    // Un daily: lo que me propongo, cómo fue y el atasco de la lista.
    await user.click(within(minitalk).getByRole('button', { name: text('scrum.entry.write') }))

    const daily = within(minitalk).getByRole('form', {
      name: fill('scrum.entry.title', { project: 'minitalk' }),
    })

    await user.click(within(daily).getByRole('checkbox', { name: text('scrum.check.leaks') }))
    await user.selectOptions(
      within(daily).getByLabelText(text('scrum.entry.outcome')),
      text('scrum.outcome.partial'),
    )
    await user.selectOptions(
      within(daily).getByLabelText(text('scrum.entry.problem')),
      text('scrum.problem.memory'),
    )
    await user.selectOptions(
      within(daily).getByLabelText(text('scrum.entry.solution')),
      text('scrum.solution.debugger'),
    )
    await user.click(within(daily).getByRole('button', { name: text('scrum.entry.save') }))

    expect(await within(minitalk).findByText(text('scrum.problem.memory'), {}, WAIT)).toBeTruthy()
    expect(within(minitalk).getByText(text('scrum.outcome.partial'))).toBeTruthy()
  }, 30_000)

  it('«Otro» pide su texto, y se ve tal cual en el daily', async () => {
    const user = userEvent.setup()

    await openApp('#/agenda')

    const printf = await goal('ft_printf')

    await user.click(within(printf).getByRole('button', { name: text('scrum.entry.write') }))

    const daily = within(printf).getByRole('form', {
      name: fill('scrum.entry.title', { project: 'ft_printf' }),
    })

    // Sin «Otro» no hay campo; con él, sí.
    expect(within(daily).queryByLabelText(text('scrum.entry.problemOther'))).toBeNull()
    await user.selectOptions(
      within(daily).getByLabelText(text('scrum.entry.problem')),
      text('scrum.problem.other'),
    )
    await user.type(
      within(daily).getByLabelText(text('scrum.entry.problemOther')),
      'El Makefile relinkea',
    )
    await user.selectOptions(
      within(daily).getByLabelText(text('scrum.entry.solution')),
      text('scrum.solution.other'),
    )
    await user.type(
      within(daily).getByLabelText(text('scrum.entry.solutionOther')),
      'Leer el manual de make',
    )
    await user.click(within(daily).getByRole('button', { name: text('scrum.entry.save') }))

    expect(await within(printf).findByText('El Makefile relinkea', {}, WAIT)).toBeTruthy()
    expect(within(printf).getByText(/Leer el manual de make/)).toBeTruthy()
  }, 30_000)

  it('la entrega se fija como cuenta atrás, y la meta del sprint abre su tablero', async () => {
    const user = userEvent.setup()
    const pin = vi.spyOn(api, 'pinCountdown')

    await openApp('#/agenda')

    const printf = await goal('ft_printf')

    await user.click(within(printf).getByRole('button', { name: text('scrum.pin') }))
    await waitFor(() => {
      expect(pin).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'custom',
          title: fill('scrum.pin.title', { project: 'ft_printf' }),
        }),
      )
    }, WAIT)
    expect(
      await within(printf).findByRole('button', { name: text('scrum.unpin') }, WAIT),
    ).toHaveProperty('ariaPressed', 'true')

    // get_next_line va con el sprint 2: su tablero, con el atasco de cada cual.
    const gnl = await goal('get_next_line')

    await user.click(within(gnl).getByRole('button', { name: text('scrum.sprint.show') }))

    const board = await within(gnl).findByRole('region', { name: text('scrum.board.title') }, WAIT)
    const table = await within(board).findByRole('table', {}, WAIT)
    const lruiz = must(
      within(table)
        .getAllByRole('row')
        .find((row) => within(row).queryByText('lruiz') !== null),
      'la fila de lruiz',
    )

    expect(within(lruiz).getByText(text('scrum.problem.waiting'))).toBeTruthy()

    // Al abrir su fila sale su último daily.
    fireEvent.click(
      within(lruiz).getByRole('button', { name: fill('scrum.board.more', { login: 'lruiz' }) }),
    )
    expect(
      await within(table).findByText(/Sin franjas de corrección hasta el jueves/, {}, WAIT),
    ).toBeTruthy()
  }, 30_000)

  it('el tablero del sprint solo lo ve quien está dentro', async () => {
    await expect(api.getSprintBoard(1)).rejects.toMatchObject({ status: 403 })
    await expect(api.getSprintBoard(2)).resolves.toMatchObject({ groupId: 2 })
  })
})
