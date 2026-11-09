/**
 * La terminal del curso de git: interpreta una línea y la ejecuta sobre una
 * copia del repositorio (y del remoto, si lo hay).
 *
 * **Habla como git 2.4x en inglés**, igual que los simuladores de shell y de
 * Docker hablan como bash y Docker: lo que se ve aquí es lo que se verá en el
 * clúster («nothing to commit, working tree clean», «Switched to branch
 * 'main'», « ! [rejected] main -> main (fetch first)»). Se resume lo que git
 * escribe por defecto (sin los hashes largos ni las fechas, y sin las líneas
 * de ayuda «(use "git add" …)», como con `advice.statusHints` apagado). Lo
 * que es del simulador y no de git (los topes, lo que no está, la seguridad)
 * va en castellano y empieza por `peer4u-sandbox:`.
 *
 * **Se porta como git**: un commit sin nada preparado se niega (salvo
 * `--allow-empty`); cambiar de rama se lleva los cambios sin commit salvo que
 * choquen; `git pull` con las ramas separadas pide elegir (`--rebase`,
 * `--no-rebase`, `--ff-only` o `git config pull.rebase`); `git push` a secas
 * en una rama sin upstream se niega y dice cómo; `fetch` no borra las ramas de
 * origin que ya no están salvo con `--prune`. Las diferencias que quedan, a
 * sabiendas, están en `docs/curso-git.md` («Lo que el simulador hace
 * distinto»).
 *
 * **No ejecuta nada de verdad**: no hay `fs`, ni procesos, ni `eval`. Los
 * ficheros son textos en un objeto; las órdenes de shell que no son del curso
 * (sudo, curl, bash…) solo dan un mensaje. Cada línea se mide antes (largo,
 * palabras) y después (`withinLimits`): si se pasa, falla y no cambia nada.
 */

import { LIMITS, own, reserved, safePath, safeRef, withinLimits } from './limits.js'
import {
  ancestors,
  clone,
  commitOf,
  copyId,
  emptyRepo,
  forget,
  GitError,
  headId,
  isAncestor,
  mergeBase,
  newId,
  sameFiles,
} from './model.js'
import type { Commit, Files, Remote, Repo, StashEntry } from './model.js'
import {
  kindOf,
  oneLine,
  REMOTE_URL,
  resolve,
  trackingLines,
  tryResolve,
  upstreamOf,
} from './refs.js'
import type { World } from './refs.js'
import { changedPaths, commitStats, diffstat } from './text.js'
import { diff, fileStates, log, show, status, statusLines } from './view.js'

export type { World } from './refs.js'
export { resolve } from './refs.js'
export type RunResult = World & { output: string[]; ok: boolean; command: string | null }

/** Un mensaje del simulador (no de git): en castellano y con su prefijo. */
const sandbox = (message: string): GitError => new GitError(`peer4u-sandbox: ${message}`)

/** Varias líneas de git en un error (se enseñan una a una). */
const fail = (...lines: string[]): GitError => new GitError(lines.join('\n'))

const NO_SHELL =
  'aquí no hay shell: una orden por línea, sin ; && | ni $( ). Esta terminal es un git simulado y no ejecuta nada en tu ordenador'

/** La sangría con la que git lista ficheros en sus mensajes (un tabulador). */
const TAB = '        '

/**
 * Parte una línea en palabras, respetando comillas simples y dobles. `>` y
 * `>>` sin comillas son palabras sueltas (`echo a>f` vale como `echo a > f`).
 * Lo que en una shell encadena o ejecuta otras órdenes se rechaza.
 */
export function tokenize(line: string): string[] {
  const tokens: string[] = []
  const text = line.trim()
  let current = ''
  let quote: string | null = null
  let started = false
  const flush = (): void => {
    if (started || current !== '') tokens.push(current)
    current = ''
    started = false
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? ''

    if (quote !== null) {
      if (char === quote) quote = null
      else current += char
    } else if (char === '"' || char === "'") {
      quote = char
      started = true
    } else if (/\s/.test(char)) flush()
    else if (char === '>') {
      flush()
      if (text[i + 1] === '>') {
        tokens.push('>>')
        i++
      } else tokens.push('>')
    } else if (';|&`<'.includes(char) || (char === '$' && text[i + 1] === '(')) {
      throw sandbox(NO_SHELL)
    } else {
      current += char
      started = true
    }
  }
  if (quote !== null) throw sandbox('falta cerrar unas comillas')
  flush()

  return tokens
}

// --- Ficheros -----------------------------------------------------------------

/** Une tres versiones de los ficheros. Lo que cambian los dos de forma distinta es conflicto. */
export function threeWay(
  base: Files,
  ours: Files,
  theirs: Files,
  theirsName: string,
): { files: Files; conflicts: string[] } {
  const files: Files = {}
  const conflicts: string[] = []

  for (const path of new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ])) {
    const [b, o, t] = [base[path], ours[path], theirs[path]]
    let result: string | undefined

    if (o === t || t === b) result = o
    else if (o === b) result = t
    else {
      conflicts.push(path)
      result = `<<<<<<< HEAD\n${o ?? ''}\n=======\n${t ?? ''}\n>>>>>>> ${theirsName}`
    }
    if (result !== undefined) files[path] = result
  }

  return { files, conflicts: conflicts.sort() }
}

/**
 * ¿Coincide `path` con el patrón `pattern` (`*` y `?`)? Programación
 * dinámica en vez de una expresión regular: un patrón como `*a*a*a*a*b`
 * no puede disparar el tiempo.
 */
function glob(pattern: string, path: string): boolean {
  let row: boolean[] = [true, ...Array.from({ length: path.length }, () => false)]

  for (const char of pattern) {
    const next = [char === '*' && row[0] === true]

    for (let j = 1; j <= path.length; j++) {
      next[j] =
        char === '*'
          ? row[j] === true || next[j - 1] === true
          : row[j - 1] === true && (char === '?' || char === path[j - 1])
    }
    row = next
  }

  return row[path.length] === true
}

const ALL_PATHS = new Set(['.', './', ':/', ':', '*', '**'])

/** Lo que dice git cuando un fichero no coincide con nada. */
const MISS = {
  add: (raw: string) => `fatal: pathspec '${raw}' did not match any files`,
  known: (raw: string) => `error: pathspec '${raw}' did not match any file(s) known to git`,
  rm: (raw: string) => `rm: cannot remove '${raw}': No such file or directory`,
} as const

/**
 * Los ficheros de `universe` que nombran `specs`: `.` (todos), un fichero, una
 * carpeta (todo lo de dentro) o un patrón con `*` (`*.c`). Como en git, un
 * patrón que no coincide con nada es un error.
 */
function pathsOf(
  specs: readonly string[],
  universe: readonly string[],
  miss: (raw: string) => string = MISS.add,
): string[] {
  const found = new Set<string>()

  for (const raw of specs) {
    if (ALL_PATHS.has(raw)) {
      for (const path of universe) found.add(path)
      continue
    }
    // `/`, `~/…` o `../…` no llegan aquí: `safePath` los rechaza con su porqué.
    if (/^[/~]|(^|\/)\.\.(\/|$)/.test(raw)) safePath(raw)

    const spec = raw.replace(/^\.\//, '').replace(/\/+$/, '')
    const wild = spec.includes('*') || spec.includes('?')

    if (!wild) safePath(spec)

    const hits = universe.filter((path) =>
      wild ? glob(spec, path) : path === spec || path.startsWith(`${spec}/`),
    )

    if (hits.length === 0) throw new GitError(miss(raw))
    for (const path of hits) found.add(path)
  }

  return [...found].sort()
}

const union = (...records: Files[]): string[] => [
  ...new Set(records.flatMap((record) => Object.keys(record))),
]

const tipFiles = (repo: Repo): Files => commitOf(repo, headId(repo)).files

/** Pone `path` en `files` tal como está en `from` (o lo quita si allí no está). */
function copyPath(files: Files, from: Files, path: string): void {
  const content = own(from, path)

  if (content === undefined) forget(files, path)
  else files[path] = content
}

/** `git add` de un fichero: el índice toma lo de tu carpeta y, si chocaba, queda resuelto. */
function stage(repo: Repo, path: string): void {
  copyPath(repo.index, repo.work, path)
  if (repo.merging !== null)
    repo.merging.conflicts = repo.merging.conflicts.filter((each) => each !== path)
}

/** Ficheros preparados (el índice no es HEAD). */
const stagedPaths = (repo: Repo): string[] => {
  const tip = tipFiles(repo)

  return union(tip, repo.index)
    .filter((path) => repo.index[path] !== tip[path])
    .sort()
}

/** Ficheros seguidos con cambios sin preparar. */
const unstagedPaths = (repo: Repo): string[] =>
  Object.keys(repo.index)
    .filter((path) => repo.work[path] !== repo.index[path])
    .sort()

type Op = 'checkout' | 'merge' | 'cherry-pick' | 'revert'

/**
 * Antes de que una orden cambie tus ficheros de `before` a `after`: si toca un
 * fichero con cambios tuyos sin commit, o pisaría uno que git no sigue, se
 * niega como git. Lo que no toca, se queda como está.
 */
function guard(repo: Repo, before: Files, after: Files, op: Op): void {
  const local: string[] = []
  const untracked: string[] = []

  for (const path of changedPaths(before, after)) {
    const clean = repo.index[path] === before[path] && repo.work[path] === before[path]
    const already = repo.index[path] === after[path] && repo.work[path] === after[path]

    if (clean || already) continue
    if (own(repo.index, path) === undefined && before[path] === undefined) untracked.push(path)
    else local.push(path)
  }
  if (op === 'cherry-pick' || op === 'revert') {
    if (local.length + untracked.length > 0)
      throw fail(
        `error: your local changes would be overwritten by ${op}.`,
        'hint: commit your changes or stash them to proceed.',
        `fatal: ${op} failed`,
      )

    return
  }

  const where = op === 'checkout' ? 'before you switch branches.' : 'before you merge.'

  if (local.length > 0)
    throw fail(
      `error: Your local changes to the following files would be overwritten by ${op}:`,
      ...local.map((path) => `${TAB}${path}`),
      `Please commit your changes or stash them ${where}`,
      'Aborting',
    )
  if (untracked.length > 0)
    throw fail(
      `error: The following untracked working tree files would be overwritten by ${op}:`,
      ...untracked.map((path) => `${TAB}${path}`),
      `Please move or remove them ${where}`,
      'Aborting',
    )
}

/** Lleva tus ficheros de `before` a `after`: lo que cambia entre los dos; lo demás (tus cambios), igual. */
function land(repo: Repo, before: Files, after: Files): void {
  for (const path of changedPaths(before, after)) {
    copyPath(repo.index, after, path)
    copyPath(repo.work, after, path)
  }
}

/** Índice y carpeta como en la punta de HEAD; lo que git no sigue se queda (como en git). */
function settle(repo: Repo): void {
  const files = tipFiles(repo)
  const untracked = Object.fromEntries(
    Object.entries(repo.work).filter(([path]) => own(repo.index, path) === undefined),
  )

  repo.index = { ...files }
  repo.work = { ...untracked, ...files }
}

/** Mueve lo que HEAD señala (la rama, o HEAD si está separado) a `id`. */
function setHeadTo(repo: Repo, id: string): void {
  if (repo.head.kind === 'branch') repo.branches[repo.head.name] = id
  else repo.head = { kind: 'detached', id }
}

/** Cómo se llama dónde estás en la cabecera de un commit: `[main c3]` o `[detached HEAD c3]`. */
const where = (repo: Repo): string =>
  repo.head.kind === 'branch' ? repo.head.name : 'detached HEAD'

function makeCommit(
  repo: Repo,
  parents: string[],
  message: string,
  files: Files,
  id = newId(repo),
): Commit {
  const commit: Commit = { id, parents, message, files: { ...files } }

  repo.commits[id] = commit

  return commit
}

/** Aplica sobre `onto` lo que cambió `id` respecto a su primer padre. */
function replay(repo: Repo, id: string, onto: string): { files: Files; conflicts: string[] } {
  const commit = commitOf(repo, id)
  const parent = commit.parents[0] === undefined ? {} : commitOf(repo, commit.parents[0]).files

  return threeWay(parent, commitOf(repo, onto).files, commit.files, id)
}

/** Apunta la rama de origin que sigue `branch`. */
function setUpstream(repo: Repo, branch: string, upstream: string): void {
  repo.upstream = { ...(repo.upstream ?? {}), [branch]: upstream }
}

/** El valor de una opción de `git config` (las claves no distinguen mayúsculas). */
const configOf = (repo: Repo, key: string): string | undefined =>
  repo.config === undefined ? undefined : own(repo.config, key.toLowerCase())

// --- Opciones -----------------------------------------------------------------

type Ctx = { world: World; out: string[] }

const HELP = [
  'Ficheros: ls · cat f · echo "texto" > f · echo "más" >> f · touch f · rm f · mv f g',
  'Guardar: git status · git add f|.|-A · git commit -m "msg" · git commit -am "msg" · git commit --amend · git log · git diff',
  'Deshacer cambios: git restore f · git restore --staged f · git reset HEAD f · git rm [--cached] f',
  'Ramas: git branch [nombre] · git switch [-c] rama · git checkout [-b] rama|commit · git switch - · git merge rama',
  'Reescribir: git rebase rama · git cherry-pick commit… · git reset [--soft|--hard] ref · git revert ref',
  'Más: git tag nombre [ref] · git stash [pop|list|drop] · git fetch · git pull [--rebase|--no-rebase] · git push [-u] [--force] [origin rama]',
  'Equipo: gh pr merge rama (acepta un pull request en origin) · git config pull.rebase false',
  'Referencias: HEAD, main, origin/main, c3, HEAD~2, main^, v1.0',
]

/**
 * Formas largas, cortas y juntas que significan lo mismo, por comando: se
 * traducen a una sola antes de interpretar. Así `--message`, `-m` y `-am`
 * hacen lo mismo y cuentan igual.
 */
const ALIASES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  add: { '--all': ['-A'], '--no-ignore-removal': ['-A'], '-u': ['--update'], '--force': ['-f'] },
  commit: { '--message': ['-m'], '--all': ['-a'], '-am': ['-a', '-m'], '-ma': ['-a', '-m'] },
  switch: { '--create': ['-c'], '--force-create': ['-C'], '-d': ['--detach'], '-t': ['--track'] },
  checkout: { '-t': ['--track'] },
  branch: {
    '--delete': ['-d'],
    '--move': ['-m'],
    '-M': ['-m'],
    '--force': ['-f'],
    '-u': ['--set-upstream-to'],
    '--remotes': ['-r'],
    '--all': ['-a'],
  },
  merge: { '--message': ['-m'] },
  tag: { '--delete': ['-d'], '--annotate': ['-a'], '--message': ['-m'], '--force': ['-f'] },
  stash: { '--message': ['-m'], '--include-untracked': ['-u'] },
  push: { '--set-upstream': ['-u'], '-f': ['--force'] },
  pull: { '-r': ['--rebase'] },
  fetch: { '--prune': ['-p'] },
  restore: { '-S': ['--staged'], '-W': ['--worktree'], '-s': ['--source'] },
  rm: { '--force': ['-f'] },
  status: { '--short': ['-s'], '--branch': ['-b'], '-sb': ['-s', '-b'] },
}

