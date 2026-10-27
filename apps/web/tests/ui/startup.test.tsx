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
  })
})
