/**
 * El curso de git en francés: cada punto y cada prueba de grupo tiene sus
 * textos, con la misma forma que en inglés (las mismas partes de la teoría,
 * los mismos ejemplos y las mismas tareas), los mismos `{login}` y `{n}`, y
 * los comandos sin traducir. Lo que le falte al francés sale en inglés.
 */
import { describe, expect, it } from 'vitest'

import {
  GROUP_MISSIONS,
  GROUPS_EN,
  GROUPS_FR,
  levelIn,
  LEVELS,
  LEVELS_EN,
  LEVELS_FR,
  MISSION_ITEMS_EN,
  MISSION_ITEMS_FR,
  missionIn,
  missionItemIn,
} from '@sanatorio/gitsim'
import type { Remote } from '@sanatorio/gitsim'

/** Un ejemplo sin lo que se traduce: el texto entre comillas y el comentario. */
const command = (line: string): string =>
  line
    .replace(/#.*$/, '')
    .replace(/"[^"]*"/g, '""')
    .trim()

/** Lo que no se traduce de una tarea: las variables, los comandos de git y los nombres con variables. */
const code = (text: string): string[] =>
  [
    ...(text.match(/\{\w+\}/g) ?? []),
    ...(text.match(/\b(?:git|gh) [a-z-]+/g) ?? []),
    ...(text.match(/[\w./*-]*\{\w+\}[\w./*-]*|[\w-]+\.txt/g) ?? []),
  ].sort()

describe('curso de git en francés', () => {
  it('están todos los puntos, todas las pruebas y todas las misiones, y nada más', () => {
    const ids = LEVELS.map((level) => level.id)

    expect(ids.filter((id) => LEVELS_FR[id] === undefined)).toEqual([])
    expect(Object.keys(LEVELS_FR).filter((id) => !ids.includes(id))).toEqual([])
    expect(Object.keys(GROUPS_FR).sort()).toEqual(Object.keys(GROUPS_EN).sort())
    expect(Object.keys(MISSION_ITEMS_FR).sort()).toEqual(Object.keys(MISSION_ITEMS_EN).sort())
  })

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    '%s tiene la misma teoría y los mismos comandos',
    (id, level) => {
      const fr = LEVELS_FR[id]
      const en = LEVELS_EN[id]

      expect(Object.keys(fr?.theory ?? {}).sort()).toEqual(Object.keys(level.theory).sort())
      expect(fr?.theory.how.map(command)).toEqual(en?.theory.how.map(command))
      expect(levelIn(level, 'fr').title).toBe(fr?.title)
      expect(levelIn(level, 'fr').solution).toBe(level.solution)
    },
  )

  it.each(Object.entries(MISSION_ITEMS_FR))(
    'la misión «%s» lleva las mismas variables',
    (key, fr) => {
      expect(code(fr)).toEqual(code(key))
    },
  )

  it.each(GROUP_MISSIONS.map((mission) => [mission.gate, mission] as const))(
    '%s tiene su historia, sus tareas y sus misiones',
    (gate, mission) => {
      const fr = GROUPS_FR[gate]
      const en = GROUPS_EN[gate]

      expect(fr?.tasks).toHaveLength(mission.tasks.length)
      fr?.tasks.forEach((task, i) => {
        expect(code(task), task).toEqual(code(en?.tasks[i] ?? ''))
      })
      expect(missionIn(mission, 'fr').story).toBe(fr?.story)

      const remote: Remote = { commits: {}, branches: {}, tags: {}, locked: [] }
      const players = [
        { login: 'ana', prefix: 'a', n: 1 },
        { login: 'leo', prefix: 'b', n: 2 },
      ]

      for (const item of mission.check(remote, players)) {
        const text = missionItemIn(item, 'fr')

        expect(text).toBe(
          item.login === null
            ? MISSION_ITEMS_FR[item.key]
            : MISSION_ITEMS_FR[item.key]
                ?.replaceAll('{login}', item.login)
                .replaceAll('{n}', String(item.n)),
        )
        expect(text).not.toContain('{')
      }
    },
  )

  it('lo que no tiene traducción sale tal cual', () => {
    const [mission] = GROUP_MISSIONS
    const level = { ...LEVELS[0], id: 'sin-francés' } as (typeof LEVELS)[number]

    expect(levelIn(level, 'fr')).toBe(level)
    expect(levelIn(level, 'ca')).toBe(level)
    expect(
      missionItemIn({ text: 'tal cual', login: null, key: 'sin traducir', n: null }, 'fr'),
    ).toBe('tal cual')
    expect(mission === undefined ? undefined : missionIn(mission, 'eu')).toBe(mission)
  })
})
