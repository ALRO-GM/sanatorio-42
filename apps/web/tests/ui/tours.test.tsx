import { act, cleanup, render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import es from 'virtual:textos/es'

import { I18nProvider } from '../../src/shared/i18n'
import { Tour, defineTour, stepAt } from '../../src/shared/tour/Tour'
import type { TourDef } from '../../src/shared/tour/Tour'
import { DemoSpot } from '../../src/shared/ui/InfoTip'

/**
 * Las demostraciones, pintadas de verdad: todo lo que el guion manda señalar
 * con el ratón (`cursor`) existe en la escena en algún momento. Un destino que
 * no existe deja el ratón quieto en una esquina y la demostración no se entiende.
 */
const MODULES = import.meta.glob<Record<string, unknown>>('../../src/features/**/*Tour.tsx', {
  eager: true,
})

const TOURS = Object.values(MODULES).flatMap((module) => {
  const tour = module.TOUR as TourDef<object> | undefined
  const component = Object.entries(module).find(
    ([name, value]) => name.endsWith('Tour') && typeof value === 'function',
  )?.[1] as ComponentType | undefined

  return tour === undefined || component === undefined
    ? []
    : [[tour.name, tour, component] as const]
})

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('demostraciones pintadas', () => {
  it.each(TOURS)('%s: el ratón solo va a cosas que existen', async (_, tour, Component) => {
    vi.useFakeTimers()
    render(
      <I18nProvider>
        <Component />
      </I18nProvider>,
    )

    const wanted = new Set(
      tour.script.flatMap(([, change]) =>
        'cursor' in change && typeof change.cursor === 'string' ? [change.cursor] : [],
      ),
    )
    const seen = new Set<string>()
    const look = (): void => {
      for (const element of document.querySelectorAll('[data-tour]')) {
        seen.add(element.getAttribute('data-tour') ?? '')
      }
    }

    // Se recorre el guion entero, mirando la escena tras cada paso.
    for (let step = 0; step < 400; step++) {
      look()
      await act(async () => {
        await vi.advanceTimersToNextTimerAsync()
      })
      if (vi.getTimerCount() === 0) break
    }
    look()

    expect([...wanted].filter((target) => !seen.has(target))).toEqual([])
  })
})

describe('mando de las demostraciones', () => {
  it('se pausa, se salta a un paso y se sigue desde ahí', async () => {
    const [, tour, Component] = TOURS[0] ?? []

    if (tour === undefined || Component === undefined) throw new Error('sin demostraciones')
    vi.useFakeTimers()
    const view = render(
      <I18nProvider>
        <Component />
      </I18nProvider>,
    )
    const caption = (): string => view.container.querySelector('.tour-caption')?.textContent ?? ''
    const chapters = view.container.querySelectorAll<HTMLButtonElement>('.tour-chapter')

    expect(chapters.length).toBe(tour.steps.length)

    // Al último paso: sale su título y su frase sin esperar al guion.
    const last = chapters[chapters.length - 1]
    const step = tour.steps.at(-1) ?? 1

    await act(async () => {
      last?.click()
      await vi.advanceTimersByTimeAsync(800 * 1.5 * 3)
    })
    expect(caption()).toContain(es[`tour.${tour.name}.title.${String(step)}`])
    expect(caption()).toContain(es[`tour.${tour.name}.${String(step)}`])

    // En pausa no pasa nada por mucho que corra el reloj.
    const pause = [...view.container.querySelectorAll('button')].find((button) =>
      button.classList.contains('pill'),
    )

    act(() => {
      pause?.click()
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('el interrogante sobre un sitio: desde qué paso empieza', () => {
  const tour = defineTour('record', {}, [[1000, { caption: 2 }]], {
    2: '.health-card',
    1: '.xp-bar',
  })

  it('el paso del sitio más cercano, de dentro hacia fuera; ninguno, null', () => {
    document.body.innerHTML = `
      <section class="profile">
        <article class="health-card"><p><b id="in-health">ok</b></p></article>
        <div class="xp-bar"><span id="in-xp"></span></div>
        <p id="elsewhere"></p>
      </section>`

    expect(stepAt(tour.spots, document.getElementById('in-health'))).toBe(2)
    expect(stepAt(tour.spots, document.getElementById('in-xp'))).toBe(1)
    expect(stepAt(tour.spots, document.getElementById('elsewhere'))).toBeNull()
    expect(stepAt(tour.spots, null)).toBeNull()
  })

  it('abierta desde el interrogante, la demostración empieza en ese paso', () => {
    document.body.innerHTML = '<article class="health-card"><b id="in-health">ok</b></article>'
    const dropped = document.getElementById('in-health')
    const view = render(
      <I18nProvider>
        <DemoSpot.Provider value={dropped}>
          <Tour tour={tour} tab={() => ''}>
            {() => null}
          </Tour>
        </DemoSpot.Provider>
      </I18nProvider>,
    )

    expect(view.container.querySelector('.tour-caption')?.textContent).toContain(
      es['tour.record.2'],
    )
  })
})
