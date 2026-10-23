import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { ExamPeople } from '../../src/features/exams/ExamPeople'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const WAIT = { timeout: 5000 }

afterEach(() => {
  cleanup()
})

describe('PeopleResults: la lista de personas de los buscadores', () => {
  it('en el buscador de la cabecera se elige con las flechas y Enter', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.click(screen.getByRole('button', { name: text('finder.label') }))

    const box = screen.getByRole('combobox', { name: text('finder.label') })

    await user.type(box, 'jd')
    await settle(500)

    const list = await screen.findByRole('listbox', { name: text('finder.label') }, WAIT)
    const options = within(list).getAllByRole('option')

    expect(options.length).toBeGreaterThan(0)
    // La primera viene elegida; la flecha arriba da la vuelta hasta la última.
    expect(options[0]?.getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowUp}')
    const last = must(options.at(-1), 'la última')

    expect(last.getAttribute('aria-selected')).toBe('true')
    expect(box.getAttribute('aria-activedescendant')).toBe(last.id)

    const login = must(last.querySelector('strong')?.textContent, 'su login')

    await user.keyboard('{Enter}')
    await settle()
    expect(window.location.hash).toBe(`#/expediente/${login}`)
  }, 20_000)

  it('si no hay nadie, lo dice', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.click(screen.getByRole('button', { name: text('finder.label') }))
    await user.type(screen.getByRole('combobox', { name: text('finder.label') }), 'zzzzqq')
    await settle(500)

    expect(await screen.findByText(text('finder.none'), {}, WAIT)).toBeTruthy()
  }, 20_000)
})

describe('ExamPeople: la lista de personas de exámenes', () => {
  it('foto, nombre, círculo, lo que añada cada vista y la clase de la fila', () => {
    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <ExamPeople
          label="En el examen"
          people={[
            { login: 'ana', image: null, circle: 3, mark: 100 },
            { login: 'bea', image: null, circle: null, mark: null },
          ]}
          rowClass={(person) => (person.mark === null ? 'status-pending' : 'status-passed')}
          badges={(person) => <span className="badge">extra-{person.login}</span>}
          end={(person) => <strong>{person.mark ?? '—'}</strong>}
        />
      </I18nProvider>,
    )

    const rows = within(screen.getByRole('list', { name: 'En el examen' })).getAllByRole('listitem')

    expect(rows).toHaveLength(2)
    expect(rows[0]?.className).toBe('status-passed')
    expect(
      within(must(rows[0], 'ana')).getByText(text('graph.circle').replace('{n}', '3')),
    ).toBeTruthy()
    expect(within(must(rows[1], 'bea')).queryByText(/3/)).toBeNull()
    expect(within(must(rows[1], 'bea')).getByText('extra-bea')).toBeTruthy()
    expect(within(must(rows[1], 'bea')).getByText('—')).toBeTruthy()
  })
})
