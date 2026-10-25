import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { gateOf } from '@sanatorio/gitsim'

import { GroupRooms } from '../../src/features/gitcourse/GroupRoom'
import { ME } from '../../src/shared/api/mock/data'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('curso de git: prueba de grupo', () => {
  it('se crea la sala, entra la compañera, se empieza y se juega con origin común', async () => {
    const user = userEvent.setup()
    const gate = must(gateOf('group1'), 'la prueba group1')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <GroupRooms gate={gate} me={ME.login} />
      </I18nProvider>,
    )
    await user.click(await screen.findByRole('button', { name: text('common.createRoom') }))

    // Sola no se puede empezar; la compañera de mentira entra enseguida.
    const start = await screen.findByRole('button', { name: text('git.room.start') })

    expect(start.hasAttribute('disabled')).toBe(true)
    await settle(3200)
    expect(screen.getByText('mgarcia')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('git.room.start') }))

    // Tu papel, las misiones y la terminal, que ejecuta en el servidor.
    expect(await screen.findByText(text('git.room.missions'))).toBeTruthy()
    expect(screen.getByText(`git switch -c ${ME.login}`)).toBeTruthy()

    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    await user.type(input, `git switch -c ${ME.login}{Enter}`)
    expect(await screen.findByText(new RegExp(`Ahora en la nueva rama ${ME.login}`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`origin/${ME.login} tiene un commit`))).toBeTruthy()

    // Salir vuelve a la lista.
    await user.click(screen.getByRole('button', { name: text('common.leave') }))
    expect(await screen.findByRole('button', { name: text('common.createRoom') })).toBeTruthy()
  }, 20_000)
})