/** Opciones que llevan valor detrás (`-m "mensaje"`, `--source HEAD~1`), por comando. */
const VALUED: Readonly<Record<string, readonly string[]>> = {
  commit: ['-m'],
  switch: ['-c', '-C'],
  checkout: ['-b', '-B'],
  branch: ['-m', '--set-upstream-to'],
  merge: ['-m'],
  tag: ['-m'],
  stash: ['-m'],
  restore: ['--source'],
}

/** Normaliza las opciones de `sub`: `--x=y`, alias y `-m"mensaje"` pegado. */
function normalize(sub: string, args: readonly string[]): string[] {
  const aliases = own(ALIASES, sub) ?? {}
  const valued = own(VALUED, sub) ?? []
  const result: string[] = []

  for (const arg of args) {
    let word = arg
    let value: string | null = null
    const equals = /^(--[a-z-]+)=(.*)$/.exec(arg)

    if (equals !== null) {
      word = equals[1] ?? arg
      value = equals[2] ?? ''
    }

    const alias = own(aliases, word)
    const words = alias === undefined ? [word] : [...alias]
    const last = words.at(-1) ?? word

    // `-m"mensaje"` (sin espacio) vale como `-m "mensaje"`.
    if (alias === undefined && sub === 'commit' && /^-m./.test(word) && word !== '-ma') {
      result.push('-m', word.slice(2))
      continue
    }
    result.push(...words)
    if (value !== null && valued.includes(last)) result.push(value)
  }

  return result
}

function flags(
  sub: string,
  args: readonly string[],
): {
  flags: Set<string>
  rest: string[]
  values: Map<string, string>
} {
  const valued = own(VALUED, sub) ?? []
  const set = new Set<string>()
  const rest: string[] = []
  const values = new Map<string, string>()

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (valued.includes(arg)) {
      values.set(arg, args[i + 1] ?? '')
      set.add(arg)
      i++
    } else if (arg.startsWith('-') && arg !== '-' && arg !== '--') set.add(arg)
    else rest.push(arg)
  }

  return { flags: set, rest, values }
}

/** Solo las opciones de `known`: lo demás se dice en vez de ignorarlo en silencio. */
function only(command: string, given: Set<string>, known: readonly string[]): void {
  const unknown = [...given].find((flag) => !known.includes(flag))

  if (unknown !== undefined)
    throw sandbox(`git ${command} ${unknown}: esa opción no está en este simulador`)
}

// --- Guardar ---------------------------------------------------------------------

function add(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('add', args)

  only('add', f, ['-A', '--update', '-v', '--verbose', '-f'])

  const specs = rest.filter((arg) => arg !== '--')

  if (specs.length === 0 && !f.has('-A') && !f.has('--update'))
    throw fail('Nothing specified, nothing added.', "hint: Maybe you wanted to say 'git add .'?")

  // `-u` solo mira lo que git ya sigue (lo que hay en el índice).
  const universe = f.has('--update') ? Object.keys(repo.index) : union(repo.work, repo.index)

  for (const path of specs.length === 0 ? universe : pathsOf(specs, universe)) {
    const changed = repo.index[path] !== repo.work[path]

    stage(repo, path)
    if (changed && (f.has('-v') || f.has('--verbose')))
      ctx.out.push(repo.work[path] === undefined ? `remove '${path}'` : `add '${path}'`)
  }
}

function gitRm(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('rm', args)

  only('rm', f, ['--cached', '-r', '-f', '-q'])

  const specs = rest.filter((arg) => arg !== '--')

  if (specs.length === 0) throw fail('usage: git rm [<options>] [--] <file>...')
  // Solo lo que git sigue: un fichero nuevo sin add no se puede quitar del índice.
  for (const path of pathsOf(specs, Object.keys(repo.index))) {
    forget(repo.index, path)
    if (repo.merging !== null)
      repo.merging.conflicts = repo.merging.conflicts.filter((each) => each !== path)
    // Con --cached se deja de seguir, pero el fichero sigue en tu carpeta.
    if (!f.has('--cached')) forget(repo.work, path)
    ctx.out.push(`rm '${path}'`)
  }
}

/** `mv` y `git mv`: cambia el nombre en la carpeta (y en el índice, si es de git). */
function move(repo: Repo, args: string[], tracked: boolean): void {
  const [from, to] = flags('mv', args).rest

  if (from === undefined || to === undefined)
    throw tracked
      ? fail('usage: git mv [<options>] <source>... <destination>')
      : fail("mv: missing destination file operand after 'mv'")

  const source = safePath(from)
  const target = safePath(to)
  const content = own(repo.work, source)

  if (tracked && own(repo.index, source) === undefined)
    throw fail(`fatal: not under version control, source=${source}, destination=${target}`)
  if (content === undefined)
    throw fail(
      tracked
        ? `fatal: bad source, source=${source}, destination=${target}`
        : `mv: cannot stat '${from}': No such file or directory`,
    )
  if (tracked && own(repo.work, target) !== undefined)
    throw fail(`fatal: destination exists, source=${source}, destination=${target}`)
  forget(repo.work, source)
  repo.work[target] = content
  if (tracked) {
    forget(repo.index, source)
    repo.index[target] = content
  }
}

function commit(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags('commit', args)

  only('commit', f, ['-a', '-m', '--amend', '--no-edit', '--allow-empty', '-q', '-v'])

  const message = values.get('-m')

  if (message?.trim() === '') throw fail('Aborting commit due to empty commit message.')

  const tip = commitOf(repo, headId(repo))
  const specs = rest.filter((arg) => arg !== '--')

  if (f.has('-a') && specs.length > 0)
    throw fail(`fatal: paths '${specs.join(' ')} ...' with -a does not make sense`)
  // `-a` prepara todo lo que git ya sigue (cambiado o borrado), no los ficheros nuevos.
  if (f.has('-a')) for (const path of Object.keys(repo.index)) stage(repo, path)

  // `git commit f`: solo f (como lo tengas en tu carpeta), aunque haya más preparado.
  let files = repo.index

  if (specs.length > 0) {
    if (repo.merging !== null) throw fail('fatal: cannot do a partial commit during a merge.')
    files = { ...tip.files }
    for (const path of pathsOf(specs, union(repo.index, tip.files), MISS.known)) {
      stage(repo, path)
      copyPath(files, repo.index, path)
    }
  }

  if (repo.merging !== null) {
    if (repo.merging.conflicts.length > 0)
      throw fail(
        'error: Committing is not possible because you have unmerged files.',
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
        'hint: as appropriate to mark resolution and make a commit.',
        'fatal: Exiting because of an unresolved conflict.',
      )

    // Un merge a medias guardado antes del 2026-11-09 lleva el nombre de la rama, no el id.
    const theirs =
      own(repo.commits, repo.merging.theirs) === undefined
        ? (tryResolve(ctx.world, repo.merging.theirs) ?? repo.merging.theirs)
        : repo.merging.theirs
    const made = makeCommit(
      repo,
      [tip.id, theirs],
      message ?? repo.merging.message ?? `Merge commit '${repo.merging.theirs}'`,
      files,
    )

    setHeadTo(repo, made.id)
    repo.merging = null
    ctx.out.push(`[${where(repo)} ${made.id}] ${made.message}`)

    return
  }

  if (f.has('--amend')) {
    // Se rehace el último commit: mismo padre, otro id (el de su copia).
    const parent = tip.parents[0] === undefined ? {} : commitOf(repo, tip.parents[0]).files
    const made = makeCommit(repo, tip.parents, message ?? tip.message, files, copyId(repo, tip.id))

    setHeadTo(repo, made.id)
    ctx.out.push(`[${where(repo)} ${made.id}] ${made.message}`, ...commitStats(parent, made.files))

    return
  }
  // Sin nada preparado git no hace commit: enseña el status y se niega.
  if (sameFiles(files, tip.files) && !f.has('--allow-empty')) throw fail(...statusLines(repo))

  const id = newId(repo)
  // Sin -m git abriría el editor; aquí no hay editor y el mensaje lo pone el simulador.
  const made = makeCommit(repo, [tip.id], message ?? `Commit ${id}`, files, id)

  setHeadTo(repo, made.id)
  ctx.out.push(`[${where(repo)} ${made.id}] ${made.message}`, ...commitStats(tip.files, made.files))
}

