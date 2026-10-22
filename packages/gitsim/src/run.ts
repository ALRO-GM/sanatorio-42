/**
 * La terminal del curso de git: interpreta una línea y la ejecuta sobre una
 * copia del repositorio (y del remoto, si lo hay). Lo que no cambia el estado
 * solo escribe. Los mensajes imitan a los de git, en corto y en español.
 *
 * Comandos de shell: `ls`, `cat`, `echo texto > fichero` (o `>>`), `rm`,
 * `help`. De git: init no (ya hay repo), status, log, add, rm, commit (-m, -a,
 * --amend), branch, switch, checkout, merge, rebase, cherry-pick, reset,
 * revert, tag, stash, fetch, pull, push y clone. Y `gh pr merge`, que acepta
 * un pull request en origin (para las pruebas de grupo).
 *
 * Una simplificación a sabiendas: `git commit` sin cambios hace un commit
 * vacío (en git de verdad haría falta `--allow-empty`). En los retos de ramas
 * importa la forma del árbol, no el contenido.
 */

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

/** Parte una línea en palabras, respetando comillas simples y dobles. */
export function tokenize(line: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: string | null = null
  let started = false

  for (const char of line.trim()) {
    if (quote !== null) {
      if (char === quote) quote = null
      else current += char
    } else if (char === '"' || char === "'") {
      quote = char
      started = true
    } else if (/\s/.test(char)) {
      if (started || current !== '') tokens.push(current)
      current = ''
      started = false
    } else {
      current += char
      started = true
    }
  }
  if (quote !== null) throw new GitError('falta cerrar unas comillas')
  if (started || current !== '') tokens.push(current)

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
      repo.branches[base] ??
      repo.tags[base] ??
      repo.tracking[base] ??
      (repo.commits[base] === undefined ? undefined : base)

  if (id === undefined) throw new GitError(`no conozco «${base}»: ni rama, ni tag, ni commit`)

  for (const step of steps.match(/[~^]\d*/g) ?? []) {
    const n = step.length > 1 ? Number(step.slice(1)) : 1

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
  if ('branch' in target) repo.head = { kind: 'branch', name: target.branch }
  else repo.head = { kind: 'detached', id: target.id }

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

// --- Comandos -----------------------------------------------------------------

type Ctx = { world: World; out: string[] }

const HELP = [
  'Ficheros: ls · cat f · echo "texto" > f · echo "más" >> f · rm f',
  'Guardar: git status · git add f|. · git commit -m "msg" · git commit --amend · git log',
  'Ramas: git branch [nombre] · git switch [-c] rama · git checkout [-b] rama|commit · git merge rama',
  'Reescribir: git rebase rama · git cherry-pick commit… · git reset [--soft|--hard] ref · git revert ref',
  'Más: git tag nombre [ref] · git stash [pop|list] · git fetch · git pull [--rebase] · git push [-u] [--force] [origin rama]',
  'Equipo: gh pr merge rama (acepta un pull request en origin)',
  'Referencias: HEAD, main, origin/main, c3, HEAD~2, main^, v1.0',
]

function flags(args: string[]): {
  flags: Set<string>
  rest: string[]
  values: Map<string, string>
} {
  const set = new Set<string>()
  const rest: string[] = []
  const values = new Map<string, string>()

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (arg === '-m' || arg === '-b' || arg === '-c' || arg === '-C' || arg === '-B') {
      values.set(arg, args[i + 1] ?? '')
      set.add(arg)
      i++
    } else if (arg.startsWith('-')) set.add(arg)
    else rest.push(arg)
  }

  return { flags: set, rest, values }
}

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

  const paths = [
    ...new Set([...Object.keys(tip), ...Object.keys(repo.index), ...Object.keys(repo.work)]),
  ].sort()
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

function commit(repo: Repo, args: string[], out: string[]): void {
  const { flags: f, values } = flags(args)

  if (f.has('-a') || f.has('-am')) {
    for (const path of Object.keys(repo.index)) {
      if (repo.work[path] === undefined) forget(repo.index, path)
      else repo.index[path] = repo.work[path]
    }
  }
  if (f.has('-am')) values.set('-m', args[args.indexOf('-am') + 1] ?? '')

  if (repo.merging !== null) {
    const unresolved = repo.merging.conflicts.filter((path) =>
      (repo.index[path] ?? '').includes('<<<<<<<'),
    )

    if (unresolved.length > 0)
      throw new GitError(`quedan conflictos sin resolver: ${unresolved.join(', ')}`)

    const theirs = repo.merging.theirs
    const made = makeCommit(
      repo,
      [headId(repo), resolveIn(repo, theirs)],
      values.get('-m') ?? `Merge ${theirs}`,
      repo.index,
    )

    setHeadTo(repo, made.id)
    repo.merging = null
    out.push(`[${made.id}] ${made.message}`)

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
    out.push(`[${made.id}] ${made.message} (rehecho)`)

    return
  }

  const id = newId(repo)
  const made = makeCommit(repo, [tip.id], values.get('-m') ?? `Commit ${id}`, repo.index, id)

  setHeadTo(repo, made.id)
  out.push(`[${made.id}] ${made.message}`)
  if (sameFiles(made.files, tip.files))
    out.push('(commit vacío: en git de verdad haría falta --allow-empty)')
}

/** `resolve` sin el remoto, para lo guardado en el estado. */
function resolveIn(repo: Repo, ref: string): string {
  return resolve({ repo, remote: null }, ref)
}

const BRANCH_FLAGS = new Set(['-d', '-D', '-f', '--list', '-a'])

function branch(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)
  const unknown = [...f].find((flag) => !BRANCH_FLAGS.has(flag))

  if (unknown !== undefined) throw new GitError(`git branch: no conozco la opción ${unknown}`)

  if (f.has('-d') || f.has('-D')) {
    for (const name of rest) {
      if (repo.branches[name] === undefined) throw new GitError(`no existe la rama ${name}`)
      if (repo.head.kind === 'branch' && repo.head.name === name)
        throw new GitError(`no puedes borrar la rama en la que estás (${name})`)
      if (f.has('-d') && !isAncestor(repo.commits, repo.branches[name] ?? '', headId(repo))) {
        throw new GitError(`${name} tiene commits sin unir: usa -D para borrarla igualmente`)
      }
      forget(repo.branches, name)
      ctx.out.push(`Rama ${name} borrada`)
    }

    return
  }
  if (f.has('-f')) {
    const [name, ref = 'HEAD'] = rest

    if (name === undefined) throw new GitError('git branch -f rama ref')
    repo.branches[name] = resolve(ctx.world, ref)
    ctx.out.push(`${name} → ${repo.branches[name]}`)

    return
  }

  const [name, ref = 'HEAD'] = rest

  if (name === undefined) {
    for (const each of Object.keys(repo.branches).sort()) {
      ctx.out.push(`${repo.head.kind === 'branch' && repo.head.name === each ? '*' : ' '} ${each}`)
    }

    return
  }
  if (!/^[A-Za-z0-9._/-]{1,40}$/.test(name) || name.startsWith('-'))
    throw new GitError(`«${name}» no vale como nombre de rama`)
  if (repo.branches[name] !== undefined) throw new GitError(`ya existe la rama ${name}`)
  repo.branches[name] = resolve(ctx.world, ref)
  ctx.out.push(`Rama ${name} creada en ${repo.branches[name]}`)
}

