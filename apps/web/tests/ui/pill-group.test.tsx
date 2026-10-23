import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PillGroup } from '../../src/shared/ui/PillGroup'

const OPTIONS = ['day', 'week', 'month'] as const

/** Un grupo con su estado, como lo usa cualquier pantalla. */
function Pills({ kind, onChange }: { kind: 'group' | 'tabs'; onChange?: (next: string) => void }) {
  const [value, setValue] = useState<(typeof OPTIONS)[number]>('day')

  return (
    <PillGroup
      kind={kind}
      id="period"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      label="Periodo"
      text={(option) => `Opción ${option}`}
      disabled={(option) => option === 'month'}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe('Grupo de pastillas', () => {
  it('como filtro: botones con aria-pressed, y las flechas mueven el foco sin elegir', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Pills kind="group" onChange={onChange} />)

    const group = screen.getByRole('group', { name: 'Periodo' })
    const day = screen.getByRole('button', { name: 'Opción day', pressed: true })
    const week = screen.getByRole('button', { name: 'Opción week', pressed: false })

    expect(group).toBeTruthy()

    day.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(week)
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('week')
    expect(week.getAttribute('aria-pressed')).toBe('true')

    // La apagada no cuenta: desde la última, la flecha vuelve a la primera.
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(day)
  })

  it('como pestañas: tablist, aria-controls, y las flechas eligen con foco rotatorio', async () => {
    const user = userEvent.setup()

    render(<Pills kind="tabs" />)

    const tabs = screen.getAllByRole('tab')

    expect(screen.getByRole('tablist', { name: 'Periodo' })).toBeTruthy()
    expect(tabs[0]?.getAttribute('aria-controls')).toBe('period-panel-day')
    expect(tabs[0]?.id).toBe('period-tab-day')
    // Solo la elegida entra con Tab; a las demás se llega con las flechas.
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1])

    await user.tab()
    expect(document.activeElement).toBe(tabs[0])

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false')

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')

    await user.keyboard('{End}')
    // La última está apagada: End se queda en la última que se puede elegir.
    expect(document.activeElement).toBe(tabs[1])
  })
})
