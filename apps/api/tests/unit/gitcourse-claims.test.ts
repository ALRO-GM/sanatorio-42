/**
 * Curso de git: lo que dice la teoría de cada punto pasa de verdad en el
 * motor. Cada caso reproduce el error típico (`problems`) o la salida que
 * cita la demostración y comprueba que el motor escribe lo que se cita, con
 * los mensajes de git en inglés (los espacios de relleno de git no cuentan).
 * Y lo que el motor hace es lo que haría git 2.4x: ver `docs/curso-git.md`.
 */
import { describe, expect, it } from 'vitest'

import { LEVELS, levelOf, run, startOf } from '@sanatorio/gitsim'
import type { World } from '@sanatorio/gitsim'

/** Un commit con su cambio. */
const C = (name: string): string[] => [
  `echo ${name} > ${name}.txt`,
  `git add ${name}.txt`,
  `git commit -m ${name}`,
]

/** Ejecuta las líneas desde el principio del punto y junta lo que se ve (con los espacios juntos). */
function screen(id: string, lines: readonly string[]): { all: string; last: string } {
  const level = levelOf(id)

  if (level === undefined) throw new Error(`falta ${id}`)

  let world: World = startOf(level)
  const out: string[] = []
  let last: string[] = []

  for (const line of lines) {
    const result = run(world, line)

    out.push(...result.output)
    last = result.output
    world = { repo: result.repo, remote: result.remote }
  }

  const flat = (text: string[]): string => text.join('\n').replace(/[ \t]+/g, ' ')

  return { all: flat(out), last: flat(last) }
}