function switchTo(ctx: Ctx, args: string[], create: string | null, detach: boolean): void {
  const { repo } = ctx.world

  mustBeClean(repo, 'cambiar de rama')
  if (create !== null) {
    branch(ctx, [create, ...args])
    moveTo(repo, { branch: create })
    ctx.out.push(`Ahora en la nueva rama ${create}`)

    return
  }

  const [target] = args

  if (target === undefined) throw new GitError('¿a qué rama?')
  if (!detach && repo.branches[target] !== undefined) {
    moveTo(repo, { branch: target })
    ctx.out.push(`Ahora en la rama ${target}`)

    return
  }
  // Una rama remota sin local: se crea la local que la sigue (como git).
  if (!detach && repo.tracking[`origin/${target}`] !== undefined) {
    repo.branches[target] = repo.tracking[`origin/${target}`] ?? ''
    moveTo(repo, { branch: target })
    ctx.out.push(`Nueva rama ${target}, que sigue a origin/${target}`)

    return
  }

  const id = resolve(ctx.world, target)

  moveTo(repo, { id })
  ctx.out.push(`HEAD separado en ${id}: lo que hagas aquí no está en ninguna rama`)
}

function merge(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest, values } = flags(args)

  if (f.has('--abort')) {
    if (repo.merging === null) throw new GitError('no hay ningún merge a medias')
    repo.merging = null
    moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: repo.head.id })
    ctx.out.push('Merge abandonado: todo como antes')

    return
  }
  mustBeClean(repo, 'unir ramas')

  const [ref] = rest

  if (ref === undefined) throw new GitError('¿qué rama quieres unir?')

  const theirs = resolve(ctx.world, ref)
  const ours = headId(repo)

  if (isAncestor(repo.commits, theirs, ours)) {
    ctx.out.push('Ya está todo unido')

    return
  }
  if (isAncestor(repo.commits, ours, theirs) && !f.has('--no-ff')) {
    setHeadTo(repo, theirs)
    moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: theirs })
    ctx.out.push(`Avance rápido (fast-forward) hasta ${theirs}`)

    return
  }

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
  moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: made.id })
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
  const [ref] = flags(args).rest

  mustBeClean(repo, 'hacer rebase')
  if (ref === undefined) throw new GitError('¿sobre qué rama?')

  const onto = resolve(ctx.world, ref)
  const ours = headId(repo)

  if (isAncestor(repo.commits, ours, onto)) {
    // Nada propio que copiar: se avanza.
    setHeadTo(repo, onto)
    moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: onto })
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
  moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: tip })
  ctx.out.push(`Rebase hecho: ${mine.join(', ')} copiados encima de ${ref}`)
}

