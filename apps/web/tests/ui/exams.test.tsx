import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
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
  vi.restoreAllMocks()
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

  // Solo sale en el modo de datos; como la cola de intentos, va plegado.
  it('cada intento y la cola salen plegados y se abren, con la nota mediana; sin tabla de kickoffs hasta elegir dos', async () => {
    const user = userEvent.setup()

    await openExams()
    await screen.findByRole('combobox', { name: text('exams.familyFilter') }, WAIT)

    const folded = must(
      within(rankRow(3)).getAllByText(text('exams.byAttempt'), { selector: 'summary' })[0],
      'el desplegable de cada intento',
    )
    const details = must(folded.closest('details'), 'su details')

    const tail = must(
      within(rankRow(3)).getAllByText(pattern('exams.moreAttempts'), { selector: 'summary' })[0],
      'la cola de intentos',
    ).closest('details')

    expect(tail?.open).toBe(false)
    expect(details.open).toBe(false)
    await user.click(folded)
    expect(details.open).toBe(true)
    expect(within(details).getAllByText(/^nota mediana \d+ ·/).length).toBeGreaterThan(0)

    // El black hole sale por lo que 42 hizo al echar a cada cual, no por su
    // fecha (`docs/blackhole.md`); la tabla de kickoffs, solo al comparar dos.
    expect(screen.queryByRole('table')).toBeNull()
  }, 30_000)

  it('en el modo de datos se comparan dos kickoffs una al lado de la otra (#81)', async () => {
    const user = userEvent.setup()

    await openExams()

    const first = await screen.findByRole('combobox', { name: text('exams.compare.first') }, WAIT)
    const second = screen.getByRole('combobox', { name: text('exams.compare.second') })
    const months = within(first)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value !== '')

    // La misma dos veces no es una comparación: no sale la tabla.
    await user.selectOptions(first, must(months[0], 'una kickoff'))
    await user.selectOptions(second, must(months[0], 'la misma'))
    await settle(300)
    expect(screen.queryByRole('table')).toBeNull()

    await user.selectOptions(
      screen.getByRole('combobox', { name: text('exams.compare.second') }),
      must(months[1], 'otra kickoff'),
    )

    const table = await screen.findByRole('table', { name: text('exams.compare.title') }, WAIT)
    // Una columna por kickoff, con su gente; cada examen, en cifras y en %.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3)
    expect(within(table).getAllByText(/ %/).length).toBeGreaterThan(0)
    expect(within(table).getByRole('rowheader', { name: 'Exam Rank 03 · 42next' })).toBeTruthy()

    // Solo con los de C, solo filas de C.
    await user.selectOptions(choice('exams.familyFilter'), 'classic')
    await vi.waitFor(() => {
      expect(
        within(screen.getByRole('table')).queryByRole('rowheader', {
          name: 'Exam Rank 03 · 42next',
        }),
      ).toBeNull()
    }, WAIT)
  }, 30_000)

  it('fuera del modo de datos no se ofrece comparar', async () => {
    await openApp('#/examenes')
    await screen.findByRole('combobox', { name: text('exams.familyFilter') }, WAIT)

    expect(screen.queryByRole('combobox', { name: text('exams.compare.first') })).toBeNull()
  }, 30_000)

  it('en el modo de datos sale el black hole de cada círculo, en cifras y en % (#81)', async () => {
    await openExams()

    const card = must(
      (await screen.findByText(text('exams.blackhole.title'), {}, WAIT)).closest('article'),
      'la tarjeta del black hole',
    )

    expect(within(card).getAllByText(/ %/).length).toBeGreaterThan(0)
    expect(within(card).getAllByText(pattern('exams.blackhole.line')).length).toBeGreaterThan(0)
  }, 30_000)

  it('quien administra ve el historial: quién se fue y quién lo tiene más cerca (#81)', async () => {
    const user = userEvent.setup()

    await openExams()

    const tabs = await screen.findByRole('tablist', { name: text('exams.blackhole.history') }, WAIT)
    const panel = (): HTMLElement => screen.getByRole('tabpanel')

    expect(await within(panel()).findByRole('link', { name: 'tvelasco' }, WAIT)).toBeTruthy()
    await user.click(within(tabs).getByRole('tab', { name: text('exams.blackhole.closest') }))
    expect(await within(panel()).findByRole('link', { name: 'amolina' }, WAIT)).toBeTruthy()
    expect(within(panel()).queryByRole('link', { name: 'tvelasco' })).toBeNull()
  }, 30_000)

  it('quien no administra no ve el historial ni lo pide', async () => {
    const profile = await api.getProfile()

    vi.spyOn(api, 'getProfile').mockResolvedValue({ ...profile, admin: false })
    const history = vi.spyOn(api, 'getExamBlackhole')

    await openExams()
    await screen.findByText(text('exams.blackhole.title'), {}, WAIT)
    await settle(300)

    expect(screen.queryByRole('tablist', { name: text('exams.blackhole.history') })).toBeNull()
    expect(history).not.toHaveBeenCalled()
  }, 30_000)

  it('si falla el historial, se dice; sin nadie con lo elegido, también', async () => {
    const history = vi.spyOn(api, 'getExamBlackhole').mockRejectedValue(new Error('caído'))

    await openExams()
    await screen.findByRole('tablist', { name: text('exams.blackhole.history') }, WAIT)
    expect(await within(screen.getByRole('tabpanel')).findByRole('alert', {}, WAIT)).toBeTruthy()

    cleanup()
    history.mockResolvedValue({ absorbed: [], closest: [] })
    await openExams()
    expect(await screen.findByText(text('exams.blackhole.nobody'), {}, WAIT)).toBeTruthy()
  }, 30_000)
})
