/**
 * Los títulos que pone Peer4U a los eventos: se mandan en español (`title`) y
 * como datos (`label`) para que la web los escriba en su idioma. Lo guardado
 * solo en español (cuentas atrás, avisos de antes) se reconoce de vuelta.
 */
import type { EventTitle } from '@sanatorio/contracts'
import { describe, expect, it } from 'vitest'

import { labelOf } from '../../src/modules/calendar/index.js'
import { spanishTitle, titled } from '../../src/modules/calendar/titles.js'

const label = (
  kind: EventTitle['kind'],
  project: string | null = null,
  login: string | null = null,
): EventTitle => ({ kind, project, login })

/** Cada título con el id de evento que le corresponde. */
const CASES: [EventTitle, string, string][] = [
  [label('help_window'), 'Te ofreces a ayudar', 'help:window:2026-10-20:10:00'],
  [label('helping', null, 'lsoto'), 'Ayudas a lsoto', 'help:booking:7'],
  [label('helped', null, 'mgarcia'), 'mgarcia te ayuda', 'help:booking:8'],
  [label('sprint', 'ft_printf'), 'Sprint de ft_printf', 'therapy:3:2026-10-20'],
  [label('sprint'), 'Sprint de grupo', 'therapy:4:2026-10-21'],
  [label('correcting', 'Libft'), 'Corriges Libft', 'evaluation:1'],
  [label('correcting'), 'Corriges', 'evaluation:2'],
  [label('corrected', 'ft_printf'), 'Te corrigen ft_printf', 'evaluation:3'],
  [label('corrected'), 'Te corrigen', 'evaluation:4'],
]

describe('títulos de los eventos', () => {
  it.each(CASES)('%o se escribe «%s» en español', (each, title) => {
    expect(spanishTitle(each)).toBe(title)
    expect(titled(each)).toEqual({ title, label: each })
  })

  it.each(CASES)('%o se reconoce desde «%s» guardado', (each, title, eventId) => {
    expect(labelOf(title, eventId)).toEqual(each)
  })

  it('lo que tiene título propio o no es de los nuestros se queda sin label', () => {
    // Una pizarra, un evento o un examen de 42: su título no se traduce.
    expect(labelOf('Te corrigen ft_printf', 'board:12')).toBeNull()
    expect(labelOf('Exam Session Morning', 'exam:31945')).toBeNull()
    expect(labelOf('Lo que sea', null)).toBeNull()
    // Con el id de los nuestros, pero con un título que no es de esa forma.
    expect(labelOf('Otra cosa', 'help:window:x')).toBeNull()
    expect(labelOf('Otra cosa', 'help:booking:1')).toBeNull()
    expect(labelOf('Otra cosa', 'therapy:1:2026-10-20')).toBeNull()
    expect(labelOf('Otra cosa', 'evaluation:1')).toBeNull()
    expect(labelOf('', 'evaluation:1')).toBeNull()
  })
})