function cherryPick(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world

  mustBeClean(repo, 'hacer cherry-pick')
  if (args.length === 0) throw new GitError('¿qué commits?')

  const tip = copyAll(
    repo,
    args.map((ref) => resolve(ctx.world, ref)),
    headId(repo),
  )

  setHeadTo(repo, tip)
  moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: tip })
  ctx.out.push(`Copiados ${args.join(', ')}`)
}

function reset(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)
  const target = resolve(ctx.world, rest[0] ?? 'HEAD')
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

  mustBeClean(repo, 'hacer revert')

  const [ref] = args

  if (ref === undefined) throw new GitError('¿qué commit quieres deshacer?')

  const id = resolve(ctx.world, ref)
  const target = commitOf(repo, id)
  const parent = target.parents[0] === undefined ? {} : commitOf(repo, target.parents[0]).files
  // Lo contrario de lo que hizo: de su foto a la de su padre.
  const result = threeWay(target.files, commitOf(repo, headId(repo)).files, parent, `revert ${id}`)

  if (result.conflicts.length > 0)
    throw new GitError(`conflicto al deshacer ${id}: arréglalo a mano`)

  const made = makeCommit(repo, [headId(repo)], `Revert «${target.message}»`, result.files)

  setHeadTo(repo, made.id)
  moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: made.id })
  ctx.out.push(`[${made.id}] deshace ${id}`)
}

function tag(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const [name, ref = 'HEAD'] = flags(args).rest

  if (name === undefined) {
    for (const each of Object.keys(repo.tags).sort()) ctx.out.push(each)

    return
  }
  if (repo.tags[name] !== undefined) throw new GitError(`ya existe el tag ${name}`)
  repo.tags[name] = resolve(ctx.world, ref)
  ctx.out.push(`Tag ${name} en ${repo.tags[name]}`)
}

