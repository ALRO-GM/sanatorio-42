/**
 * La terminal del curso de git: interpreta una línea y la ejecuta sobre una
 * copia del repositorio (y del remoto, si lo hay). Lo que no cambia el estado
 * solo escribe. Los mensajes imitan a los de git, en corto y en español.
 *
 * **No ejecuta nada de verdad**: no hay `fs`, ni procesos, ni `eval`. Los
 * ficheros son textos en un objeto; las órdenes de shell que no son del curso
 * (sudo, curl, bash…) solo dan un mensaje. Cada línea se mide antes (largo,
 * palabras) y después (`withinLimits`): si se pasa, falla y no cambia nada.
 *
 * Comandos de shell: `ls`, `cat`, `echo texto > fichero` (o `>>`), `touch`,
 * `rm`, `mv`, `pwd`, `help`. De git: status, log, diff, show, add, rm, mv,
 * restore, commit, branch, switch, checkout, merge, rebase, cherry-pick,
 * reset, revert, tag, stash, fetch, pull, push, clone y remote. Y `gh pr
 * merge`, que acepta un pull request en origin (para las pruebas de grupo).
 *
 * Las formas equivalentes de git valen igual: `git add .`, `-A`, `--all`,
 * `*` o fichero a fichero; `-m` y `--message`; `switch -c` y `checkout -b`;
 * `restore --staged` y `reset HEAD fichero`… (ver `ALIASES`).
 *
 * Una simplificación a sabiendas: `git commit` sin cambios hace un commit
 * vacío (en git de verdad haría falta `--allow-empty`). En los retos de ramas
 * importa la forma del árbol, no el contenido.
 */

import { LIMITS, own, reserved, safePath, safeRef, withinLimits } from './limits.js'
import {
  ancestors,
  clone,
  forget,
  commitOf,
  copyId,
  emptyRepo,
  GitError,
  headId,
  isAncestor,
  mergeBase,
  newId,
  sameFiles,
} from './model.js'
import type { Commit, Files, Remote, Repo } from './model.js'

export type World = { repo: Repo; remote: Remote | null }
export type RunResult = World & { output: string[]; ok: boolean; command: string | null }

const NO_SHELL =
  'aquí no hay shell: una orden por línea, sin ; && | ni $( ). Esta terminal es un git simulado y no ejecuta nada en tu ordenador'

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
      throw new GitError(NO_SHELL)
    } else {
      current += char
      started = true
    }
  }
  if (quote !== null) throw new GitError('falta cerrar unas comillas')
  flush()

  return tokens
}

// --- Referencias ------------------------------------------------------------

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
      own(repo.tracking, base) ??
      (own(repo.commits, base) === undefined ? undefined : base)

  if (id === undefined) throw new GitError(`no conozco «${base}»: ni rama, ni tag, ni commit`)

  for (const step of steps.match(/[~^]\d*/g) ?? []) {
    // Un número enorme no cuelga nada: se para en el primer commit.
    const n = step.length > 1 ? Math.min(Number(step.slice(1)), LIMITS.commits + 1) : 1

    if (step.startsWith('~')) {
      for (let i = 0; i < n; i++) {
        const parent: string | undefined = commitOf(repo, id).parents[0]

        if (parent === undefined) throw new GitError(`${ref}: no hay tantos commits hacia atrás`)
        id = parent
      }
    } else {
      const parent: string | undefined = commitOf(repo, id).parents[n - 1]

      if (parent === undefined) throw new GitError(`${ref}: ese commit no tiene padre número ${n}`)
      id = parent
    }
  }

  return id
}

/** Como `resolve`, pero `null` si no es una referencia (para distinguir de un fichero). */
function tryResolve(world: World, ref: string): string | null {
  try {
    return resolve(world, ref)
  } catch {
    return null
  }
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

/**
 * Los ficheros de `universe` que nombran `specs`: `.` (todos), un fichero, una
 * carpeta (todo lo de dentro) o un patrón con `*` (`*.c`). Como en git, un
 * patrón que no coincide con nada es un error.
 */
function pathsOf(specs: readonly string[], universe: readonly string[]): string[] {
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

    if (hits.length === 0) throw new GitError(`«${raw}» no coincide con ningún fichero`)
    for (const path of hits) found.add(path)
  }

  return [...found].sort()
}

const union = (...records: Files[]): string[] => [
  ...new Set(records.flatMap((record) => Object.keys(record))),
]

function dirty(repo: Repo): boolean {
  const tip = commitOf(repo, headId(repo)).files

  return !sameFiles(repo.index, tip) || !sameFiles(repo.work, tip)
}

function mustBeClean(repo: Repo, what: string): void {
  if (repo.merging !== null)
    throw new GitError('hay un merge a medias: resuelve los conflictos o haz git merge --abort')
  if (dirty(repo))
    throw new GitError(`tienes cambios sin guardar: haz commit o stash antes de ${what}`)
}

/** Pone HEAD en un commit (o rama) y deja índice y trabajo como en ese commit. */
function moveTo(repo: Repo, target: { branch: string } | { id: string }): void {
  // Para `git switch -`: la rama de la que vienes.
  if (repo.head.kind === 'branch' && !('branch' in target && target.branch === repo.head.name))
    repo.previous = repo.head.name
  if ('branch' in target) repo.head = { kind: 'branch', name: target.branch }
  else repo.head = { kind: 'detached', id: target.id }

  const files = commitOf(repo, headId(repo)).files

  repo.index = { ...files }
  repo.work = { ...files }
}

/** Deja índice y trabajo como en la punta de HEAD, sin moverlo (tras merge, rebase…). */
function refresh(repo: Repo): void {
  const files = commitOf(repo, headId(repo)).files

  repo.index = { ...files }
  repo.work = { ...files }
}

