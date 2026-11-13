import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('Estadísticas de Ayuda', () => {
  it('cada sección tiene sus cifras y su clasificación con fotos; el periodo cambia las cifras', async () => {
    const user = userEvent.setup()

    await openApp('#/estadisticas')
    expect(
      await screen.findByRole('heading', { name: new RegExp(text('stats.title')) }),
    ).toBeTruthy()

    for (const id of ['consulta', 'tablon', 'terapia', 'pizarras', 'notgames']) {
      const card = must(
        (await screen.findByRole('heading', { name: text(`nav.${id}`), level: 3 })).closest(
          'article',
        ),
        `la tarjeta de ${id}`,
      )
      const ranking = within(card).getByRole('list', { name: text(`stats.${id}.rank`) })

      expect(within(ranking).getAllByRole('listitem').length).toBeGreaterThan(0)
      // Cada fila lleva a su expediente y enseña la foto.
      expect(within(ranking).getAllByRole('link').length).toBeGreaterThan(0)
      expect(within(ranking).getAllByRole('img').length).toBeGreaterThan(0)
    }

    const doubts = (): string =>
      must(
        screen.getByText(text('stats.tablon.doubts')).nextElementSibling?.textContent,
        'la cifra de dudas',
      )
    const before = doubts()

    await user.click(screen.getByRole('button', { name: text('rank.all') }))
    await screen.findByRole('button', { name: text('rank.all'), pressed: true })
    await expect.poll(doubts).not.toBe(before)
  }, 20_000)

  it('debajo, las clasificaciones de los cursos: total, cada curso, jefes y certificados', async () => {
    const user = userEvent.setup()

    await openApp('#/estadisticas')
    const block = must(
      (await screen.findByRole('heading', { name: text('stats.courses.title'), level: 2 })).closest(
        'section',
      ),
      'el bloque de los cursos',
    )
    const titles = [
      'stats.courses.total',
      'nav.cursoshell',
      'nav.cursogit',
      'nav.cursodocker',
      'nav.cursok8s',
      'nav.cursonet',
      'stats.courses.bosses',
      'stats.courses.certificates',
    ]

    for (const key of titles) {
      expect(await within(block).findByRole('heading', { name: text(key), level: 3 })).toBeTruthy()
    }

    // La tarjeta del total se busca cada vez: al cambiar el periodo se vuelve a pintar.
    const total = (): HTMLElement =>
      must(
        screen
          .getByRole('heading', { name: text('stats.courses.total') })
          .closest<HTMLElement>('article'),
        'la tarjeta del total',
      )
    const ranking = within(total()).getByRole('list', { name: text('stats.courses.total.rank') })

    // Quien más estrellas suma va primero, con su foto y enlace a su perfil.
    expect(within(ranking).getAllByRole('link')[0]?.textContent).toBe('lruiz')
    const passed = (): string | null | undefined =>
      within(total()).queryByText(text('stats.courses.sum.units'))?.nextElementSibling?.textContent
    const before = passed()

    // El periodo de arriba cambia también los cursos.
    await user.click(screen.getByRole('button', { name: text('rank.all') }))
    await expect.poll(passed, { timeout: 5000 }).not.toBe(before)
    expect(passed()).toBeTruthy()
  }, 20_000)

  it('al pasar el ratón por un login sale su ficha con la foto y lo que está haciendo', async () => {
    const user = userEvent.setup()

    await openApp('#/estadisticas')
    const link = (await screen.findAllByRole('link', { name: 'anavarro' }))[0]

    await user.hover(must(link, 'el enlace'))
    const card = await screen.findByRole('tooltip', {}, { timeout: 3000 })

    expect(within(card).getByText('anavarro')).toBeTruthy()
    expect(within(card).getByRole('img')).toBeTruthy()
    await user.unhover(must(link, 'el enlace'))
    expect(screen.queryByRole('tooltip')).toBeNull()
  }, 20_000)
})