/**
 * `git restore f` (deshace lo no preparado), `--staged` (saca del índice),
 * los dos, y `--source ref`. Lo mismo hacen `git checkout -- f` y
 * `git reset HEAD f`, que acaban aquí. Solo vale con ficheros que git conoce.
 */
function restore(
  ctx: Ctx,
  specs: readonly string[],
  options: { staged: boolean; worktree: boolean; source: string | null },
): string[] {
  const { repo } = ctx.world

  if (specs.length === 0) throw fail('fatal: you must specify path(s) to restore')

  const from =
    options.source === null && !options.staged
      ? repo.index
      : commitOf(repo, resolve(ctx.world, options.source ?? 'HEAD')).files
  const paths = pathsOf(specs, union(repo.index, from), MISS.known)

  for (const path of paths) {
    if (options.staged) copyPath(repo.index, from, path)
    if (options.worktree) copyPath(repo.work, from, path)
  }

  return paths
}

function gitRestore(ctx: Ctx, args: string[]): void {
  const { flags: f, rest, values } = flags('restore', args)

  only('restore', f, ['--staged', '--worktree', '--source'])

  const staged = f.has('--staged')

  restore(
    ctx,
    rest.filter((arg) => arg !== '--'),
    {
      staged,
      worktree: f.has('--worktree') || !staged,
      source: values.get('--source') ?? null,
    },
  )
}

/** «Unstaged changes after reset:» y los ficheros seguidos que siguen cambiados. */
function unstagedAfterReset(repo: Repo): string[] {
  const paths = unstagedPaths(repo)

  return paths.length === 0
    ? []
    : [
        'Unstaged changes after reset:',
        ...paths.map(
          (path) => `${repo.work[path] === undefined ? 'D' : 'M'}${TAB.slice(1)}${path}`,
        ),
      ]
}

// --- Ramas ------------------------------------------------------------------