/** Mueve lo que HEAD señala (la rama, o HEAD si está separado) a `id`. */
function setHeadTo(repo: Repo, id: string): void {
  if (repo.head.kind === 'branch') repo.branches[repo.head.name] = id
  else repo.head = { kind: 'detached', id }
}

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

// --- Opciones -----------------------------------------------------------------

type Ctx = { world: World; out: string[] }

const HELP = [
  'Ficheros: ls · cat f · echo "texto" > f · echo "más" >> f · touch f · rm f · mv f g',
  'Guardar: git status · git add f|.|-A · git commit -m "msg" · git commit -am "msg" · git commit --amend · git log · git diff',
  'Deshacer cambios: git restore f · git restore --staged f · git reset HEAD f · git rm [--cached] f',
  'Ramas: git branch [nombre] · git switch [-c] rama · git checkout [-b] rama|commit · git switch - · git merge rama',
  'Reescribir: git rebase rama · git cherry-pick commit… · git reset [--soft|--hard] ref · git revert ref',
  'Más: git tag nombre [ref] · git stash [pop|list|drop] · git fetch · git pull [--rebase] · git push [-u] [--force] [origin rama]',
  'Equipo: gh pr merge rama (acepta un pull request en origin)',
  'Referencias: HEAD, main, origin/main, c3, HEAD~2, main^, v1.0',
]

/**
 * Formas largas, cortas y juntas que significan lo mismo, por comando: se
 * traducen a una sola antes de interpretar. Así `--message`, `-m` y `-am`
 * hacen lo mismo y cuentan igual.
 */
const ALIASES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  add: { '--all': ['-A'], '--no-ignore-removal': ['-A'], '-u': ['--update'] },
  commit: { '--message': ['-m'], '--all': ['-a'], '-am': ['-a', '-m'], '-ma': ['-a', '-m'] },
  switch: { '--create': ['-c'], '--force-create': ['-C'], '-d': ['--detach'] },
  checkout: { '-t': ['--track'] },
  branch: { '--delete': ['-d'], '--move': ['-m'], '-M': ['-m'], '--force': ['-f'] },
  merge: { '--message': ['-m'] },
  tag: { '--delete': ['-d'], '--annotate': ['-a'], '--message': ['-m'], '--force': ['-f'] },
  stash: { '--message': ['-m'] },
  push: { '--set-upstream': ['-u'], '-f': ['--force'], '--force-with-lease': ['--force'] },
  pull: { '-r': ['--rebase'] },
  restore: { '-S': ['--staged'], '-W': ['--worktree'], '-s': ['--source'] },
  rm: { '--force': ['-f'] },
}

/** Opciones que llevan valor detrás (`-m "mensaje"`, `--source HEAD~1`). */
const VALUED = new Set(['-m', '-b', '-c', '-C', '-B', '--source'])

/** Normaliza las opciones de `sub`: `--x=y`, alias y `-m"mensaje"` pegado. */
function normalize(sub: string, args: readonly string[]): string[] {
  const aliases = own(ALIASES, sub) ?? {}
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
    if (value !== null && VALUED.has(last)) result.push(value)
  }

  return result
}

