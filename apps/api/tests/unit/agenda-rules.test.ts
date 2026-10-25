/**
 * Reglas de la agenda (`docs/agenda.md`): el tipo de cada proyecto y sus
 * checkpoints de fábrica, el lunes de un weekly y dónde está atascada una meta.
 */

import { describe, expect, it } from 'vitest'

import type { AgendaEntry } from '@sanatorio/contracts'
import {
  CHECKPOINT_KEYS,
  DEFAULT_CHECKPOINTS,
  blockerOf,
  daysBetween,
  kindOf,
  mondayOf,
  stuckOn,
} from '../../src/modules/agenda/agenda.rules.js'

const entry = (day: string, change: Partial<AgendaEntry> = {}): AgendaEntry => ({
  id: 1,
  kind: 'daily',
  day,
  plan: [],
  outcome: null,
  problem: null,
  problemOther: null,
  solution: null,
  solutionOther: null,
  progress: null,
  note: null,
  updatedAt: `${day}T10:00:00.000Z`,
  ...change,
})

describe('reglas de la agenda', () => {
  it('deduce el tipo de proyecto por su nombre; lo que no reconoce es de C', () => {
    expect(
      [
        'ft_printf',
        'Libft',
        'so_long',
        'FdF',
        'cub3D',
        'CPP Module 04',
        'Python Module 00',
        'Born2beroot',
        'Inception',
        'Exam Rank 03',
        'C Piscine Exam 01',
        'ft_transcendence',
        'webserv',
        '',
      ].map(kindOf),
    ).toEqual([
      'c',
      'c',
      'graphics',
      'graphics',
      'graphics',
      'cpp',
      'python',
      'sysadmin',
      'sysadmin',
      'exam',
      'exam',
      'other',
      'other',
      'c',
    ])
  })

  it('los de fábrica son de la lista, sin repetir, y el examen no pide norminette', () => {
    for (const keys of Object.values(DEFAULT_CHECKPOINTS)) {
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys.every((key) => CHECKPOINT_KEYS.includes(key))).toBe(true)
    }
    expect(DEFAULT_CHECKPOINTS.exam).not.toContain('norminette')
    expect(DEFAULT_CHECKPOINTS.c.at(-1)).toBe('slots')
  })

  it('el weekly va al lunes, también el domingo y entre años', () => {
    expect(mondayOf('2026-10-25')).toBe('2026-10-19')
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
    expect(mondayOf('2027-01-02')).toBe('2026-12-28')
    expect(daysBetween('2026-10-25', '2026-11-01')).toBe(7)
    expect(daysBetween('2026-10-25', '2026-10-24')).toBe(-1)
  })

  it('el atasco abierto es el del último daily; uno sin problema lo cierra', () => {
    expect(blockerOf([])).toBeNull()
    expect(
      blockerOf([
        entry('2026-10-24', { problem: 'bug' }),
        entry('2026-10-25', { problem: 'other', problemOther: 'make', solution: 'docs' }),
      ]),
    ).toEqual({
      day: '2026-10-25',
      problem: 'other',
      problemOther: 'make',
      solution: 'docs',
      solutionOther: null,
    })
    expect(blockerOf([entry('2026-10-24', { problem: 'bug' }), entry('2026-10-25')])).toBeNull()
    expect(
      stuckOn([
        { id: 1, key: 'works', text: null, done: true },
        { id: 2, key: 'leaks', text: null, done: false },
      ])?.key,
    ).toBe('leaks')
    expect(stuckOn([{ id: 1, key: 'works', text: null, done: true }])).toBeNull()
  })
})