/** Crea la rama `name` en `start`; si sale de una rama de origin, la sigue (como git). */
function createBranch(ctx: Ctx, name: string, start: string, force = false): string {
  const { repo } = ctx.world

  safeRef(name, 'branch')
  if (own(repo.branches, name) !== undefined && !force)
    throw fail(`fatal: a branch named '${name}' already exists`)

  const id = tryResolve(ctx.world, start)

  if (id === null) throw fail(`fatal: not a valid object name: '${start}'`)
  repo.branches[name] = id
  if (kindOf(repo, start) === 'remote branch') {
    const upstream = start.replace(/^remotes\//, '')

    setUpstream(repo, name, upstream)
    ctx.out.push(`branch '${name}' set up to track '${upstream}'.`)
  }

  return id
}

function branch(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags('branch', args)
  const current = repo.head.kind === 'branch' ? repo.head.name : null

  only('branch', f, [
    '-d',
    '-D',
    '-f',
    '-m',
    '--list',
    '-a',
    '-r',
    '-v',
    '-vv',
    '--set-upstream-to',
    '--unset-upstream',
    '--show-current',
  ])

  if (f.has('--show-current')) {
    if (current !== null) ctx.out.push(current)

    return
  }
  if (f.has('--set-upstream-to') || f.has('--unset-upstream')) {
    const name = rest[0] ?? current

    if (name === null) throw fail('fatal: HEAD does not point to a branch')
    if (own(repo.branches, name) === undefined) throw fail(`fatal: branch '${name}' does not exist`)
    if (f.has('--unset-upstream')) {
      if (repo.upstream !== undefined) forget(repo.upstream, name)

      return
    }

    const upstream = (values.get('--set-upstream-to') ?? '').replace(/^remotes\//, '')

    if (own(repo.tracking, upstream) === undefined)
      throw fail(`fatal: the requested upstream branch '${upstream}' does not exist`)
    setUpstream(repo, name, upstream)
    ctx.out.push(`branch '${name}' set up to track '${upstream}'.`)

    return
  }
  if (f.has('-d') || f.has('-D')) {
    if (rest.length === 0) throw fail('fatal: branch name required')
    for (const name of rest) {
      const id = own(repo.branches, name)

      if (id === undefined) throw fail(`error: branch '${name}' not found.`)
      if (current === name)
        throw fail(`error: Cannot delete branch '${name}' checked out at '~/repo'`)

      // Unida: en HEAD, o en la rama de origin que sigue (git avisa de que no está en HEAD).
      const upstream = upstreamOf(repo, name)
      const theirs = upstream === undefined ? undefined : own(repo.tracking, upstream)
      const inHead = isAncestor(repo.commits, id, headId(repo))
      const inUpstream = theirs !== undefined && isAncestor(repo.commits, id, theirs)

      // `-d --force` es `-D`.
      if (f.has('-d') && !f.has('-D') && !f.has('-f') && !inHead && !inUpstream) {
        throw fail(
          `error: The branch '${name}' is not fully merged.`,
          `If you are sure you want to delete it, run 'git branch -D ${name}'.`,
        )
      }
      if (!inHead && inUpstream && f.has('-d'))
        ctx.out.push(
          `warning: deleting branch '${name}' that has been merged to`,
          `         '${upstream ?? ''}', but not yet merged to HEAD.`,
        )
      forget(repo.branches, name)
      if (repo.upstream !== undefined) forget(repo.upstream, name)
      ctx.out.push(`Deleted branch ${name} (was ${id}).`)
    }

    return
  }
  if (f.has('-m')) {
    // `git branch -m nuevo` (la actual) o `git branch -m viejo nuevo`.
    const given = values.get('-m') ?? ''
    const [from, to] = rest[0] === undefined ? [current ?? '', given] : [given, rest[0]]
    const at = own(repo.branches, from)

    if (at === undefined) throw fail(`error: refname refs/heads/${from} not found`)
    safeRef(to, 'branch')
    if (own(repo.branches, to) !== undefined)
      throw fail(`fatal: a branch named '${to}' already exists`)
    forget(repo.branches, from)
    repo.branches[to] = at

    const upstream = upstreamOf(repo, from)

    if (upstream !== undefined && repo.upstream !== undefined) {
      forget(repo.upstream, from)
      setUpstream(repo, to, upstream)
    }
    if (current === from) repo.head = { kind: 'branch', name: to }

    return
  }
  if (f.has('-f')) {
    const [name, ref = 'HEAD'] = rest

    if (name === undefined) throw fail('fatal: branch name required')
    if (current === name) throw fail(`fatal: cannot force update the current branch.`)
    createBranch(ctx, name, ref, true)

    return
  }

  const [name, ref = 'HEAD'] = rest

  if (
    name === undefined ||
    f.has('--list') ||
    f.has('-a') ||
    f.has('-r') ||
    f.has('-v') ||
    f.has('-vv')
  ) {
    const verbose = (each: string, id: string): string => {
      if (!f.has('-v') && !f.has('-vv')) return each

      const upstream = upstreamOf(repo, each)

      return `${each} ${id}${f.has('-vv') && upstream !== undefined ? ` [${upstream}]` : ''} ${commitOf(repo, id).message}`
    }

    if (!f.has('-r')) {
      for (const [each, id] of Object.entries(repo.branches).sort(([a], [b]) => a.localeCompare(b)))
        ctx.out.push(`${current === each ? '*' : ' '} ${verbose(each, id)}`)
    }
    if (f.has('-a') || f.has('-r'))
      for (const each of Object.keys(repo.tracking).sort())
        ctx.out.push(`  ${f.has('-a') ? 'remotes/' : ''}${each}`)

    return
  }
  createBranch(ctx, name, ref)
}

/** `origin/x` → `x`, para crear la rama local que la sigue (`--track`). */
function trackOf(repo: Repo, ref: string): string {
  const name = ref.replace(/^remotes\//, '')

  if (!name.startsWith('origin/') || own(repo.tracking, name) === undefined)
    throw fail(`fatal: '${ref}' is not a valid remote-tracking branch`)

  return name.slice('origin/'.length)
}

/**
 * Al dejar un HEAD separado: si sus commits no están en ninguna rama ni tag,
 * git avisa de que se quedan atrás (y de cómo no perderlos).
 */
function leaving(repo: Repo, to: string): string[] {
  if (repo.head.kind !== 'detached' || repo.head.id === to) return []

  const from = repo.head.id
  const kept = new Set(
    [
      ...Object.values(repo.branches),
      ...Object.values(repo.tags),
      ...Object.values(repo.tracking),
    ].flatMap((id) => [...ancestors(repo.commits, id)]),
  )
  const lost = [...ancestors(repo.commits, from)].filter((id) => !kept.has(id))

  if (lost.length === 0) return [`Previous HEAD position was ${oneLine(repo, from)}`]

  const many = lost.length > 1

  return [
    `Warning: you are leaving ${lost.length} commit${many ? 's' : ''} behind, not connected to`,
    'any of your branches:',
    '',
    ...lost.slice(0, 5).map((id) => `  ${oneLine(repo, id)}`),
    '',
    `If you want to keep ${many ? 'them' : 'it'} by creating a new branch, this may be a good time`,
    'to do so with:',
    '',
    ` git branch <new-branch-name> ${from}`,
    '',
  ]
}

/** Lo que te llevas al cambiar de rama: `M  f.c` por cada fichero con cambios sin commit. */
function carried(repo: Repo): string[] {
  const tip = tipFiles(repo)

  return union(tip, repo.index)
    .sort()
    .flatMap((path) => {
      const index = repo.index[path]
      const work = own(repo.index, path) === undefined ? undefined : repo.work[path]

      if (index === tip[path] && work === index) return []

      const letter =
        tip[path] === undefined ? 'A' : index === undefined || work === undefined ? 'D' : 'M'

      return [`${letter}${TAB.slice(1)}${path}`]
    })
}

/** Cambia HEAD (a una rama o a un commit) llevándote tus cambios, si no chocan. */
function checkoutTo(
  repo: Repo,
  target: { branch: string } | { id: string },
  before = tipFiles(repo),
): void {
  const id = 'branch' in target ? (repo.branches[target.branch] ?? '') : target.id
  const after = commitOf(repo, id).files

  guard(repo, before, after, 'checkout')
  land(repo, before, after)
  // Para `git switch -`: la rama de la que vienes.
  if (repo.head.kind === 'branch' && !('branch' in target && target.branch === repo.head.name))
    repo.previous = repo.head.name
  repo.head =
    'branch' in target ? { kind: 'branch', name: target.branch } : { kind: 'detached', id }
}

function notWhileMerging(repo: Repo, verb: 'switch' | 'checkout'): void {
  if (repo.merging === null) return
  if (repo.merging.conflicts.length > 0)
    throw fail(
      'error: you need to resolve your current index first',
      ...repo.merging.conflicts.map((path) => `${path}: needs merge`),
    )
  if (verb === 'switch')
    throw fail(
      'fatal: cannot switch branch while merging',
      'Consider "git merge --quit" or "git worktree add".',
    )
}

type SwitchOptions = {
  create: string | null
  force: boolean
  detach: boolean
  track: boolean
  verb: 'switch' | 'checkout'
}

function switchTo(ctx: Ctx, args: string[], options: SwitchOptions): void {
  const { repo } = ctx.world

  notWhileMerging(repo, options.verb)

  // `--track origin/x`: crea x siguiendo a origin/x.
  const create =
    options.create ?? (options.track && args[0] !== undefined ? trackOf(repo, args[0]) : null)

  if (create !== null) {
    const start = args[0] ?? 'HEAD'
    const existed = own(repo.branches, create) !== undefined

    if (existed && !options.force) throw fail(`fatal: a branch named '${create}' already exists`)

    const id = tryResolve(ctx.world, start)

    if (id === null)
      throw options.verb === 'switch'
        ? fail(`fatal: invalid reference: ${start}`)
        : fail(
            `fatal: '${start}' is not a commit and a branch '${create}' cannot be created from it`,
          )

    // Se mira antes de crear la rama: si tus cambios chocan, no se crea nada.
    const before = tipFiles(repo)

    guard(repo, before, commitOf(repo, id).files, 'checkout')
    createBranch(ctx, create, start, existed)
    checkoutTo(repo, { branch: create }, before)
    ctx.out.push(
      ...carried(repo),
      existed ? `Switched to and reset branch '${create}'` : `Switched to a new branch '${create}'`,
    )

    return
  }

  let [target] = args

  if (target === undefined) {
    if (options.verb === 'switch') throw fail('fatal: missing branch or commit argument')
    ctx.out.push(...carried(repo), ...trackingLines(repo))

    return
  }
  if (target === '-') {
    // La rama de antes, como `cd -`.
    if (repo.previous === undefined || own(repo.branches, repo.previous) === undefined)
      throw fail('fatal: invalid reference: @{-1}')
    target = repo.previous
  }
  if (!options.detach && own(repo.branches, target) !== undefined) {
    if (repo.head.kind === 'branch' && repo.head.name === target) {
      ctx.out.push(`Already on '${target}'`, ...trackingLines(repo))

      return
    }

    const lines = leaving(repo, repo.branches[target] ?? '')

    checkoutTo(repo, { branch: target })
    ctx.out.push(
      ...lines,
      ...carried(repo),
      `Switched to branch '${target}'`,
      ...trackingLines(repo),
    )

    return
  }
  // Una rama de origin sin local: se crea la local que la sigue (como git).
  const remote = own(repo.tracking, `origin/${target}`)

  if (!options.detach && remote !== undefined) {
    guard(repo, tipFiles(repo), commitOf(repo, remote).files, 'checkout')
    createBranch(ctx, target, `origin/${target}`)
    checkoutTo(repo, { branch: target })
    ctx.out.push(...carried(repo), `Switched to a new branch '${target}'`)

    return
  }

  const id = tryResolve(ctx.world, target)

  if (id === null)
    throw options.verb === 'switch'
      ? fail(`fatal: invalid reference: ${target}`)
      : fail(MISS.known(target))
  // `git switch` solo va a ramas; para un commit suelto pide --detach.
  if (options.verb === 'switch' && !options.detach)
    throw fail(
      `fatal: a branch is expected, got ${kindOf(repo, target)} '${target}'`,
      'hint: If you want to detach HEAD at the commit, try again with the --detach option.',
    )

  const lines = leaving(repo, id)
  const attached = repo.head.kind === 'branch'

  checkoutTo(repo, { id })
  ctx.out.push(...lines, ...carried(repo))
  if (options.verb === 'checkout' && attached)
    ctx.out.push(
      `Note: switching to '${target}'.`,
      '',
      "You are in 'detached HEAD' state. You can look around, make experimental changes and commit them, and you can discard any commits you make in this state without impacting any branches by switching back to a branch.",
      '',
      'If you want to create a new branch to retain commits you create, you may do so (now or later) by using -c with the switch command. Example:',
      '',
      '  git switch -c <new-branch-name>',
      '',
    )
  ctx.out.push(`HEAD is now at ${oneLine(repo, id)}`)
}

function gitSwitch(ctx: Ctx, args: string[]): void {
  const parsed = flags('switch', args)

  only('switch', parsed.flags, ['-c', '-C', '--detach', '--track', '-q'])
  switchTo(ctx, parsed.rest, {
    create: parsed.values.get('-c') ?? parsed.values.get('-C') ?? null,
    force: parsed.flags.has('-C'),
    detach: parsed.flags.has('--detach'),
    track: parsed.flags.has('--track'),
    verb: 'switch',
  })
}

/** `git checkout`: cambiar de rama, o (con ficheros) deshacer cambios como `restore`. */
function checkout(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const parsed = flags('checkout', args)
  const { rest } = parsed
  const dash = rest.indexOf('--')
  const isFile = (word: string | undefined): boolean =>
    word !== undefined &&
    (own(repo.index, word) !== undefined ||
      Object.keys(repo.index).some((path) => path.startsWith(`${word}/`)) ||
      ALL_PATHS.has(word))
  const updated = (paths: string[], from: string): void => {
    ctx.out.push(`Updated ${paths.length} path${paths.length === 1 ? '' : 's'} from ${from}`)
  }

  only('checkout', parsed.flags, ['-b', '-B', '--detach', '--track', '-f', '-q'])

  // `checkout -- f`, `checkout ref -- f`, `checkout f` y `checkout ref f`.
  const onlyFiles =
    rest.length > 0 && rest.every(isFile) && own(repo.branches, rest[0] ?? '') === undefined

  if (dash >= 0 || onlyFiles) {
    const before = dash >= 0 ? rest.slice(0, dash) : []
    const specs = dash >= 0 ? rest.slice(dash + 1) : rest
    const source = before[0] ?? null

    updated(
      restore(ctx, specs, { staged: source !== null, worktree: true, source }),
      source === null ? 'the index' : resolve(ctx.world, source),
    )

    return
  }
  if (
    rest.length === 2 &&
    isFile(rest[1]) &&
    parsed.values.get('-b') === undefined &&
    tryResolve(ctx.world, rest[0] ?? '') !== null
  ) {
    updated(
      restore(ctx, rest.slice(1), { staged: true, worktree: true, source: rest[0] ?? null }),
      resolve(ctx.world, rest[0] ?? 'HEAD'),
    )

    return
  }
  switchTo(ctx, rest, {
    create: parsed.values.get('-b') ?? parsed.values.get('-B') ?? null,
    force: parsed.values.get('-B') !== undefined,
    detach: parsed.flags.has('--detach'),
    track: parsed.flags.has('--track'),
    verb: 'checkout',
  })
}

/** El mensaje que git propone para un merge: «Merge branch 'feature'» (y « into develop» fuera de main). */
function mergeMessage(repo: Repo, ref: string): string {
  const kind = kindOf(repo, ref)
  const what =
    kind === 'branch'
      ? `branch '${ref}'`
      : kind === 'remote branch'
        ? `remote-tracking branch '${ref}'`
        : kind === 'tag'
          ? `tag '${ref}'`
          : `commit '${ref}'`
  const into =
    repo.head.kind === 'branch' && !['main', 'master'].includes(repo.head.name)
      ? ` into ${repo.head.name}`
      : ''

  return `Merge ${what}${into}`
}

function merge(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags('merge', args)

  only('merge', f, [
    '--no-ff',
    '--ff',
    '--ff-only',
    '--abort',
    '--continue',
    '-m',
    '--no-edit',
    '-q',
  ])
  if (f.has('--abort')) {
    if (repo.merging === null) throw fail('fatal: There is no merge to abort (MERGE_HEAD missing).')
    repo.merging = null
    settle(repo)

    return
  }
  if (f.has('--continue')) {
    if (repo.merging === null)
      throw fail('fatal: There is no merge in progress (MERGE_HEAD missing).')
    commit(ctx, [])

    return
  }
  if (repo.merging !== null)
    throw fail(
      'fatal: You have not concluded your merge (MERGE_HEAD exists).',
      'Please, commit your changes before you merge.',
    )

  // Sin nombre, git une la rama de origin que sigues.
  const ref =
    rest[0] ?? (repo.head.kind === 'branch' ? upstreamOf(repo, repo.head.name) : undefined)

  if (ref === undefined) throw fail('fatal: No remote for the current branch.')
  if (rest.length > 1)
    throw sandbox('de una en una: git merge rama (aquí no hay merges de varias ramas a la vez)')

  const theirs = tryResolve(ctx.world, ref)

  if (theirs === null) throw fail(`merge: ${ref} - not something we can merge`)

  const ours = headId(repo)
  const oursFiles = commitOf(repo, ours).files
  const theirsFiles = commitOf(repo, theirs).files

  if (isAncestor(repo.commits, theirs, ours)) {
    ctx.out.push('Already up to date.')

    return
  }
  if (isAncestor(repo.commits, ours, theirs) && !f.has('--no-ff')) {
    guard(repo, oursFiles, theirsFiles, 'merge')
    land(repo, oursFiles, theirsFiles)
    setHeadTo(repo, theirs)
    ctx.out.push(`Updating ${ours}..${theirs}`, 'Fast-forward', ...diffstat(oursFiles, theirsFiles))

    return
  }
  if (f.has('--ff-only')) throw fail('fatal: Not possible to fast-forward, aborting.')

  // Un merge de verdad no empieza con cosas preparadas: no sabría qué es de quién.
  const staged = stagedPaths(repo)

  if (staged.length > 0)
    throw fail(
      'error: Your local changes to the following files would be overwritten by merge:',
      ...staged.map((path) => `${TAB}${path}`),
      'Please commit your changes or stash them before you merge.',
      'Aborting',
    )

  const base = mergeBase(repo.commits, ours, theirs)
  const baseFiles = base === null ? {} : commitOf(repo, base).files
  const result = threeWay(baseFiles, oursFiles, theirsFiles, ref)
  const message = values.get('-m') ?? mergeMessage(repo, ref)

  guard(repo, oursFiles, result.files, 'merge')
  land(repo, oursFiles, result.files)
  if (result.conflicts.length > 0) {
    repo.merging = { theirs, conflicts: result.conflicts, message }
    for (const path of changedPaths(oursFiles, result.files).filter(
      (each) => baseFiles[each] !== oursFiles[each] && baseFiles[each] !== theirsFiles[each],
    ))
      ctx.out.push(`Auto-merging ${path}`)
    for (const path of result.conflicts)
      ctx.out.push(
        baseFiles[path] === undefined
          ? `CONFLICT (add/add): Merge conflict in ${path}`
          : oursFiles[path] === undefined || theirsFiles[path] === undefined
            ? `CONFLICT (modify/delete): ${path} deleted in one branch and modified in the other.`
            : `CONFLICT (content): Merge conflict in ${path}`,
      )
    ctx.out.push('Automatic merge failed; fix conflicts and then commit the result.')

    return
  }

  const made = makeCommit(repo, [ours, theirs], message, result.files)

  setHeadTo(repo, made.id)
  ctx.out.push("Merge made by the 'ort' strategy.", ...diffstat(oursFiles, result.files))
}

/** Rebase y pull --rebase necesitan tus ficheros seguidos sin cambios (como git). */
function cleanForRebase(repo: Repo, verb: string): void {
  if (stagedPaths(repo).length > 0)
    throw fail(
      `error: cannot ${verb}: Your index contains uncommitted changes.`,
      'error: Please commit or stash them.',
    )
  if (unstagedPaths(repo).length > 0)
    throw fail(
      `error: cannot ${verb}: You have unstaged changes.`,
      'error: Please commit or stash them.',
    )
}

function rebase(ctx: Ctx, args: string[], verb = 'rebase'): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('rebase', args)

  if (f.has('-i') || f.has('--interactive'))
    throw sandbox(
      'el rebase interactivo no está en este simulador: para juntar commits, git reset --soft',
    )
  // Aquí un rebase nunca se queda a medias: no hay nada que continuar.
  if (f.has('--abort') || f.has('--continue') || f.has('--skip'))
    throw fail('fatal: No rebase in progress?')
  only('rebase', f, ['-q'])

  const [given, which] = rest

  // `git rebase main feature` = `git switch feature` + `git rebase main`.
  if (which !== undefined)
    switchTo(ctx, [which], {
      create: null,
      force: false,
      detach: false,
      track: false,
      verb: 'switch',
    })

  const name = repo.head.kind === 'branch' ? repo.head.name : null
  const ref = given ?? (name === null ? undefined : upstreamOf(repo, name))

  if (ref === undefined)
    throw fail(
      'fatal: There is no tracking information for the current branch.',
      'Please specify which branch you want to rebase against.',
    )
  cleanForRebase(repo, verb)

  const onto = tryResolve(ctx.world, ref)

  if (onto === null) throw fail(`fatal: invalid upstream '${ref}'`)

  const ours = headId(repo)
  const before = tipFiles(repo)
  const updated =
    name === null
      ? 'Successfully rebased and updated detached HEAD.'
      : `Successfully rebased and updated refs/heads/${name}.`

  if (isAncestor(repo.commits, onto, ours)) {
    ctx.out.push(name === null ? 'HEAD is up to date.' : `Current branch ${name} is up to date.`)

    return
  }
  if (isAncestor(repo.commits, ours, onto)) {
    // Nada propio que copiar: se avanza.
    guard(repo, before, commitOf(repo, onto).files, 'checkout')
    land(repo, before, commitOf(repo, onto).files)
    setHeadTo(repo, onto)
    ctx.out.push(name === null ? updated : `Fast-forwarded ${name} to ${ref}.`)

    return
  }

  const already = ancestors(repo.commits, onto)
  // Los commits propios (no en `onto`), del más viejo al más nuevo, sin merges (git los deja fuera).
  const mine = [...ancestors(repo.commits, ours)]
    .filter((id) => !already.has(id) && commitOf(repo, id).parents.length <= 1)
    .sort((a, b) => (isAncestor(repo.commits, a, b) ? -1 : isAncestor(repo.commits, b, a) ? 1 : 0))
  let tip = onto

  for (const id of mine) {
    const original = commitOf(repo, id)
    const result = replay(repo, id, tip)

    if (result.conflicts.length > 0)
      throw sandbox(
        `el rebase choca en ${result.conflicts.join(', ')} al copiar ${id} («${original.message}»). Aquí un rebase no se queda a medias, así que no ha cambiado nada: une con git merge, o arregla antes el choque`,
      )

    const parent =
      original.parents[0] === undefined ? {} : commitOf(repo, original.parents[0]).files

    // Lo que ya está en `onto` (el mismo cambio) no se copia dos veces, como en git.
    if (sameFiles(result.files, commitOf(repo, tip).files) && !sameFiles(parent, original.files)) {
      ctx.out.push(`dropping ${oneLine(repo, id)} -- patch contents already upstream`)
      continue
    }
    tip = makeCommit(repo, [tip], original.message, result.files, copyId(repo, id)).id
  }

  guard(repo, before, commitOf(repo, tip).files, 'checkout')
  land(repo, before, commitOf(repo, tip).files)
  setHeadTo(repo, tip)
  ctx.out.push(updated)
}

/** cherry-pick y revert: sin cosas preparadas y sin un merge a medias. */
function readyToPick(repo: Repo, op: 'cherry-pick' | 'revert'): void {
  if (repo.merging !== null || stagedPaths(repo).length > 0)
    throw fail(
      `error: your local changes would be overwritten by ${op}.`,
      'hint: commit your changes or stash them to proceed.',
      `fatal: ${op} failed`,
    )
}

function cherryPick(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('cherry-pick', args)

  only('cherry-pick', f, ['-x', '--no-edit'])
  readyToPick(repo, 'cherry-pick')
  if (rest.length === 0) throw fail('fatal: empty commit set passed')

  for (const ref of rest) {
    const id = tryResolve(ctx.world, ref)

    if (id === null) throw fail(`fatal: bad revision '${ref}'`)

    const original = commitOf(repo, id)

    if (original.parents.length > 1)
      throw fail(
        `error: commit ${id} is a merge but no -m option was given.`,
        'fatal: cherry-pick failed',
      )

    const before = tipFiles(repo)
    const result = replay(repo, id, headId(repo))

    if (result.conflicts.length > 0)
      throw sandbox(
        `el cherry-pick de ${id} choca en ${result.conflicts.join(', ')}. Aquí no se queda a medias, así que no ha cambiado nada: arregla antes el choque`,
      )
    if (sameFiles(result.files, before))
      throw fail(
        'The previous cherry-pick is now empty, possibly due to conflict resolution.',
        'If you wish to commit it anyway, use:',
        '',
        '    git commit --allow-empty',
      )
    guard(repo, before, result.files, 'cherry-pick')
    land(repo, before, result.files)

    const made = makeCommit(repo, [headId(repo)], original.message, result.files, copyId(repo, id))

    setHeadTo(repo, made.id)
    ctx.out.push(`[${where(repo)} ${made.id}] ${made.message}`, ...commitStats(before, made.files))
  }
}

function reset(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('reset', args)

  only('reset', f, ['--soft', '--mixed', '--hard', '-q'])

  // `git reset HEAD f`, `git reset f` y `git reset -- f`: sacar del índice.
  const dash = rest.indexOf('--')
  const first = rest[0]
  const paths =
    dash >= 0
      ? rest.slice(dash + 1)
      : first !== undefined && tryResolve(ctx.world, first) === null
        ? rest
        : rest.slice(1)

  if (paths.length > 0) {
    if (f.has('--hard')) throw fail('fatal: Cannot do hard reset with paths.')
    if (f.has('--soft')) throw fail('fatal: Cannot do soft reset with paths.')
    restore(ctx, paths, {
      staged: true,
      worktree: false,
      source: dash === 0 || paths === rest ? 'HEAD' : (first ?? 'HEAD'),
    })
    ctx.out.push(...unstagedAfterReset(repo))

    return
  }
  if (f.has('--soft') && repo.merging !== null)
    throw fail('fatal: Cannot do a soft reset in the middle of a merge.')

  const target = resolve(ctx.world, first ?? 'HEAD')
  const files = commitOf(repo, target).files

  if (f.has('--hard')) {
    // Lo que git no sigue se queda; lo seguido vuelve a como estaba en ese commit.
    const untracked = Object.fromEntries(
      Object.entries(repo.work).filter(([path]) => own(repo.index, path) === undefined),
    )

    repo.index = { ...files }
    repo.work = { ...untracked, ...files }
  } else if (!f.has('--soft')) repo.index = { ...files }
  setHeadTo(repo, target)
  repo.merging = null
  if (f.has('--hard')) ctx.out.push(`HEAD is now at ${oneLine(repo, target)}`)
  else if (!f.has('--soft')) ctx.out.push(...unstagedAfterReset(repo))
}

function revert(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('revert', args)

  only('revert', f, ['--no-edit'])
  readyToPick(repo, 'revert')
  if (rest.length === 0) throw fail('fatal: empty commit set passed')

  // Varios a la vez: uno detrás de otro, como git.
  for (const ref of rest) {
    const id = tryResolve(ctx.world, ref)

    if (id === null) throw fail(`fatal: bad revision '${ref}'`)

    const target = commitOf(repo, id)

    if (target.parents.length > 1)
      throw fail(
        `error: commit ${id} is a merge but no -m option was given.`,
        'fatal: revert failed',
      )

    const before = tipFiles(repo)
    const parent = target.parents[0] === undefined ? {} : commitOf(repo, target.parents[0]).files
    // Lo contrario de lo que hizo: de su foto a la de su padre.
    const result = threeWay(target.files, before, parent, `parent of ${id}`)

    if (result.conflicts.length > 0)
      throw sandbox(
        `deshacer ${id} choca en ${result.conflicts.join(', ')}. Aquí no se queda a medias, así que no ha cambiado nada: arregla antes el choque`,
      )
    if (sameFiles(result.files, before)) throw fail(...statusLines(repo))
    guard(repo, before, result.files, 'revert')
    land(repo, before, result.files)

    const made = makeCommit(repo, [headId(repo)], `Revert "${target.message}"`, result.files)

    setHeadTo(repo, made.id)
    ctx.out.push(`[${where(repo)} ${made.id}] ${made.message}`, ...commitStats(before, made.files))
  }
}

function tag(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('tag', args)

  // Un tag anotado (`-a … -m`) se guarda como uno ligero: aquí solo importa a qué commit apunta.
  only('tag', f, ['-a', '-m', '-d', '-f', '-l', '--list', '-n'])

  const [name, ref = 'HEAD'] = rest

  if (f.has('-d')) {
    if (rest.length === 0) throw fail('fatal: tag name required')
    for (const each of rest) {
      const id = own(repo.tags, each)

      if (id === undefined) throw fail(`error: tag '${each}' not found.`)
      forget(repo.tags, each)
      ctx.out.push(`Deleted tag '${each}' (was ${id})`)
    }

    return
  }
  if (name === undefined || f.has('-l') || f.has('--list')) {
    for (const each of Object.keys(repo.tags).sort()) ctx.out.push(each)

    return
  }
  safeRef(name, 'tag')

  const old = own(repo.tags, name)

  if (old !== undefined && !f.has('-f')) throw fail(`fatal: tag '${name}' already exists`)

  const id = tryResolve(ctx.world, ref)

  if (id === null) throw fail(`fatal: Failed to resolve '${ref}' as a valid ref.`)
  repo.tags[name] = id
  if (old !== undefined && old !== id) ctx.out.push(`Updated tag '${name}' (was ${old})`)
}

/** `stash@{1}` o `1` → 1; sin nada, 0. */
function stashIndex(repo: Repo, word: string | undefined): number {
  if (repo.stash.length === 0) throw fail('error: No stash entries found.')

  const n =
    word === undefined
      ? 0
      : Number(/^(?:stash@\{(\d+)\}|(\d+))$/.exec(word)?.slice(1).find(Boolean) ?? NaN)

  if (!Number.isInteger(n) || repo.stash[n] === undefined)
    throw fail(`error: ${word ?? 'stash@{0}'} is not a valid reference`)

  return n
}

/** Lo de una entrada del stash sobre lo que tienes ahora: como un merge de tres vías. */
function applyStash(ctx: Ctx, entry: StashEntry): string[] {
  const { repo } = ctx.world
  const tip = tipFiles(repo)
  const base =
    entry.base !== undefined && own(repo.commits, entry.base) !== undefined
      ? commitOf(repo, entry.base).files
      : tip
  const changed = changedPaths(base, entry.work)
  const blocked = changed.filter(
    (path) =>
      (repo.work[path] !== tip[path] || repo.index[path] !== tip[path]) &&
      repo.work[path] !== entry.work[path],
  )

  if (blocked.length > 0)
    throw fail(
      'error: Your local changes to the following files would be overwritten by merge:',
      ...blocked.map((path) => `${TAB}${path}`),
      'Please commit your changes or stash them before you merge.',
      'Aborting',
    )

  const untracked = Object.keys(entry.untracked ?? {}).filter(
    (path) => own(repo.work, path) !== undefined,
  )

  if (untracked.length > 0)
    throw fail(
      ...untracked.map((path) => `${path} already exists, no checkout`),
      'error: could not restore untracked files from stash',
    )

  const conflicts: string[] = []

  for (const path of changed) {
    if (tip[path] === base[path] || tip[path] === entry.work[path]) {
      copyPath(repo.work, entry.work, path)
      // Un fichero nuevo vuelve preparado (git tiene que seguirlo); los demás, sin preparar.
      if (base[path] === undefined && own(entry.index, path) !== undefined)
        copyPath(repo.index, entry.work, path)
    } else {
      conflicts.push(path)
      repo.work[path] =
        `<<<<<<< Updated upstream\n${tip[path] ?? ''}\n=======\n${entry.work[path] ?? ''}\n>>>>>>> Stashed changes`
    }
  }
  for (const [path, content] of Object.entries(entry.untracked ?? {})) repo.work[path] = content

  return conflicts
}

function stash(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags('stash', args)
  const [action = 'push', ...more] = rest

  only('stash', f, ['-m', '-u', '-q', '--index'])

  switch (action) {
    case 'list':
      repo.stash.forEach((entry, index) =>
        ctx.out.push(`stash@{${index}}: ${entry.message ?? 'WIP'}`),
      )

      return
    case 'show': {
      const entry = repo.stash[stashIndex(repo, more[0])]
      const base =
        entry?.base !== undefined && own(repo.commits, entry.base) !== undefined
          ? commitOf(repo, entry.base).files
          : {}

      ctx.out.push(...diffstat(base, entry?.work ?? {}))

      return
    }
    case 'drop': {
      const index = stashIndex(repo, more[0])

      repo.stash.splice(index, 1)
      ctx.out.push(`Dropped refs/stash@{${index}}`)

      return
    }
    case 'clear':
      repo.stash = []

      return
    case 'pop':
    case 'apply': {
      const index = stashIndex(repo, more[0])
      const entry = repo.stash[index]

      if (entry === undefined) throw fail('error: No stash entries found.')
      if (repo.merging !== null) throw fail('error: Cannot apply a stash in the middle of a merge')

      const conflicts = applyStash(ctx, entry)

      if (conflicts.length > 0) {
        for (const path of conflicts)
          ctx.out.push(`Auto-merging ${path}`, `CONFLICT (content): Merge conflict in ${path}`)
        // Con conflictos git no lo tira: lo guarda por si hace falta otra vez.
        if (action === 'pop') ctx.out.push('The stash entry is kept in case you need it again.')

        return
      }
      ctx.out.push(...statusLines(repo))
      if (action === 'pop') {
        repo.stash.splice(index, 1)
        ctx.out.push(`Dropped refs/stash@{${index}}`)
      }

      return
    }
    case 'push':
    case 'save': {
      const { staged, unstaged, untracked } = fileStates(repo)
      const withUntracked = f.has('-u')

      if (staged.length + unstaged.length === 0 && !(withUntracked && untracked.length > 0))
        throw fail('No local changes to save')

      const given =
        values.get('-m') ?? (action === 'save' && more.length > 0 ? more.join(' ') : null)
      const at = repo.head.kind === 'branch' ? repo.head.name : '(no branch)'
      const message =
        given === null ? `WIP on ${at}: ${oneLine(repo, headId(repo))}` : `On ${at}: ${given}`
      const tracked = Object.fromEntries(
        Object.entries(repo.work).filter(([path]) => own(repo.index, path) !== undefined),
      )
      const entry: StashEntry = {
        base: headId(repo),
        index: { ...repo.index },
        work: tracked,
        message,
      }

      if (withUntracked)
        entry.untracked = Object.fromEntries(untracked.map((path) => [path, repo.work[path] ?? '']))
      repo.stash.unshift(entry)
      // Lo que no sigue git se queda en tu carpeta (salvo con -u).
      if (withUntracked) for (const path of untracked) forget(repo.work, path)
      settle(repo)
      ctx.out.push(`Saved working directory and index state ${message}`)

      return
    }
    default:
      throw fail(`error: unknown subcommand: \`${action}'`)
  }
}

// --- Remoto ------------------------------------------------------------------

function mustRemote(world: World): Remote {
  if (world.remote === null)
    throw fail(
      "fatal: 'origin' does not appear to be a git repository",
      'fatal: Could not read from remote repository.',
    )

  return world.remote
}

/** Una línea de `fetch` o `push`: ` * [new branch]      login      -> origin/login`. */
const refLine = (flag: string, summary: string, from: string, to: string): string =>
  `${flag}${summary.padEnd(17)} ${from.padEnd(10)} -> ${to}`

/** Lo que dice git de cómo se ha movido una rama: `c1..c3`, o `c2...c4` si se forzó. */
function moved(commits: Record<string, Commit>, old: string, id: string): [string, string] {
  return isAncestor(commits, old, id) ? ['   ', `${old}..${id}`] : [' + ', `${old}...${id}`]
}

function fetch(ctx: Ctx, args: string[] = []): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  const lines: string[] = []

  for (const [id, each] of Object.entries(remote.commits)) {
    if (own(repo.commits, id) === undefined) repo.commits[id] = clone(each)
  }
  for (const [name, id] of Object.entries(remote.branches).sort(([a], [b]) => a.localeCompare(b))) {
    const key = `origin/${name}`
    const old = own(repo.tracking, key)

    if (old === id) continue
    if (old === undefined) lines.push(refLine(' * ', '[new branch]', name, key))
    else {
      const [flag, summary] = moved(repo.commits, old, id)

      lines.push(`${refLine(flag, summary, name, key)}${flag === ' + ' ? '  (forced update)' : ''}`)
    }
    repo.tracking[key] = id
  }
  // Las ramas que se han borrado en origin solo desaparecen aquí con --prune, como en git.
  if (args.includes('-p')) {
    for (const key of Object.keys(repo.tracking)) {
      if (own(remote.branches, key.slice('origin/'.length)) === undefined) {
        lines.push(refLine(' - ', '[deleted]', '(none)', key))
        forget(repo.tracking, key)
      }
    }
  }
  for (const [name, id] of Object.entries(remote.tags)) {
    if (own(repo.tags, name) !== undefined) continue
    repo.tags[name] = id
    lines.push(refLine(' * ', '[new tag]', name, name))
  }
  if (lines.length > 0) ctx.out.push(`From ${REMOTE_URL}`, ...lines)
}

const DIVERGENT = [
  'hint: You have divergent branches and need to specify how to reconcile them.',
  'hint: You can do so by running one of the following commands sometime before',
  'hint: your next pull:',
  'hint:',
  'hint:   git config pull.rebase false  # merge',
  'hint:   git config pull.rebase true   # rebase',
  'hint:   git config pull.ff only       # fast-forward only',
  'hint:',
  'hint: You can replace "git config" with "git config --global" to set a default',
  'hint: preference for all repositories. You can also pass --rebase, --no-rebase,',
  'hint: or --ff-only on the command line to override the configured default per',
  'hint: invocation.',
  'fatal: Need to specify how to reconcile divergent branches.',
]

function pull(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags('pull', args)

  only('pull', f, ['--rebase', '--no-rebase', '--ff-only', '--no-ff', '--ff', '-q'])
  if (repo.head.kind !== 'branch')
    throw fail(
      'You are not currently on a branch.',
      'Please specify which branch you want to merge with.',
      'See git-pull(1) for details.',
      '',
      '    git pull <remote> <branch>',
    )
  if (rest[0] !== undefined && rest[0] !== 'origin') {
    throw fail(
      `fatal: '${rest[0]}' does not appear to be a git repository`,
      'fatal: Could not read from remote repository.',
    )
  }

  const current = repo.head.name

  fetch(ctx)

  // `git pull origin main` trae main a la rama en la que estés; sin nombre, la que sigues.
  const named = rest[1]
  const upstream = named === undefined ? upstreamOf(repo, current) : `origin/${named}`

  if (upstream === undefined)
    throw fail(
      'There is no tracking information for the current branch.',
      'Please specify which branch you want to merge with.',
      'See git-pull(1) for details.',
      '',
      '    git pull <remote> <branch>',
      '',
      'If you wish to set tracking information for this branch you can do so with:',
      '',
      `    git branch --set-upstream-to=origin/<branch> ${current}`,
    )

  const theirs = own(repo.tracking, upstream)

  if (theirs === undefined)
    throw fail(
      named === undefined
        ? `Your configuration specifies to merge with the ref 'refs/heads/${upstream.slice('origin/'.length)}' from the remote, but no such ref was fetched.`
        : `fatal: couldn't find remote ref ${named}`,
    )

  const ours = headId(repo)
  const configured = configOf(repo, 'pull.rebase')
  const mode = f.has('--rebase')
    ? 'rebase'
    : f.has('--ff-only')
      ? 'ff-only'
      : f.has('--no-rebase') || f.has('--ff') || f.has('--no-ff')
        ? 'merge'
        : configured === 'true'
          ? 'rebase'
          : configured === 'false'
            ? 'merge'
            : configOf(repo, 'pull.ff') === 'only'
              ? 'ff-only'
              : configOf(repo, 'pull.ff') !== undefined
                ? 'merge'
                : 'ask'
  const diverged =
    !isAncestor(repo.commits, theirs, ours) && !isAncestor(repo.commits, ours, theirs)

  // Desde git 2.33, si las ramas se han separado hay que decir cómo unirlas.
  if (mode === 'ask' && diverged) throw fail(...DIVERGENT)
  if (mode === 'rebase') {
    rebase(ctx, [upstream], 'pull with rebase')

    return
  }

  const branchName = upstream.slice('origin/'.length)
  const into = ['main', 'master'].includes(current) ? '' : ` into ${current}`

  merge(ctx, [
    ...(mode === 'ff-only' ? ['--ff-only'] : []),
    ...(f.has('--no-ff') ? ['--no-ff'] : []),
    '-m',
    `Merge branch '${branchName}' of ${REMOTE_URL}${into}`,
    upstream,
  ])
}

type Pushed = {
  line: string
  rejected: 'fetch first' | 'non-fast-forward' | 'stale info' | null
  /** La rama protegida que se ha negado, si es eso. */
  locked: string | null
}

/** Sube el commit `id` a la rama (o el tag) `name` de origin, si se puede. */
function pushRef(
  ctx: Ctx,
  remote: Remote,
  source: string,
  id: string,
  name: string,
  options: { force: boolean; lease: boolean; tag: boolean },
): Pushed {
  const { repo } = ctx.world
  const theirs = options.tag ? own(remote.tags, name) : own(remote.branches, name)
  const arrow = `${source} -> ${name}`

  if (theirs === id) return { line: '', rejected: null, locked: null }
  if (theirs !== undefined && options.tag && !options.force)
    return {
      line: ` ! [rejected]        ${arrow} (already exists)`,
      rejected: 'non-fast-forward',
      locked: null,
    }
  if (theirs !== undefined && !options.tag) {
    const known = own(repo.commits, theirs) !== undefined
    const ahead = known && isAncestor(repo.commits, theirs, id)

    if (options.lease && own(repo.tracking, `origin/${name}`) !== theirs)
      return {
        line: ` ! [rejected]        ${arrow} (stale info)`,
        rejected: 'stale info',
        locked: null,
      }
    if (!ahead && !options.force && !options.lease)
      return {
        line: ` ! [rejected]        ${arrow} (${known ? 'non-fast-forward' : 'fetch first'})`,
        rejected: known ? 'non-fast-forward' : 'fetch first',
        locked: null,
      }
  }
  if (!options.tag && remote.locked.includes(name))
    return {
      line: ` ! [remote rejected] ${arrow} (protected branch hook declined)`,
      rejected: null,
      locked: name,
    }

  for (const each of ancestors(repo.commits, id))
    remote.commits[each] ??= clone(commitOf(repo, each))
  if (options.tag) remote.tags[name] = id
  else {
    remote.branches[name] = id
    repo.tracking[`origin/${name}`] = id
  }
  if (theirs === undefined)
    return {
      line: refLine(' * ', options.tag ? '[new tag]' : '[new branch]', source, name).replace(
        / +-> /,
        ' -> ',
      ),
      rejected: null,
      locked: null,
    }

  const [flag, summary] = moved(repo.commits, theirs, id)

  return {
    line: `${flag}${summary}  ${arrow}${flag === ' + ' ? ' (forced update)' : ''}`,
    rejected: null,
    locked: null,
  }
}

const HINTS: Record<'fetch first' | 'non-fast-forward' | 'stale info', string[]> = {
  'fetch first': [
    'hint: Updates were rejected because the remote contains work that you do not',
    'hint: have locally. This is usually caused by another repository pushing to',
    'hint: the same ref. If you want to integrate the remote changes, use',
    "hint: 'git pull' before pushing again.",
  ],
  'non-fast-forward': [
    'hint: Updates were rejected because the tip of your current branch is behind',
    'hint: its remote counterpart. If you want to integrate the remote changes,',
    "hint: use 'git pull' before pushing again.",
  ],
  'stale info': [],
}

function push(ctx: Ctx, args: string[]): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  const { flags: f, rest } = flags('push', args)

  only('push', f, [
    '-u',
    '--force',
    '--force-with-lease',
    '--tags',
    '--all',
    '--delete',
    '-d',
    '-q',
  ])
  if (rest[0] !== undefined && rest[0] !== 'origin')
    throw fail(
      `fatal: '${rest[0]}' does not appear to be a git repository`,
      'fatal: Could not read from remote repository.',
    )

  const named = rest.slice(1)
  const current = repo.head.kind === 'branch' ? repo.head.name : null
  const options = { force: f.has('--force'), lease: f.has('--force-with-lease'), tag: false }
  const results: Pushed[] = []
  const tracked: [string, string][] = []

  if (f.has('--delete') || f.has('-d') || named.some((spec) => spec.startsWith(':'))) {
    for (const spec of named) {
      const name = spec.replace(/^:/, '')

      if (own(remote.branches, name) === undefined)
        throw fail(
          `error: unable to delete '${name}': remote ref does not exist`,
          `error: failed to push some refs to '${REMOTE_URL}'`,
        )
      if (remote.locked.includes(name))
        throw fail(
          'remote: error: GH006: Protected branch update failed for refs/heads/' + name + '.',
          `To ${REMOTE_URL}`,
          ` ! [remote rejected] ${name} (protected branch hook declined)`,
          `error: failed to push some refs to '${REMOTE_URL}'`,
        )
      forget(remote.branches, name)
      forget(repo.tracking, `origin/${name}`)
      results.push({
        line: refLine(' - ', '[deleted]', name, '').replace(/ +-> $/, ''),
        rejected: null,
        locked: null,
      })
    }
  } else {
    // Qué se sube: lo que se nombra, todas las ramas (--all), los tags (--tags) o la rama actual.
    const specs: { source: string; id: string; name: string; tag: boolean }[] = []

    if (f.has('--all'))
      for (const [name, id] of Object.entries(repo.branches).sort(([a], [b]) => a.localeCompare(b)))
        specs.push({ source: name, id, name, tag: false })
    for (const spec of named) {
      // `HEAD` es la rama actual; `local:remota` sube con otro nombre; un tag sube como tag.
      const [rawLocal = '', rawName] = spec.split(':')
      const local = rawLocal === 'HEAD' ? current : rawLocal

      if (local === null)
        throw fail(
          'fatal: You are not currently on a branch.',
          'To push the history leading to the current (detached HEAD)',
          'state now, use',
          '',
          '    git push origin HEAD:<name-of-remote-branch>',
        )

      const branchId = own(repo.branches, local)
      const tagId = own(repo.tags, local)
      const id =
        branchId ??
        tagId ??
        (rawName === undefined ? undefined : (tryResolve(ctx.world, local) ?? undefined))

      if (id === undefined)
        throw fail(
          `error: src refspec ${local} does not match any`,
          `error: failed to push some refs to '${REMOTE_URL}'`,
        )

      const name = rawName === undefined || rawName === '' ? local : rawName

      safeRef(name, 'branch')
      specs.push({
        source: rawLocal === 'HEAD' ? 'HEAD' : local,
        id,
        name,
        tag: branchId === undefined && tagId !== undefined,
      })
    }
    if (named.length === 0 && !f.has('--all') && !f.has('--tags')) {
      if (current === null)
        throw fail(
          'fatal: You are not currently on a branch.',
          'To push the history leading to the current (detached HEAD)',
          'state now, use',
          '',
          '    git push origin HEAD:<name-of-remote-branch>',
        )

      const upstream = upstreamOf(repo, current)
      const auto = configOf(repo, 'push.autoSetupRemote') === 'true'

      // push.default=simple: sin upstream (o con otro nombre) git no adivina adónde subir.
      if (upstream === undefined && !f.has('-u') && !auto)
        throw fail(
          `fatal: The current branch ${current} has no upstream branch.`,
          'To push the current branch and set the remote as upstream, use',
          '',
          `    git push --set-upstream origin ${current}`,
          '',
          'To have this happen automatically for branches without a tracking',
          "upstream, see 'push.autoSetupRemote' in 'git help config'.",
        )
      if (upstream !== undefined && upstream !== `origin/${current}`)
        throw fail(
          'fatal: The upstream branch of your current branch does not match',
          'the name of your current branch.',
        )
      if (upstream === undefined && !f.has('-u')) tracked.push([current, `origin/${current}`])
      specs.push({ source: current, id: repo.branches[current] ?? '', name: current, tag: false })
    }
    if (f.has('--tags'))
      for (const [name, id] of Object.entries(repo.tags).sort(([a], [b]) => a.localeCompare(b)))
        specs.push({ source: name, id, name, tag: true })
    for (const spec of specs) {
      results.push(
        pushRef(ctx, remote, spec.source, spec.id, spec.name, { ...options, tag: spec.tag }),
      )
      if (f.has('-u') && !spec.tag)
        tracked.push([
          spec.source === 'HEAD' ? (current ?? spec.name) : spec.source,
          `origin/${spec.name}`,
        ])
    }
  }

  const lines = results.map((each) => each.line).filter((line) => line !== '')
  const rejected = results.find((each) => each.rejected !== null)?.rejected ?? undefined
  const locked = results.filter((each) => each.locked !== null)

  if (rejected !== undefined || locked.length > 0)
    throw fail(
      ...locked.map(
        (each) =>
          `remote: error: GH006: Protected branch update failed for refs/heads/${each.locked ?? ''}.`,
      ),
      ...(locked.length > 0 ? ['remote: error: Changes must be made through a pull request.'] : []),
      `To ${REMOTE_URL}`,
      ...lines,
      `error: failed to push some refs to '${REMOTE_URL}'`,
      ...(rejected === undefined ? [] : HINTS[rejected]),
    )
  if (lines.length === 0) ctx.out.push('Everything up-to-date')
  else ctx.out.push(`To ${REMOTE_URL}`, ...lines)
  for (const [branchName, upstream] of tracked) {
    if (own(repo.branches, branchName) === undefined) continue
    setUpstream(repo, branchName, upstream)
    ctx.out.push(`branch '${branchName}' set up to track '${upstream}'.`)
  }
}