function flags(args: readonly string[]): {
  flags: Set<string>
  rest: string[]
  values: Map<string, string>
} {
  const set = new Set<string>()
  const rest: string[] = []
  const values = new Map<string, string>()

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (VALUED.has(arg)) {
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
    throw new GitError(`git ${command}: la opción ${unknown} no está en este simulador`)
}

// --- Mirar ------------------------------------------------------------------------

function status(repo: Repo, out: string[]): void {
  const tip = commitOf(repo, headId(repo)).files

  out.push(
    repo.head.kind === 'branch'
      ? `En la rama ${repo.head.name}`
      : `HEAD separado en ${repo.head.id}`,
  )
  if (repo.merging !== null)
    out.push(
      `Uniendo ${repo.merging.theirs}: arregla ${repo.merging.conflicts.join(', ')} y haz git add y git commit`,
    )

  const paths = union(tip, repo.index, repo.work).sort()
  const staged = paths.filter((path) => repo.index[path] !== tip[path])
  const changed = paths.filter((path) => repo.work[path] !== repo.index[path])

  if (staged.length > 0) out.push(`Preparado para el commit: ${staged.join(', ')}`)
  if (changed.length > 0) out.push(`Cambios sin preparar: ${changed.join(', ')}`)
  if (staged.length === 0 && changed.length === 0)
    out.push('Nada que guardar: el trabajo está limpio')
}

function log(repo: Repo, args: string[], out: string[]): void {
  const all = args.includes('--all')
  const starts = all ? [headId(repo), ...Object.values(repo.branches)] : [headId(repo)]
  const reach = new Set<string>()

  for (const start of starts) for (const id of ancestors(repo.commits, start)) reach.add(id)

  const order = [...reach].sort(
    (a, b) =>
      Number(/\d+/.exec(b)?.[0] ?? 0) - Number(/\d+/.exec(a)?.[0] ?? 0) || b.length - a.length,
  )
  const labels = (id: string): string => {
    const names = [
      ...(repo.head.kind === 'branch' && repo.branches[repo.head.name] === id
        ? [`HEAD -> ${repo.head.name}`]
        : []),
      ...(repo.head.kind === 'detached' && repo.head.id === id ? ['HEAD'] : []),
      ...Object.entries(repo.branches)
        .filter(
          ([name, at]) => at === id && !(repo.head.kind === 'branch' && repo.head.name === name),
        )
        .map(([name]) => name),
      ...Object.entries(repo.tracking)
        .filter(([, at]) => at === id)
        .map(([name]) => name),
      ...Object.entries(repo.tags)
        .filter(([, at]) => at === id)
        .map(([name]) => `tag: ${name}`),
    ]

    return names.length === 0 ? '' : ` (${names.join(', ')})`
  }

  for (const id of order.slice(0, 30)) out.push(`${id}${labels(id)} ${commitOf(repo, id).message}`)
}

/** Un texto en una línea y corto, para `diff`. */
const brief = (text: string | undefined): string =>
  text === undefined ? '(no está)' : `«${text.replace(/\n/g, ' ⏎ ').slice(0, 60)}»`

function diff(repo: Repo, args: string[], out: string[]): void {
  const staged = args.includes('--staged') || args.includes('--cached')
  const tip = commitOf(repo, headId(repo)).files
  const [from, to] = staged ? [tip, repo.index] : [repo.index, repo.work]
  const changed = union(from, to)
    .filter((path) => from[path] !== to[path])
    .sort()

  if (changed.length === 0) out.push('(sin cambios)')
  for (const path of changed.slice(0, 20))
    out.push(`${path}: ${brief(from[path])} → ${brief(to[path])}`)
}

function show(ctx: Ctx, args: string[]): void {
  const ref = flags(args).rest[0] ?? 'HEAD'
  const commit = commitOf(ctx.world.repo, resolve(ctx.world, ref))

  ctx.out.push(`${commit.id} ${commit.message}`)
  ctx.out.push(`padres: ${commit.parents.join(', ') || '(ninguno)'}`)
  ctx.out.push(`ficheros: ${Object.keys(commit.files).sort().join(', ') || '(ninguno)'}`)
}

// --- Guardar ---------------------------------------------------------------------

function add(repo: Repo, args: string[]): void {
  const { flags: f, rest } = flags(args)

  only('add', f, ['-A', '--update', '-v', '--verbose', '-f'])

  const specs = rest.filter((arg) => arg !== '--')

  if (specs.length === 0 && !f.has('-A') && !f.has('--update'))
    throw new GitError('¿qué ficheros? (git add . para todos)')

  // `-u` solo mira lo que git ya sigue (lo que hay en el índice).
  const universe = f.has('--update') ? Object.keys(repo.index) : union(repo.work, repo.index)

  for (const path of specs.length === 0 ? universe : pathsOf(specs, universe)) {
    const content = own(repo.work, path)

    if (content === undefined) forget(repo.index, path)
    else repo.index[path] = content
  }
}

function gitRm(repo: Repo, args: string[]): void {
  const { flags: f, rest } = flags(args)

  only('rm', f, ['--cached', '-r', '-f', '-q'])

  const specs = rest.filter((arg) => arg !== '--')

  if (specs.length === 0) throw new GitError('¿qué ficheros?')
  for (const path of pathsOf(specs, union(repo.index, repo.work))) {
    forget(repo.index, path)
    // Con --cached se deja de seguir, pero el fichero sigue en tu directorio.
    if (!f.has('--cached')) forget(repo.work, path)
  }
}

/** `mv` y `git mv`: cambia el nombre en el trabajo (y en el índice, si es de git). */
function move(repo: Repo, args: string[], tracked: boolean): void {
  const [from, to] = flags(args).rest

  if (from === undefined || to === undefined) throw new GitError('se usa así: mv origen destino')

  const source = safePath(from)
  const target = safePath(to)
  const content = own(repo.work, source)

  if (content === undefined) throw new GitError(`no existe ${from}`)
  forget(repo.work, source)
  repo.work[target] = content
  if (tracked) {
    forget(repo.index, source)
    repo.index[target] = content
  }
}

function commit(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags(args)

  only('commit', f, ['-a', '-m', '--amend', '--no-edit', '--allow-empty', '-q', '-v'])
  if (f.has('-m') && (values.get('-m') ?? '').trim() === '')
    throw new GitError('el mensaje está vacío: git commit -m "qué has hecho"')

  // `-a` prepara todo lo que git ya sigue; `git commit f` prepara f (como un add).
  const specs = rest.filter((arg) => arg !== '--')
  const staged = f.has('-a')
    ? Object.keys(repo.index)
    : specs.length === 0
      ? []
      : pathsOf(specs, union(repo.work, repo.index))

  for (const path of staged) {
    const content = own(repo.work, path)

    if (content === undefined) forget(repo.index, path)
    else repo.index[path] = content
  }

  if (repo.merging !== null) {
    const unresolved = repo.merging.conflicts.filter((path) =>
      (repo.index[path] ?? '').includes('<<<<<<<'),
    )

    if (unresolved.length > 0)
      throw new GitError(`quedan conflictos sin resolver: ${unresolved.join(', ')}`)

    const theirs = repo.merging.theirs
    const made = makeCommit(
      repo,
      [headId(repo), resolve(ctx.world, theirs)],
      values.get('-m') ?? `Merge ${theirs}`,
      repo.index,
    )

    setHeadTo(repo, made.id)
    repo.merging = null
    ctx.out.push(`[${made.id}] ${made.message}`)

    return
  }

  const tip = commitOf(repo, headId(repo))

  if (f.has('--amend')) {
    // Se rehace el último commit: mismo padre, otro id (el de su copia).
    const made = makeCommit(
      repo,
      tip.parents,
      values.get('-m') ?? tip.message,
      repo.index,
      copyId(repo, tip.id),
    )

    setHeadTo(repo, made.id)
    ctx.out.push(`[${made.id}] ${made.message} (rehecho)`)

    return
  }

  const id = newId(repo)
  const made = makeCommit(repo, [tip.id], values.get('-m') ?? `Commit ${id}`, repo.index, id)

  setHeadTo(repo, made.id)
  ctx.out.push(`[${made.id}] ${made.message}`)
  if (sameFiles(made.files, tip.files))
    ctx.out.push('(commit vacío: en git de verdad haría falta --allow-empty)')
}

/**
 * `git restore f` (deshace lo no preparado), `--staged` (saca del índice),
 * los dos, y `--source ref`. Lo mismo hacen `git checkout -- f` y
 * `git reset HEAD f`, que acaban aquí.
 */
function restore(
  ctx: Ctx,
  specs: readonly string[],
  options: { staged: boolean; worktree: boolean; source: string | null },
): void {
  const { repo } = ctx.world

  if (specs.length === 0) throw new GitError('¿qué ficheros?')

  const from =
    options.source === null && !options.staged
      ? repo.index
      : commitOf(repo, resolve(ctx.world, options.source ?? 'HEAD')).files
  const paths = pathsOf(specs, union(repo.work, repo.index, from))

  for (const path of paths) {
    const content = own(from, path)

    for (const [on, target] of [
      [options.staged, repo.index],
      [options.worktree, repo.work],
    ] as const) {
      if (!on) continue
      if (content === undefined) forget(target, path)
      else target[path] = content
    }
  }
  ctx.out.push(
    `${options.staged && !options.worktree ? 'Fuera del índice' : 'Restaurado'}: ${paths.join(', ')}`,
  )
}

function gitRestore(ctx: Ctx, args: string[]): void {
  const { flags: f, rest, values } = flags(args)

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

// --- Ramas ------------------------------------------------------------------

function branch(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags(args)

  only('branch', f, ['-d', '-D', '-f', '-m', '--list', '-a', '-r', '-v', '-vv'])

  if (f.has('-d') || f.has('-D')) {
    if (rest.length === 0) throw new GitError('¿qué rama borras?')
    for (const name of rest) {
      if (own(repo.branches, name) === undefined) throw new GitError(`no existe la rama ${name}`)
      if (repo.head.kind === 'branch' && repo.head.name === name)
        throw new GitError(`no puedes borrar la rama en la que estás (${name})`)
      // `-d --force` es `-D`.
      if (
        f.has('-d') &&
        !f.has('-f') &&
        !isAncestor(repo.commits, repo.branches[name] ?? '', headId(repo))
      ) {
        throw new GitError(`${name} tiene commits sin unir: usa -D para borrarla igualmente`)
      }
      forget(repo.branches, name)
      ctx.out.push(`Rama ${name} borrada`)
    }

    return
  }
  if (f.has('-m')) {
    // `git branch -m nuevo` (la actual) o `git branch -m viejo nuevo`.
    const given = values.get('-m') ?? ''
    const [from, to] =
      rest[0] === undefined
        ? [repo.head.kind === 'branch' ? repo.head.name : '', given]
        : [given, rest[0]]
    const at = own(repo.branches, from)

    if (at === undefined) throw new GitError(`no existe la rama ${from}`)
    safeRef(to, 'rama')
    if (own(repo.branches, to) !== undefined) throw new GitError(`ya existe la rama ${to}`)
    forget(repo.branches, from)
    repo.branches[to] = at
    if (repo.head.kind === 'branch' && repo.head.name === from)
      repo.head = { kind: 'branch', name: to }
    ctx.out.push(`Rama ${from} ahora se llama ${to}`)

    return
  }
  if (f.has('-f')) {
    const [name, ref = 'HEAD'] = rest

    if (name === undefined) throw new GitError('git branch -f rama ref')
    safeRef(name, 'rama')
    if (repo.head.kind === 'branch' && repo.head.name === name)
      throw new GitError(`no puedes mover con -f la rama en la que estás (${name})`)
    repo.branches[name] = resolve(ctx.world, ref)
    ctx.out.push(`${name} → ${repo.branches[name]}`)

    return
  }

  const [name, ref = 'HEAD'] = rest

  if (name === undefined || f.has('--list')) {
    for (const each of Object.keys(repo.branches).sort()) {
      ctx.out.push(`${repo.head.kind === 'branch' && repo.head.name === each ? '*' : ' '} ${each}`)
    }
    if (f.has('-a') || f.has('-r'))
      for (const each of Object.keys(repo.tracking).sort()) ctx.out.push(`  remotes/${each}`)

    return
  }
  safeRef(name, 'rama')
  if (own(repo.branches, name) !== undefined) throw new GitError(`ya existe la rama ${name}`)
  repo.branches[name] = resolve(ctx.world, ref)
  ctx.out.push(`Rama ${name} creada en ${repo.branches[name]}`)
}

/** `origin/x` → `x`, para crear la rama local que la sigue (`--track`). */
function trackOf(repo: Repo, ref: string): string {
  if (!ref.startsWith('origin/') || own(repo.tracking, ref) === undefined)
    throw new GitError(`origin no tiene la rama ${ref.replace(/^origin\//, '')}`)

  return ref.slice('origin/'.length)
}

function switchTo(
  ctx: Ctx,
  args: string[],
  options: { create: string | null; detach: boolean; track: boolean },
): void {
  const { repo } = ctx.world

  mustBeClean(repo, 'cambiar de rama')

  // `--track origin/x`: crea x siguiendo a origin/x.
  const create =
    options.create ?? (options.track && args[0] !== undefined ? trackOf(repo, args[0]) : null)

  if (create !== null) {
    branch(ctx, [create, ...(options.create === null ? args.slice(0, 1) : args)])
    moveTo(repo, { branch: create })
    ctx.out.push(`Ahora en la nueva rama ${create}`)

    return
  }

  let [target] = args

  if (target === undefined) throw new GitError('¿a qué rama?')
  if (target === '-') {
    // La rama de antes, como `cd -`.
    if (repo.previous === undefined || own(repo.branches, repo.previous) === undefined)
      throw new GitError('no hay una rama anterior a la que volver')
    target = repo.previous
  }
  if (!options.detach && own(repo.branches, target) !== undefined) {
    if (repo.head.kind === 'branch' && repo.head.name === target) {
      ctx.out.push(`Ya estás en ${target}`)

      return
    }
    moveTo(repo, { branch: target })
    ctx.out.push(`Ahora en la rama ${target}`)

    return
  }
  // Una rama remota sin local: se crea la local que la sigue (como git).
  const remote = own(repo.tracking, `origin/${target}`)

  if (!options.detach && remote !== undefined) {
    safeRef(target, 'rama')
    repo.branches[target] = remote
    moveTo(repo, { branch: target })
    ctx.out.push(`Nueva rama ${target}, que sigue a origin/${target}`)

    return
  }

  const id = resolve(ctx.world, target)

  moveTo(repo, { id })
  ctx.out.push(`HEAD separado en ${id}: lo que hagas aquí no está en ninguna rama`)
}

function gitSwitch(ctx: Ctx, args: string[]): void {
  const parsed = flags(args)

  only('switch', parsed.flags, ['-c', '-C', '--detach', '--track', '-t'])
  switchTo(ctx, parsed.rest, {
    create: parsed.values.get('-c') ?? parsed.values.get('-C') ?? null,
    detach: parsed.flags.has('--detach'),
    track: parsed.flags.has('--track') || parsed.flags.has('-t'),
  })
}

/** `git checkout`: cambiar de rama, o (con ficheros) deshacer cambios como `restore`. */
function checkout(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const parsed = flags(args)
  const { rest } = parsed
  const dash = rest.indexOf('--')
  const isFile = (word: string | undefined): boolean =>
    word !== undefined &&
    (own(repo.work, word) !== undefined ||
      own(repo.index, word) !== undefined ||
      union(repo.work, repo.index).some((path) => path.startsWith(`${word}/`)))

  only('checkout', parsed.flags, ['-b', '-B', '--detach', '--track', '-f', '-q'])

  // `checkout -- f`, `checkout ref -- f`, `checkout f` y `checkout ref f`.
  const onlyFiles =
    rest.length > 0 && rest.every(isFile) && own(repo.branches, rest[0] ?? '') === undefined

  if (dash >= 0 || onlyFiles) {
    const before = dash >= 0 ? rest.slice(0, dash) : []
    const specs = dash >= 0 ? rest.slice(dash + 1) : rest

    restore(ctx, specs, { staged: before.length > 0, worktree: true, source: before[0] ?? null })

    return
  }
  if (
    rest.length === 2 &&
    isFile(rest[1]) &&
    parsed.values.get('-b') === undefined &&
    tryResolve(ctx.world, rest[0] ?? '') !== null
  ) {
    restore(ctx, rest.slice(1), { staged: true, worktree: true, source: rest[0] ?? null })

    return
  }
  switchTo(ctx, rest, {
    create: parsed.values.get('-b') ?? parsed.values.get('-B') ?? null,
    detach: parsed.flags.has('--detach'),
    track: parsed.flags.has('--track'),
  })
}

function merge(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags(args)

  only('merge', f, ['--no-ff', '--ff', '--ff-only', '--abort', '--continue', '-m', '--no-edit'])
  if (f.has('--abort')) {
    if (repo.merging === null) throw new GitError('no hay ningún merge a medias')
    repo.merging = null
    refresh(repo)
    ctx.out.push('Merge abandonado: todo como antes')

    return
  }
  if (f.has('--continue')) {
    if (repo.merging === null) throw new GitError('no hay ningún merge a medias')
    commit(ctx, [])

    return
  }
  mustBeClean(repo, 'unir ramas')

  const [ref] = rest

  if (ref === undefined) throw new GitError('¿qué rama quieres unir?')
  if (rest.length > 1) throw new GitError('de una en una: git merge rama')

  const theirs = resolve(ctx.world, ref)
  const ours = headId(repo)

  if (isAncestor(repo.commits, theirs, ours)) {
    ctx.out.push('Ya está todo unido')

    return
  }
  if (isAncestor(repo.commits, ours, theirs) && !f.has('--no-ff')) {
    setHeadTo(repo, theirs)
    refresh(repo)
    ctx.out.push(`Avance rápido (fast-forward) hasta ${theirs}`)

    return
  }
  if (f.has('--ff-only'))
    throw new GitError(
      'no se puede avanzar sin commit de merge (--ff-only): las ramas se separaron',
    )

  const base = mergeBase(repo.commits, ours, theirs)
  const result = threeWay(
    base === null ? {} : commitOf(repo, base).files,
    commitOf(repo, ours).files,
    commitOf(repo, theirs).files,
    ref,
  )

  if (result.conflicts.length > 0) {
    repo.merging = { theirs: ref, conflicts: result.conflicts }
    repo.index = { ...result.files }
    repo.work = { ...result.files }
    ctx.out.push(
      `CONFLICTO en ${result.conflicts.join(', ')}: edítalos, haz git add y git commit (o git merge --abort)`,
    )
    return
  }

  const made = makeCommit(repo, [ours, theirs], values.get('-m') ?? `Merge ${ref}`, result.files)

  setHeadTo(repo, made.id)
  refresh(repo)
  ctx.out.push(`Merge hecho: ${made.id}`)
}

/** Copia uno a uno los commits `ids` encima de `onto`. Corta si hay conflicto. */
function copyAll(repo: Repo, ids: string[], onto: string): string {
  let tip = onto

  for (const id of ids) {
    const result = replay(repo, id, tip)

    if (result.conflicts.length > 0) {
      throw new GitError(
        `conflicto al copiar ${id} en ${result.conflicts.join(', ')}: en este curso, mejor git merge`,
      )
    }

    const original = commitOf(repo, id)

    tip = makeCommit(repo, [tip], original.message, result.files, copyId(repo, id)).id
  }

  return tip
}

function rebase(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  if (f.has('-i') || f.has('--interactive'))
    throw new GitError(
      'el rebase interactivo no está en este simulador: para juntar commits, git reset --soft',
    )
  if (f.has('--abort') || f.has('--continue'))
    throw new GitError('aquí un rebase no se queda a medias: si choca, no cambia nada')
  only('rebase', f, [])

  const [ref, which] = rest

  if (ref === undefined) throw new GitError('¿sobre qué rama?')
  // `git rebase main feature` = `git switch feature` + `git rebase main`.
  if (which !== undefined) switchTo(ctx, [which], { create: null, detach: false, track: false })
  mustBeClean(repo, 'hacer rebase')

  const onto = resolve(ctx.world, ref)
  const ours = headId(repo)

  if (isAncestor(repo.commits, ours, onto)) {
    // Nada propio que copiar: se avanza.
    setHeadTo(repo, onto)
    refresh(repo)
    ctx.out.push(`Avance rápido hasta ${onto}`)

    return
  }

  const already = ancestors(repo.commits, onto)
  // Los commits propios (no en `onto`), del más viejo al más nuevo, sin merges.
  const mine = [...ancestors(repo.commits, ours)]
    .filter((id) => !already.has(id) && commitOf(repo, id).parents.length <= 1)
    .sort((a, b) => (isAncestor(repo.commits, a, b) ? -1 : isAncestor(repo.commits, b, a) ? 1 : 0))

  if (mine.length === 0) {
    ctx.out.push('Ya está al día')

    return
  }

  const tip = copyAll(repo, mine, onto)

  setHeadTo(repo, tip)
  refresh(repo)
  ctx.out.push(`Rebase hecho: ${mine.join(', ')} copiados encima de ${ref}`)
}

function cherryPick(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  only('cherry-pick', f, ['-x', '--no-edit'])
  mustBeClean(repo, 'hacer cherry-pick')
  if (rest.length === 0) throw new GitError('¿qué commits?')

  const tip = copyAll(
    repo,
    rest.map((ref) => resolve(ctx.world, ref)),
    headId(repo),
  )

  setHeadTo(repo, tip)
  refresh(repo)
  ctx.out.push(`Copiados ${rest.join(', ')}`)
}

function reset(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

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
    if (f.has('--hard') || f.has('--soft'))
      throw new GitError('con ficheros, git reset solo saca del índice (sin --hard ni --soft)')
    restore(ctx, paths, {
      staged: true,
      worktree: false,
      source: dash === 0 || paths === rest ? 'HEAD' : (first ?? 'HEAD'),
    })

    return
  }

  const target = resolve(ctx.world, first ?? 'HEAD')
  const files = commitOf(repo, target).files

  setHeadTo(repo, target)
  repo.merging = null
  if (f.has('--hard')) {
    repo.index = { ...files }
    repo.work = { ...files }
  } else if (!f.has('--soft')) repo.index = { ...files }
  ctx.out.push(
    `HEAD ahora en ${target}${f.has('--hard') ? ': cambios descartados' : f.has('--soft') ? ': los cambios siguen preparados' : ': los cambios siguen en el trabajo'}`,
  )
}

function revert(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  only('revert', f, ['--no-edit'])
  mustBeClean(repo, 'hacer revert')
  if (rest.length === 0) throw new GitError('¿qué commit quieres deshacer?')

  // Varios a la vez: uno detrás de otro, como git.
  for (const id of rest.map((ref) => resolve(ctx.world, ref))) {
    const target = commitOf(repo, id)
    const parent = target.parents[0] === undefined ? {} : commitOf(repo, target.parents[0]).files
    // Lo contrario de lo que hizo: de su foto a la de su padre.
    const result = threeWay(
      target.files,
      commitOf(repo, headId(repo)).files,
      parent,
      `revert ${id}`,
    )

    if (result.conflicts.length > 0)
      throw new GitError(`conflicto al deshacer ${id}: arréglalo a mano`)

    const made = makeCommit(repo, [headId(repo)], `Revert «${target.message}»`, result.files)

    setHeadTo(repo, made.id)
    ctx.out.push(`[${made.id}] deshace ${id}`)
  }
  refresh(repo)
}

function tag(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  only('tag', f, ['-a', '-m', '-d', '-f', '-l', '--list'])

  const [name, ref = 'HEAD'] = rest

  if (f.has('-d')) {
    if (rest.length === 0) throw new GitError('¿qué tag borras?')
    for (const each of rest) {
      if (own(repo.tags, each) === undefined) throw new GitError(`no existe el tag ${each}`)
      forget(repo.tags, each)
      ctx.out.push(`Tag ${each} borrado`)
    }

    return
  }
  if (name === undefined || f.has('-l') || f.has('--list')) {
    for (const each of Object.keys(repo.tags).sort()) ctx.out.push(each)

    return
  }
  safeRef(name, 'tag')
  if (own(repo.tags, name) !== undefined && !f.has('-f'))
    throw new GitError(`ya existe el tag ${name}`)
  repo.tags[name] = resolve(ctx.world, ref)
  ctx.out.push(`Tag ${name} en ${repo.tags[name]}`)
}

/** `stash@{1}` o `1` → 1; sin nada, 0. */
function stashIndex(repo: Repo, word: string | undefined): number {
  const n =
    word === undefined
      ? 0
      : Number(/^(?:stash@\{(\d+)\}|(\d+))$/.exec(word)?.slice(1).find(Boolean) ?? NaN)

  if (!Number.isInteger(n) || repo.stash[n] === undefined)
    throw new GitError(
      word === undefined ? 'no hay nada guardado en el stash' : `no hay ${word} en el stash`,
    )

  return n
}

function stash(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { rest } = flags(args)
  const [action = 'push', which] = rest

  switch (action) {
    case 'list':
      repo.stash.forEach((_, index) => ctx.out.push(`stash@{${index}}`))

      return
    case 'show': {
      const entry = repo.stash[stashIndex(repo, which)]

      ctx.out.push(`ficheros: ${Object.keys(entry?.work ?? {}).join(', ')}`)

      return
    }
    case 'drop':
      repo.stash.splice(stashIndex(repo, which), 1)
      ctx.out.push('Entrada del stash tirada')

      return
    case 'clear':
      repo.stash = []
      ctx.out.push('Stash vacío')

      return
    case 'pop':
    case 'apply': {
      const index = stashIndex(repo, which)
      const top = repo.stash[index] ?? { index: {}, work: {} }

      if (dirty(repo)) throw new GitError('tienes cambios: guárdalos antes de recuperar el stash')
      repo.index = { ...top.index }
      repo.work = { ...top.work }
      if (action === 'pop') repo.stash.splice(index, 1)
      ctx.out.push('Cambios recuperados del stash')

      return
    }
    case 'push':
    case 'save':
      if (!dirty(repo)) throw new GitError('no hay cambios que guardar')
      repo.stash.unshift({ index: { ...repo.index }, work: { ...repo.work } })
      refresh(repo)
      ctx.out.push('Cambios guardados en el stash: el trabajo queda limpio')

      return
    default:
      throw new GitError(`git stash ${action}: no lo conozco (push, pop, apply, list, drop)`)
  }
}

// --- Remoto ------------------------------------------------------------------

function mustRemote(world: World): Remote {
  if (world.remote === null) throw new GitError('este repositorio no tiene remoto (origin)')

  return world.remote
}

function fetch(ctx: Ctx): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  let fresh = 0

  for (const [id, each] of Object.entries(remote.commits)) {
    if (own(repo.commits, id) === undefined) {
      repo.commits[id] = clone(each)
      fresh++
    }
  }
  for (const [name, id] of Object.entries(remote.branches)) repo.tracking[`origin/${name}`] = id
  for (const name of Object.keys(repo.tracking)) {
    if (own(remote.branches, name.slice('origin/'.length)) === undefined)
      forget(repo.tracking, name)
  }
  for (const [name, id] of Object.entries(remote.tags)) repo.tags[name] ??= id
  ctx.out.push(fresh === 0 ? 'Nada nuevo en origin' : `Bajados ${fresh} commits de origin`)
}

