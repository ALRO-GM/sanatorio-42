/**
 * El git simulado del curso de git: cada comando hace lo que haría git 2.4x
 * (y lo dice con sus mensajes, en inglés), los errores no cambian nada, y la
 * comparación con el objetivo mira la forma de la historia, no los ids.
 */
import { describe, expect, it } from 'vitest'

import {
  checkAttempt,
  emptyRepo,
  goalOf,
  goalOfLevel,
  headId,
  LEVELS,
  levelOf,
  missing,
  run,
  runAll,
  startOf,
  tokenize,
} from '@sanatorio/gitsim'
import type { Remote, World } from '@sanatorio/gitsim'

const start = (): World => ({ repo: emptyRepo(), remote: null })
const ok = (world: World, ...lines: string[]): World => {
  const result = runAll(world, lines)

  if (!result.ok) throw new Error(result.output.join('\n'))

  return result
}
const say = (world: World, line: string): string => run(world, line).output.join('\n')
/** Un commit sin cambios, para los tests en los que solo importa la forma. */
const EMPTY = 'git commit --allow-empty -m x'

describe('git simulado: guardar', () => {
  it('commit, índice y status, con los mensajes de git', () => {
    let world = ok(start(), 'echo "hola" > a.txt')

    expect(say(world, 'git status')).toMatch(/Untracked files:\n\s+a\.txt/)
    world = ok(world, 'git add a.txt')
    expect(say(world, 'git status')).toMatch(/Changes to be committed:\n\s+new file:\s+a\.txt/)
    expect(say(world, 'git commit -m "primero"')).toMatch(
      /^\[main c1\] primero\n 1 file changed, 1 insertion\(\+\)\n create mode 100644 a\.txt$/,
    )
    world = ok(world, 'git commit -m "primero"')
    expect(world.repo.commits.c1).toMatchObject({
      parents: ['c0'],
      message: 'primero',
      files: { 'a.txt': 'hola' },
    })
    expect(say(world, 'git status')).toBe('On branch main\nnothing to commit, working tree clean')
    // Lo no preparado no entra en el commit: sin nada preparado, git se niega.
    world = ok(world, 'echo "adiós" > a.txt')
    expect(say(world, 'git status')).toMatch(
      /Changes not staged for commit:\n\s+modified:\s+a\.txt/,
    )
    world = ok(world, 'git commit -am "con -a"')
    expect(world.repo.commits.c2?.files['a.txt']).toBe('adiós')
  })

  it('un commit sin nada preparado se niega (salvo --allow-empty), como en git', () => {
    const clean = start()
    const refused = run(clean, 'git commit -m "nada"')

    expect(refused.ok).toBe(false)
    expect(refused.output.at(-1)).toBe('nothing to commit, working tree clean')
    expect(refused.repo).toEqual(clean.repo)
    expect(ok(clean, 'git commit --allow-empty -m "vacío"').repo.branches.main).toBe('c1')

    const untracked = ok(clean, 'echo a > nuevo.c')

    expect(run(untracked, 'git commit -m x').output.at(-1)).toBe(
      'nothing added to commit but untracked files present (use "git add" to track)',
    )
    // -a no añade ficheros nuevos.
    expect(run(untracked, 'git commit -am x').ok).toBe(false)

    const changed = ok(untracked, 'git add nuevo.c', 'git commit -m a', 'echo b > nuevo.c')

    expect(run(changed, 'git commit -m x').output.at(-1)).toBe(
      'no changes added to commit (use "git add" and/or "git commit -a")',
    )
    expect(say(changed, 'git commit -m ""')).toBe('Aborting commit due to empty commit message.')
  })

  it('git commit f guarda solo f, aunque haya más preparado; un fichero que git no sigue, no', () => {
    const world = ok(
      start(),
      'echo 1 > a',
      'echo 1 > b',
      'git add a b',
      'git commit -m base',
      'echo 2 > a',
      'echo 2 > b',
      'git add b',
      'echo nuevo > c',
    )
    const only = ok(world, 'git commit -m "solo a" a')

    expect(only.repo.commits.c2?.files).toEqual({ a: '2', b: '1' })
    // b sigue preparado para el siguiente.
    expect(only.repo.index.b).toBe('2')
    expect(say(world, 'git commit -m x c')).toBe(
      "error: pathspec 'c' did not match any file(s) known to git",
    )
  })

  it('--amend rehace el último commit con otro id', () => {
    const world = ok(start(), 'git commit --allow-empty -m "mal"', 'git commit --amend -m "bien"')

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
    expect(say(world, 'cat nada')).toBe('cat: nada: No such file or directory')
  })
})