/**
 * `gh pr merge rama [--base main]`: abre y acepta un pull request en origin,
 * como el botón de GitHub: un commit de merge en la rama base, aunque esté
 * protegida. Con conflictos se niega: hay que traer la base a la rama,
 * resolverlos y subirla otra vez.
 */
function pullRequest(ctx: Ctx, args: string[]): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  // `--base develop`: el nombre queda como tercera palabra suelta.
  const [action, name, baseName = 'main'] = flags('gh', args).rest

  if (action !== 'merge' || name === undefined)
    throw sandbox('se usa así: gh pr merge rama (y --base develop para otra rama base)')

  const theirs = own(remote.branches, name)
  const ours = own(remote.branches, baseName)

  if (theirs === undefined)
    throw fail(
      `no pull requests found for branch "${name}" (súbela antes con git push origin ${name})`,
    )
  if (ours === undefined) throw fail(`GraphQL: Base ref must be a branch (${baseName})`)
  if (isAncestor(remote.commits, theirs, ours)) {
    ctx.out.push(`! No commits between ${baseName} and ${name}`)

    return
  }

  const base = mergeBase(remote.commits, ours, theirs)
  const result = threeWay(
    base === null ? {} : (remote.commits[base]?.files ?? {}),
    remote.commits[ours]?.files ?? {},
    remote.commits[theirs]?.files ?? {},
    name,
  )

  if (result.conflicts.length > 0) {
    throw fail(
      `X Pull request ${name} → ${baseName} is not mergeable: the merge commit cannot be cleanly created.`,
      `peer4u-sandbox: choca en ${result.conflicts.join(', ')}: trae ${baseName} a tu rama (git pull --no-rebase origin ${baseName}), resuélvelo y vuelve a subirla`,
    )
  }

  const number =
    Object.values(remote.commits).filter((each) => each.message.startsWith('Merge pull request #'))
      .length + 1
  const id = newId(repo)

  remote.commits[id] = {
    id,
    parents: [ours, theirs],
    message: `Merge pull request #${number} from equipo/${name}`,
    files: result.files,
  }
  remote.branches[baseName] = id
  ctx.out.push(`✓ Merged pull request #${number} (${name} into ${baseName})`)
}

