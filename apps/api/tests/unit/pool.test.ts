import { describe, expect, it } from 'vitest'

import { audienceOf } from '../../src/modules/pool/pool.rules.js'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const DAY = 86_400_000
const at = (days: number): string => new Date(NOW + days * DAY).toISOString()
const someone = (cursus: { cursus_id: number; begin_at?: string | null }[] | undefined) => ({
  id: 1,
  login: 'pepe',
  ...(cursus === undefined ? {} : { cursus_users: cursus }),
})

describe('quién entra', () => {
  it('con el 42cursus, estudiante, aunque también tenga la piscina', () => {
    expect(audienceOf(someone([{ cursus_id: 21, begin_at: at(-400) }]), NOW)).toBe('student')
    expect(
      audienceOf(
        someone([
          { cursus_id: 9, begin_at: at(-430) },
          { cursus_id: 21, begin_at: at(30) },
        ]),
        NOW,
      ),
    ).toBe('student')
  })

  it('con la C Piscine en curso (o a punto), piscinero; en los bordes, también', () => {
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: at(-10) }]), NOW)).toBe('pool')
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: at(-60) }]), NOW)).toBe('pool')
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: at(30) }]), NOW)).toBe('pool')
  })

  it('una piscina antigua, Discovery, sin fecha o sin cursus: no entra', () => {
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: at(-61) }]), NOW)).toBe('other')
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: at(31) }]), NOW)).toBe('other')
    expect(audienceOf(someone([{ cursus_id: 9, begin_at: null }]), NOW)).toBe('other')
    expect(audienceOf(someone([{ cursus_id: 3, begin_at: at(-5) }]), NOW)).toBe('other')
    expect(audienceOf(someone([]), NOW)).toBe('other')
  })

  it('si 42 no manda cursus_users, no se puede saber: entra como antes', () => {
    expect(audienceOf(someone(undefined), NOW)).toBe('student')
  })
})
