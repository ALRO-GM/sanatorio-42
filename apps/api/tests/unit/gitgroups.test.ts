/**
 * Las pruebas de grupo del curso de git: varias personas con su repositorio y
 * un origin común. Cada prueba se juega de principio a fin con los comandos
 * de sus papeles, en un orden con choques (pushes rechazados, conflictos), y
 * las misiones tienen que acabar hechas; a medias, no.
 */
import { describe, expect, it } from 'vitest'

import {
  groupRemote,
  groupRepo,
  missionDone,
  missionOf,
  PREFIXES,
  roleOf,
  run,
} from '@sanatorio/gitsim'
import type { GroupPlayer, Remote, Repo } from '@sanatorio/gitsim'

/** Una partida de grupo de mentira: el origin común y el repo de cada cual. */
function table(gate: string, logins: string[]) {
  const mission = missionOf(gate)

  if (mission === undefined) throw new Error(`no existe ${gate}`)

  let remote: Remote = groupRemote(mission)
  const repos = new Map<string, Repo>()
  const repoOf = (login: string): Repo => {
    const repo = repos.get(login)

    if (repo === undefined) throw new Error(`${login} no juega`)

    return repo
  }
  const players: GroupPlayer[] = logins.map((login, index) => {
    const prefix = PREFIXES[index] ?? 'z'

    repos.set(login, groupRepo(remote, prefix))

    return { login, prefix, role: roleOf(mission, index).id }
  })

  return {
    /** Ejecuta líneas como `login`; todas tienen que salir bien. */
    play(login: string, ...lines: string[]) {
      for (const line of lines) {
        const result = run({ repo: repoOf(login), remote }, line)

        if (!result.ok) throw new Error(`${login}: ${line}\n${result.output.join('\n')}`)
        repos.set(login, result.repo)
        remote = result.remote ?? remote
      }
    },
    /** Ejecuta una línea que tiene que fallar, y devuelve su salida. */
    fails(login: string, line: string): string {
      const result = run({ repo: repoOf(login), remote }, line)

      expect(result.ok).toBe(false)

      return result.output.join('\n')
    },
    origin: () => remote,
    items: () => mission.check(remote, players),
    done: () => missionDone(mission.check(remote, players)),
  }
}

