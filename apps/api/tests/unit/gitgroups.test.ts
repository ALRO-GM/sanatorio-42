/**
 * Las pruebas de grupo del curso de git y el jefe final: varias personas con
 * su repositorio y un origin común. Cada prueba se juega de principio a fin
 * con las tareas de todas, en un orden con choques (pushes rechazados,
 * conflictos), y tiene que acabar hecha. Y si una persona no hace su parte,
 * no: cada concepto lo tiene que usar cada cual.
 */
import { describe, expect, it } from 'vitest'

import { farApart, groupStart, missionDone, missionOf, PREFIXES, run } from '@sanatorio/gitsim'
import type { GroupPlayer, Remote, Repo } from '@sanatorio/gitsim'

/** Una partida de grupo de mentira: el origin común y el repo de cada cual. */
function table(gate: string, logins: string[]) {
  const mission = missionOf(gate)

  if (mission === undefined) throw new Error(`no existe ${gate}`)

  const players: GroupPlayer[] = logins.map((login, index) => ({
    login,
    prefix: PREFIXES[index] ?? 'z',
    n: index + 1,
  }))
  const started = groupStart(mission, players)
  let remote: Remote = started.remote
  const repos = new Map<string, Repo>(Object.entries(started.repos))
  const repoOf = (login: string): Repo => {
    const repo = repos.get(login)

    if (repo === undefined) throw new Error(`${login} no juega`)

    return repo
  }

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
    /** El id del commit con ese mensaje en el repo de `login`. */
    idOf(login: string, message: string): string {
      const found = Object.values(repoOf(login).commits).find((c) => c.message === message)

      if (found === undefined) throw new Error(`no hay «${message}»`)

      return found.id
    },
    origin: () => remote,
    missing: () => mission.check(remote, players).filter((each) => !each.done),
    done: () => missionDone(mission.check(remote, players)),
  }
}

type Table = ReturnType<typeof table>

/** Grupo 1: rama, commit, push, y unirla en main con merge (trayendo main antes). */
function group1(game: Table, login: string) {
  game.play(
    login,
    `git switch -c ${login}`,
    `echo hola > ${login}.txt`,
    `git add ${login}.txt`,
    'git commit -m "Mi fichero"',
    `git push origin ${login}`,
    'git switch main',
    'git pull',
    `git merge --no-ff ${login}`,
    'git push',
  )
}

/** Grupo 2: rama, pull request que choca, traer main, resolver y otra vez. */
function group2(game: Table, login: string, lines: string[]) {
  game.play(
    login,
    `git switch -c ${login}`,
    `echo "- ${login}" >> equipo.txt`,
    'git add equipo.txt',
    'git commit -m "Me apunto"',
    `git push origin ${login}`,
  )
  expect(game.fails(login, `gh pr merge ${login}`)).toContain('conflictos en equipo.txt')
  game.play(
    login,
    'git pull origin main',
    `echo "${lines[0] ?? ''}" > equipo.txt`,
    ...lines.slice(1).map((line) => `echo "${line}" >> equipo.txt`),
    'git add equipo.txt',
    'git commit -m "Resuelto"',
    `git push origin ${login}`,
    `gh pr merge ${login}`,
  )
}

/** Grupo 3: funcionalidad, hotfix y versión, cada cual con su número. */
function group3(game: Table, login: string, n: number) {
  game.play(
    login,
    'git switch develop',
    `git switch -c feature/${login}`,
    `echo hecho > ${login}.txt`,
    `git add ${login}.txt`,
    'git commit -m "Mi funcionalidad"',
    'git switch develop',
    'git pull',
    `git merge --no-ff feature/${login}`,
    'git push origin develop',
    'git switch main',
    'git pull',
    `git switch -c hotfix/1.0.${n}`,
    `echo arreglado > arreglo-${login}.txt`,
    `git add arreglo-${login}.txt`,
    'git commit -m "Arreglo"',
    'git switch main',
    `git merge --no-ff hotfix/1.0.${n}`,
    `git tag v1.0.${n}`,
    'git switch develop',
    'git pull',
    `git merge --no-ff hotfix/1.0.${n}`,
    `git switch -c release/1.${n}`,
    `echo notas > notas-1.${n}.txt`,
    `git add notas-1.${n}.txt`,
    'git commit -m "Versión"',
    'git switch main',
    'git pull',
    `git merge --no-ff release/1.${n}`,
    `git tag v1.${n}`,
    'git switch develop',
    `git merge --no-ff release/1.${n}`,
    'git push origin main',
    'git push origin develop',
    'git push --tags',
  )
}