function gitClone(ctx: Ctx): void {
  const remote = mustRemote(ctx.world)
  const old = ctx.world.repo

  // Ya clonado: git no clona encima de una carpeta con cosas.
  if (Object.keys(old.tracking).length > 0)
    throw fail("fatal: destination path 'repo' already exists and is not an empty directory.")

  const repo = emptyRepo(old.prefix)

  repo.commits = clone(remote.commits)
  repo.branches = {}
  repo.next = old.next
  ctx.world = { ...ctx.world, repo }
  ctx.out.push("Cloning into 'repo'...")
  fetch({ world: ctx.world, out: [] })

  const main =
    own(remote.branches, 'main') !== undefined
      ? 'main'
      : (Object.keys(remote.branches)[0] ?? 'main')

  repo.branches[main] = remote.branches[main] ?? 'c0'
  repo.head = { kind: 'branch', name: main }
  setUpstream(repo, main, `origin/${main}`)
  settle(repo)
}

/** Lo que se puede poner con `git config` en este simulador (lo que cambia algo, y el nombre). */
const CONFIG_KEYS: Readonly<Record<string, readonly string[] | null>> = {
  'pull.rebase': ['true', 'false'],
  'pull.ff': ['only', 'true', 'false'],
  'push.autosetupremote': ['true', 'false'],
  'user.name': null,
  'user.email': null,
  'core.editor': null,
  'init.defaultbranch': null,
}