function stash(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world
  const [action = 'push'] = args

  if (action === 'list') {
    repo.stash.forEach((_, index) => ctx.out.push(`stash@{${index}}`))

    return
  }
  if (action === 'pop' || action === 'apply') {
    const top = repo.stash[0]

    if (top === undefined) throw new GitError('no hay nada guardado en el stash')
    if (dirty(repo)) throw new GitError('tienes cambios: guárdalos antes de recuperar el stash')
    repo.index = { ...top.index }
    repo.work = { ...top.work }
    if (action === 'pop') repo.stash.shift()
    ctx.out.push('Cambios recuperados del stash')

    return
  }
  if (!dirty(repo)) throw new GitError('no hay cambios que guardar')
  repo.stash.unshift({ index: { ...repo.index }, work: { ...repo.work } })
  moveTo(repo, repo.head.kind === 'branch' ? { branch: repo.head.name } : { id: repo.head.id })
  ctx.out.push('Cambios guardados en el stash: el trabajo queda limpio')
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
    if (repo.commits[id] === undefined) {
      repo.commits[id] = clone(each)
      fresh++
    }
  }
  for (const [name, id] of Object.entries(remote.branches)) repo.tracking[`origin/${name}`] = id
  for (const name of Object.keys(repo.tracking)) {
    if (remote.branches[name.slice('origin/'.length)] === undefined) forget(repo.tracking, name)
  }
  for (const [name, id] of Object.entries(remote.tags)) repo.tags[name] ??= id
  ctx.out.push(fresh === 0 ? 'Nada nuevo en origin' : `Bajados ${fresh} commits de origin`)
}

function pull(ctx: Ctx, args: string[]): void {
  const { repo } = ctx.world

  if (repo.head.kind !== 'branch')
    throw new GitError('estás con HEAD separado: cámbiate a una rama')
  fetch(ctx)

  // `git pull origin main` trae main a la rama en la que estés; sin nombre, la suya.
  const { rest } = flags(args)
  const named = (rest[0] === 'origin' ? rest[1] : undefined) ?? repo.head.name
  const upstream = `origin/${named}`

  if (repo.tracking[upstream] === undefined) throw new GitError(`origin no tiene la rama ${named}`)
  if (args.includes('--rebase')) rebase(ctx, [upstream])
  else merge(ctx, [upstream])
}

