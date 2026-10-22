/**
 * Las pruebas de grupo de la API de mentira: las compañeras de mentira hacen
 * todas sus tareas, y con las tuyas la prueba se supera. Si alguna vez el
 * motor cambia y su guion deja de valer, aquí se ve.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GitRoom } from '@sanatorio/contracts'

import { ME } from '../src/shared/api/mock/data'
import { gitRoomsMock as api } from '../src/shared/api/mock/gitrooms'

const me = ME.login

/** Lo que hace quien juega en cada prueba (entra la última: su número va detrás de las compañeras). */
const MINE: Record<string, (room: GitRoom) => string[]> = {
  group1: () => [
    `git switch -c ${me}`,
    `echo hola > ${me}.txt`,
    `git add ${me}.txt`,
    'git commit -m "Mio"',
    `git push origin ${me}`,
    'git switch main',
    'git pull',
    `git merge --no-ff ${me}`,
    'git push',
  ],
  group2: () => [
    `git switch -c ${me}`,
    `echo "- ${me}" >> equipo.txt`,
    'git add equipo.txt',
    'git commit -m "Me apunto"',
    'git pull origin main',
    'echo "# Equipo" > equipo.txt',
    'echo "- coordinación" >> equipo.txt',
    'echo "- mgarcia" >> equipo.txt',
    'echo "- lperez" >> equipo.txt',
    `echo "- ${me}" >> equipo.txt`,
    'git add equipo.txt',
    'git commit -m "Resuelto"',
    `git push origin ${me}`,
    `gh pr merge ${me}`,
  ],
  group3: () => [
    'git switch develop',
    `git switch -c feature/${me}`,
    `echo hecho > ${me}.txt`,
    `git add ${me}.txt`,
    'git commit -m "Mi funcionalidad"',
    'git switch develop',
    'git pull',
    `git merge --no-ff feature/${me}`,
    'git push origin develop',
    'git switch main',
    'git pull',
    'git switch -c hotfix/1.0.3',
    `echo arreglado > arreglo-${me}.txt`,
    `git add arreglo-${me}.txt`,
    'git commit -m "Arreglo"',
    'git switch main',
    'git merge --no-ff hotfix/1.0.3',
    'git tag v1.0.3',
    'git switch develop',
    'git pull',
    'git merge --no-ff hotfix/1.0.3',
    'git switch -c release/1.3',
    'echo notas > notas-1.3.txt',
    'git add notas-1.3.txt',
    'git commit -m "Versión"',
    'git switch main',
    'git pull',
    'git merge --no-ff release/1.3',
    'git tag v1.3',
    'git switch develop',
    'git pull',
    'git merge --no-ff release/1.3',
    'git push origin main',
    'git push origin develop',
    'git push --tags',
  ],
  boss: (room) => {
    const broken = Object.values(room.mine?.repo.commits ?? {}).find(
      (commit) => commit.message === 'Rompe 2',
    )

    return [
      `git switch -c fix/${me}`,
      `git revert ${broken?.id ?? ''}`,
      `git push origin fix/${me}`,
      `gh pr merge fix/${me}`,
      'git switch develop',
      `git switch -c feature/${me}`,
      `echo uno > ${me}.txt`,
      `git add ${me}.txt`,
      'git commit -m "Parte 1"',
      `echo dos >> ${me}.txt`,
      `git add ${me}.txt`,
      'git commit -m "Parte 2"',
      'git reset --soft HEAD~2',
      'git commit -m "Mi funcionalidad"',
      'git fetch',
      'git rebase origin/develop',
      'git switch develop',
      'git reset --hard origin/develop',
      `git merge feature/${me}`,
      'git push origin develop',
      'gh pr merge develop',
      'git switch main',
      'git pull',
      'git tag v2.2',
      'git push --tags',
    ]
  },
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

  for (const gate of ['group1', 'group2', 'group3', 'boss']) {
    it(`${gate}: entran, hacen lo suyo y con lo tuyo se supera`, async () => {
      const room = await api.createGitRoom(gate)

      later(10_000)
      expect((await api.getGitRoom(room.id)).players.at(-1)?.login).toBe(me)
      await api.startGitRoom(room.id)
      // Las compañeras acaban su guion (en el jefe, todo menos publicar).
      later(5 * 60_000)

      let view = await api.getGitRoom(room.id)

      expect(view.status).toBe('playing')
      for (const line of MINE[gate]?.(view) ?? []) {
        const result = await api.runGitRoom(room.id, line)

        if (!result.ok) throw new Error(`${line}: ${result.output.join(' / ')}`)
        view = result.room
      }
      // En el jefe, la compañera publica cuando ya está todo.
      later(10_000)
      view = await api.getGitRoom(room.id)
      expect(view.missions.filter((each) => !each.done).map((each) => each.text)).toEqual([])
      expect(view.result).toBe('passed')
      await api.leaveGitRoom(room.id)
    })
  }
})
