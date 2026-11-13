import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { askView, UNITS } from '@sanatorio/ragsim'
import type { Unit } from '@sanatorio/ragsim'

import { UnitView } from '../../src/features/ragcourse/UnitView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Supera en la API de mentira todo lo que hay antes de ese punto (el camino va en orden). */
async function reach(id: string): Promise<Unit> {
  const course = await api.getRagCourse()

  for (const unit of UNITS) {
    if (unit.id === id) return unit
    if (course.stars[unit.id] !== undefined) continue
    if (unit.limit !== undefined) await api.startRagBoss(unit.id)
    await api.submitRagAttempt(unit.id, { entries: unit.solution })
  }
  throw new Error(`no hay ${id}`)
}

async function show(unit: Unit): Promise<void> {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <UnitView
        unit={unit}
        course={await api.getRagCourse()}
        onCourse={() => undefined}
        onBack={() => undefined}
      />
    </I18nProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('curso de RAG', () => {
  it('el camino, la guía de construcción y una unidad entera: teoría, ejemplo y banco de pruebas', async () => {
    const user = userEvent.setup()

    await openApp('#/cursorag')

    // No pide ningún otro curso antes; arriba, la tubería y la guía de construcción.
    const next = await screen.findByRole(
      'button',
      { name: 'Trocear: el tamaño' },
      { timeout: 5000 },
    )

    expect(screen.queryByRole('note')).toBeNull()
    expect(
      within(screen.getByRole('list', { name: text('rag.pipe.label') })).getAllByRole('listitem'),
    ).toHaveLength(7)
    await user.click(screen.getByText(text('rag.guide.title')))
    expect(screen.getAllByText(/def load_documents/).length).toBeGreaterThan(0)

    // El camino va de uno en uno: el que toca se abre, el siguiente aún no.
    expect(next.hasAttribute('disabled')).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Trocear: el solape' }).hasAttribute('disabled'),
    ).toBe(true)
    await user.click(next)
    expect(screen.getByText(text('shell.theory.what'))).toBeTruthy()
    expect(screen.getByText(text('rag.stars.three.many').replace('{n}', '3'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toExample') }))
    // El ejemplo lo ejecuta el motor: con trozos de 10 palabras, la respuesta se pierde al trocear.
    expect(screen.getByText(/Antes de verlo/)).toBeTruthy()
    expect(await screen.findByText(text('rag.stage.chunking'))).toBeTruthy()
    expect(screen.getByText(text('rag.chunks.split'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('shell.toTest') }))

    // Mover el mando y mirar no cuenta; cada «Comprobar», sí.
    const size = screen.getByRole('slider', {
      name: new RegExp(text('rag.knob.size').slice(0, 12)),
    })
    const check = screen.getByRole('button', { name: text('rag.bench.check') })

    fireEvent.change(size, { target: { value: '20' } })
    expect(screen.getByText(text('rag.count.many').replace('{n}', '0'))).toBeTruthy()
    await user.click(check)
    expect(screen.getByText(text('rag.count.one').replace('{n}', '1'))).toBeTruthy()
    expect(screen.getByText(text('rag.bench.failed'))).toBeTruthy()
    fireEvent.change(size, { target: { value: '50' } })
    expect(screen.getByText(text('rag.chunks.whole'))).toBeTruthy()
    await user.click(check)
    expect(await screen.findByText(new RegExp(text('shell.won')))).toBeTruthy()
    expect(screen.getByText(text('rag.why.many').replace('{n}', '2'))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: new RegExp(text('shell.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'Trocear: el solape' })).hasAttribute('disabled'),
    ).toBe(false)
  }, 40_000)

  it('un cálculo a mano: el motor da los datos y admite la coma decimal', async () => {
    const user = userEvent.setup()
    const unit = await reach('rag-tfidf')
    const task = unit.tasks[0]

    if (task?.kind !== 'calc') throw new Error('se esperaba un cálculo')
    await show(unit)
    await user.click(screen.getByRole('tab', { name: new RegExp(text('shell.step.test')) }))

    const boxes = screen.getAllByRole('textbox')
    const check = screen.getByRole('button', { name: text('rag.bench.check') })

    expect(boxes).toHaveLength(task.asks.length)
    // Sin rellenar todo no se puede comprobar (y no cuenta).
    expect(check.hasAttribute('disabled')).toBe(true)
    for (const box of boxes) await user.type(box, '9')
    await user.click(check)
    expect(screen.getByText(text('rag.bench.failed'))).toBeTruthy()
    for (const [at, box] of boxes.entries()) {
      const view = askView(must(task.asks[at], 'la pregunta'))

      await user.clear(box)
      await user.type(box, view.expected.toFixed(view.decimals).replace('.', ','))
    }
    await user.click(check)
    expect(await screen.findByText(new RegExp(text('shell.won')))).toBeTruthy()
    expect(screen.getByText(text('rag.bench.passed'))).toBeTruthy()
  }, 40_000)

  it('un jefe: historia, tareas en pestañas, reloj y, al vencerlo, la pieza de tu RAG', async () => {
    const user = userEvent.setup()
    const boss = await reach('rag-boss-invents')

    await show(boss)
    expect(screen.getByText(/Soporte reenvía una captura/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Empezar el contrarreloj/ }))
    expect(await screen.findByRole('timer')).toBeTruthy()

    // Tarea 1: contexto encendido y solo guías y código.
    await user.click(screen.getByRole('checkbox', { name: text('rag.knob.context') }))
    for (const source of ['lock', 'env', 'eval'])
      await user.click(screen.getByRole('checkbox', { name: text(`rag.opt.sources.${source}`) }))
    await user.click(screen.getByRole('button', { name: text('rag.bench.check') }))
    expect(screen.getByText(text('rag.bench.passed'))).toBeTruthy()
    expect(screen.getByRole('tab', { name: /✓/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('rag.bench.next') }))

    // Tarea 2: por estructura, con un tope de 60 palabras.
    await user.click(screen.getByRole('button', { name: text('rag.opt.chunker.structure') }))
    fireEvent.change(screen.getByRole('slider', { name: /Tamaño del trozo/ }), {
      target: { value: '60' },
    })
    await user.click(screen.getByRole('button', { name: text('rag.bench.check') }))
    await settle(400)
    expect(screen.getByText(/Jefe superado en 0:0\d/)).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
    // Vencido el jefe del bloque, la pieza que ya se puede escribir.
    expect(screen.getByText(new RegExp(text('rag.build.title')))).toBeTruthy()
    expect(screen.getByText(/def chunk\(path, text, max_size\)/)).toBeTruthy()
  }, 40_000)
})
