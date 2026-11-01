/**
 * «Mis correcciones» del tablón: el álbum de correcciones
 * (`docs/correcciones-coleccion.md`) en los tres modos, buscando por rol y
 * nombre. Con la API de mentira, la persona aprobó Libft (corregido 11
 * veces: maestría) y Born2beroot (sin corregir: el hueco).
 */

import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { setDetail } from '../../src/shared/detail'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const fill = (key: string, vars: Record<string, string>): string =>
  Object.entries(vars).reduce((acc, [name, value]) => acc.replace(`{${name}}`, value), text(key))
const WAIT = { timeout: 5000 }

afterEach(() => {
  cleanup()
  setDetail('normal')
})

async function openAlbum(detail: 'simple' | 'normal' | 'datos', seen?: number[]): Promise<void> {
  const user = userEvent.setup()

  await openApp('#/tablon')
  setDetail(detail)
  // Lo que ya estaba completo la última vez (para la celebración).
  if (seen !== undefined) localStorage.setItem('sanatorio_album_sets_core', JSON.stringify(seen))
  await user.click(
    await screen.findByRole('button', { name: text('cgraph.view.corrections') }, WAIT),
  )
  await screen.findByText(text('cgraph.album'), {}, WAIT)
}

describe('álbum de correcciones', () => {
  it('enseña el progreso, el cromo que falta en silueta y el siguiente objetivo', async () => {
    await openAlbum('normal')

    expect(screen.getByText(fill('cgraph.progress.many', { owned: '1', n: '2' }))).toBeTruthy()
    // El anillo dice el porcentaje.
    expect(screen.getByRole('img', { name: '50 %' })).toBeTruthy()

    const missing = screen.getByRole('button', {
      name: fill('cgraph.card.missing', { name: 'Born2beroot' }),
    })

    expect(missing.className).toContain('missing')
    // Lo que aún no ha aprobado sale con candado y no cuenta.
    expect(
      screen.getByRole('button', { name: fill('cgraph.future', { name: 'ft_printf' }) }).className,
    ).toContain('locked')

    const goals = await screen.findByRole('region', { name: text('cgraph.goals') }, WAIT)

    expect(
      within(goals).getByText(
        fill('cgraph.goal.set.one', { n: '1', set: 'Círculo 1', names: 'B2BR' }),
        { exact: false },
      ),
    ).toBeTruthy()
    // La comparación resumida, sin la clasificación entera.
    const compare = await screen.findByRole('region', { name: text('cgraph.compare') }, WAIT)

    expect(within(compare).getByText(text('cgraph.group.friends'))).toBeTruthy()
    expect(screen.queryByRole('heading', { name: text('cgraph.ranking') })).toBeNull()
  }, 20_000)

  it('en el modo de datos abre las clasificaciones por grupo y la rareza', async () => {
    const user = userEvent.setup()

    await openAlbum('datos')

    expect(await screen.findByRole('heading', { name: text('cgraph.ranking') }, WAIT)).toBeTruthy()

    const tabs = screen.getByRole('tablist', { name: text('cgraph.ranking.groups') })

    await user.click(within(tabs).getByRole('tab', { name: text('cgraph.group.world') }))

    const list = await screen.findByRole('list', { name: text('cgraph.ranking') }, WAIT)

    expect(within(list).getByText('lmarin-g')).toBeTruthy()
    // Tu fila, marcada.
    expect(within(list).getByText(text('rank.you'))).toBeTruthy()
    // La rareza de los cromos, en una etiqueta.
    expect(screen.getAllByText(text('cgraph.rarity.common')).length).toBeGreaterThan(0)
  }, 20_000)

  it('en el simplificado sale el álbum, sin objetivos ni rankings', async () => {
    await openAlbum('simple')

    expect(screen.getByText(fill('cgraph.progress.many', { owned: '1', n: '2' }))).toBeTruthy()
    expect(screen.queryByRole('region', { name: text('cgraph.goals') })).toBeNull()
    expect(screen.queryByRole('region', { name: text('cgraph.compare') })).toBeNull()
    expect(screen.queryByRole('heading', { name: text('cgraph.ranking') })).toBeNull()
  }, 20_000)

  it('celebra una colección recién completada, una sola vez', async () => {
    await openAlbum('normal', [])

    expect(
      await screen.findByText(fill('cgraph.celebrate', { set: 'Círculo 0' }), {}, WAIT),
    ).toBeTruthy()
    expect(localStorage.getItem('sanatorio_album_sets_core')).toBe('[0]')
  }, 20_000)

  it('elegir un cromo abre su tablón', async () => {
    const user = userEvent.setup()

    await openAlbum('simple')
    await user.click(
      screen.getByRole('button', { name: fill('cgraph.card.missing', { name: 'Born2beroot' }) }),
    )

    expect(
      await screen.findByText(fill('board.openDoubts', { project: 'Born2beroot' }), {}, WAIT),
    ).toBeTruthy()
  }, 20_000)
})
