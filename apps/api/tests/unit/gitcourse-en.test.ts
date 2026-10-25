/**
 * El curso de git en inglés: cada punto y cada prueba de grupo tiene sus
 * textos, con la misma forma que en español (las mismas partes de la teoría,
 * los mismos ejemplos y las mismas tareas), y cada misión que se comprueba
 * tiene su traducción.
 */
import { describe, expect, it } from 'vitest'

import {
  GROUP_MISSIONS,
  GROUPS_EN,
  levelIn,
  LEVELS,
  LEVELS_EN,
  MISSION_ITEMS_EN,
  missionIn,
  missionItemIn,
} from '@sanatorio/gitsim'
import type { Remote } from '@sanatorio/gitsim'

describe('curso de git en inglés', () => {
  it('están todos los puntos, y nada más', () => {
    const ids = LEVELS.map((level) => level.id)

    expect(ids.filter((id) => LEVELS_EN[id] === undefined)).toEqual([])
    expect(Object.keys(LEVELS_EN).filter((id) => !ids.includes(id))).toEqual([])
  })

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s tiene la misma teoría',
    (id, level) => {
      const en = LEVELS_EN[id]

      expect(Object.keys(en?.theory ?? {}).sort()).toEqual(Object.keys(level.theory).sort())
      expect(en?.theory.how).toHaveLength(level.theory.how.length)
      expect(levelIn(level, 'en').title).toBe(en?.title)
      expect(levelIn(level, 'es')).toBe(level)
      expect(levelIn(level, 'ca')).toBe(level)
    },
  )

  it.each(GROUP_MISSIONS.map((mission) => [mission.gate, mission] as const))(
    '%s tiene su historia, sus tareas y sus misiones',
    (gate, mission) => {
      const en = GROUPS_EN[gate]

      expect(en?.tasks).toHaveLength(mission.tasks.length)
      expect(missionIn(mission, 'en').story).toBe(en?.story)

      // Las misiones salen de comprobar un origin vacío: ninguna cumplida.
      const remote: Remote = { commits: {}, branches: {}, tags: {}, locked: [] }
      const players = [
        { login: 'ana', prefix: 'a', n: 1 },
        { login: 'leo', prefix: 'b', n: 2 },
      ]

      for (const item of mission.check(remote, players)) {
        expect(MISSION_ITEMS_EN[item.key], item.key).toBeDefined()
        expect(missionItemIn(item, 'en')).not.toContain('{')
        if (item.login !== null && item.key.includes('{login}')) {
          expect(missionItemIn(item, 'en')).toContain(item.login)
        }
      }
    },
  )
})
