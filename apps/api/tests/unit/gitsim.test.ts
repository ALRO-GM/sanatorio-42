/**
 * El git simulado del curso de git: cada comando hace lo que haría git (en lo
 * que el curso enseña), los errores no cambian nada, y la comparación con el
 * objetivo mira la forma de la historia, no los ids.
 */
import { describe, expect, it } from 'vitest'

import { emptyRepo, goalOf, headId, missing, run, runAll, tokenize } from '@sanatorio/gitsim'
import type { Remote, World } from '@sanatorio/gitsim'

const start = (): World => ({ repo: emptyRepo(), remote: null })
const ok = (world: World, ...lines: string[]): World => {
  const result = runAll(world, lines)

  if (!result.ok) throw new Error(result.output.join('\n'))

  return result
}

describe('git simulado: guardar', () => {
  it('commit, índice y status', () => {
    let world = ok(start(), 'echo "hola" > a.txt')

    expect(run(world, 'git status').output.join('\n')).toMatch(/Cambios sin preparar: a.txt/)
    world = ok(world, 'git add a.txt')
    expect(run(world, 'git status').output.join('\n')).toMatch(/Preparado para el commit: a.txt/)
    world = ok(world, 'git commit -m "primero"')
    expect(world.repo.commits.c1).toMatchObject({
      parents: ['c0'],
      message: 'primero',
      files: { 'a.txt': 'hola' },
    })
    expect(run(world, 'git status').output.join('\n')).toMatch(/limpio/)
    // Lo no preparado no entra en el commit.
    world = ok(world, 'echo "adiós" > a.txt', 'git commit -m "vacío"')
    expect(world.repo.commits.c2?.files['a.txt']).toBe('hola')
    world = ok(world, 'git commit -am "con -a"')
    expect(world.repo.commits.c3?.files['a.txt']).toBe('adiós')
  })

  it('--amend rehace el último commit con otro id', () => {
    const world = ok(start(), 'git commit -m "mal"', 'git commit --amend -m "bien"')

    expect(world.repo.branches.main).toBe("c1'")
    expect(world.repo.commits["c1'"]).toMatchObject({ parents: ['c0'], message: 'bien' })
  })

  it('comillas, echo >> y cat', () => {
    expect(tokenize(`git commit -m "dos palabras" 'otra'`)).toEqual([
      'git',
      'commit',
      '-m',
      'dos palabras',
      'otra',
    ])
    expect(() => tokenize('echo "sin cerrar')).toThrow()

    const world = ok(start(), 'echo uno > f', 'echo dos >> f')

    expect(run(world, 'cat f').output).toEqual(['uno', 'dos'])
    expect(run(world, 'cat nada').ok).toBe(false)
  })
})

describe('git simulado: ramas', () => {
  it('branch, switch y merge rápido o de tres vías', () => {
    let world = ok(
      start(),
      'git branch feature',
      'git switch feature',
      'git commit',
      'git switch main',
    )

    expect(world.repo.head).toEqual({ kind: 'branch', name: 'main' })
    // main no ha avanzado: el merge es rápido, sin commit nuevo.
    world = ok(world, 'git merge feature')
    expect(world.repo.branches.main).toBe('c1')

    world = ok(
      world,
      'git switch -c otra',
      'git commit',
      'git switch main',
      'git commit',
      'git merge otra',
    )
    const tip = world.repo.commits[world.repo.branches.main ?? '']

    expect(tip?.parents).toEqual(['c3', 'c2'])
  })

  it('conflicto: se marca, se arregla con add y commit, o se abandona', () => {
    let world = ok(
      start(),
      'echo base > f',
      'git add f',
      'git commit',
      'git switch -c rama',
      'echo suyo > f',
      'git commit -am "suyo"',
      'git switch main',
      'echo mío > f',
      'git commit -am "mío"',
    )
    const merged = run(world, 'git merge rama')

    expect(merged.ok).toBe(true)
    expect(merged.output.join(' ')).toMatch(/CONFLICTO en f/)
    expect(merged.repo.work.f).toMatch(/<<<<<<< HEAD\nmío\n=======\nsuyo\n>>>>>>> rama/)
    // Sin arreglar no deja hacer commit; tampoco cambiar de rama.
    expect(run(merged, 'git commit').ok).toBe(false)
    expect(run(merged, 'git switch rama').ok).toBe(false)

    world = ok(merged, 'echo los dos > f', 'git add f', 'git commit -m "unidos"')
    expect(world.repo.commits[world.repo.branches.main ?? '']).toMatchObject({
      parents: ['c3', 'c2'],
      files: { f: 'los dos' },
    })

    const aborted = ok(merged, 'git merge --abort')

    expect(aborted.repo.work.f).toBe('mío')
    expect(aborted.repo.merging).toBeNull()
  })

  it('no deja borrar la rama en la que estás ni una sin unir (salvo -D)', () => {
    const world = ok(start(), 'git switch -c x', 'git commit', 'git switch main')

    expect(run(world, 'git branch -d x').ok).toBe(false)
    expect(ok(world, 'git branch -D x').repo.branches.x).toBeUndefined()
    expect(run(ok(world, 'git switch x'), 'git branch -d x').ok).toBe(false)
    expect(run(world, 'git branch -nombre').ok).toBe(false)
  })

  it('con cambios sin guardar no deja cambiar de rama', () => {
    const world = ok(start(), 'git branch x', 'echo a > f')

    expect(run(world, 'git switch x').output.join(' ')).toMatch(/cambios sin guardar/)
  })
})

