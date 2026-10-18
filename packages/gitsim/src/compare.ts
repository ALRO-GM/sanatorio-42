/**
 * ¿Se ha llegado a la estructura que pide el reto? No se comparan ids: se
 * compara la **forma** de la historia bajo cada rama (cuántos commits, cómo se
 * unen, y cuáles son copias de otros), y si se pide, HEAD, las ramas del
 * remoto, los tags y el contenido de ficheros. Quien llega por otro orden de
 * comandos llega igual.
 */

import { commitOf, headId } from './model.js'
import type { Commit, Files, Remote, Repo } from './model.js'

/** La forma de la historia hasta `id`: sus padres, recursivamente, y si es una copia (`'`). */
export function shape(
  commits: Record<string, Commit>,
  id: string,
  memo = new Map<string, string>(),
): string {
  const known = memo.get(id)

  if (known !== undefined) return known

  const commit = commits[id]

  if (commit === undefined) return '?'

  const copies = (/'+$/.exec(id)?.[0] ?? '').length
  const result = `(${commit.parents.map((parent) => shape(commits, parent, memo)).join(',')})${"'".repeat(copies)}`

  memo.set(id, result)

  return result
}

/** En un objetivo: la rama (o el tag) no tiene que existir. */
const GONE = '-'

/** Lo que pide un reto: lo que haya en cada clave, se comprueba; lo que falte, no. */
export type Goal = {
  /** Las ramas locales y la forma de su historia. */
  branches?: Record<string, string>
  /** En qué rama tiene que acabar HEAD (o `detached` con su forma). */
  head?: { branch: string } | { detached: string }
  /** Las ramas de origin y su forma. */
  remote?: Record<string, string>
  tags?: Record<string, string>
  /** Ficheros que tiene que haber en la punta de una rama. */
  files?: Record<string, Files>
}

/** El objetivo que sale de un estado (el de la solución): todo lo que se ve. */
export function goalOf(
  repo: Repo,
  remote: Remote | null,
  check: {
    branches?: string[]
    head?: boolean
    remote?: string[]
    tags?: boolean
    files?: Record<string, string[]>
  } = {},
): Goal {
  const memo = new Map<string, string>()
  // Una rama que se nombra y no está tiene que no estar (`GONE`): borrar cuenta.
  const pick = (
    from: Record<string, string>,
    names: string[] | undefined,
    commits: Record<string, Commit>,
  ) =>
    Object.fromEntries(
      (names ?? Object.keys(from)).map((name) => {
        const id = from[name]

        return [name, id === undefined ? GONE : shape(commits, id, memo)]
      }),
    )
  const goal: Goal = { branches: pick(repo.branches, check.branches, repo.commits) }

  if (check.head !== false) {
    goal.head =
      repo.head.kind === 'branch'
        ? { branch: repo.head.name }
        : { detached: shape(repo.commits, repo.head.id, memo) }
  }
  if (remote !== null && check.remote !== undefined)
    goal.remote = pick(remote.branches, check.remote, remote.commits)
  if (check.tags === true) goal.tags = pick(repo.tags, undefined, repo.commits)
  if (check.files !== undefined) {
    goal.files = Object.fromEntries(
      Object.entries(check.files).map(([branchName, paths]) => {
        const id = repo.branches[branchName]
        const files = id === undefined ? {} : commitOf(repo, id).files

        return [branchName, Object.fromEntries(paths.map((path) => [path, files[path] ?? '']))]
      }),
    )
  }

  return goal
}

export type Miss = { kind: 'branch' | 'head' | 'remote' | 'tag' | 'file'; name: string }

/** Lo que falta para llegar al objetivo. Vacío: conseguido. */
export function missing(repo: Repo, remote: Remote | null, goal: Goal): Miss[] {
  const memo = new Map<string, string>()
  const misses: Miss[] = []

  for (const [name, wanted] of Object.entries(goal.branches ?? {})) {
    const id = repo.branches[name]

    if (
      wanted === GONE
        ? id !== undefined
        : id === undefined || shape(repo.commits, id, memo) !== wanted
    )
      misses.push({ kind: 'branch', name })
  }
  if (goal.head !== undefined) {
    const ok =
      'branch' in goal.head
        ? repo.head.kind === 'branch' && repo.head.name === goal.head.branch
        : repo.head.kind === 'detached' &&
          shape(repo.commits, headId(repo), memo) === goal.head.detached

    if (!ok) misses.push({ kind: 'head', name: 'branch' in goal.head ? goal.head.branch : 'HEAD' })
  }
  for (const [name, wanted] of Object.entries(goal.remote ?? {})) {
    const id = remote?.branches[name]
    const ok =
      wanted === GONE
        ? id === undefined
        : remote !== null && id !== undefined && shape(remote.commits, id, new Map()) === wanted

    if (!ok) {
      misses.push({ kind: 'remote', name: `origin/${name}` })
    }
  }
  for (const [name, wanted] of Object.entries(goal.tags ?? {})) {
    const id = repo.tags[name]

    if (id === undefined || shape(repo.commits, id, memo) !== wanted)
      misses.push({ kind: 'tag', name })
  }
  for (const [branchName, files] of Object.entries(goal.files ?? {})) {
    const id = repo.branches[branchName]
    const have = id === undefined ? {} : (repo.commits[id]?.files ?? {})

    for (const [path, content] of Object.entries(files)) {
      if ((have[path] ?? '').trim() !== content.trim())
        misses.push({ kind: 'file', name: `${branchName}:${path}` })
    }
  }

  return misses
}