function pull(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  only('pull', f, ['--rebase', '--no-rebase', '--ff-only', '--no-ff', '--ff', '-q'])
  if (repo.head.kind !== 'branch')
    throw new GitError('estás con HEAD separado: cámbiate a una rama')
  fetch(ctx)

  // `git pull origin main` trae main a la rama en la que estés; sin nombre, la suya.
  const named = (rest[0] === 'origin' ? rest[1] : undefined) ?? repo.head.name
  const upstream = `origin/${named}`

  if (own(repo.tracking, upstream) === undefined)
    throw new GitError(`origin no tiene la rama ${named}`)
  if (f.has('--rebase')) rebase(ctx, [upstream])
  else merge(ctx, [...[...f].filter((flag) => flag !== '--no-rebase' && flag !== '-q'), upstream])
}

/** Sube `local` a la rama `name` de origin. */
function pushOne(ctx: Ctx, remote: Remote, local: string, name: string, force: boolean): void {
  const { repo } = ctx.world
  const id = own(repo.branches, local)

  if (id === undefined) throw new GitError(`no tienes la rama ${local}`)
  safeRef(name, 'rama')
  if (remote.locked.includes(name))
    throw new GitError(`${name} está protegida en origin: sube tu rama y únela con un pull request`)

  const theirs = own(remote.branches, name)

  if (theirs !== undefined && !force && !ancestors(repo.commits, id).has(theirs)) {
    throw new GitError(
      `rechazado: origin/${name} tiene commits que tú no tienes. Haz git pull primero`,
    )
  }
  for (const each of ancestors(repo.commits, id))
    remote.commits[each] ??= clone(commitOf(repo, each))
  remote.branches[name] = id
  repo.tracking[`origin/${name}`] = id
  ctx.out.push(`Subido ${local} a origin${local === name ? '' : `/${name}`} (${id})`)
}

