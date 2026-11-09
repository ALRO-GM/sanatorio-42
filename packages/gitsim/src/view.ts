/**
 * Lo que solo mira: `git status`, `git log`, `git diff` y `git show`. Escriben
 * como git 2.4x en inglés (con `advice.statusHints` apagado: sin las líneas
 * «(use "git add" …)»), para que lo que se ve aquí sea lo que se verá en el
 * clúster. No cambian el repositorio.
 */

import { own } from './limits.js'
import { ancestors, commitOf, GitError, headId } from './model.js'
import type { Files, Repo } from './model.js'
import { aheadBehind, resolve, trackingLines, upstreamOf } from './refs.js'
import type { World } from './refs.js'
import { diffstat, unified } from './text.js'

/** La sangría con la que git lista los ficheros (un tabulador). */
const TAB = '        '

const union = (...records: Files[]): string[] => [
  ...new Set(records.flatMap((record) => Object.keys(record))),
]

/** Cómo está cada fichero: preparado, sin preparar, sin seguir o con conflicto. */
export function fileStates(repo: Repo): {
  staged: string[]
  unstaged: string[]
  untracked: string[]
  unmerged: string[]
} {
  const tip = commitOf(repo, headId(repo)).files
  const unmerged = [...(repo.merging?.conflicts ?? [])].sort()
  const open = (path: string): boolean => !unmerged.includes(path)

  return {
    staged: union(tip, repo.index)
      .filter((path) => open(path) && repo.index[path] !== tip[path])
      .sort(),
    unstaged: Object.keys(repo.index)
      .filter((path) => open(path) && repo.work[path] !== repo.index[path])
      .sort(),
    untracked: Object.keys(repo.work)
      .filter((path) => open(path) && own(repo.index, path) === undefined)
      .sort(),
    unmerged,
  }
}

const label = (word: string): string => `${word}:`.padEnd(Math.max(12, word.length + 4))

/** Las líneas de `git status` (las mismas que enseña un `git commit` que no tiene nada que guardar). */
export function statusLines(repo: Repo): string[] {
  const tip = commitOf(repo, headId(repo)).files
  const { staged, unstaged, untracked, unmerged } = fileStates(repo)
  const lines = [
    repo.head.kind === 'branch'
      ? `On branch ${repo.head.name}`
      : `HEAD detached at ${repo.head.id}`,
  ]
  const tracking = trackingLines(repo)

  lines.push(...tracking)
  if (tracking.length > 0) lines.push('')
  if (repo.merging !== null) {
    lines.push(
      unmerged.length > 0
        ? 'You have unmerged paths.'
        : 'All conflicts fixed but you are still merging.',
      '',
    )
  }

  const section = (title: string, entries: string[]): void => {
    if (entries.length === 0) return
    lines.push(title, ...entries.map((entry) => `${TAB}${entry}`), '')
  }

  section(
    'Changes to be committed:',
    staged.map(
      (path) =>
        `${label(tip[path] === undefined ? 'new file' : repo.index[path] === undefined ? 'deleted' : 'modified')}${path}`,
    ),
  )
  section(
    'Unmerged paths:',
    unmerged.map((path) => `${label('both modified')}${path}`),
  )
  section(
    'Changes not staged for commit:',
    unstaged.map(
      (path) => `${label(repo.work[path] === undefined ? 'deleted' : 'modified')}${path}`,
    ),
  )
  section('Untracked files:', untracked)
  if (staged.length === 0 && repo.merging === null) {
    lines.push(
      unstaged.length > 0
        ? 'no changes added to commit (use "git add" and/or "git commit -a")'
        : untracked.length > 0
          ? 'nothing added to commit but untracked files present (use "git add" to track)'
          : 'nothing to commit, working tree clean',
    )
  }
  while (lines.at(-1) === '') lines.pop()

  return lines
}

