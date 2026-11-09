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
/** Un commit con su cambio (como en git, sin cambio no hay commit). */
const C = (name: string): string[] => [
  `echo ${name} > ${name}.txt`,
  `git add ${name}.txt`,
  `git commit -m ${name}`,
]

/** Otras formas de resolver cada punto, todas con tres estrellas. */
const VARIANTS: Record<string, string[][]> = {
  'w0-commit': [
    ['git commit --message "Añade el Makefile"'],
    ['git commit -m"Makefile"'],
    ['git status', 'git log --oneline', 'git commit'],
    ['git commit -am Makefile'],
  ],
  'w0-add': [
    ['echo "int main(void)" > hola.c', 'git add .', 'git commit -m x'],
    ['echo "int main(void)">hola.c', 'git add -A', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add --all', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add *', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add *.c', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add ./hola.c', 'git commit -m x'],
    ['echo "int main(void)" > hola.c', 'git add -v hola.c', 'git commit -m x'],
    ['touch hola.c', 'echo "int main(void)" >> hola.c', 'git add hola.c', 'git commit -m x'],
  ],
  'w0-status': [
    ['git commit -m x libft.h'],
    ['git add .', 'git restore --staged main.c', 'git commit -m x'],
    ['git add -A', 'git reset HEAD main.c', 'git commit -m x'],
    ['git add *', 'git reset main.c', 'git commit -m x'],
    ['git add --all', 'git reset -- main.c', 'git diff --staged', 'git commit -m x'],
    ['git status -s', 'git add libft.h', 'git commit -m x'],
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
    ['git checkout -b feature', ...C('x')],
    ['git switch --create feature', 'echo x > x', 'git add -A', 'git commit -m x'],
    ['git branch feature', 'git checkout feature', ...C('x')],
    [
      'git branch feature',
      'git status',
      'git switch feature',
      'echo x > x',
      'git add .',
      'git commit',
    ],
    // El fichero nuevo, sin commit, viaja contigo al cambiar de rama.
    ['echo x > x', 'git switch -c feature', 'git add x', 'git commit -m x'],
  ],
  'w1-head': [
    ['git checkout main', ...C('x')],
    ['git switch -', ...C('x')],
    ['git checkout -', ...C('x')],
    ['echo x > x', 'git switch main', 'git add x', 'git commit -m x'],
  ],
  'w1-ff': [['git merge --ff-only feature'], ['git merge feature -m nada']],
  'w1-merge': [['git merge --no-ff feature'], ['git merge -m "Une feature" feature']],
  'w1-delete': [
    [
      'git checkout -b fix',
      ...C('x'),
      'git checkout main',
      'git merge fix',
      'git branch --delete fix',
    ],
    [
      'git branch fix',
      'git switch fix',
      ...C('x'),
      'git switch -',
      'git merge fix',
      'git branch -D fix',
    ],
    [
      'git switch -c fix',
      ...C('x'),
      'git switch main',
      'git merge --ff-only fix',
      'git branch -d fix',
    ],
  ],
  'w1-world': [
    [
      'git checkout -b a',
      ...C('a1'),
      'git checkout main',
      'git checkout -b b',
      ...C('b1'),
      'git checkout main',
      'git merge a',
      'git merge b',
    ],
    [
      'git switch -c a',
      ...C('a1'),
      'git switch -c b main',
      ...C('b1'),
      'git switch main',
      'git merge a',
      'git merge b',
    ],
  ],
  'w2-clone': [
    ['git clone git@github.com:equipo/repo.git', ...C('x'), 'git push origin main'],
    ['git clone', ...C('x'), 'git push -u origin main'],
    ['git clone', ...C('x'), 'git push origin HEAD'],
  ],
  'w2-fetch': [
    ['git pull'],
    ['git fetch origin', 'git merge origin/main'],
    ['git fetch', 'git rebase origin/main'],
    ['git pull --ff-only'],
    ['git fetch', 'git merge'],
  ],
  'w2-pull': [
    ['git fetch', 'git merge origin/main', 'git push'],
    ['git pull --no-rebase origin main', 'git push origin main'],
    ['git config pull.rebase false', 'git pull', 'git push'],
    ['git pull --no-ff', 'git push'],
  ],
  'w2-branch': [
    ['git checkout -b login', ...C('a'), ...C('b'), 'git push -u origin login'],
    ['git switch -c login', ...C('a'), ...C('b'), 'git push --set-upstream origin login'],
    ['git switch -c login', ...C('a'), ...C('b'), 'git push origin HEAD'],
    ['git switch -c login', ...C('a'), ...C('b'), 'git push origin login'],
    [
      'git config push.autoSetupRemote true',
      'git switch -c login',
      ...C('a'),
      ...C('b'),
      'git push',
    ],
  ],
  'w2-world': [
    ['git pull -r', 'git push'],
    ['git fetch', 'git rebase origin/main', 'git push'],
    ['git pull --rebase origin main', 'git push origin main'],
    ['git config pull.rebase true', 'git pull', 'git push'],
    ['git fetch', 'git rebase', 'git push'],
  ],
  'w3-relative': [
    ['git checkout HEAD^^'],
    ['git switch --detach HEAD~2'],
    ['git switch -d main~2'],
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
    ['git switch bugfix', 'git rebase main', 'git switch main', 'git rebase bugfix'],
  ],
  'w4-reset': [
    ['git reset --hard HEAD^^'],
    ['git reset --hard c1'],
    ['git reset --hard main~2'],
    ['git reset HEAD~2'],
    ['git reset --mixed HEAD~2'],
    ['git reset --soft HEAD~2'],
  ],
  'w4-revert': [
    ['git revert --no-edit HEAD', 'git push origin main'],
    ['git revert HEAD', 'git push origin HEAD'],
  ],
  'w4-stash': [
    [
      'git stash push',
      'git checkout fix',
      'echo x > f.c',
      'git commit -am x',
      'git checkout main',
      'git stash pop',
      'git add .',
      'git commit -m sigo',
    ],
    [
      'git stash save "a medias"',
      'git switch fix',
      ...C('arreglo'),
      'git switch -',
      'git stash apply',
      'git commit -a -m sigo',
    ],
    // Sin stash: un commit provisional que luego se deshace con reset --soft.
    [
      'git commit -am wip',
      'git switch fix',
      'echo x > f.c',
      'git commit -am x',
      'git switch main',
      'git reset --soft HEAD~1',
      'git commit -m sigo',
    ],
  ],
  'w4-conflict': [
    ['git merge rama', 'echo "los dos" > f.c', 'git add .', 'git commit -m x'],
    ['git merge rama', 'echo "los dos" > f.c', 'git commit -am x'],
    ['git merge rama', 'echo "los dos" > f.c', 'git add -A', 'git merge --continue'],
  ],
  'w4-world': [
    ['git reset HEAD~3', 'git add -A', 'git commit -m x'],
    ['git reset --mixed HEAD~3', 'git add .', 'git commit -m x'],
    ['git reset --soft HEAD^^^', 'git commit --message junto'],
  ],
  'w5-github-flow': [
    ['git pull', 'git checkout -b api', ...C('a'), ...C('b'), 'git push -u origin api'],
    ['git pull origin main', 'git switch -c api', ...C('a'), ...C('b'), 'git push origin HEAD'],
    [
      'git fetch',
      'git merge --ff-only origin/main',
      'git switch -c api',
      ...C('a'),
      ...C('b'),
      'git push origin api',
    ],
  ],
  'w5-tag': [
    ['git tag -a v1.0 -m "Versión 1.0"', 'git tag v0.9 HEAD^'],
    ['git tag v0.9 main~1', 'git tag v1.0 main'],
  ],
  'w5-release': [
    [
      'git checkout -b release/1.0',
      ...C('v1'),
      'git checkout main',
      'git merge --no-ff release/1.0',
      'git checkout develop',
      'git merge --no-ff release/1.0',
      'git tag v1.0 main',
    ],
    [
      'git switch -c release/1.0',
      ...C('v1'),
      'git switch main',
      'git merge --no-ff -m "Versión 1.0" release/1.0',
      'git tag -a v1.0 -m "1.0"',
      'git switch develop',
      'git merge --no-ff release/1.0',
    ],
  ],
  'w5-hotfix': [
    [
      'git checkout -b hotfix',
      ...C('arreglo'),
      'git checkout main',
      'git merge --no-ff hotfix',
      'git tag v1.0.1',
      'git checkout develop',
      'git merge hotfix',
    ],
  ],
  'w5-world': [
    [
      'git checkout -b mini',
      ...C('x'),
      'git fetch',
      'git rebase origin/main',
      'git checkout main',
      'git merge mini',
      'git push',
      'git branch -d mini',
    ],
    [
      'git switch -c mini',
      ...C('x'),
      'git switch main',
      'git pull --ff-only',
      'git rebase main mini',
      'git switch main',
      'git merge --ff-only mini',
      'git push origin main',
      'git branch --delete mini',
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
    expect(
      tally(level, ['git branch feature', 'git commit --allow-empty', 'git switch feature'])
        .commands,
    ).toBe(3)
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

describe('curso de git: lo que no vale, y por qué (git haría lo mismo)', () => {
  /** Punto, intento y por qué no llega (lo que haría git de verdad). */
  const REJECTED: [string, string[], string][] = [
    [
      'w0-add',
      ['echo "int main(void)" > hola.c', 'git commit -m x hola.c'],
      'git commit f solo vale con ficheros que git ya sigue: «pathspec did not match»',
    ],
    [
      'w2-pull',
      ['git pull', 'git push'],
      'con las ramas separadas, pull a secas pide elegir cómo unir',
    ],
    [
      'w2-world',
      ['git pull --no-rebase', 'git push'],
      'deja un commit de merge: el reto pide historia en línea',
    ],
    ['w3-relative', ['git switch HEAD~2'], 'git switch a un commit pide --detach'],
    ['w1-ff', ['git merge --no-ff feature'], 'crea un commit de merge: el reto pide avance rápido'],
    [
      'w5-release',
      [
        'git switch -c release/1.0',
        ...C('v1'),
        'git switch main',
        'git merge --no-ff release/1.0',
        'git tag v1.0',
        'git switch develop',
        'git merge release/1.0',
      ],
      'en develop avanza rápido y no queda el merge de la release (Gitflow pide --no-ff)',
    ],
    [
      'w4-revert',
      ['git reset --hard HEAD~1', 'git push --force'],
      'reescribe origin: el reto pide deshacer sin forzar',
    ],
    [
      'w4-stash',
      ['git switch fix', 'echo x > f.c', 'git commit -am x'],
      'git switch fix se niega: tus cambios en f.c chocan con los de fix',
    ],
  ]

  for (const [id, lines, why] of REJECTED) {
    it(`${id}: ${why}`, () => {
      const level = levelOf(id)

      if (level === undefined) throw new Error(`falta ${id}`)
      expect(checkAttempt(level, lines).done).toBe(false)
    })
  }
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