function push(ctx: Ctx, args: string[]): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)

  only('push', f, ['-u', '--force', '--tags', '--all', '--delete', '-d', '-q'])

  const named = rest[0] === 'origin' ? rest.slice(1) : rest
  const current = repo.head.kind === 'branch' ? repo.head.name : null
  const force = f.has('--force')

  if (f.has('--delete') || f.has('-d')) {
    for (const name of named) {
      if (own(remote.branches, name) === undefined)
        throw new GitError(`origin no tiene la rama ${name}`)
      if (remote.locked.includes(name)) throw new GitError(`${name} está protegida en origin`)
      forget(remote.branches, name)
      forget(repo.tracking, `origin/${name}`)
      ctx.out.push(`Borrada ${name} en origin`)
    }

    return
  }
  if (f.has('--tags')) {
    for (const [tagName, id] of Object.entries(repo.tags)) {
      for (const each of ancestors(repo.commits, id))
        remote.commits[each] ??= clone(commitOf(repo, each))
      remote.tags[tagName] = id
    }
    ctx.out.push('Tags subidos a origin')
    if (named.length === 0) return
  }
  if (f.has('--all')) {
    for (const name of Object.keys(repo.branches).sort()) pushOne(ctx, remote, name, name, force)

    return
  }

  const refspecs = named.length === 0 ? [current ?? ''] : named

  for (const spec of refspecs) {
    // `HEAD` es la rama actual; `local:remota` sube con otro nombre.
    const [rawLocal = '', rawName] = spec.split(':')
    const local = rawLocal === 'HEAD' || rawLocal === '' ? current : rawLocal

    if (local === null) throw new GitError('¿qué rama subes? (estás con HEAD separado)')
    pushOne(ctx, remote, local, rawName === undefined || rawName === '' ? local : rawName, force)
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
  const [action, name, baseName = 'main'] = flags(args).rest

  if (action !== 'merge' || name === undefined) throw new GitError('se usa así: gh pr merge rama')

  const theirs = own(remote.branches, name)
  const ours = own(remote.branches, baseName)

  if (theirs === undefined)
    throw new GitError(`origin no tiene la rama ${name}: súbela con git push`)
  if (ours === undefined) throw new GitError(`origin no tiene la rama ${baseName}`)
  if (isAncestor(remote.commits, theirs, ours)) {
    ctx.out.push(`${name} ya está unida en ${baseName}`)

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
    throw new GitError(
      `el pull request tiene conflictos en ${result.conflicts.join(', ')}: trae ${baseName} a tu rama (git pull origin ${baseName}), resuélvelos y vuelve a subirla`,
    )
  }

  const id = newId(repo)

  remote.commits[id] = {
    id,
    parents: [ours, theirs],
    message: `Merge pull request: ${name}`,
    files: result.files,
  }
  remote.branches[baseName] = id
  ctx.out.push(`Pull request de ${name} unido en ${baseName} (${id}). Tráelo con git pull`)
}