describe('git simulado: ramas', () => {
  it('branch, switch y merge rápido o de tres vías', () => {
    let world = ok(start(), 'git branch feature', 'git switch feature', EMPTY)

    expect(say(world, 'git switch main')).toBe("Switched to branch 'main'")
    world = ok(world, 'git switch main')
    expect(world.repo.head).toEqual({ kind: 'branch', name: 'main' })
    // main no ha avanzado: el merge es rápido, sin commit nuevo.
    expect(say(world, 'git merge feature')).toMatch(/^Updating c0\.\.c1\nFast-forward/)
    world = ok(world, 'git merge feature')
    expect(world.repo.branches.main).toBe('c1')

    world = ok(world, 'git switch -c otra', EMPTY, 'git switch main', EMPTY)
    expect(say(world, 'git merge otra')).toBe("Merge made by the 'ort' strategy.")
    world = ok(world, 'git merge otra')

    const tip = world.repo.commits[world.repo.branches.main ?? '']

    expect(tip).toMatchObject({ parents: ['c3', 'c2'], message: "Merge branch 'otra'" })
    expect(say(world, 'git merge otra')).toBe('Already up to date.')
    // Fuera de main, el mensaje dice adónde.
    expect(
      ok(world, 'git switch -c dev c1', EMPTY, 'git merge otra').repo.commits.c6?.message,
    ).toBe("Merge branch 'otra' into dev")
  })

  it('conflicto: se marca, git add lo da por resuelto y se confirma, o se abandona', () => {
    const world = ok(
      start(),
      'echo base > f',
      'git add f',
      'git commit -m base',
      'git switch -c rama',
      'echo suyo > f',
      'git commit -am "suyo"',
      'git switch main',
      'echo mío > f',
      'git commit -am "mío"',
    )
    const merged = run(world, 'git merge rama')

    expect(merged.ok).toBe(true)
    expect(merged.output).toEqual([
      'Auto-merging f',
      'CONFLICT (content): Merge conflict in f',
      'Automatic merge failed; fix conflicts and then commit the result.',
    ])
    expect(merged.repo.work.f).toMatch(/<<<<<<< HEAD\nmío\n=======\nsuyo\n>>>>>>> rama/)
    expect(say(merged, 'git status')).toMatch(/You have unmerged paths\.[\s\S]*both modified:\s+f/)
    // Sin git add no deja hacer commit; tampoco cambiar de rama.
    expect(say(merged, 'git commit -m x')).toMatch(/^error: Committing is not possible/)
    expect(say(merged, 'git switch rama')).toMatch(/^error: you need to resolve your current index/)

    const done = ok(merged, 'echo los dos > f', 'git add f', 'git commit -m "unidos"')

    expect(done.repo.commits[done.repo.branches.main ?? '']).toMatchObject({
      parents: ['c3', 'c2'],
      files: { f: 'los dos' },
    })
    // Como en git, add no mira las marcas: confirmar con ellas se puede (y se ve).
    expect(ok(merged, 'git add f', 'git commit -m prisa').repo.work.f).toMatch(/<<<<<<</)
    // commit -a también resuelve lo que git sigue.
    expect(ok(merged, 'echo bien > f', 'git commit -am x').repo.merging).toBeNull()

    const aborted = ok(merged, 'git merge --abort')

    expect(aborted.repo.work.f).toBe('mío')
    expect(aborted.repo.merging).toBeNull()
    expect(say(aborted, 'git merge --abort')).toMatch(/There is no merge to abort/)
  })

  it('no deja borrar la rama en la que estás ni una sin unir (salvo -D)', () => {
    const world = ok(start(), 'git switch -c x', EMPTY, 'git switch main')

    expect(say(world, 'git branch -d x')).toBe(
      "error: The branch 'x' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D x'.",
    )
    expect(say(world, 'git branch -D x')).toBe('Deleted branch x (was c1).')
    expect(ok(world, 'git branch -D x').repo.branches.x).toBeUndefined()
    expect(run(ok(world, 'git switch x'), 'git branch -d x').ok).toBe(false)
    expect(run(world, 'git branch -nombre').ok).toBe(false)
  })

  it('cambiar de rama se lleva los cambios si no chocan, y se niega si chocan', () => {
    const base = ok(start(), 'echo a > f', 'echo a > g', 'git add f g', 'git commit -m base')
    // Las dos ramas tienen el mismo f: el cambio viaja contigo.
    const carried = run(ok(base, 'git branch x', 'echo b > f'), 'git switch x')

    expect(carried.ok).toBe(true)
    expect(carried.output).toEqual(['M       f', "Switched to branch 'x'"])
    expect(carried.repo.work.f).toBe('b')

    // x cambia f: con f cambiado aquí, git no se arriesga.
    const apart = ok(base, 'git switch -c x', 'echo x > f', 'git commit -am x', 'git switch main')
    const blocked = run(ok(apart, 'echo mío > f'), 'git switch x')

    expect(blocked.ok).toBe(false)
    expect(blocked.output).toEqual([
      'error: Your local changes to the following files would be overwritten by checkout:',
      '        f',
      'Please commit your changes or stash them before you switch branches.',
      'Aborting',
    ])
    // Un cambio en otro fichero sí viaja.
    expect(ok(apart, 'echo mío > g', 'git switch x').repo.work).toEqual({ f: 'x', g: 'mío' })
    // Un fichero sin seguir que la otra rama trae: tampoco se pisa.
    const other = ok(
      base,
      'git switch -c y',
      'echo y > h',
      'git add h',
      'git commit -m h',
      'git switch main',
    )

    expect(say(ok(other, 'echo mío > h'), 'git switch y')).toMatch(
      /^error: The following untracked working tree files would be overwritten by checkout:/,
    )
    // Y si no choca, lo que no sigue git se queda en tu carpeta.
    expect(ok(other, 'echo nota > nota.txt', 'git switch y').repo.work['nota.txt']).toBe('nota')
  })

  it('switch solo va a ramas (un commit pide --detach); checkout sí separa HEAD', () => {
    const world = ok(start(), EMPTY, EMPTY, 'git tag v1')

    expect(say(world, 'git switch HEAD~1')).toBe(
      "fatal: a branch is expected, got commit 'HEAD~1'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.",
    )
    expect(say(world, 'git switch v1')).toMatch(/got tag 'v1'/)
    expect(say(world, 'git switch --detach HEAD~1')).toBe('HEAD is now at c1 x')
    expect(say(world, 'git checkout HEAD~1')).toMatch(
      /^Note: switching to 'HEAD~1'\.[\s\S]*HEAD is now at c1 x$/,
    )
    expect(say(world, 'git switch nada')).toBe('fatal: invalid reference: nada')
  })
})

