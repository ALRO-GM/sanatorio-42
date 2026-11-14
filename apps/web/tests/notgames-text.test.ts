/**
 * Not-games: los ajustes de una sala en una línea (con la temática, #110) y
 * por qué no puedes entrar, en el idioma de la web (#90).
 */

import { describe, expect, it } from 'vitest'

import type { QuizSettings, TurnSettings } from '@sanatorio/contracts'

import { settingsText, turnSettingsText, whyNotText } from '../src/features/notgames/settings-text'

/** Un `t` que devuelve la clave con sus huecos, para ver qué se pide. */
const t = (key: string, vars: Record<string, string | number> = {}): string =>
  Object.keys(vars).length === 0 ? key : `${key}(${Object.values(vars).join(',')})`

const quiz: QuizSettings = {
  mode: 'duel',
  competitive: false,
  pool: 'common',
  kinds: 'mixed',
  difficulty: 'rising',
  questions: 10,
  minCircle: null,
}
const chess: TurnSettings = {
  game: 'chess',
  minutes: 5,
  pool: 'general',
  kinds: 'quick',
  minCircle: null,
}

describe('ajustes de una sala', () => {
  it('la temática va la primera', () => {
    expect(settingsText(t, { ...quiz, language: 'python' }).split(' · ')[0]).toBe(
      'notgames.language.python',
    )
    expect(turnSettingsText(t, { ...chess, language: 'git' })).toBe(
      'notgames.minutesN(5) · notgames.language.git · notgames.pool.general',
    )
  })

  it('sin temática (salas de antes) o con «De todo», no se dice', () => {
    expect(settingsText(t, quiz)).not.toContain('notgames.language')
    expect(settingsText(t, { ...quiz, language: 'any' })).not.toContain('notgames.language')
    expect(turnSettingsText(t, chess)).toBe('notgames.minutesN(5) · notgames.pool.general')
  })

  it('con todo puesto, cada parte una vez', () => {
    const line = settingsText(t, {
      ...quiz,
      language: 'c',
      competitive: true,
      minCircle: 6,
      questions: 60,
    })

    expect(line.split(' · ')).toHaveLength(7)
    expect(turnSettingsText(t, { ...chess, minCircle: 0 })).toContain('notgames.fromCircle(0)')
  })
})

describe('por qué no puedes entrar', () => {
  it('en español, el motivo de la API; en los demás idiomas, uno genérico', () => {
    expect(whyNotText(t, 'es', 'La sala está llena')).toBe('La sala está llena')
    expect(whyNotText(t, 'en', 'La sala está llena')).toBe('notgames.cantJoin')
    expect(whyNotText(t, 'fr', '')).toBe('notgames.cantJoin')
  })

  it('un motivo raro (vacío o enorme) se enseña tal cual en español', () => {
    expect(whyNotText(t, 'es', '')).toBe('')
    expect(whyNotText(t, 'es', 'x'.repeat(5000))).toHaveLength(5000)
  })
})
