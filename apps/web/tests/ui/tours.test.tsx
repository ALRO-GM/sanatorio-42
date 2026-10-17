import { act, cleanup, render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../src/shared/i18n'
import type { TourDef } from '../../src/shared/tour/Tour'

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