describe('git simulado: reescribir y deshacer', () => {
  it('referencias relativas, HEAD separado y el aviso al dejar commits atrás', () => {
    const world = ok(start(), EMPTY, EMPTY, EMPTY, 'git checkout HEAD~2')

    expect(world.repo.head).toEqual({ kind: 'detached', id: 'c1' })
    expect(headId(ok(world, 'git checkout main^').repo)).toBe('c2')
    expect(say(world, 'git checkout HEAD~9')).toBe(
      "error: pathspec 'HEAD~9' did not match any file(s) known to git",
    )
    expect(say(world, 'git switch main')).toBe(
      "Previous HEAD position was c1 x\nSwitched to branch 'main'",
    )
    expect(say(ok(world, 'git commit --allow-empty -m suelto'), 'git switch main')).toMatch(
      /^Warning: you are leaving 1 commit behind, not connected to\nany of your branches:\n\n {2}c4 suelto/,
    )
  })

  it('rebase copia los commits propios encima, con comilla, y salta lo que ya está', () => {
    const world = ok(
      start(),
      'git switch -c feature',
      EMPTY,
      EMPTY,
      'git switch main',
      EMPTY,
      'git switch feature',
    )

    expect(say(world, 'git rebase main')).toBe(
      'Successfully rebased and updated refs/heads/feature.',
    )

    const rebased = ok(world, 'git rebase main')

    expect(rebased.repo.branches.feature).toBe("c2'")
    expect(rebased.repo.commits["c2'"]?.parents).toEqual(["c1'"])
    expect(rebased.repo.commits["c1'"]?.parents).toEqual(['c3'])
    expect(say(rebased, 'git rebase main')).toBe('Current branch feature is up to date.')
    expect(say(ok(rebased, 'git switch main'), 'git rebase feature')).toBe(
      'Fast-forwarded main to feature.',
    )

    // Un cambio que ya está en main (cherry-pick) no se copia dos veces.
    const twice = ok(
      start(),
      'git switch -c f',
      'echo a > a',
      'git add a',
      'git commit -m a',
      'git switch main',
      'git cherry-pick f',
      'echo b > b',
      'git add b',
      'git commit -m b',
      'git switch f',
    )

    expect(say(twice, 'git rebase main')).toMatch(
      /^dropping c1 a -- patch contents already upstream/,
    )
    expect(ok(twice, 'git rebase main').repo.branches.f).toBe('c2')
    // Con cambios sin guardar, git no hace rebase.
    expect(say(ok(twice, 'echo x > a'), 'git rebase main')).toBe(
      'error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.',
    )
  })

  it('cherry-pick, reset y revert', () => {
    let world = ok(
      start(),
      'git switch -c x',
      'echo a > f',
      'git add f',
      'git commit -m uno',
      EMPTY,
      'git switch main',
    )

    expect(say(world, 'git cherry-pick c1')).toMatch(/^\[main c1'\] uno/)
    world = ok(world, 'git cherry-pick c1')
    expect(world.repo.branches.main).toBe("c1'")
    expect(world.repo.work.f).toBe('a')
    expect(say(world, 'git cherry-pick c1')).toMatch(/^The previous cherry-pick is now empty/)

    expect(say(world, 'git revert HEAD')).toMatch(/^\[main c3\] Revert "uno"/)
    world = ok(world, 'git revert HEAD')
    expect(world.repo.work.f).toBeUndefined()

    const soft = ok(world, 'git reset --soft c0')

    expect(soft.repo.branches.main).toBe('c0')
    expect(say(world, 'git reset --hard c0')).toBe('HEAD is now at c0 Primer commit')
    // --hard deja lo que git no sigue.
    expect(ok(world, 'echo nota > nota', 'git reset --hard c0').repo.work).toEqual({ nota: 'nota' })
    expect(say(ok(world, 'git reset --hard HEAD~1', 'echo b > f', 'git add f'), 'git reset')).toBe(
      'Unstaged changes after reset:\nM       f',
    )
    expect(say(world, 'git reset --hard HEAD f')).toBe('fatal: Cannot do hard reset with paths.')
  })

  it('stash guarda lo que git sigue, deja lo demás y vuelve aunque haya otros cambios', () => {
    const base = ok(start(), 'echo a > f', 'echo a > g', 'git add f g', 'git commit -m base')
    let world = ok(base, 'echo b > f', 'echo nuevo > n')

    expect(say(world, 'git stash')).toBe(
      'Saved working directory and index state WIP on main: c1 base',
    )
    world = ok(world, 'git stash')
    // n no lo sigue git: se queda (con -u también se guardaría).
    expect(world.repo.work).toEqual({ f: 'a', g: 'a', n: 'nuevo' })
    expect(say(world, 'git stash list')).toBe('stash@{0}: WIP on main: c1 base')
    // Otro cambio en g no impide recuperar el de f.
    world = ok(world, 'echo c > g', 'git stash pop')
    expect(world.repo.work).toEqual({ f: 'b', g: 'c', n: 'nuevo' })
    expect(world.repo.stash).toEqual([])
    // Un cambio en el mismo fichero, sí.
    const clash = ok(base, 'echo b > f', 'git stash', 'echo c > f')

    expect(say(clash, 'git stash pop')).toMatch(
      /^error: Your local changes to the following files would be overwritten by merge:/,
    )
    expect(ok(base, 'echo x > n', 'git stash -u').repo.work).toEqual({ f: 'a', g: 'a' })
    expect(say(base, 'git stash')).toBe('No local changes to save')
    expect(say(start(), 'git stash pop')).toBe('error: No stash entries found.')
  })

  it('tags y errores sin cambiar nada', () => {
    const world = ok(start(), EMPTY, 'git tag v1.0')

    expect(world.repo.tags['v1.0']).toBe('c1')
    expect(say(world, 'git tag v1.0')).toBe("fatal: tag 'v1.0' already exists")

    const failed = run(world, 'git merge noexiste')

    expect(failed.ok).toBe(false)
    expect(failed.output).toEqual(['merge: noexiste - not something we can merge'])
    expect(failed.repo).toEqual(world.repo)
    expect(say(world, 'sudo rm -rf /')).toMatch(/^peer4u-sandbox: sudo: no existe aquí/)
    expect(say(world, 'git rebaseo')).toBe("git: 'rebaseo' is not a git command. See 'git --help'.")
  })

  it('log de una rama, de un rango y de todo (también lo de origin y los tags)', () => {
    const world = ok(start(), EMPTY, 'git switch -c f', EMPTY, EMPTY, 'git switch main', EMPTY)

    expect(say(world, 'git log --oneline')).toBe('c4 (HEAD -> main) x\nc1 x\nc0 Primer commit')
    expect(say(world, 'git log --oneline f')).toBe('c3 (f) x\nc2 x\nc1 x\nc0 Primer commit')
    expect(say(world, 'git log --oneline main..f')).toBe('c3 (f) x\nc2 x')
    expect(say(world, 'git log --oneline -2 --all')).toBe('c4 (HEAD -> main) x\nc3 (f) x')
    expect(say(world, 'git log -1')).toBe('commit c4 (HEAD -> main)\n\n    x')
    expect(say(world, 'git log nada')).toMatch(/^fatal: ambiguous argument 'nada'/)
  })
})

describe('git simulado: remoto', () => {
  const remote = (): Remote => ({
    commits: { c0: { id: 'c0', parents: [], message: 'Primer commit', files: {} } },
    branches: { main: 'c0' },
    tags: {},
    locked: [],
  })
  const file = (name: string): string[] => [
    `echo ${name} > ${name}`,
    `git add ${name}`,
    `git commit -m ${name}`,
  ]

  it('push, fetch, pull y push rechazado, como git', () => {
    // Dos personas con el mismo remoto: ana (prefijo a) y leo (prefijo b).
    const shared = remote()
    let ana: World = ok({ repo: emptyRepo('a'), remote: shared }, 'git clone', ...file('uno'))

    expect(say(ana, 'git push')).toBe('To github.com:equipo/repo.git\n   c0..a1  main -> main')
    ana = ok(ana, 'git push')

    let leo: World = ok({ repo: emptyRepo('b'), remote: ana.remote }, 'git clone')

    expect(leo.repo.branches.main).toBe('a1')
    ana = ok({ ...ana, remote: leo.remote }, ...file('dos'), 'git push')
    leo = ok({ ...leo, remote: ana.remote }, ...file('tres'))
    expect(say(leo, 'git status')).toMatch(/Your branch is ahead of 'origin\/main' by 1 commit\./)

    // leo aún no ha visto lo de ana: «fetch first».
    const rejected = run(leo, 'git push')

    expect(rejected.ok).toBe(false)
    expect(rejected.output).toContain(' ! [rejected]        main -> main (fetch first)')
    expect(rejected.output).toContain("hint: 'git pull' before pushing again.")

    // Tras fetch: «non-fast-forward», y log --all ya enseña origin/main.
    const fetched = ok(leo, 'git fetch')

    expect(say(leo, 'git fetch')).toBe(
      'From github.com:equipo/repo.git\n   a1..a2            main       -> origin/main',
    )
    expect(say(fetched, 'git log --oneline --all')).toMatch(/^a2 \(origin\/main\) dos/)
    expect(say(fetched, 'git status')).toMatch(
      /have diverged,\nand have 1 and 1 different commits each/,
    )
    expect(run(fetched, 'git push').output).toContain(
      ' ! [rejected]        main -> main (non-fast-forward)',
    )
    expect(say(fetched, 'git fetch')).toBe('')

    // pull con las ramas separadas pide elegir.
    const asked = run(leo, 'git pull')

    expect(asked.ok).toBe(false)
    expect(asked.output.at(-1)).toBe('fatal: Need to specify how to reconcile divergent branches.')
    leo = ok(leo, 'git pull --no-rebase', 'git push')
    expect(leo.remote?.commits[leo.remote.branches.main ?? '']).toMatchObject({
      parents: ['b1', 'a2'],
      message: "Merge branch 'main' of github.com:equipo/repo.git",
    })
  })

  it('pull: --rebase, --ff-only y lo que diga git config', () => {
    const shared = remote()
    const ana = ok(
      { repo: emptyRepo('a'), remote: shared },
      'git clone',
      ...file('uno'),
      'git push',
    )
    const leo = ok({ repo: emptyRepo('b'), remote: shared }, 'git clone', ...file('dos'))
    const both = { ...leo, remote: ana.remote }

    expect(ok(both, 'git pull --rebase').repo.branches.main).toBe("b1'")
    expect(say(both, 'git pull --ff-only')).toMatch(
      /fatal: Not possible to fast-forward, aborting\.$/,
    )
    expect(ok(both, 'git config pull.rebase true', 'git pull').repo.branches.main).toBe("b1'")
    expect(ok(both, 'git config pull.rebase false', 'git pull').repo.commits.b2?.parents).toEqual([
      'b1',
      'a1',
    ])
    expect(say(both, 'git config pull.rebase quizás')).toMatch(/^fatal: bad boolean config value/)
    expect(say(both, 'git config alias.co checkout')).toMatch(/^peer4u-sandbox:/)
  })

  it('push a secas necesita upstream; -u lo pone; main protegida se niega', () => {
    const shared = { ...remote(), locked: ['main'] }
    const world = ok({ repo: emptyRepo('a'), remote: shared }, 'git clone', ...file('uno'))

    expect(say(world, 'git push')).toMatch(
      /^remote: error: GH006: Protected branch update failed for refs\/heads\/main\./,
    )

    const branch = ok(world, 'git switch -c feature')

    expect(say(branch, 'git push')).toMatch(
      /^fatal: The current branch feature has no upstream branch\.[\s\S]*git push --set-upstream origin feature/,
    )
    expect(say(branch, 'git push -u origin feature')).toBe(
      "To github.com:equipo/repo.git\n * [new branch]      feature -> feature\nbranch 'feature' set up to track 'origin/feature'.",
    )

    const pushed = ok(branch, 'git push -u origin feature')

    expect(pushed.remote?.branches.feature).toBe('a1')
    expect(say(ok(pushed, ...file('dos')), 'git push')).toMatch(/a1\.\.a2 {2}feature -> feature/)
    expect(
      ok(branch, 'git config push.autoSetupRemote true', 'git push').repo.upstream,
    ).toMatchObject({
      feature: 'origin/feature',
    })
    expect(say({ repo: emptyRepo(), remote: null }, 'git push')).toMatch(
      /does not appear to be a git repository/,
    )
  })

  it('branch -u, un tag por su nombre y --force-with-lease, como git', () => {
    const shared = remote()
    const ana = ok({ repo: emptyRepo('a'), remote: shared }, 'git clone', ...file('uno'))
    const tracked = ok(
      ana,
      'git push origin main:otra',
      'git switch -c otra',
      'git branch -u origin/otra',
    )

    expect(tracked.repo.upstream?.otra).toBe('origin/otra')
    expect(say(tracked, 'git status')).toMatch(/up to date with 'origin\/otra'/)
    expect(say(ana, 'git branch -u origin/nada')).toMatch(/^fatal: the requested upstream branch/)

    const tagged = ok(ana, 'git push', 'git tag v1', 'git push origin v1')

    expect(tagged.remote?.tags.v1).toBe('a1')

    // Otra persona sube algo; quien no lo ha traído no lo pisa con --force-with-lease.
    const leo = ok(
      { repo: emptyRepo('b'), remote: tagged.remote },
      'git clone',
      ...file('dos'),
      'git push',
    )
    const stale = ok({ ...tagged, remote: leo.remote }, 'git reset --hard HEAD~1', ...file('tres'))

    expect(run(stale, 'git push --force-with-lease').output).toContain(
      ' ! [rejected]        main -> main (stale info)',
    )
    expect(ok(stale, 'git push --force').remote?.branches.main).toBe('a2')
  })

  it('merge, cherry-pick y revert respetan tus cambios donde no tocan, y se niegan donde sí', () => {
    const world = ok(
      start(),
      'echo a > f',
      'echo a > g',
      'git add f g',
      'git commit -m base',
      'git switch -c x',
      'echo x > f',
      'git commit -am x',
      'git switch main',
      'echo y > h',
      'git add h',
      'git commit -m h',
    )

    // Un cambio sin preparar en g no estorba: el merge se hace y g sigue cambiado.
    expect(ok(world, 'echo mío > g', 'git merge x').repo.work.g).toBe('mío')
    // En f, que el merge cambia, sí.
    expect(say(ok(world, 'echo mío > f'), 'git merge x')).toMatch(
      /^error: Your local changes to the following files would be overwritten by merge:/,
    )
    // Algo preparado, aunque sea en otro fichero, no deja empezar un merge de verdad.
    expect(run(ok(world, 'echo mío > g', 'git add g'), 'git merge x').ok).toBe(false)
    expect(say(ok(world, 'echo mío > f'), 'git cherry-pick x')).toMatch(
      /^error: your local changes would be overwritten by cherry-pick\./,
    )
    expect(ok(world, 'echo mío > g', 'git revert HEAD').repo.work).toEqual({ f: 'a', g: 'mío' })
  })

  it('fetch no borra las ramas de origin que ya no están salvo con --prune', () => {
    const shared = remote()
    const ana = ok(
      { repo: emptyRepo('a'), remote: shared },
      'git clone',
      'git switch -c x',
      'git push -u origin x',
    )
    const leo = ok({ repo: emptyRepo('b'), remote: ana.remote }, 'git clone')
    const gone = ok({ ...ana, remote: leo.remote }, 'git switch main', 'git push origin --delete x')
    const seen = { ...leo, remote: gone.remote }

    expect(ok(seen, 'git fetch').repo.tracking['origin/x']).toBe('c0')
    expect(say(seen, 'git fetch --prune')).toMatch(/- \[deleted\] {9}\(none\) {5}-> origin\/x/)
    expect(ok(seen, 'git fetch -p').repo.tracking['origin/x']).toBeUndefined()
    expect(say(seen, 'git clone')).toMatch(/^fatal: destination path 'repo' already exists/)
  })
})

describe('git simulado: comparar con el objetivo', () => {
  it('cuenta la forma, no los ids ni el orden', () => {
    const solution = ok(start(), 'git branch b', EMPTY, 'git switch b', EMPTY, 'git switch main')
    const goal = goalOf(solution.repo, null)
    // Otro orden: los ids salen cruzados, pero la forma es la misma.
    const other = ok(start(), 'git switch -c b', EMPTY, 'git switch main', EMPTY)

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
      EMPTY,
      'git switch main',
      EMPTY,
      'git switch f',
      'git rebase main',
    )
    const merged = ok(
      start(),
      'git switch -c f',
      EMPTY,
      'git switch main',
      EMPTY,
      'git switch f',
      'git merge main',
    )

    expect(missing(merged.repo, null, goalOf(rebased.repo, null))).not.toEqual([])

    const withFile = ok(start(), 'echo hola > a', 'git add a', 'git commit -m a')
    const goal = goalOf(withFile.repo, null, { files: { main: ['a'] } })

    expect(
      missing(ok(start(), 'echo adiós > a', 'git add a', 'git commit -m a').repo, null, goal),
    ).toEqual([{ kind: 'file', name: 'main:a' }])
  })
})

describe('el camino del curso', () => {
  it('cada punto se puede montar, su solución llega y el principio no vale ya', () => {
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length)
    for (const level of LEVELS) {
      const goal = goalOfLevel(level)
      const start = startOf(level)

      expect(missing(start.repo, start.remote, goal), level.id).not.toEqual([])
      expect(checkAttempt(level, level.solution, goal), level.id).toMatchObject({
        done: true,
        stars: 3,
      })
    }
  })

  it('otro camino al mismo sitio también vale; mirar no resta estrellas y fallar no cuenta', () => {
    const level = levelOf('w1-branch')

    if (level === undefined) throw new Error('falta w1-branch')
    expect(
      checkAttempt(level, [
        'git status',
        'git branch feature',
        'git switch feature',
        'git log',
        'echo x > x.c',
        'git add x.c',
        'git commit -m x',
      ]),
      // Crear la rama y cambiarse a ella cuenta uno, como `switch -c`.
    ).toMatchObject({ done: true, stars: 3, commands: 2 })
    expect(
      checkAttempt(level, ['git switch -c feature', EMPTY, 'git branch x', 'git branch -D x']),
    ).toMatchObject({ done: true, stars: 2, commands: 4 })
    expect(
      checkAttempt(level, ['git merge nada', 'git commit -m x', 'git switch -c feature', EMPTY]),
    ).toMatchObject({ done: true, stars: 3 })
    expect(checkAttempt(level, ['git switch -c feature']).done).toBe(false)
  })

  it('borrar una rama cuenta: si sigue, no está hecho', () => {
    const level = levelOf('w1-delete')

    if (level === undefined) throw new Error('falta w1-delete')
    expect(
      checkAttempt(level, ['git switch -c fix', EMPTY, 'git switch main', 'git merge fix']).misses,
    ).toEqual([{ kind: 'branch', name: 'fix' }])
  })

  it('con remoto: la compañera sube después de que clones, y main protegida no se toca', () => {
    const pull = levelOf('w2-pull')
    const flow = levelOf('w5-github-flow')
    const rebase = levelOf('w2-world')

    if (pull === undefined || flow === undefined || rebase === undefined)
      throw new Error('faltan niveles')
    expect(run(startOf(pull), 'git push').ok).toBe(false)
    // pull a secas con las ramas separadas no une: hay que elegir cómo.
    expect(checkAttempt(pull, ['git pull', 'git push']).done).toBe(false)
    // Un merge no vale donde se pide rebase.
    expect(checkAttempt(rebase, ['git pull --no-rebase', 'git push']).done).toBe(false)
    expect(runAll(startOf(flow), [EMPTY, 'git push']).ok).toBe(false)
  })

  it('stash: sin aparcar, cambiar a fix choca (f.c es distinto allí)', () => {
    const stash = levelOf('w4-stash')

    if (stash === undefined) throw new Error('falta w4-stash')
    expect(say(startOf(stash), 'git switch fix')).toMatch(
      /^error: Your local changes to the following files would be overwritten by checkout:\n {8}f\.c/,
    )
  })
})