describe('pruebas de grupo del curso de git', () => {
  it('grupo 1: cada cual sube su rama y una persona las une en main', () => {
    const game = table('group1', ['ana', 'bea'])

    for (const login of ['ana', 'bea']) {
      game.play(
        login,
        `git switch -c ${login}`,
        `echo hola > ${login}.txt`,
        `git add ${login}.txt`,
        'git commit -m "Mi fichero"',
      )
    }
    game.play('ana', 'git push origin ana')
    expect(game.done()).toBe(false)
    game.play('bea', 'git push origin bea')
    game.play('ana', 'git switch main', 'git fetch', 'git merge origin/ana', 'git merge origin/bea')
    expect(game.done()).toBe(false)
    game.play('ana', 'git push')
    expect(game.items().every((each) => each.done)).toBe(true)
  })

  it('grupo 2: main protegida, pull requests y un conflicto resuelto', () => {
    const logins = ['ana', 'bea', 'dani']
    const game = table('group2', logins)

    for (const login of logins) {
      game.play(
        login,
        `git switch -c ${login}`,
        `echo "- ${login}" >> equipo.txt`,
        'git add equipo.txt',
        'git commit -m "Me apunto"',
        `git push origin ${login}`,
      )
    }
    expect(game.fails('ana', 'git push origin ana:main')).toContain('error')
    game.play('ana', 'gh pr merge ana')
    expect(game.fails('bea', 'gh pr merge bea')).toContain('conflictos en equipo.txt')

    // bea trae main, resuelve dejando las dos líneas y vuelve a probar.
    game.play(
      'bea',
      'git pull origin main',
      'echo "# Equipo" > equipo.txt',
      'echo "- ana" >> equipo.txt',
      'echo "- bea" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Resuelto"',
      'git push origin bea',
      'gh pr merge bea',
    )
    expect(game.done()).toBe(false)
    game.play(
      'dani',
      'git pull origin main',
      'echo "# Equipo" > equipo.txt',
      'echo "- ana" >> equipo.txt',
      'echo "- bea" >> equipo.txt',
      'echo "- dani" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Resuelto"',
      'git push origin dani',
      'gh pr merge dani',
    )
    expect(game.items().every((each) => each.done)).toBe(true)
  })

  it('grupo 2: no se puede confirmar el conflicto con las marcas puestas', () => {
    const game = table('group2', ['ana', 'bea', 'dani'])

    for (const login of ['ana', 'bea']) {
      game.play(
        login,
        `git switch -c ${login}`,
        `echo "- ${login}" >> equipo.txt`,
        'git add equipo.txt',
        'git commit -m "Me apunto"',
        `git push origin ${login}`,
      )
    }
    game.play('ana', 'gh pr merge ana')
    // bea trae main e intenta confirmar el conflicto tal cual, con las marcas.
    game.play('bea', 'git pull origin main', 'git add equipo.txt')
    expect(game.fails('bea', 'git commit -m "Sin mirar"')).toContain('conflictos sin resolver')
    expect(game.done()).toBe(false)
  })

  it('grupo 3: versión y hotfix a la vez en Gitflow, con features en develop', () => {
    const game = table('group3', ['rel', 'hot', 'feat'])

    game.play(
      'feat',
      'git switch develop',
      'git switch -c feature/feat',
      'echo hecho > feat.txt',
      'git add feat.txt',
      'git commit -m "Mi funcionalidad"',
      'git switch develop',
      'git merge feature/feat',
      'git push origin develop',
    )
    game.play(
      'hot',
      'git switch -c hotfix/1.0.1',
      'echo arreglado > arreglo.txt',
      'git add arreglo.txt',
      'git commit -m "Arreglo urgente"',
      'git switch main',
      'git merge hotfix/1.0.1',
      'git tag v1.0.1',
      'git switch develop',
      'git merge hotfix/1.0.1',
    )
    // develop ya avanzó con la funcionalidad: el push se rechaza y hay que traerla.
    expect(game.fails('hot', 'git push origin develop')).toContain('git pull')
    game.play(
      'hot',
      'git pull',
      'git push origin develop',
      'git push origin main',
      'git push --tags',
    )
    game.play(
      'rel',
      'git switch develop',
      'git pull',
      'git switch -c release/1.1',
      'echo "1.1" > version.txt',
      'git add version.txt',
      'git commit -m "Versión 1.1"',
      'git switch main',
      'git pull',
      'git merge release/1.1',
      'git tag v1.1',
      'git switch develop',
      'git merge release/1.1',
      'git push origin main',
      'git push origin develop',
      'git push --tags',
    )
    expect(game.items().every((each) => each.done)).toBe(true)
  })

  it('grupo 3: un hotfix sacado de develop no cuenta como arreglo de la 1.0', () => {
    const game = table('group3', ['rel', 'hot', 'feat'])

    game.play(
      'rel',
      'git switch develop',
      'git switch -c release/1.1',
      'echo "1.1" > version.txt',
      'git add version.txt',
      'git commit -m "Versión 1.1"',
      'git switch develop',
      'git merge release/1.1',
    )
    // Mal: el arreglo sale de develop, que ya lleva la 1.1.
    game.play(
      'rel',
      'git switch -c hotfix/1.0.1',
      'echo arreglado > arreglo.txt',
      'git add arreglo.txt',
      'git commit -m "Arreglo"',
      'git tag v1.0.1',
      'git switch main',
      'git merge hotfix/1.0.1',
      'git switch develop',
      'git merge hotfix/1.0.1',
      'git push origin main',
      'git push origin develop',
      'git push --tags',
    )
    expect(game.items()[0]?.done).toBe(false)
  })

  it('las copias de commits ajenos llevan un id propio: no chocan entre personas', () => {
    const game = table('group1', ['ana', 'bea', 'dani'])

    game.play('ana', 'git switch -c ana', 'git commit -m "a"', 'git push origin ana')
    for (const login of ['bea', 'dani']) {
      game.play(login, 'git fetch', `git switch -c ${login}`, 'git cherry-pick origin/ana')
      game.play(login, `git push origin ${login}`)
    }

    const { branches } = game.origin()

    expect(branches.bea).toMatch(/^b\d+'$/)
    expect(branches.dani).toMatch(/^d\d+'$/)
  })
})
