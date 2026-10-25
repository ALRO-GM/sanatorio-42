/**
 * Curso de git: las formas equivalentes de hacer lo mismo valen igual. Cada
 * punto del camino se resuelve con otras variantes razonables (`add -A` en vez
 * de fichero a fichero, `checkout -b` en vez de `switch -c`, `fetch` + `merge`
 * en vez de `pull`…) y con todas se llega a las tres estrellas: el objetivo
 * se mira por el estado del repositorio, y lo que cuenta, por lo que cambia.
 */
import { describe, expect, it } from 'vitest'

import {
  checkAttempt,
  emptyRepo,
  LEVELS,
  levelOf,
  run,
  runAll,
  starGoals,
  tally,
} from '@sanatorio/gitsim'
import type { World } from '@sanatorio/gitsim'

const start = (): World => ({ repo: emptyRepo(), remote: null })
const ok = (world: World, ...lines: string[]): World => {
  const result = runAll(world, lines)

  if (!result.ok) throw new Error(result.output.join('\n'))

  return result
}

/** Otras formas de resolver cada punto, todas con tres estrellas. */
const VARIANTS: Record<string, string[][]> = {
  'w0-commit': [
    ['git commit --message "uno"', 'git commit -m"dos"'],
    ['git commit --message=uno', 'git status', 'git log --oneline', 'git commit --allow-empty'],
  ],
  'w0-add': [
    ['echo "int main(void)" > hola.c', 'git add .', 'git commit -m x'],
    ['echo "int main(void)">hola.c', 'git add -A', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add --all', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add *', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add *.c', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add ./hola.c', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git commit -m x hola.c'],
    ['touch hola.c', 'echo "int main(void)" >> hola.c', 'git add hola.c', 'git commit -m x'],
  ],
  'w0-status': [
    ['git commit -m x libft.h'],
    ['git add .', 'git restore --staged main.c', 'git commit -m x'],
    ['git add -A', 'git reset HEAD main.c', 'git commit -m x'],
    ['git add *', 'git reset main.c', 'git commit -m x'],
    ['git add --all', 'git reset -- main.c', 'git diff --staged', 'git commit -m x'],
  ],
  'w0-world': [
    [
      'echo a > notas.txt',
      'git add .',
      'git commit -m uno',
      'echo b >> notas.txt',
      'git add -A',
      'git commit -m dos',
      'echo c > todo.txt',
      'git add --all',
      'git commit -m tres',
    ],
    [
      'echo a > notas.txt',
      'git add notas.txt',
      'git commit -m uno',
      'echo b >> notas.txt',
      'git commit -a -m dos',
      'echo c > todo.txt',
      'git add todo.txt',
      'git commit --message tres',
    ],
  ],
  'w1-branch': [
    ['git checkout -b feature', 'git commit'],
    ['git switch --create feature', 'git commit -m x'],
    ['git branch feature', 'git checkout feature', 'git commit'],
    ['git branch feature', 'git status', 'git switch feature', 'git commit'],
  ],
  'w1-head': [
    ['git checkout main', 'git commit'],
    ['git switch -', 'git commit'],
    ['git checkout -', 'git commit'],
  ],
  'w1-ff': [['git merge --ff-only feature'], ['git merge feature -m nada']],
  'w1-merge': [['git merge --no-ff feature'], ['git merge -m "Une feature" feature']],
  'w1-delete': [
    [
      'git checkout -b fix',
      'git commit',
      'git checkout main',
      'git merge fix',
      'git branch --delete fix',
    ],
    [
      'git branch fix',
      'git switch fix',
      'git commit',
      'git switch -',
      'git merge fix',
      'git branch -D fix',
    ],
  ],
  'w1-world': [
    [
      'git checkout -b a',
      'git commit',
      'git checkout main',
      'git checkout -b b',
      'git commit',
      'git checkout main',
      'git merge a',
      'git merge b',
    ],
    [
      'git switch -c a',
      'git commit',
      'git switch -c b main',
      'git commit',
      'git switch main',
      'git merge a',
      'git merge b',
    ],
  ],
  'w2-clone': [
    ['git clone git@github.com:equipo/repo.git', 'git commit', 'git push origin main'],
    ['git clone', 'git commit -m x', 'git push -u origin main'],
    ['git clone', 'git commit -m x', 'git push origin HEAD'],
  ],
  'w2-fetch': [
    ['git pull'],
    ['git fetch origin', 'git merge origin/main'],
    ['git fetch', 'git rebase origin/main'],
    ['git pull --ff-only'],
  ],
  'w2-pull': [
    ['git fetch', 'git merge origin/main', 'git push'],
    ['git pull origin main', 'git push origin main'],
  ],
  'w2-branch': [
    ['git checkout -b login', 'git commit', 'git commit', 'git push -u origin login'],
    ['git switch -c login', 'git commit', 'git commit', 'git push --set-upstream origin login'],
    ['git switch -c login', 'git commit', 'git commit', 'git push origin HEAD'],
  ],
  'w2-world': [
    ['git pull -r', 'git push'],
    ['git fetch', 'git rebase origin/main', 'git push'],
    ['git pull --rebase origin main', 'git push origin main'],
  ],
  'w3-relative': [
    ['git checkout HEAD^^'],
    ['git switch --detach HEAD~2'],
    ['git checkout main~2'],
    ['git checkout @~2'],
    ['git checkout HEAD~1~1'],
    ['git checkout c1'],
  ],
  'w3-amend': [['git commit --amend --message "Arregla el parser"'], ['git commit --amend']],
  'w3-cherry': [['git cherry-pick exp^'], ['git cherry-pick -x exp~1'], ['git cherry-pick c2']],
  'w3-rebase': [['git rebase main feature'], ['git checkout feature', 'git rebase main']],
  'w3-world': [
    ['git rebase main bugfix', 'git switch main', 'git merge bugfix'],
    ['git checkout bugfix', 'git rebase main', 'git checkout main', 'git merge --ff-only bugfix'],
    ['git rebase main bugfix', 'git checkout -', 'git merge bugfix'],
  ],
  'w4-reset': [
    ['git reset --hard HEAD^^'],
    ['git reset --hard c1'],
    ['git reset --hard main~2'],
    ['git reset HEAD~2'],
  ],
  'w4-revert': [
    ['git revert --no-edit HEAD', 'git push origin main'],
    ['git revert HEAD', 'git push origin HEAD'],
  ],
  'w4-stash': [
    [
      'git stash push',
      'git checkout fix',
      'git commit',
      'git checkout main',
      'git stash pop',
      'git add .',
      'git commit -m sigo',
    ],
    [
      'git stash save "a medias"',
      'git switch fix',
      'git commit',
      'git switch -',
      'git stash apply',
      'git commit -a -m sigo',
    ],
  ],
  'w4-conflict': [
    ['git merge rama', 'echo "los dos" > f.c', 'git add .', 'git commit -m x'],
    ['git merge rama', 'echo "los dos" > f.c', 'git commit -am x'],
    ['git merge rama', 'echo "los dos" > f.c', 'git add -A', 'git merge --continue'],
  ],
  'w4-world': [
    ['git reset HEAD~3', 'git add -A', 'git commit -m x'],
    ['git reset --soft HEAD^^^', 'git commit --message junto'],
  ],
  'w5-github-flow': [
    ['git pull', 'git checkout -b api', 'git commit', 'git commit', 'git push -u origin api'],
    [
      'git pull origin main',
      'git switch -c api',
      'git commit',
      'git commit',
      'git push origin HEAD',
    ],
  ],
  'w5-tag': [
    ['git tag -a v1.0 -m "Versión 1.0"', 'git tag v0.9 HEAD^'],
    ['git tag v0.9 main~1', 'git tag v1.0 main'],
  ],
  'w5-release': [
    [
      'git checkout -b release/1.0',
      'git commit',
      'git checkout main',
      'git merge --no-ff release/1.0',
      'git checkout develop',
      'git merge --no-ff release/1.0',
      'git tag v1.0 main',
    ],
  ],
  'w5-hotfix': [
    [
      'git checkout -b hotfix',
      'git commit -am arreglo',
      'git checkout main',
      'git merge --no-ff hotfix',
      'git tag v1.0.1',
      'git checkout develop',
      'git merge --no-ff hotfix',
    ],
  ],
  'w5-world': [
    [
      'git checkout -b mini',
      'git commit',
      'git fetch',
      'git rebase origin/main',
      'git checkout main',
      'git merge mini',
      'git push',
      'git branch -d mini',
    ],
  ],
}

describe('curso de git: formas equivalentes', () => {
  it('hay variantes para cada punto del camino', () => {
    expect(Object.keys(VARIANTS).sort()).toEqual(LEVELS.map((level) => level.id).sort())
  })

  for (const [id, variants] of Object.entries(VARIANTS)) {
    it(`${id}: todas llegan, y con tres estrellas`, () => {
      const level = levelOf(id)

      if (level === undefined) throw new Error(`falta ${id}`)
      for (const lines of variants) {
        const result = checkAttempt(level, lines)

        expect(result, lines.join(' · ')).toMatchObject({ done: true, stars: 3 })
        expect(result.commands, lines.join(' · ')).toBeLessThanOrEqual(starGoals(level).three)
      }
    })
  }

  it('mirar, preparar ficheros, fetch y lo que falla no cuentan', () => {
    const level = levelOf('w0-add')

    if (level === undefined) throw new Error('falta w0-add')

    const lines = [
      'git status',
      'echo "int main(void)" > hola.c',
      'git add nada',
      'git add hola.c',
      'git restore --staged hola.c',
      'git add .',
      'git diff --staged',
      'git log',
      'git commit -m x',
    ]

    expect(tally(level, lines).lines.map((line) => line.counted)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ])
    expect(tally(level, lines).lines[2]?.ok).toBe(false)
  })

  it('crear rama y cambiarse cuenta uno solo si va seguido; repetir algo hecho no cuenta', () => {
    const level = levelOf('w1-branch')

    if (level === undefined) throw new Error('falta w1-branch')
    expect(tally(level, ['git branch feature', 'git switch feature']).commands).toBe(1)
    expect(tally(level, ['git branch feature', 'git commit', 'git switch feature']).commands).toBe(
      3,
    )
    expect(tally(level, ['git switch main', 'git switch main']).commands).toBe(0)
    expect(tally(level, ['git branch a', 'git branch b', 'git switch a']).commands).toBe(3)
  })

  it('las estrellas: tres hasta la solución, dos hasta la mitad más uno, una con más', () => {
    const level = levelOf('w1-world')

    if (level === undefined) throw new Error('falta w1-world')
    expect(starGoals(level)).toEqual({ three: 8, two: 13 })
    for (const each of LEVELS) {
      const goals = starGoals(each)

      expect(goals.three, each.id).toBeGreaterThan(0)
      expect(goals.two, each.id).toBeGreaterThan(goals.three)
    }
  })
})