function gitClone(ctx: Ctx): void {
  const remote = mustRemote(ctx.world)
  const prefix = ctx.world.repo.prefix
  const repo = emptyRepo(prefix)

  repo.commits = clone(remote.commits)
  repo.branches = {}
  repo.next = ctx.world.repo.next
  ctx.world = { ...ctx.world, repo }
  fetch(ctx)
  repo.branches.main = remote.branches.main ?? Object.values(remote.branches)[0] ?? ''
  moveTo(repo, { branch: 'main' })
  ctx.out.push('Clonado origin: estás en main')
}

// --- La terminal -------------------------------------------------------------

/** Un comando de git: lo que cambia el estado, sobre `ctx.world`. */
function git(ctx: Ctx, sub: string, given: string[]): void {
  const { repo } = ctx.world
  const rest = normalize(sub, given)

  switch (sub) {
    case 'status':
      status(repo, ctx.out)
      break
    case 'log':
      log(repo, rest, ctx.out)
      break
    case 'diff':
      diff(repo, rest, ctx.out)
      break
    case 'show':
      show(ctx, rest)
      break
    case 'add':
      add(repo, rest)
      break
    case 'rm':
      gitRm(repo, rest)
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
      fetch(ctx)
      break
    case 'pull':
      pull(ctx, rest)
      break
    case 'push':
      push(ctx, rest)
      break
    case 'clone':
      gitClone(ctx)
      break
    case 'remote':
      if (ctx.world.remote !== null) ctx.out.push('origin  (el remoto común de este reto)')
      break
    case 'help':
      ctx.out.push(...HELP)
      break
    case 'config':
      ctx.out.push('Aquí no hace falta configurar nada: ya tienes nombre y correo')
      break
    case 'init':
      throw new GitError('ya estás en un repositorio')
    default:
      throw new GitError(`git ${sub}: no lo conozco. Escribe help`)
  }
}