function config(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const words = args.filter((arg) => !['--global', '--local'].includes(arg))

  if (words.includes('--list') || words.includes('-l')) {
    for (const [key, value] of Object.entries(repo.config ?? {})) ctx.out.push(`${key}=${value}`)

    return
  }

  const [rawKey, value] = words

  if (rawKey === undefined) throw fail('usage: git config [<options>]')

  const key = rawKey.toLowerCase()
  const allowed = own(CONFIG_KEYS, key)

  if (allowed === undefined)
    throw sandbox(
      `git config ${rawKey}: aquí solo están pull.rebase, pull.ff, push.autoSetupRemote, user.name y user.email`,
    )
  if (value === undefined) {
    const current = configOf(repo, key)

    if (current === undefined) throw fail('')
    ctx.out.push(current)

    return
  }
  if (value.length > LIMITS.name) throw sandbox(`como mucho ${LIMITS.name} caracteres`)
  if (allowed !== null && !allowed.includes(value.toLowerCase()))
    throw fail(`fatal: bad boolean config value '${value}' for '${rawKey}'`)
  repo.config = { ...(repo.config ?? {}), [key]: allowed === null ? value : value.toLowerCase() }
}

// --- La terminal -------------------------------------------------------------

/** Un comando de git: lo que cambia el estado, sobre `ctx.world`. */
function git(ctx: Ctx, sub: string, given: string[]): void {
  const { repo } = ctx.world
  const rest = normalize(sub, given)

  switch (sub) {
    case 'status':
      ctx.out.push(...status(repo, rest))
      break
    case 'log':
      ctx.out.push(...log(ctx.world, rest))
      break
    case 'diff':
      ctx.out.push(...diff(ctx.world, rest))
      break
    case 'show':
      ctx.out.push(...show(ctx.world, rest))
      break
    case 'add':
      add(ctx, rest)
      break
    case 'rm':
      gitRm(ctx, rest)
      break
    case 'mv':
      move(repo, rest, true)
      break
    case 'restore':
      gitRestore(ctx, rest)
      break
    case 'commit':
      commit(ctx, rest)
      break
    case 'branch':
      branch(ctx, rest)
      break
    case 'switch':
      gitSwitch(ctx, rest)
      break
    case 'checkout':
      checkout(ctx, rest)
      break
    case 'merge':
      merge(ctx, rest)
      break
    case 'rebase':
      rebase(ctx, rest)
      break
    case 'cherry-pick':
      cherryPick(ctx, rest)
      break
    case 'reset':
      reset(ctx, rest)
      break
    case 'revert':
      revert(ctx, rest)
      break
    case 'tag':
      tag(ctx, rest)
      break
    case 'stash':
      stash(ctx, rest)
      break
    case 'fetch':
      mustRemote(ctx.world)
      fetch(ctx, rest)
      break
    case 'pull':
      mustRemote(ctx.world)
      pull(ctx, rest)
      break
    case 'push':
      push(ctx, rest)
      break
    case 'clone':
      gitClone(ctx)
      break
    case 'remote':
      if (ctx.world.remote !== null)
        ctx.out.push(
          ...(rest.includes('-v')
            ? [
                `origin${TAB.slice(2)}${REMOTE_URL} (fetch)`,
                `origin${TAB.slice(2)}${REMOTE_URL} (push)`,
              ]
            : ['origin']),
        )
      break
    case 'help':
    case '--help':
      ctx.out.push(...HELP)
      break
    case 'config':
      config(ctx, given)
      break
    case 'init':
      ctx.out.push('Reinitialized existing Git repository in ~/repo/.git/')
      break
    case 'version':
    case '--version':
      ctx.out.push('git version 2.43.0 (simulado)')
      break
    default:
      throw fail(`git: '${sub}' is not a git command. See 'git --help'.`)
  }
}