describe('pruebas de grupo del curso de git', () => {
  it('grupo 1: cada cual sube su rama y la une en main; quien llega tarde trae main', () => {
    const game = table('group1', ['ana', 'bea'])

    group1(game, 'ana')
    expect(game.done()).toBe(false)
    // bea une su rama sin traer antes lo que subió ana: su push se rechaza hasta traerlo.
    game.play(
      'bea',
      'git switch -c bea',
      'echo hola > bea.txt',
      'git add bea.txt',
      'git commit -m "Mio"',
      'git push origin bea',
      'git switch main',
      'git merge --no-ff bea',
    )
    expect(game.fails('bea', 'git push')).toContain('git pull')
    game.play('bea', 'git pull', 'git push')
    expect(game.missing()).toEqual([])
  })

  it('grupo 1: si una persona une las ramas de todas, las demás no lo han hecho', () => {
    const game = table('group1', ['ana', 'bea'])

    game.play(
      'bea',
      'git switch -c bea',
      'echo hola > bea.txt',
      'git add bea.txt',
      'git commit -m "Mio"',
      'git push origin bea',
    )
    group1(game, 'ana')
    game.play('ana', 'git fetch', 'git merge --no-ff origin/bea', 'git push')
    expect(game.missing().map((each) => each.login)).toEqual(['bea'])
  })

  it('grupo 2: a todas les choca el pull request y cada cual resuelve el suyo', () => {
    const game = table('group2', ['ana', 'bea', 'dani'])

    expect(game.fails('ana', 'git push origin main')).toContain('protegida')
    group2(game, 'ana', ['# Equipo', '- coordinación', '- ana'])
    group2(game, 'bea', ['# Equipo', '- coordinación', '- ana', '- bea'])
    expect(game.done()).toBe(false)
    group2(game, 'dani', ['# Equipo', '- coordinación', '- ana', '- bea', '- dani'])
    expect(game.missing()).toEqual([])
  })

  it('grupo 2: borrar la línea de otra persona al resolver no vale', () => {
    const game = table('group2', ['ana', 'bea', 'dani'])

    group2(game, 'ana', ['# Equipo', '- ana'])
    expect(game.missing().some((each) => each.text.includes('coordinación'))).toBe(true)
  })

  it('grupo 2: no se puede confirmar el conflicto con las marcas puestas', () => {
    const game = table('group2', ['ana', 'bea', 'dani'])

    game.play(
      'ana',
      'git switch -c ana',
      'echo "- ana" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Me apunto"',
      'git pull origin main',
      'git add equipo.txt',
    )
    expect(game.fails('ana', 'git commit -m "Sin mirar"')).toContain('conflictos sin resolver')
  })

  it('grupo 3: cada cual hace funcionalidad, hotfix y versión, aunque se pisen los pushes', () => {
    const game = table('group3', ['ana', 'bea', 'dani'])

    group3(game, 'ana', 1)
    group3(game, 'bea', 2)
    expect(game.done()).toBe(false)
    expect(game.missing().every((each) => each.login === 'dani')).toBe(true)
    group3(game, 'dani', 3)
    expect(game.missing()).toEqual([])
  })

  it('grupo 3: una versión sin tu funcionalidad dentro no cuenta', () => {
    const game = table('group3', ['ana', 'bea', 'dani'])

    game.play(
      'ana',
      'git switch develop',
      'git switch -c release/1.1',
      'echo notas > notas-1.1.txt',
      'git add notas-1.1.txt',
      'git commit -m "Versión"',
      'git switch main',
      'git merge --no-ff release/1.1',
      'git tag v1.1',
      'git switch develop',
      'git merge --no-ff release/1.1',
      'git push origin main',
      'git push origin develop',
      'git push --tags',
    )
    expect(game.missing().some((each) => each.text.startsWith('v1.1:'))).toBe(true)
  })
})

