import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const legend = (key: string): RegExp => new RegExp(`^${text(key).split(' (')[0] ?? ''}`)

afterEach(() => {
  cleanup()
})

describe('Avance por plan', () => {
  it('sale con el plan de quien mira y, con los dos, una media para C y otra para Python', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')

    // El de prueba es del plan con Python: una sola media, la suya.
    expect(
      await screen.findAllByText(legend('stats.progress.average'), {}, { timeout: 5000 }),
    ).not.toHaveLength(0)
    expect(screen.queryByText(legend('stats.progress.averageC'))).toBeNull()

    await user.click(screen.getByRole('button', { name: text('stats.progress.plan.all') }))

    expect(screen.getAllByText(legend('stats.progress.averageC'))).not.toHaveLength(0)
    expect(screen.getAllByText(legend('stats.progress.averagePython'))).not.toHaveLength(0)
    expect(document.querySelector('.progress-line.average-c')).not.toBeNull()
    expect(document.querySelector('.progress-line.average-python')).not.toBeNull()
    expect(document.querySelector('.progress-line.average')).toBeNull()
  })
})