/** `git status -s` (y `-b` para la línea de la rama). */
function shortStatus(repo: Repo, branchLine: boolean): string[] {
  const tip = commitOf(repo, headId(repo)).files
  const { untracked, unmerged } = fileStates(repo)
  const lines: string[] = []

  if (branchLine) {
    if (repo.head.kind === 'detached') lines.push('## HEAD (no branch)')
    else {
      const upstream = upstreamOf(repo, repo.head.name)
      const theirs = upstream === undefined ? undefined : own(repo.tracking, upstream)
      let line = `## ${repo.head.name}`

      if (upstream !== undefined) line += `...${upstream}`
      if (theirs !== undefined) {
        const { ahead, behind } = aheadBehind(repo.commits, headId(repo), theirs)
        const parts = [
          ...(ahead > 0 ? [`ahead ${ahead}`] : []),
          ...(behind > 0 ? [`behind ${behind}`] : []),
        ]

        if (parts.length > 0) line += ` [${parts.join(', ')}]`
      }
      lines.push(line)
    }
  }
  for (const path of union(tip, repo.index).sort()) {
    if (unmerged.includes(path)) {
      lines.push(`UU ${path}`)
      continue
    }

    const x =
      repo.index[path] === tip[path]
        ? ' '
        : tip[path] === undefined
          ? 'A'
          : repo.index[path] === undefined
            ? 'D'
            : 'M'
    const y =
      repo.index[path] === undefined || repo.work[path] === repo.index[path]
        ? ' '
        : repo.work[path] === undefined
          ? 'D'
          : 'M'

    if (x !== ' ' || y !== ' ') lines.push(`${x}${y} ${path}`)
  }
  for (const path of untracked) lines.push(`?? ${path}`)

  return lines
}

export function status(repo: Repo, args: readonly string[]): string[] {
  const short = args.some(
    (arg) => arg === '-s' || arg === '--short' || arg === '-sb' || arg === '--porcelain',
  )
  const branchLine = args.some((arg) => arg === '-b' || arg === '--branch' || arg === '-sb')

  return short ? shortStatus(repo, branchLine) : statusLines(repo)
}

/** Las etiquetas de un commit en `git log`: `HEAD -> main, tag: v1.0, origin/main, feature`. */
function decorations(repo: Repo, id: string): string {
  const names = [
    ...(repo.head.kind === 'branch' && repo.branches[repo.head.name] === id
      ? [`HEAD -> ${repo.head.name}`]
      : []),
    ...(repo.head.kind === 'detached' && repo.head.id === id ? ['HEAD'] : []),
    ...Object.entries(repo.tags)
      .filter(([, at]) => at === id)
      .map(([name]) => `tag: ${name}`),
    ...Object.entries(repo.tracking)
      .filter(([, at]) => at === id)
      .map(([name]) => name),
    ...Object.entries(repo.branches)
      .filter(
        ([name, at]) => at === id && !(repo.head.kind === 'branch' && repo.head.name === name),
      )
      .map(([name]) => name),
  ]

  return names.length === 0 ? '' : ` (${names.join(', ')})`
}

/** El orden de `git log`: lo más nuevo arriba (los ids crecen con el tiempo; las copias, después). */
const newestFirst = (a: string, b: string): number =>
  Number(/\d+/.exec(b)?.[0] ?? 0) - Number(/\d+/.exec(a)?.[0] ?? 0) || b.length - a.length

/** Lo más que enseña `git log` de una vez. */
const LOG_MAX = 30

/**
 * `git log`: desde HEAD, desde las referencias que se le den (`git log
 * feature`, `main..feature`, `^main`) o desde todas (`--all`: ramas, ramas
 * de origin, tags y HEAD). `--oneline`, `-n 3` / `-3`; `--graph` y
 * `--decorate` se aceptan (el dibujo ya lo hace el curso).
 */
export function log(world: World, args: readonly string[]): string[] {
  const { repo } = world
  const oneline = args.includes('--oneline')
  let limit = LOG_MAX
  const include: string[] = []
  const exclude: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''
    const count = /^-(\d+)$/.exec(arg)?.[1] ?? /^--max-count=(\d+)$/.exec(arg)?.[1]

    if (count !== undefined) limit = Math.min(Number(count), LOG_MAX)
    else if (arg === '-n') {
      limit = Math.min(Number(args[i + 1] ?? LOG_MAX) || 0, LOG_MAX)
      i++
    } else if (arg === '--all') {
      include.push(
        headId(repo),
        ...Object.values(repo.branches),
        ...Object.values(repo.tracking),
        ...Object.values(repo.tags),
      )
    } else if (['--oneline', '--graph', '--decorate', '--no-decorate', '--'].includes(arg)) continue
    else if (arg.startsWith('-')) throw new GitError(`fatal: unrecognized argument: ${arg}`)
    else if (arg.includes('..')) {
      const [from = '', to = ''] = arg.split('..')

      exclude.push(resolve(world, from === '' ? 'HEAD' : from))
      include.push(resolve(world, to === '' ? 'HEAD' : to))
    } else if (arg.startsWith('^')) exclude.push(resolve(world, arg.slice(1)))
    else include.push(resolve(world, arg))
  }
  if (include.length === 0) include.push(headId(repo))

  const hidden = new Set(exclude.flatMap((id) => [...ancestors(repo.commits, id)]))
  const reach = new Set<string>()

  for (const start of include)
    for (const id of ancestors(repo.commits, start)) if (!hidden.has(id)) reach.add(id)

  const lines: string[] = []

  for (const id of [...reach].sort(newestFirst).slice(0, limit)) {
    const commit = commitOf(repo, id)

    if (oneline) {
      lines.push(`${id}${decorations(repo, id)} ${commit.message}`)
      continue
    }
    if (lines.length > 0) lines.push('')
    lines.push(`commit ${id}${decorations(repo, id)}`)
    if (commit.parents.length > 1) lines.push(`Merge: ${commit.parents.join(' ')}`)
    lines.push('', `    ${commit.message}`)
  }

  return lines
}

