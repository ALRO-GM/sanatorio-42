import { cleanup, render, screen, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/shared/i18n'
import { RankingList, withMe } from '../../src/shared/ui/RankingList'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

const ROWS = [
  { login: 'ana', image: null, rank: 1, xp: 300 },
  { login: 'bea', image: null, rank: 2, xp: 200 },
  { login: 'cris', image: null, rank: 3, xp: 100 },
]

afterEach(() => {
  cleanup()
})

describe('withMe: tu fila siempre a la vista', () => {
  it('añade la tuya al final solo si no estabas; no toca la lista original', () => {
    const mine = { login: 'yo', image: null, rank: 212, xp: 1 }

    expect(withMe(ROWS, mine).map((row) => row.login)).toEqual(['ana', 'bea', 'cris', 'yo'])
    expect(withMe(ROWS, ROWS[1] ?? null)).toHaveLength(3)
    expect(withMe(ROWS, null)).toHaveLength(3)
    expect(withMe([], mine)).toEqual([mine])
    expect(ROWS).toHaveLength(3)
  })
})

describe('RankingList: la fila de clasificación', () => {
  it('medallas en los tres primeros, y «tú» en texto en tu fila', () => {
    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <RankingList
          rows={[...ROWS, { login: 'yo', image: null, rank: 12, xp: 5 }]}
          me="yo"
          label="Quién ayuda más"
          value={(row) => <strong>{row.xp} XP</strong>}
        />
      </I18nProvider>,
    )

    const list = screen.getByRole('list', { name: 'Quién ayuda más' })
    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(4)
    expect(items[0]?.querySelector('.medal-1')).not.toBeNull()
    expect(items[2]?.querySelector('.medal-3')).not.toBeNull()
    expect(items[3]?.querySelector('.medal')).toBeNull()

    // Tu fila: con fondo (clase) y con la palabra, para no depender del color.
    expect(items[3]?.classList.contains('me')).toBe(true)
    expect(within(must(items[3], 'tu fila')).getByText(text('rank.you'))).toBeTruthy()
    expect(within(list).getAllByText(text('rank.you'))).toHaveLength(1)
    expect(within(list).getByText('5 XP')).toBeTruthy()
  })
})
