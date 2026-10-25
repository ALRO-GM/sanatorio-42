import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { reloadDetail } from '../../src/shared/detail'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
/**
 * Un texto con huecos, como expresión: los huecos valen cualquier cosa. Si la
 * clave tiene singular y plural (`.one`, `.many`), vale cualquiera de los dos.
 */
const pattern = (key: string): RegExp =>
  new RegExp(
    (key in es ? [key] : [`${key}.one`, `${key}.many`])
      .map((each) =>
        text(each)
          .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
          .replace(/\{\w+\}/g, '.+'),
      )
      .join('|'),
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

/** Un desplegable de los filtros, buscado cada vez: se vuelve a pintar al cambiar de filtro. */
const choice = (key: string): HTMLElement => screen.getByRole('combobox', { name: text(key) })
/** Las casillas de las kickoffs (dentro de su desplegable). */
const kickoffs = (): HTMLElement => screen.getByRole('group', { name: text('exams.kickoffs') })

const selection = (): string =>
  must(screen.getByText(pattern('exams.selection')).textContent, 'la gente elegida')

describe('Estadísticas de exámenes', () => {
  it('se elige plan, exámenes y kickoffs; el mismo rango de C y de Nexus va en la misma fila', async () => {
    const user = userEvent.setup()

    await openExams()
    await screen.findByRole('combobox', { name: text('exams.familyFilter') }, WAIT)

    // Con los dos, el rango 3 lleva su examen de C y el de Nexus.
    const row = rankRow(3)

    expect(within(row).getByText('Exam Rank 03')).toBeTruthy()
    expect(within(row).getByText('Exam Rank 03 · 42next')).toBeTruthy()
    // De entrada, hasta el tercer intento; los demás, al desplegar.
    expect(within(row).getAllByText(pattern('exams.moreAttempts')).length).toBeGreaterThan(0)

    // Solo Nexus: el de C desaparece.
    await user.selectOptions(choice('exams.familyFilter'), 'next')
    expect(within(rankRow(3)).queryByText('Exam Rank 03')).toBeNull()
    expect(within(rankRow(3)).getByText('Exam Rank 03 · 42next')).toBeTruthy()

    // Una kickoff (se marca su casilla en el desplegable): menos gente que con todas.
    const before = selection()

    await user.click(screen.getByText(text('exams.kickoff.all'), { selector: 'summary' }))
    await user.click(
      must(within(kickoffs()).getAllByRole('checkbox', { checked: false })[0], 'una kickoff'),
    )
    await expect.poll(selection, WAIT).not.toBe(before)
    expect(
      within(kickoffs()).getByRole('checkbox', { name: text('exams.kickoff.all') }),
    ).toHaveProperty('checked', false)

    // Solo el core en C: los de Nexus ya no salen.
    await user.selectOptions(choice('exams.trackFilter'), 'classic')
    await user.click(within(kickoffs()).getByRole('checkbox', { name: text('exams.kickoff.all') }))
    await user.selectOptions(choice('exams.familyFilter'), 'both')
    await expect
      .poll(() => within(rankRow(3)).queryByText('Exam Rank 03 · 42next'), WAIT)
      .toBeNull()
    expect(within(rankRow(3)).getByText('Exam Rank 03')).toBeTruthy()
  }, 30_000)

  it('cada intento va plegado, con la nota mediana; sin black hole ni tabla de kickoffs', async () => {
    const user = userEvent.setup()

    await openExams()
    await screen.findByRole('combobox', { name: text('exams.familyFilter') }, WAIT)

    const folded = must(
      within(rankRow(3)).getAllByText(text('exams.byAttempt'), { selector: 'summary' })[0],
      'el desplegable de cada intento',
    )
    const details = must(folded.closest('details'), 'su details')

    expect(details.open).toBe(false)
    await user.click(folded)
    expect(details.open).toBe(true)
    expect(within(details).getAllByText(/^nota mediana \d+ ·/).length).toBeGreaterThan(0)

    expect(screen.queryByText(/black hole/i)).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  }, 30_000)
})