/** Las órdenes de shell que entiende la terminal (sobre ficheros simulados). */
function shell(ctx: Ctx, program: string, args: string[]): void {
  const { repo } = ctx.world

  switch (program) {
    case 'help':
      ctx.out.push(...HELP)
      break
    case 'ls':
      ctx.out.push(Object.keys(repo.work).sort().join('  ') || '(vacío)')
      break
    case 'pwd':
      ctx.out.push('~/repo')
      break
    case 'cd':
      ctx.out.push('Aquí no hace falta cd: todo pasa dentro de ~/repo')
      break
    case 'mkdir':
      ctx.out.push('Las carpetas se crean solas al crear un fichero dentro: echo hola > src/a.c')
      break
    case 'cat':
      if (args.length === 0) throw new GitError('¿qué fichero?')
      for (const path of args) {
        const content = own(repo.work, safePath(path))

        if (content === undefined) throw new GitError(`no existe ${path}`)
        ctx.out.push(...content.split('\n'))
      }
      break
    case 'touch':
      if (args.length === 0) throw new GitError('¿qué fichero?')
      for (const path of args) repo.work[safePath(path)] ??= ''
      break
    case 'echo': {
      const arrow = args.findIndex((arg) => arg === '>' || arg === '>>')

      if (arrow < 0) {
        ctx.out.push(args.join(' '))
        break
      }

      const target = args[arrow + 1]

      if (target === undefined) throw new GitError('¿en qué fichero?')
      if (args.length > arrow + 2) throw new GitError('un solo fichero detrás de > o >>')

      const path = safePath(target)
      const text = args.slice(0, arrow).join(' ')
      const before = own(repo.work, path)

      repo.work[path] = args[arrow] === '>>' && before !== undefined ? `${before}\n${text}` : text
      break
    }
    case 'rm': {
      // `rm -rf` solo puede borrar ficheros del repositorio simulado: no hay otros.
      const { rest } = flags(args)

      if (rest.length === 0) throw new GitError('¿qué ficheros?')
      for (const path of pathsOf(rest, Object.keys(repo.work))) forget(repo.work, path)
      break
    }
    case 'mv':
      move(repo, args, false)
      break
    default:
      // Nada se ejecuta de verdad: ni sudo, ni curl, ni bash.
      throw new GitError(
        `${program.slice(0, 30)}: no existe aquí. Esta terminal es un git simulado y no toca tu ordenador. Escribe help`,
      )
  }
}

/** Las palabras que no pueden ser nombre de nada (ver `reserved`). */
function mustNotBeReserved(words: readonly string[]): void {
  for (const word of words) {
    const bad = word.split(/[/~^:@{}]/).find(reserved)

    if (bad !== undefined)
      throw new GitError(`«${bad}» es un nombre reservado en este simulador: usa otro`)
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
      throw new GitError(`la línea es demasiado larga: como mucho ${LIMITS.line} caracteres`)

    const words = tokenize(line)
    const [program, ...args] = words

    if (program === undefined) return { ...world, output: [], ok: true, command: null }
    if (words.length > LIMITS.words)
      throw new GitError(`demasiadas palabras en una línea: como mucho ${LIMITS.words}`)
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
      error instanceof GitError ? error.message : 'no he podido con esa orden; no ha cambiado nada'

    return { ...world, output: [...ctx.out, `error: ${message}`], ok: false, command }
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
