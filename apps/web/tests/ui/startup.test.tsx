/**
 * La startup del Pomodoro (`docs/pomodoro-startup.md`): con los minutos de
 * concentración se aprende, se funda la startup con su nombre, se contrata y
 * se sale en el ranking. Contra la API de mentira (30 horas ganadas).
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { StartupPanel } from '../../src/features/focus/startup/StartupPanel'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string, vars: Record<string, string> = {}): string =>
  Object.entries(vars).reduce(
    (out, [name, value]) => out.replace(`{${name}}`, value),
    must(es[key], `el texto ${key}`),
  )

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
})

describe('startup del Pomodoro', () => {
  it('aprender, fundar con nombre y contratar; y sale en el ranking', async () => {
    render(
      <I18nProvider>
        <StartupPanel />
      </I18nProvider>,
    )

    const learn = async (axis: string, times: number): Promise<void> => {
      for (let time = 0; time < times; time += 1) {
        const card = await screen.findByRole('button', {
          name: text('startup.item.learn', { axis: text(`startup.axis.${axis}`) }),
        })

        await waitFor(() => {
          expect((card as HTMLButtonElement).disabled).toBe(false)
        })
        fireEvent.click(card)
      }
    }

    await learn('ai', 4)
    await learn('data', 3)

    // Los hitos, en orden: el proyecto y el MVP.
    for (const milestone of ['side', 'mvp']) {
      const go = await screen.findByRole('button', { name: text(`startup.milestone.${milestone}`) })

      await waitFor(() => {
        expect((go as HTMLButtonElement).disabled).toBe(false)
      })
      fireEvent.click(go)
    }

    // Fundar pide el nombre.
    const found = await screen.findByRole('button', { name: text('startup.milestone.founded') })

    expect((found as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: text('startup.name') }), {
      target: { value: 'Neuralia' },
    })
    fireEvent.click(found)

    // Ya se puede contratar: tres candidatos y volver a sacar.
    const hiring = await screen.findByRole('group', { name: text('startup.hire') })
    const candidates = within(hiring).getAllByRole('button', {
      name: new RegExp(`^${text('startup.hire')} · `),
    })

    expect(candidates).toHaveLength(3)
    fireEvent.click(must(candidates[0], 'un candidato'))

    const ranking = await screen.findByRole('list', { name: text('startup.ranking') })

    await waitFor(() => {
      expect(within(ranking).getByText('Neuralia').textContent).toBe('Neuralia')
    })
  }, 20_000)

  it('cajas sorpresa, colocar la decoración a mano y visitar otra oficina', async () => {
    render(
      <I18nProvider>
        <StartupPanel />
      </I18nProvider>,
    )

    // Tres sesiones largas en la API de mentira: tres cajas. La primera trae un gato.
    const open = await screen.findByRole('button', { name: text('startup.box') })

    await waitFor(() => {
      expect((open as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(open)
    expect((await screen.findByRole('status')).textContent).toContain(
      text('startup.prize', { name: text('startup.decor.cat') }),
    )

    // La segunda, una máquina de refrescos que se coloca sola.
    const again = screen.getByRole('button', { name: text('startup.box') })

    await waitFor(() => {
      expect((again as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(again)
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(text('startup.decor.vending'))
    })

    // Mover la decoración: se elige la pieza y se mueve con las flechas.
    fireEvent.click(await screen.findByRole('button', { name: text('startup.edit') }))

    const editor = await screen.findByRole('group', { name: text('startup.edit') })
    const piece = within(editor).getByRole('button', {
      name: new RegExp(`^${text('startup.decor.vending')} `),
    })
    const before = piece.getAttribute('aria-label')

    // El gato va solo: no sale para colocar.
    expect(
      within(editor).queryByRole('button', { name: new RegExp(text('startup.decor.cat')) }),
    ).toBeNull()
    fireEvent.click(piece)

    const moves = ['up', 'left', 'right', 'down'].map((way) =>
      within(editor).getByRole('button', { name: text(`startup.move.${way}`) }),
    )
    const free = must(
      moves.find((move) => !(move as HTMLButtonElement).disabled),
      'una flecha que se pueda usar',
    )

    fireEvent.click(free)
    await waitFor(() => {
      expect(
        within(editor)
          .getByRole('button', { name: new RegExp(`^${text('startup.decor.vending')} `) })
          .getAttribute('aria-label'),
      ).not.toBe(before)
    })

    // Guardarla en el almacén.
    fireEvent.click(within(editor).getByRole('button', { name: text('startup.store') }))
    await waitFor(() => {
      expect(
        within(editor).getByRole('button', {
          name: text('startup.piece.stored', { name: text('startup.decor.vending') }),
        }),
      ).toBeTruthy()
    })

    // Ir a ver la oficina de alguien del ranking y volver.
    fireEvent.click(
      await screen.findByRole('button', { name: text('startup.visit', { login: 'lmarin-g' }) }),
    )
    fireEvent.click(await screen.findByRole('button', { name: text('startup.visit.close') }))
    expect(screen.queryByRole('button', { name: text('startup.visit.close') })).toBeNull()
  }, 20_000)

  it('implementar un producto hace que cada minuto de concentración dé dinero', async () => {
    render(
      <I18nProvider>
        <StartupPanel />
      </I18nProvider>,
    )

    // Lo que ya rinde la startup del primer test (la persona contratada sale al
    // azar y puede sumar o no): implementar el producto lo sube.
    const before = (await screen.findByTitle(text('startup.rate'))).textContent

    const product = await screen.findByRole('button', {
      name: text('startup.item.product-insights'),
    })

    await waitFor(() => {
      expect((product as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(product)
    await waitFor(() => {
      expect(screen.getByTitle(text('startup.rate')).textContent).not.toBe(before)
    })
    // El dinero se paga con dinero: sin él, el coworking no se puede alquilar.
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: text('startup.space.coworking') })
        .disabled,
    ).toBe(true)
  }, 20_000)

  it('el configurador cambia tu personaje parte a parte y lo guarda', async () => {
    render(
      <I18nProvider>
        <StartupPanel />
      </I18nProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: text('startup.avatar') }))

    const editor = await screen.findByRole('group', { name: text('startup.avatar') })
    const save = within(editor).getByRole('button', { name: text('startup.avatar.save') })
    const undo = within(editor).getByRole('button', { name: text('startup.avatar.undo') })

    // Sin cambios, nada que guardar ni deshacer.
    expect((save as HTMLButtonElement).disabled).toBe(true)
    expect((undo as HTMLButtonElement).disabled).toBe(true)

    // Una forma (el peinado) y un color (el del pelo).
    const hair = within(editor).getByRole('group', { name: text('startup.avatar.part.hair') })
    const curls = within(hair).getByRole('button', { name: text('startup.avatar.hair.3') })

    fireEvent.click(curls)
    expect(curls.getAttribute('aria-pressed')).toBe('true')

    const colour = within(editor).getByRole('group', {
      name: text('startup.avatar.part.hairColor'),
    })

    fireEvent.click(
      within(colour).getByRole('button', { name: text('startup.avatar.color', { n: '3' }) }),
    )

    // Deshacer vuelve a lo guardado: nada pendiente.
    fireEvent.click(undo)
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(curls)
    await waitFor(() => {
      expect((save as HTMLButtonElement).disabled).toBe(false)
    })
    fireEvent.click(save)

    // Guardado: lo elegido se queda y ya no hay nada pendiente.
    await waitFor(() => {
      expect((save as HTMLButtonElement).disabled).toBe(true)
    })
    expect(
      within(within(editor).getByRole('group', { name: text('startup.avatar.part.hair') }))
        .getByRole('button', { name: text('startup.avatar.hair.3') })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