function push(ctx: Ctx, args: string[]): void {
  const remote = mustRemote(ctx.world)
  const { repo } = ctx.world
  const { flags: f, rest } = flags(args)
  const named = rest[0] === 'origin' ? rest.slice(1) : rest
  const name = named[0] ?? (repo.head.kind === 'branch' ? repo.head.name : null)

  if (f.has('--tags')) {
    for (const [tagName, id] of Object.entries(repo.tags)) {
      for (const each of ancestors(repo.commits, id))
        remote.commits[each] ??= clone(commitOf(repo, each))
      remote.tags[tagName] = id
    }
    ctx.out.push('Tags subidos a origin')
    if (name === null || rest.length === 0) return
  }
  if (name === null) throw new GitError('¿qué rama subes? (estás con HEAD separado)')

  const local = repo.branches[name]

  if (local === undefined) throw new GitError(`no tienes la rama ${name}`)
  if (remote.locked.includes(name))
    throw new GitError(`${name} está protegida en origin: sube tu rama y únela con un pull request`)

  const theirs = remote.branches[name]
  const force = f.has('--force') || f.has('-f') || f.has('--force-with-lease')

  if (theirs !== undefined && !force && !ancestors(repo.commits, local).has(theirs)) {
    throw new GitError(
      `rechazado: origin/${name} tiene commits que tú no tienes. Haz git pull primero`,
    )
  }
  for (const id of ancestors(repo.commits, local)) remote.commits[id] ??= clone(commitOf(repo, id))
  remote.branches[name] = local
  repo.tracking[`origin/${name}`] = local
  ctx.out.push(`Subido ${name} a origin (${local})`)
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

  const theirs = remote.branches[name]
  const ours = remote.branches[baseName]

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

/**
 * Ejecuta una línea. Nunca lanza: los errores vuelven en `output` con `ok:
 * false`, y entonces el estado no cambia. `command` es el subcomando de git
 * (`commit`, `merge`…) o `null` si no es de git, para contar comandos.
 */
export function run(world: World, line: string): RunResult {
  const ctx: Ctx = { world: clone(world), out: [] }
  let command: string | null = null

  try {
    const words = tokenize(line)
    const [program, ...args] = words
    const { repo } = ctx.world

    if (program === undefined) return { ...world, output: [], ok: true, command: null }

    if (program === 'help') ctx.out.push(...HELP)
    else if (program === 'ls') ctx.out.push(Object.keys(repo.work).sort().join('  ') || '(vacío)')
    else if (program === 'cat') {
      const path = args[0] ?? ''
      const content = repo.work[path]

      if (content === undefined) throw new GitError(`no existe ${path}`)
      ctx.out.push(...content.split('\n'))
    } else if (program === 'echo') {
      const arrow = args.findIndex((arg) => arg === '>' || arg === '>>')

      if (arrow < 0) ctx.out.push(args.join(' '))
      else {
        const path = args[arrow + 1]

        if (path === undefined || !/^[A-Za-z0-9._/-]{1,60}$/.test(path))
          throw new GitError('¿en qué fichero?')

        const text = args.slice(0, arrow).join(' ')

        repo.work[path] =
          args[arrow] === '>>' && repo.work[path] !== undefined
            ? `${repo.work[path]}\n${text}`
            : text
      }
    } else if (program === 'rm') {
      for (const path of args) {
        if (repo.work[path] === undefined) throw new GitError(`no existe ${path}`)
        forget(repo.work, path)
      }
    } else if (program === 'git') {
      const [sub, ...rest] = args

      command = sub ?? null
      switch (sub) {
        case 'status':
          status(repo, ctx.out)
          break
        case 'log':
          log(repo, rest, ctx.out)
          break
        case 'add':
          if (rest.length === 0) throw new GitError('¿qué ficheros? (git add . para todos)')
          for (const path of rest.includes('.') || rest.includes('-A')
            ? [...new Set([...Object.keys(repo.work), ...Object.keys(repo.index)])]
            : rest) {
            if (repo.work[path] === undefined) {
              if (repo.index[path] === undefined) throw new GitError(`no existe ${path}`)
              forget(repo.index, path)
            } else repo.index[path] = repo.work[path]
          }
          break
        case 'rm':
          for (const path of rest) {
            forget(repo.work, path)
            forget(repo.index, path)
          }
          break
        case 'commit':
          commit(repo, rest, ctx.out)
          break
        case 'branch':
          branch(ctx, rest)
          break
        case 'switch': {
          const parsed = flags(rest)

          switchTo(
            ctx,
            parsed.rest,
            parsed.values.get('-c') ?? parsed.values.get('-C') ?? null,
            parsed.flags.has('--detach'),
          )
          break
        }
        case 'checkout': {
          const parsed = flags(rest)

          if (
            parsed.rest[0] === '--' ||
            (parsed.rest.length === 2 &&
              parsed.rest[1] !== undefined &&
              repo.work[parsed.rest[1]] !== undefined)
          ) {
            // git checkout -- fichero: descarta sus cambios.
            const path = parsed.rest.at(-1) ?? ''
            const tip = commitOf(repo, headId(repo)).files

            if (tip[path] === undefined) forget(repo.work, path)
            else repo.work[path] = repo.index[path] ?? tip[path]
            ctx.out.push(`Descartados los cambios de ${path}`)
            break
          }
          switchTo(
            ctx,
            parsed.rest,
            parsed.values.get('-b') ?? parsed.values.get('-B') ?? null,
            false,
          )
          break
        }
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
        case 'init':
          throw new GitError('ya estás en un repositorio')
        default:
          throw new GitError(`git ${sub ?? ''}: no lo conozco. Escribe help`)
      }
    } else if (program === 'gh' && args[0] === 'pr') {
      command = 'pr'
      pullRequest(ctx, args.slice(1))
    } else throw new GitError(`${program}: orden no encontrada. Escribe help`)

    return { ...ctx.world, output: ctx.out, ok: true, command }
  } catch (error) {
    if (!(error instanceof GitError)) throw error

    return { ...world, output: [...ctx.out, `error: ${error.message}`], ok: false, command }
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