/** Las órdenes de shell que entiende la terminal (sobre ficheros simulados). */
function shell(ctx: Ctx, program: string, args: string[]): void {
  const { repo } = ctx.world

  switch (program) {
    case 'help':
      ctx.out.push(...HELP)
      break
    case 'ls': {
      const files = Object.keys(repo.work).sort()

      if (files.length > 0) ctx.out.push(files.join('  '))
      break
    }
    case 'pwd':
      ctx.out.push('~/repo')
      break
    case 'cd':
      throw sandbox('aquí no hace falta cd: todo pasa dentro de ~/repo')
    case 'mkdir':
      throw sandbox('las carpetas se crean solas al crear un fichero dentro: echo hola > src/a.c')
    case 'cat':
      if (args.length === 0) throw sandbox('cat necesita un fichero: cat f')
      for (const path of args) {
        const content = own(repo.work, safePath(path))

        if (content === undefined) throw fail(`cat: ${path}: No such file or directory`)
        if (content !== '') ctx.out.push(...content.split('\n'))
      }
      break
    case 'touch':
      if (args.length === 0) throw fail('touch: missing file operand')
      for (const path of args) repo.work[safePath(path)] ??= ''
      break
    case 'echo': {
      const arrow = args.findIndex((arg) => arg === '>' || arg === '>>')

      if (arrow < 0) {
        ctx.out.push(args.join(' '))
        break
      }

      const target = args[arrow + 1]

      if (target === undefined) throw fail("bash: syntax error near unexpected token `newline'")
      if (args.length > arrow + 2) throw sandbox('un solo fichero detrás de > o >>')

      const path = safePath(target)
      const text = args.slice(0, arrow).join(' ')
      const before = own(repo.work, path)

      repo.work[path] =
        args[arrow] === '>>' && before !== undefined && before !== '' ? `${before}\n${text}` : text
      break
    }
    case 'rm': {
      // `rm -rf` solo puede borrar ficheros del repositorio simulado: no hay otros.
      const { rest } = flags('rm', args)

      if (rest.length === 0) throw fail('rm: missing operand')
      for (const path of pathsOf(rest, Object.keys(repo.work), MISS.rm)) forget(repo.work, path)
      break
    }
    case 'mv':
      move(repo, args, false)
      break
    default:
      // Nada se ejecuta de verdad: ni sudo, ni curl, ni bash.
      throw sandbox(
        `${program.slice(0, 30)}: no existe aquí. Esta terminal es un git simulado y no toca tu ordenador. Escribe help`,
      )
  }
}

/** Las palabras que no pueden ser nombre de nada (ver `reserved`). */
function mustNotBeReserved(words: readonly string[]): void {
  for (const word of words) {
    const bad = word.split(/[/~^:@{}]/).find(reserved)

    if (bad !== undefined)
      throw sandbox(`«${bad}» es un nombre reservado en este simulador: usa otro`)
  }
}

/**
 * Ejecuta una línea. Nunca lanza: los errores vuelven en `output` con `ok:
 * false`, y entonces el estado no cambia. `command` es el subcomando de git
 * (`commit`, `merge`…) o `null` si no es de git.
 */
export function run(world: World, line: string): RunResult {
  const ctx: Ctx = { world: clone(world), out: [] }
  let command: string | null = null

  try {
    if (line.length > LIMITS.line)
      throw sandbox(`la línea es demasiado larga: como mucho ${LIMITS.line} caracteres`)

    const words = tokenize(line)
    const [program, ...args] = words

    if (program === undefined) return { ...world, output: [], ok: true, command: null }
    if (words.length > LIMITS.words)
      throw sandbox(`demasiadas palabras en una línea: como mucho ${LIMITS.words}`)
    mustNotBeReserved(words)

    if (program === 'git') {
      const [sub, ...rest] = args

      command = sub ?? null
      if (sub === undefined) ctx.out.push(...HELP)
      else git(ctx, sub, rest)
    } else if (program === 'gh' && args[0] === 'pr') {
      command = 'pr'
      pullRequest(ctx, args.slice(1))
    } else shell(ctx, program, args)

    withinLimits(ctx.world.repo, ctx.world.remote)

    return { ...ctx.world, output: ctx.out, ok: true, command }
  } catch (error) {
    // Lo inesperado tampoco tumba la terminal (ni la API): falla y no cambia nada.
    const message =
      error instanceof GitError
        ? error.message
        : 'peer4u-sandbox: no he podido con esa orden; no ha cambiado nada'

    return {
      ...world,
      output: [...ctx.out, ...(message === '' ? [] : message.split('\n'))],
      ok: false,
      command,
    }
  }
}

/** Ejecuta varias líneas seguidas; corta en la primera que falla. */
export function runAll(world: World, lines: readonly string[]): RunResult {
  let current: RunResult = { ...world, output: [], ok: true, command: null }

  for (const line of lines) {
    const next = run(current, line)

    if (!next.ok) return { ...next, output: [...current.output, ...next.output] }
    current = { ...next, output: [...current.output, ...next.output] }
  }

  return current
}