describe('git simulado: reescribir y deshacer', () => {
  it('referencias relativas y HEAD separado', () => {
    const world = ok(start(), 'git commit', 'git commit', 'git commit', 'git checkout HEAD~2')

    expect(world.repo.head).toEqual({ kind: 'detached', id: 'c1' })
    expect(headId(ok(world, 'git checkout main^').repo)).toBe('c2')
    expect(run(world, 'git checkout HEAD~9').ok).toBe(false)
  })

  it('rebase copia los commits propios encima, con comilla', () => {
    const world = ok(
      start(),
      'git switch -c feature',
      'git commit',
      'git commit',
      'git switch main',
      'git commit',
      'git switch feature',
      'git rebase main',
    )

    expect(world.repo.branches.feature).toBe("c2'")
    expect(world.repo.commits["c2'"]?.parents).toEqual(["c1'"])
    expect(world.repo.commits["c1'"]?.parents).toEqual(['c3'])
  })

  it('cherry-pick, reset y revert', () => {
    let world = ok(
      start(),
      'git switch -c x',
      'echo a > f',
      'git add f',
      'git commit',
      'git commit',
      'git switch main',
    )

    world = ok(world, 'git cherry-pick c1')
    expect(world.repo.branches.main).toBe("c1'")
    expect(world.repo.work.f).toBe('a')

    world = ok(world, 'git revert HEAD')
    expect(world.repo.work.f).toBeUndefined()

    const soft = ok(world, 'git reset --soft c0')

    expect(soft.repo.branches.main).toBe('c0')
    expect(ok(world, 'git reset --hard c0').repo.work).toEqual({})
  })

  it('stash guarda y recupera los cambios', () => {
    let world = ok(start(), 'echo a > f', 'git stash')

    expect(world.repo.work).toEqual({})
    world = ok(world, 'git stash pop')
    expect(world.repo.work.f).toBe('a')
    expect(run(start(), 'git stash pop').ok).toBe(false)
  })

  it('tags y errores sin cambiar nada', () => {
    const world = ok(start(), 'git commit', 'git tag v1.0')

    expect(world.repo.tags['v1.0']).toBe('c1')
    expect(run(world, 'git tag v1.0').ok).toBe(false)

    const failed = run(world, 'git merge noexiste')

    expect(failed.ok).toBe(false)
    expect(failed.repo).toEqual(world.repo)
    expect(run(world, 'sudo rm -rf /').ok).toBe(false)
    expect(run(world, 'git rebaseo').ok).toBe(false)
  })
})

describe('git simulado: remoto', () => {
  const remote = (): Remote => ({
    commits: { c0: { id: 'c0', parents: [], message: 'Primer commit', files: {} } },
    branches: { main: 'c0' },
    tags: {},
    locked: [],
  })

  it('push, fetch, pull y push rechazado', () => {
    // Dos personas con el mismo remoto: ana (prefijo a) y leo (prefijo b).
    const shared = remote()
    let ana: World = ok(
      { repo: emptyRepo('a'), remote: shared },
      'git clone',
      'git commit',
      'git push',
    )
    let leo: World = ok({ repo: emptyRepo('b'), remote: ana.remote }, 'git clone')

    expect(leo.repo.branches.main).toBe('a1')
    ana = ok({ ...ana, remote: leo.remote }, 'git commit', 'git push')
    leo = ok({ ...leo, remote: ana.remote }, 'git commit')

    const rejected = run(leo, 'git push')

    expect(rejected.ok).toBe(false)
    expect(rejected.output.join(' ')).toMatch(/pull/)
    leo = ok(leo, 'git pull', 'git push')
    expect(leo.remote?.commits[leo.remote.branches.main ?? '']?.parents).toEqual(['b1', 'a2'])
  })

  it('pull --rebase y rama protegida', () => {
    const shared = { ...remote(), locked: ['main'] }
    const world = ok({ repo: emptyRepo('a'), remote: shared }, 'git clone', 'git commit')

    expect(run(world, 'git push').output.join(' ')).toMatch(/protegida/)
    expect(
      ok(world, 'git switch -c feature', 'git push origin feature').remote?.branches.feature,
    ).toBe('a1')
    expect(run({ repo: emptyRepo(), remote: null }, 'git push').ok).toBe(false)
  })
})

describe('git simulado: comparar con el objetivo', () => {
  it('cuenta la forma, no los ids ni el orden', () => {
    const solution = ok(
      start(),
      'git branch b',
      'git commit',
      'git switch b',
      'git commit',
      'git switch main',
    )
    const goal = goalOf(solution.repo, null)
    // Otro orden: los ids salen cruzados, pero la forma es la misma.
    const other = ok(start(), 'git switch -c b', 'git commit', 'git switch main', 'git commit')

    expect(missing(other.repo, null, goal)).toEqual([])
    expect(missing(start().repo, null, goal).map((miss) => miss.name)).toEqual(['main', 'b'])
    // HEAD en otra rama, también cuenta.
    expect(missing(ok(other, 'git switch b').repo, null, goal)).toEqual([
      { kind: 'head', name: 'main' },
    ])
  })

  it('las copias de un rebase no valen por un merge, y los ficheros se comparan si se pide', () => {
    const rebased = ok(
      start(),
      'git switch -c f',
      'git commit',
      'git switch main',
      'git commit',
      'git switch f',
      'git rebase main',
    )
    const merged = ok(
      start(),
      'git switch -c f',
      'git commit',
      'git switch main',
      'git commit',
      'git switch f',
      'git merge main',
    )

    expect(missing(merged.repo, null, goalOf(rebased.repo, null))).not.toEqual([])

    const withFile = ok(start(), 'echo hola > a', 'git add a', 'git commit')
    const goal = goalOf(withFile.repo, null, { files: { main: ['a'] } })

    expect(
      missing(ok(start(), 'echo adiós > a', 'git add a', 'git commit').repo, null, goal),
    ).toEqual([{ kind: 'file', name: 'main:a' }])
  })
})
