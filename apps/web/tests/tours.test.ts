/**
 * Demostraciones animadas: los guiones caben en su tiempo y cada frase que
 * enseñan existe en todos los idiomas.
 */

import { describe, expect, it } from 'vitest'

import { SCRIPT as inbox } from '../src/features/admin/InboxTour'
import { SCRIPT as boards } from '../src/features/boards/BoardsTour'
import { SCRIPT as agenda } from '../src/features/calendar/AgendaTour'
import { SCRIPT as board } from '../src/features/doubts/BoardTour'
import { SCRIPT as guard } from '../src/features/help/GuardTour'
import { SCRIPT as network } from '../src/features/network/NetworkTour'
import { SCRIPT as mailbox } from '../src/features/notices/MailboxTour'
import { SCRIPT as waiting } from '../src/features/peers/WaitingTour'
import { SCRIPT as record } from '../src/features/profile/RecordTour'
import { SCRIPT as therapy } from '../src/features/therapy/TherapyTour'
import { ca } from '../src/shared/i18n/ca'
import { en } from '../src/shared/i18n/en'
import { es } from '../src/shared/i18n/es'
import { eu } from '../src/shared/i18n/eu'
import { click, cut, typing } from '../src/shared/tour/Tour'

const TOURS = { guard, waiting, board, therapy, boards, agenda, network, record, mailbox, inbox }

type AnyCue = readonly [number, { caption?: number; press?: boolean; dark?: boolean }]

describe('demostraciones', () => {
  it.each(Object.entries(TOURS))('%s: el guion dura 20 s como mucho', (_, script) => {
    const end = Math.max(...(script as readonly AnyCue[]).map(([at]) => at))

    expect(end).toBeLessThanOrEqual(20_000)
  })

  it.each(Object.entries(TOURS))('%s: cada frase existe en los cuatro idiomas', (name, script) => {
    const captions = new Set([
      1,
      ...(script as readonly AnyCue[]).map(([, cue]) => cue.caption ?? 1),
    ])

    for (const caption of captions) {
      for (const dict of [es, en, ca, eu]) {
        expect(dict[`tour.${name}.${caption}`], `tour.${name}.${caption}`).toBeTruthy()
      }
    }
  })

  it.each(Object.entries(TOURS))(
    '%s: el ratón siempre suelta y la pantalla vuelve',
    (_, script) => {
      // Lo último que se dice del botón es que está suelto, y del fundido, que se ha ido.
      const last = (key: 'press' | 'dark'): boolean | undefined =>
        [...(script as readonly AnyCue[])]
          .sort(([a], [b]) => a - b)
          .reduce<boolean | undefined>((value, [, cue]) => cue[key] ?? value, undefined)

      expect(last('press') ?? false).toBe(false)
      expect(last('dark') ?? false).toBe(false)
    },
  )

  it('un clic llega, aprieta, cambia y suelta, en ese orden', () => {
    expect(click<{ on: boolean }>(1000, 'save', { on: true })).toEqual([
      [1000, { cursor: 'save' }],
      [1620, { press: true }],
      [1700, { on: true }],
      [1830, { press: false }],
    ])
  })

  it('un cambio de escena funde a negro, cambia y vuelve', () => {
    expect(cut<object>(500, { scene: 1 }).map(([at]) => at)).toEqual([500, 900, 1250])
  })

  it('escribir va letra a letra', () => {
    expect(typing<{ typed: number }>(0, 'typed', 3, 100)).toEqual([
      [0, { typed: 1 }],
      [100, { typed: 2 }],
      [200, { typed: 3 }],
    ])
  })
})
