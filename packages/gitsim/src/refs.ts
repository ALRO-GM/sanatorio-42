/**
 * Referencias: de un nombre (`HEAD~2`, `main^`, `origin/main`, `v1.0`, `c3`) al
 * commit, qué clase de cosa es cada nombre y cómo va una rama respecto a la
 * de origin que sigue. Lo usan los comandos y lo que solo mira (`status`,
 * `log`).
 */

import { LIMITS, own } from './limits.js'
import { ancestors, commitOf, GitError, headId } from './model.js'
import type { Commit, Remote, Repo } from './model.js'

export type World = { repo: Repo; remote: Remote | null }

/** La dirección de origin que enseñan `fetch`, `push` y `remote -v` (no se conecta a nada). */
export const REMOTE_URL = 'github.com:equipo/repo.git'

const unknown = (ref: string): GitError =>
  new GitError(
    `fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`,
  )

/** El commit al que se refiere `ref`: HEAD, rama, tag, `origin/x`, id, con `~n` y `^n`. */
export function resolve(world: World, ref: string): string {
  const { repo } = world
  const match = /^(.*?)((?:[~^]\d*)*)$/.exec(ref)
  const base = match?.[1] ?? ref
  const steps = match?.[2] ?? ''
  let id: string | undefined

  if (base === 'HEAD' || base === '@') id = headId(repo)
  else
    id =
      own(repo.branches, base) ??
      own(repo.tags, base) ??
      // `origin/x` y `remotes/origin/x` son lo mismo.
      own(repo.tracking, base.replace(/^remotes\//, '')) ??
      (own(repo.commits, base) === undefined ? undefined : base)

  if (id === undefined) throw unknown(ref)

  for (const step of steps.match(/[~^]\d*/g) ?? []) {
    // Un número enorme no cuelga nada: se para en el primer commit.
    const n = step.length > 1 ? Math.min(Number(step.slice(1)), LIMITS.commits + 1) : 1

    if (step.startsWith('~')) {
      for (let i = 0; i < n; i++) {
        const parent: string | undefined = commitOf(repo, id).parents[0]

        if (parent === undefined) throw unknown(ref)
        id = parent
      }
    } else if (n > 0) {
      const parent: string | undefined = commitOf(repo, id).parents[n - 1]

      if (parent === undefined) throw unknown(ref)
      id = parent
    }
  }

  return id
}

/** Como `resolve`, pero `null` si no es una referencia (para distinguir de un fichero). */
export function tryResolve(world: World, ref: string): string | null {
  try {
    return resolve(world, ref)
  } catch {
    return null
  }
}

/** Qué es un nombre, como lo dice git al quejarse («got tag 'v1.0'»). */
export function kindOf(repo: Repo, word: string): 'branch' | 'tag' | 'remote branch' | 'commit' {
  if (own(repo.branches, word) !== undefined) return 'branch'
  if (own(repo.tags, word) !== undefined) return 'tag'
  if (own(repo.tracking, word) !== undefined) return 'remote branch'

  return 'commit'
}

/** La rama de origin que sigue `branch`, si la tiene. */
export const upstreamOf = (repo: Repo, branch: string): string | undefined =>
  repo.upstream === undefined ? undefined : own(repo.upstream, branch)

/** Cuántos commits tiene `a` que no tiene `b`, y al revés. */
export function aheadBehind(
  commits: Record<string, Commit>,
  a: string,
  b: string,
): { ahead: number; behind: number } {
  const ofA = ancestors(commits, a)
  const ofB = ancestors(commits, b)

  return {
    ahead: [...ofA].filter((id) => !ofB.has(id)).length,
    behind: [...ofB].filter((id) => !ofA.has(id)).length,
  }
}

const commits = (n: number): string => `${n} commit${n === 1 ? '' : 's'}`

/** Lo que dicen `git status` y `git switch` sobre la rama que se sigue. */
export function trackingLines(repo: Repo): string[] {
  if (repo.head.kind !== 'branch') return []

  const upstream = upstreamOf(repo, repo.head.name)

  if (upstream === undefined) return []

  const theirs = own(repo.tracking, upstream)

  if (theirs === undefined)
    return [`Your branch is based on '${upstream}', but the upstream is gone.`]

  const { ahead, behind } = aheadBehind(repo.commits, headId(repo), theirs)

  if (ahead === 0 && behind === 0) return [`Your branch is up to date with '${upstream}'.`]
  if (behind === 0) return [`Your branch is ahead of '${upstream}' by ${commits(ahead)}.`]
  if (ahead === 0)
    return [`Your branch is behind '${upstream}' by ${commits(behind)}, and can be fast-forwarded.`]

  return [
    `Your branch and '${upstream}' have diverged,`,
    `and have ${ahead} and ${behind} different commits each, respectively.`,
  ]
}

/** «c3 Mensaje»: como lo escribe git en «HEAD is now at …». */
export const oneLine = (repo: Repo, id: string): string => `${id} ${commitOf(repo, id).message}`
