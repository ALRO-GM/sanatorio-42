import type { Peer } from '@sanatorio/contracts'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PeerList } from '../../src/features/peers/PeerList'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string, n?: number): string =>
  must(es[key], `el texto ${key}`).replace('{n}', String(n ?? ''))

const peer = (login: string, change: Partial<Peer>): Peer => ({
  login,
  image: null,
  location: null,
  available: false,
  status: 'in_progress',
  perfect: false,
  preReview: false,
  focusUntil: null,
  ...change,
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Sala de espera: quién está de guardia', () => {
  it('de guardia es disponible y sentado; los dos casos a medias no cuentan', async () => {
    const user = userEvent.setup()

    vi.spyOn(api, 'getPeers').mockResolvedValue({
      peers: [
        // Disponible pero fuera del campus: no está de guardia.
        peer('p-fuera', { available: true, location: null }),
        // Sentado pero sin ofrecerse: tampoco.
        peer('p-sentada', { available: false, location: 'c1r1s1', status: 'finished' }),
        // Disponible y sentado: de guardia, y va primero.
        peer('p-guardia', { available: true, location: 'c1r2s3' }),
      ],
      total: 3,
      partial: false,
    })
    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <PeerList project={{ id: 1314, name: 'ft_printf' }} onOpenTherapy={() => undefined} />
      </I18nProvider>,
    )

    expect(await screen.findByText(text('peers.onDuty.one', 1))).toBeTruthy()

    // La de la gente, no las del mapa del clúster (que llega a su ritmo y también tiene listas).
    const list = (): HTMLElement =>
      must(document.querySelector<HTMLElement>('ul.peer-list'), 'la lista de gente')
    const at = (login: string): number => list().textContent.indexOf(login)

    // De guardia primero; después la especialista, y al final quien no está.
    expect(at('p-guardia')).toBeGreaterThanOrEqual(0)
    expect(at('p-guardia')).toBeLessThan(at('p-sentada'))
    expect(at('p-sentada')).toBeLessThan(at('p-fuera'))

    await user.click(screen.getByLabelText(text('peers.onlyOnDuty')))
    // La lista se vuelve a pintar al filtrar: en la CI, lenta, puede tardar un poco.
    await waitFor(() => {
      expect(within(list()).queryByText('p-guardia')).not.toBeNull()
      expect(within(list()).queryByText('p-sentada')).toBeNull()
      expect(within(list()).queryByText('p-fuera')).toBeNull()
    })
  })
})
