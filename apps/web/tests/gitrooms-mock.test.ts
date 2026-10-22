/**
 * Las pruebas de grupo de la API de mentira: las compañeras de mentira hacen
 * su parte de cada misión, y con la tuya la prueba se supera. Si alguna vez el
 * motor cambia y su guion deja de valer, aquí se ve.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { gitRoomsMock as api } from '../src/shared/api/mock/gitrooms'
import { ME } from '../src/shared/api/mock/data'

const me = ME.login

/** Lo que hace quien juega en cada prueba (el último papel). */
const MINE: Record<string, string[]> = {
  group1: [
    `git switch -c ${me}`,
    `echo hola > ${me}.txt`,
    `git add ${me}.txt`,
    'git commit -m "Mio"',
    `git push origin ${me}`,
    'git switch main',
    'git fetch',
    'git merge origin/mgarcia',
    `git merge origin/${me}`,
    'git push',
  ],
  group2: [
    `git switch -c ${me}`,
    `echo "- ${me}" >> equipo.txt`,
    'git add equipo.txt',
    'git commit -m "Me apunto"',
    'git pull origin main',
    'echo "# Equipo" > equipo.txt',
    'echo "- mgarcia" >> equipo.txt',
    'echo "- lperez" >> equipo.txt',
    `echo "- ${me}" >> equipo.txt`,
    'git add equipo.txt',
    'git commit -m "Resuelto"',
    `git push origin ${me}`,
    `gh pr merge ${me}`,
  ],
  group3: [
    'git switch develop',
    'git pull',
    `git switch -c feature/${me}`,
    `echo hecho > ${me}.txt`,
    `git add ${me}.txt`,
    'git commit -m "Mi funcionalidad"',
    'git switch develop',
    'git pull',
    `git merge feature/${me}`,
    'git push origin develop',
  ],
}

describe('pruebas de grupo de mentira', () => {
  let now = Date.parse('2026-10-20T10:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const later = (ms: number) => {
    now += ms
    vi.setSystemTime(now)
  }

  for (const gate of ['group1', 'group2', 'group3']) {
    it(`${gate}: entran, hacen su parte y con la tuya se supera`, async () => {
      const room = await api.createGitRoom(gate)

      later(10_000)
      expect((await api.getGitRoom(room.id)).players.at(-1)?.login).toBe(me)
      await api.startGitRoom(room.id)
      // Las compañeras acaban su guion.
      later(5 * 60_000)

      let view = await api.getGitRoom(room.id)

      expect(view.status).toBe('playing')
      for (const line of MINE[gate] ?? []) {
        const result = await api.runGitRoom(room.id, line)

        if (!result.ok && !line.startsWith('git pull'))
          throw new Error(`${line}: ${result.output.join(' / ')}`)
        view = result.room
      }
      expect(view.missions.filter((each) => !each.done && !each.extra)).toEqual([])
      expect(view.result).toBe('passed')
      await api.leaveGitRoom(room.id)
    })
  }
})
