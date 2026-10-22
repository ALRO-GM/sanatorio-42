import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { reloadDetail } from '../../src/shared/detail'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
/** Un texto con huecos, como expresión: los huecos valen cualquier cosa. */
const pattern = (key: string): RegExp =>
  new RegExp(
    text(key)
      .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
      .replace(/\{\w+\}/g, '.+'),
  )

afterEach(() => {
  cleanup()
  localStorage.removeItem('sanatorio_detail')
  reloadDetail()
})

/** Abre los exámenes en el modo «loco por los datos». */
async function openExams(): Promise<void> {
  await openApp('#/examenes')
  localStorage.setItem('sanatorio_detail', 'datos')
  reloadDetail()
  await settle(300)
}

/** La fila de un rango: sus exámenes, uno al lado del otro. */
const rankRow = (n: number): HTMLElement =>
  must(
    screen
      .getByRole('heading', { name: text('exams.rank').replace('{n}', String(n)) })
      .closest('section'),
    `la fila del rango ${n}`,
  )

/** Un grupo de botones, buscado cada vez: la lista se vuelve a pintar al cambiar de filtro. */
const group = (key: string): HTMLElement => screen.getByRole('group', { name: text(key) })

const selection = (): string =>
  must(screen.getByText(pattern('exams.selection')).textContent, 'la gente elegida')

describe('Estadísticas de exámenes', () => {
  it('se elige plan, exámenes y kickoffs; el mismo rango de C y de Nexus va en la misma fila', async () => {
    const user = userEvent.setup()

    await openExams()
    await screen.findByRole('group', { name: text('exams.familyFilter') }, WAIT)

    // Con los dos, el rango 3 lleva su examen de C y el de Nexus.
    const row = rankRow(3)

    expect(within(row).getByText('Exam Rank 03')).toBeTruthy()
    expect(within(row).getByText('Exam Rank 03 · 42next')).toBeTruthy()

    // Solo Nexus: el de C desaparece.
    await user.click(
      within(group('exams.familyFilter')).getByRole('button', { name: text('exams.family.next') }),
    )
    expect(within(rankRow(3)).queryByText('Exam Rank 03')).toBeNull()
    expect(within(rankRow(3)).getByText('Exam Rank 03 · 42next')).toBeTruthy()

    // Una kickoff: menos gente que con todas.
    const before = selection()

    await user.click(
      must(
        within(group('exams.kickoffs')).getAllByRole('button', { pressed: false })[0],
        'una kickoff',
      ),
    )
    await expect.poll(selection, WAIT).not.toBe(before)
    expect(
      within(group('exams.kickoffs')).getByRole('button', { name: text('exams.kickoff.all') }),
    ).toHaveProperty('ariaPressed', 'false')

    // Solo el core en C: los de Nexus ya no salen.
    await user.click(
      within(group('exams.trackFilter')).getByRole('button', {
        name: text('exams.plan.classic'),
      }),
    )
    await user.click(
      within(group('exams.kickoffs')).getByRole('button', { name: text('exams.kickoff.all') }),
    )
    await user.click(
      within(group('exams.familyFilter')).getByRole('button', { name: text('exams.family.both') }),
    )
    await expect
      .poll(() => within(rankRow(3)).queryByText('Exam Rank 03 · 42next'), WAIT)
      .toBeNull()
    expect(within(rankRow(3)).getByText('Exam Rank 03')).toBeTruthy()
  }, 30_000)

  it('el black hole: por círculo, cada mes, los últimos absorbidos y quien está más cerca', async () => {
    await openExams()

    const circles = await screen.findByRole('list', { name: text('exams.bh.circles') }, WAIT)

    expect(within(circles).getAllByRole('listitem').length).toBeGreaterThan(0)
    // Cada cifra va con su porcentaje.
    expect(within(circles).getAllByText(/%/).length).toBeGreaterThan(0)
    expect(screen.getByRole('list', { name: text('exams.bh.months') })).toBeTruthy()
    for (const key of ['exams.bh.recent', 'exams.bh.closest']) {
      const list = screen.getByRole('list', { name: text(key) })

      expect(within(list).getAllByRole('link').length).toBeGreaterThan(0)
    }
    // Las kickoffs, una al lado de otra.
    expect(screen.getByRole('columnheader', { name: text('exams.col.kickoff') })).toBeTruthy()
  }, 30_000)
})