/** Lo más largo que se enseña de un diff. */
const DIFF_MAX = 120

/** Los ficheros seguidos tal como están en tu carpeta (lo que compara `git diff`). */
const trackedWork = (repo: Repo, also: Files = {}): Files =>
  Object.fromEntries(
    union(repo.index, also)
      .filter((path) => own(repo.work, path) !== undefined)
      .map((path) => [path, repo.work[path] ?? '']),
  )

/**
 * `git diff` (tu carpeta frente al índice), `--staged`/`--cached` (el índice
 * frente a HEAD), `git diff ref` (tu carpeta frente a un commit) y `git diff
 * a b` o `a..b` (dos commits). `--stat` y `--name-only` resumen.
 */
export function diff(world: World, args: readonly string[]): string[] {
  const { repo } = world
  const staged = args.includes('--staged') || args.includes('--cached')
  const refs = args
    .filter((arg) => !arg.startsWith('-'))
    .flatMap((arg) => (arg.includes('..') ? arg.split('..').map((part) => part || 'HEAD') : [arg]))
  const filesAt = (ref: string): Files => commitOf(repo, resolve(world, ref)).files
  let from: Files
  let to: Files

  if (refs.length >= 2) {
    from = filesAt(refs[0] ?? 'HEAD')
    to = filesAt(refs[1] ?? 'HEAD')
  } else if (staged) {
    from = filesAt(refs[0] ?? 'HEAD')
    to = repo.index
  } else if (refs.length === 1) {
    from = filesAt(refs[0] ?? 'HEAD')
    to = trackedWork(repo, from)
  } else {
    from = repo.index
    to = trackedWork(repo)
  }

  const lines = args.includes('--stat')
    ? diffstat(from, to)
    : args.includes('--name-only')
      ? union(from, to)
          .filter((path) => from[path] !== to[path])
          .sort()
      : unified(from, to)

  return lines.slice(0, DIFF_MAX)
}

/** `git show [ref]`: el commit y lo que cambió respecto a su primer padre. */
export function show(world: World, args: readonly string[]): string[] {
  const { repo } = world
  const ref = args.find((arg) => !arg.startsWith('-')) ?? 'HEAD'
  const id = resolve(world, ref)
  const commit = commitOf(repo, id)
  const parent = commit.parents[0] === undefined ? {} : commitOf(repo, commit.parents[0]).files
  const lines = args.includes('--oneline')
    ? [`${id}${decorations(repo, id)} ${commit.message}`]
    : [
        `commit ${id}${decorations(repo, id)}`,
        ...(commit.parents.length > 1 ? [`Merge: ${commit.parents.join(' ')}`] : []),
        '',
        `    ${commit.message}`,
        '',
      ]
  // Un merge, como en git: sin diff salvo que haya conflictos resueltos a mano.
  const body =
    args.includes('-s') || args.includes('--no-patch') || commit.parents.length > 1
      ? []
      : args.includes('--stat')
        ? diffstat(parent, commit.files)
        : args.includes('--name-only')
          ? union(parent, commit.files)
              .filter((path) => parent[path] !== commit.files[path])
              .sort()
          : unified(parent, commit.files)

  while (body.length === 0 && lines.at(-1) === '') lines.pop()

  return [...lines, ...body].slice(0, DIFF_MAX)
}