describe('git simulado: más formas de decir lo mismo', () => {
  it('git add con carpetas, patrones y -u', () => {
    let world = ok(start(), 'echo a > src/a.c', 'echo b > src/b.h', 'echo c > c.c')

    world = ok(world, 'git add src')
    expect(Object.keys(world.repo.index).sort()).toEqual(['src/a.c', 'src/b.h'])
    world = ok(world, 'git commit -m src', 'echo cambio > src/a.c', 'git add -u')
    expect(world.repo.index['src/a.c']).toBe('cambio')
    expect(world.repo.index['c.c']).toBeUndefined()
    world = ok(world, 'git add *.c')
    expect(world.repo.index['c.c']).toBe('c')
    expect(run(world, 'git add *.py').ok).toBe(false)
  })

  it('restore, checkout -- y reset HEAD deshacen igual', () => {
    const base = ok(start(), 'echo uno > f', 'git add f', 'git commit -m uno', 'echo dos > f')

    for (const line of ['git restore f', 'git checkout -- f', 'git checkout f']) {
      expect(ok(base, line).repo.work.f, line).toBe('uno')
    }

    const staged = ok(base, 'git add f')

    for (const line of [
      'git restore --staged f',
      'git reset HEAD f',
      'git reset f',
      'git reset -- f',
    ]) {
      const world = ok(staged, line)

      expect(world.repo.index.f, line).toBe('uno')
      expect(world.repo.work.f, line).toBe('dos')
    }
    expect(ok(staged, 'git restore --staged --worktree f').repo.work.f).toBe('uno')
    expect(run(staged, 'git reset --hard HEAD f').ok).toBe(false)
  })

  it('rm --cached, mv, rename de rama, tag -d, stash drop y push --delete', () => {
    let world = ok(start(), 'echo a > a', 'git add a', 'git commit -m a')

    world = ok(world, 'git rm --cached a')
    expect(world.repo.work.a).toBe('a')
    expect(world.repo.index.a).toBeUndefined()
    world = ok(world, 'git add a', 'git mv a b')
    expect(world.repo.index).toEqual({ b: 'a' })
    world = ok(world, 'git commit -m mv', 'git branch -m principal')
    expect(world.repo.head).toEqual({ kind: 'branch', name: 'principal' })
    world = ok(world, 'git tag v1', 'git tag -d v1')
    expect(world.repo.tags).toEqual({})
    world = ok(world, 'echo x > b', 'git stash', 'git stash list', 'git stash drop')
    expect(world.repo.stash).toEqual([])
    // `git stash drop` sin nada no guarda un stash nuevo.
    expect(run(world, 'git stash drop').ok).toBe(false)
    expect(run(world, 'git stash bailar').ok).toBe(false)
  })
})