/** Por punto: lo que se hace, lo que la teoría dice que se verá y lo que la última orden no enseña. */
const CLAIMS: Record<string, { lines: string[]; says: string[]; not?: string[] }[]> = {
  'w0-commit': [
    {
      lines: ['git commit -m "Añade el Makefile"', 'git commit -m otro'],
      says: ['nothing to commit, working tree clean'],
    },
    { lines: ['git status'], says: ['Changes to be committed:', 'new file: Makefile'] },
  ],
  'w0-add': [
    {
      lines: ['echo "int main(void)" > hola.c', 'git status', 'git commit -m x'],
      says: ['Untracked files:', 'nothing added to commit but untracked files present'],
    },
  ],
  'w0-status': [
    {
      lines: ['git status', 'git add .', 'git status'],
      says: [
        'Changes not staged for commit:',
        'Changes to be committed:',
        'modified: libft.h',
        'modified: main.c',
      ],
    },
  ],
  'w0-world': [
    {
      lines: [
        'echo a > notas.txt',
        'git add notas.txt',
        'git commit -m notas',
        'echo c > todo.txt',
        'git commit -am todo',
      ],
      says: ['nothing added to commit but untracked files present'],
    },
  ],
  'w1-branch': [
    { lines: ['git branch feature', ...C('x'), 'git status'], says: ['On branch main'] },
  ],
  'w1-head': [
    {
      lines: ['echo cambio > README.md', 'git switch main'],
      says: ['M README.md', "Switched to branch 'main'"],
    },
    {
      lines: ['git switch main', ...C('arreglo'), 'git log --oneline --all'],
      says: ['(feature) trabajo', '(HEAD -> main) arreglo'],
    },
  ],
  'w1-ff': [
    { lines: ['git merge feature'], says: ['Fast-forward'] },
    { lines: ['git switch feature', 'git merge main'], says: ['Already up to date.'] },
  ],
  'w1-merge': [
    {
      lines: ['git merge feature', 'git log --oneline'],
      says: ["Merge made by the 'ort' strategy.", "Merge branch 'feature'"],
    },
    {
      lines: ['git switch feature', 'git merge main', 'git log --oneline'],
      says: ["(HEAD -> feature) Merge branch 'main' into feature"],
    },
  ],
  'w1-delete': [
    {
      lines: ['git switch -c fix', ...C('x'), 'git switch main', 'git branch -d fix'],
      says: ["error: The branch 'fix' is not fully merged."],
    },
    {
      lines: [
        'git switch -c fix',
        ...C('x'),
        'git switch main',
        'git merge fix',
        'git branch -d fix',
      ],
      says: ['Deleted branch fix'],
    },
  ],
  'w1-world': [
    {
      lines: ['git switch -c a', ...C('a1'), 'git switch -c b', 'git log --oneline b'],
      says: ['a1'],
    },
  ],
  'w2-clone': [
    {
      lines: ['git clone', ...C('x'), 'git status'],
      says: ["Your branch is ahead of 'origin/main' by 1 commit."],
    },
    { lines: ['git clone', ...C('x'), 'git push'], says: ['main -> main'] },
  ],
  'w2-fetch': [
    {
      lines: ['git fetch', 'git status'],
      says: ['main -> origin/main', "Your branch is behind 'origin/main' by 2 commits"],
    },
  ],
  'w2-pull': [
    { lines: ['git push'], says: ['(fetch first)'] },
    { lines: ['git pull'], says: ['fatal: Need to specify how to reconcile divergent branches.'] },
  ],
  'w2-branch': [
    {
      lines: ['git switch -c login', ...C('x'), 'git push'],
      says: ['fatal: The current branch login has no upstream branch.'],
    },
    {
      lines: ['git switch -c login', ...C('x'), 'git push -u origin login'],
      says: ['[new branch] login -> login'],
    },
    { lines: [...C('x'), 'git push'], says: ['GH006'] },
  ],
  'w2-world': [
    { lines: ['git push'], says: ['rejected'] },
    { lines: ['git pull'], says: ['Need to specify how to reconcile divergent branches'] },
    { lines: ['git pull --rebase'], says: ['Successfully rebased'] },
  ],
  'w3-relative': [
    { lines: ['git checkout HEAD~2'], says: ['HEAD is now at c1 uno'] },
    { lines: ['git switch HEAD~2'], says: ['fatal: a branch is expected'] },
    {
      lines: ['git checkout HEAD~2', ...C('x'), 'git switch main'],
      says: ['you are leaving 1 commit behind'],
    },
  ],
  'w3-amend': [
    { lines: ['git commit -m "Arregla el parser"'], says: ['nothing to commit'] },
    { lines: [...C('x'), 'git log --oneline'], says: ['aregla el parsr'] },
  ],
  'w3-cherry': [
    { lines: ['git log --oneline --all'], says: ['c3 (exp) c', 'c2 b', 'c1 a'] },
    { lines: ['git cherry-pick exp', 'ls'], says: ['c.txt'], not: ['b.txt'] },
  ],
  'w3-rebase': [
    { lines: ['git rebase main'], says: ['Current branch main is up to date.'] },
    { lines: ['git switch feature', 'git rebase main'], says: ['Successfully rebased'] },
  ],
  'w3-world': [
    { lines: ['git merge bugfix'], says: ["Merge made by the 'ort' strategy."] },
    {
      lines: ['git switch bugfix', 'git rebase main', 'git switch main', 'git merge bugfix'],
      says: ['Fast-forward'],
    },
  ],
  'w4-reset': [
    {
      lines: ['git reset --hard HEAD~2', 'ls'],
      says: ['HEAD is now at c1 bien'],
      not: ['mal.txt', 'peor.txt'],
    },
  ],
  'w4-revert': [
    { lines: ['git revert HEAD'], says: ['Revert "ups"'] },
    {
      lines: ['git reset --hard HEAD~1', ...C('x'), 'git push'],
      says: ['! [rejected] main -> main (non-fast-forward)'],
    },
  ],
  'w4-stash': [
    {
      lines: ['git switch fix'],
      says: [
        'error: Your local changes to the following files would be overwritten by checkout:',
        'f.c',
      ],
    },
  ],
  'w4-conflict': [
    { lines: ['git merge rama'], says: ['CONFLICT (content): Merge conflict in f.c'] },
    {
      lines: ['git merge rama', 'git commit -m x'],
      says: ['error: Committing is not possible because you have unmerged files.'],
    },
  ],
  'w4-world': [
    {
      lines: ['git reset --hard HEAD~3', 'ls'],
      says: ['HEAD is now at c1 base'],
      not: ['a.c', 'b.c', 'c.c'],
    },
  ],
  'w5-github-flow': [
    {
      lines: ['git pull', ...C('x'), 'git push'],
      says: ['remote: error: GH006: Protected branch update failed for refs/heads/main.'],
    },
  ],
  'w5-tag': [
    {
      lines: ['git tag v1.0', 'git log --oneline', 'git tag v1.0'],
      says: ['tag: v1.0', "fatal: tag 'v1.0' already exists"],
    },
  ],
  'w5-release': [
    {
      lines: ['git switch -c release/1.0', ...C('x'), 'git switch main', 'git merge release/1.0'],
      says: ['Fast-forward'],
    },
  ],
  'w5-hotfix': [
    {
      lines: [
        'git switch -c hotfix',
        ...C('arreglo'),
        'git switch main',
        'git merge --no-ff hotfix',
        'git switch develop',
        'git log --oneline',
      ],
      says: ['a medias'],
      not: ['arreglo'],
    },
  ],
  'w5-world': [
    {
      lines: ['git switch -c mini', ...C('x'), 'git switch main', 'git merge mini', 'git push'],
      says: ['! [rejected] main -> main (fetch first)'],
    },
  ],
}

describe('curso de git: la teoría dice lo que hace el motor', () => {
  it('hay casos para cada punto del camino', () => {
    expect(Object.keys(CLAIMS).sort()).toEqual(LEVELS.map((level) => level.id).sort())
  })

  for (const [id, claims] of Object.entries(CLAIMS)) {
    it(`${id}: lo que se cita sale tal cual`, () => {
      for (const claim of claims) {
        const seen = screen(id, claim.lines)

        for (const text of claim.says) expect(seen.all, claim.lines.join(' · ')).toContain(text)
        // Lo que no tiene que salir, en lo que dice la última orden.
        for (const text of claim.not ?? [])
          expect(seen.last, claim.lines.join(' · ')).not.toContain(text)
      }
    })
  }

  it('las citas de la teoría (en los tres idiomas) son mensajes que el motor escribe', () => {
    const level = levelOf('w2-pull')

    // Lo que va entre comillas en inglés es el mensaje de git, igual en los tres idiomas.
    expect(level?.theory.problems).toContain(
      'fatal: Need to specify how to reconcile divergent branches.',
    )
  })
})