describe('jefe final del curso de git', () => {
  /** Lo de cada cual: el revert por PR y la funcionalidad aplastada y encima de develop. */
  function boss(game: Table, login: string, n: number) {
    const broken = game.idOf(login, `Rompe ${n}`)

    game.play(
      login,
      `git switch -c fix/${login}`,
      `git revert ${broken}`,
      `git push origin fix/${login}`,
      `gh pr merge fix/${login}`,
      'git switch develop',
      `git switch -c feature/${login}`,
      `echo uno > ${login}.txt`,
      `git add ${login}.txt`,
      'git commit -m "Parte 1"',
      `echo dos >> ${login}.txt`,
      `git add ${login}.txt`,
      'git commit -m "Parte 2"',
      'git reset --soft HEAD~2',
      `git commit -m "Funcionalidad de ${login}"`,
      'git fetch',
      'git rebase origin/develop',
      'git switch develop',
      'git reset --hard origin/develop',
      `git merge feature/${login}`,
      'git push origin develop',
    )
  }

  function release(game: Table, login: string, n: number) {
    game.play(
      login,
      'gh pr merge develop',
      'git switch main',
      'git pull',
      `git tag v2.${n}`,
      'git push --tags',
    )
  }

  it('cada cual deshace lo suyo, mete su funcionalidad sin merges y publica su versión', () => {
    const game = table('boss', ['ana', 'bea'])

    expect(game.fails('ana', 'git push origin main')).toContain('protegida')
    boss(game, 'ana', 1)
    boss(game, 'bea', 2)
    expect(game.done()).toBe(false)
    release(game, 'ana', 1)
    release(game, 'bea', 2)
    expect(game.missing()).toEqual([])
  })

  it('una versión publicada antes de tiempo (sin todo) no cuenta', () => {
    const game = table('boss', ['ana', 'bea'])

    boss(game, 'ana', 1)
    release(game, 'ana', 1)
    boss(game, 'bea', 2)
    release(game, 'bea', 2)
    expect(game.missing().map((each) => each.text)).toEqual([
      'v2.1: en main, con todas las funcionalidades y sin nada roto',
    ])
  })

  it('un merge en develop en vez de rebase, o dos commits sin juntar, no cuentan', () => {
    const game = table('boss', ['ana', 'bea'])

    boss(game, 'ana', 1)
    game.play(
      'bea',
      'git switch develop',
      'git switch -c feature/bea',
      'echo uno > bea.txt',
      'git add bea.txt',
      'git commit -m "Parte 1"',
      'echo dos >> bea.txt',
      'git add bea.txt',
      'git commit -m "Parte 2"',
      'git switch develop',
      'git pull',
      'git merge feature/bea',
      'git push origin develop',
    )
    expect(game.missing().some((each) => each.text.startsWith('La funcionalidad de bea'))).toBe(
      true,
    )
  })

  it('los puestos tienen que estar lejos: otro clúster o 4 filas y 4 columnas', () => {
    expect(farApart('c1r1s1', 'c1r5s5')).toBe(true)
    expect(farApart('c1r1s1', 'c1r5s4')).toBe(false)
    expect(farApart('c1r1s1', 'c1r2s9')).toBe(false)
    expect(farApart('c1r1s1', 'c2r1s2')).toBe(true)
    expect(farApart('c1r1s1', 'raro')).toBe(false)
  })
})

describe('ids en un origin común', () => {
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
