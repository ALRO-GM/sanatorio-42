/**
 * El modelo de un repositorio de git simulado: commits con su foto de los
 * ficheros, ramas, HEAD, índice, directorio de trabajo, tags, stash y ramas de
 * seguimiento de un remoto. Todo es datos planos (JSON): se guarda tal cual y
 * se copia con `clone`.
 *
 * Los ids son deterministas, como en *Learn Git Branching*: `c1`, `c2`… (o con
 * el prefijo de cada persona en las pruebas de grupo: `a1`, `b1`…) y las copias
 * de un rebase o un cherry-pick llevan comillas: `c2'`, `c2''`. Así, quien
 * llega a lo mismo por otro camino llega a lo mismo.
 */

export type Files = Record<string, string>

export type Commit = {
  id: string
  parents: string[]
  message: string
  /** La foto de todos los ficheros en ese commit. */
  files: Files
}

export type Head = { kind: 'branch'; name: string } | { kind: 'detached'; id: string }

export type Repo = {
  commits: Record<string, Commit>
  branches: Record<string, string>
  /** Ramas de seguimiento del remoto: `origin/main` → id. */
  tracking: Record<string, string>
  tags: Record<string, string>
  head: Head
  /** Lo preparado para el próximo commit (`git add`). */
  index: Files
  /** El directorio de trabajo. */
  work: Files
  stash: { index: Files; work: Files }[]
  /** Un merge con conflictos a medias: con qué se estaba uniendo. */
  merging: { theirs: string; conflicts: string[] } | null
  /** Prefijo de los ids de esta persona y el siguiente número. */
  prefix: string
  next: number
}

/** El remoto común (`origin`): solo commits, ramas y tags. */
export type Remote = {
  commits: Record<string, Commit>
  branches: Record<string, string>
  tags: Record<string, string>
  /** Ramas protegidas: no se puede hacer push directo (solo por «PR»). */
  locked: string[]
}

export class GitError extends Error {}

/** Quita una clave de un registro (un fichero, una rama). */
export function forget(record: Record<string, unknown>, key: string): void {
  Reflect.deleteProperty(record, key)
}

/** Copia profunda: el estado es JSON plano. */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function emptyRepo(prefix = 'c'): Repo {
  const root: Commit = { id: `${prefix}0`, parents: [], message: 'Primer commit', files: {} }

  return {
    commits: { [root.id]: root },
    branches: { main: root.id },
    tracking: {},
    tags: {},
    head: { kind: 'branch', name: 'main' },
    index: {},
    work: {},
    stash: [],
    merging: null,
    prefix,
    next: 1,
  }
}

/** El id del commit al que apunta HEAD. */
export function headId(repo: Repo): string {
  if (repo.head.kind === 'detached') return repo.head.id

  const id = repo.branches[repo.head.name]

  if (id === undefined) throw new GitError(`la rama ${repo.head.name} no existe`)

  return id
}

export function commitOf(repo: Repo, id: string): Commit {
  const commit = repo.commits[id]

  if (commit === undefined) throw new GitError(`no existe el commit ${id}`)

  return commit
}

/** Todos los ancestros de `id`, él incluido. */
export function ancestors(commits: Record<string, Commit>, id: string): Set<string> {
  const seen = new Set<string>()
  const pending = [id]

  while (pending.length > 0) {
    const current = pending.pop()

    if (current === undefined || seen.has(current)) continue
    seen.add(current)
    for (const parent of commits[current]?.parents ?? []) pending.push(parent)
  }

  return seen
}

export function isAncestor(commits: Record<string, Commit>, maybe: string, of: string): boolean {
  return ancestors(commits, of).has(maybe)
}

/** El ancestro común más cercano de dos commits (el más «nuevo» de los comunes). */
export function mergeBase(commits: Record<string, Commit>, a: string, b: string): string | null {
  const ofA = ancestors(commits, a)
  const common = [...ancestors(commits, b)].filter((id) => ofA.has(id))

  // El que no es ancestro de ningún otro común.
  return (
    common.find((candidate) =>
      common.every((other) => other === candidate || !isAncestor(commits, candidate, other)),
    ) ?? null
  )
}

/** Un id nuevo para un commit de esta persona. */
export function newId(repo: Repo): string {
  const id = `${repo.prefix}${repo.next}`

  repo.next += 1

  return id
}

/** Un id para la copia de `id` (rebase, cherry-pick): `c2'`, `c2''`… */
export function copyId(repo: Repo, id: string): string {
  let copy = `${id}'`

  while (repo.commits[copy] !== undefined) copy += "'"

  return copy
}

export const sameFiles = (a: Files, b: Files): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])

  return [...keys].every((key) => a[key] === b[key])
}
