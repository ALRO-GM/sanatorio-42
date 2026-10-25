/**
 * Ficheros y carpetas: `ls`, `cd` (en la shell), `mkdir`, `touch`, `cat`,
 * `cp`, `mv`, `rm`, `ln`, `chmod`, `chown`, `find`, `du`, `df`, `tar`,
 * `gzip`, `echo`, `printf`, `tee`… Con las opciones que se usan en el
 * trabajo y la salida con el formato de GNU coreutils.
 */

import {
  baseOf,
  can,
  childrenOf,
  copyTree,
  descendantsOf,
  EACCES,
  ENOENT,
  Fail,
  joinPath,
  lookup,
  makeDir,
  modeString,
  parentOf,
  readText,
  removePath,
  sizeOf,
  writeText,
} from '../fs.js'
import { drop, own } from '../limits.js'
import type { FsNode, Machine } from '../model.js'
import { globMatch } from '../expand.js'
import type { CommandFn, Ctx } from './types.js'
import { getopts, joinLines, linesOf } from './types.js'
import { eachInput, escapes, human, lsDate, printf } from './util.js'

const opts = (ctx: Ctx) => ({ now: ctx.sh.now(), umask: ctx.sh.session().umask })

function find(ctx: Ctx, path: string, follow = true): { path: string; node: FsNode } | null {
  return lookup(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(path), follow)
}

function must(ctx: Ctx, path: string, verb: string): { path: string; node: FsNode } {
  const found = find(ctx, path)

  if (found === null) throw new Fail(`${ctx.name}: ${verb}'${path}': ${ENOENT}`)

  return found
}

/* ---------- ls ---------- */

function lsLine(name: string, node: FsNode, humanSizes: boolean, classify: boolean): string {
  const size = node.kind === 'link' ? node.target.length : sizeOf(node)
  const shown = humanSizes ? human(size) : String(size)
  const mark = classify
    ? node.kind === 'dir'
      ? '/'
      : node.kind === 'link'
        ? '@'
        : (node.mode & 0o111) !== 0
          ? '*'
          : ''
    : ''
  const target = node.kind === 'link' ? ` -> ${node.target}` : ''
  const links = node.kind === 'dir' ? 2 : 1

  return `${modeString(node)} ${links} ${node.owner.padEnd(8)} ${node.group.padEnd(8)} ${shown.padStart(humanSizes ? 4 : 6)} ${lsDate(node.mtime)} ${name}${mark}${target}`
}

const ls: CommandFn = (ctx) => {
  // `-1` (uno por línea) parecería un número negativo: se aparta antes.
  const { flags, rest } = getopts(
    ctx.args.map((arg) => (arg === '-1' ? '--one' : arg)),
    '',
    {
      one: '1',
      all: 'a',
      'almost-all': 'A',
      'human-readable': 'h',
      recursive: 'R',
      reverse: 'r',
      directory: 'd',
      classify: 'F',
    },
  )
  const long = flags.has('l')
  const all = flags.has('a')
  const almost = flags.has('A')
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()
  const targets = rest.length === 0 ? ['.'] : rest
  const out: string[] = []
  let code = 0

  const sorted = (dir: string, names: string[]) => {
    const nodes = names.map((name) => ({
      name,
      node: own(
        machine.fs,
        name === '.' ? dir : name === '..' ? parentOf(dir) : joinPath(dir, name),
      ),
    }))
    let list = nodes.filter(
      (each): each is { name: string; node: FsNode } => each.node !== undefined,
    )

    if (flags.has('t'))
      list = list.sort((a, b) => b.node.mtime - a.node.mtime || a.name.localeCompare(b.name))
    if (flags.has('S'))
      list = list.sort((a, b) => sizeOf(b.node) - sizeOf(a.node) || a.name.localeCompare(b.name))
    if (flags.has('r')) list.reverse()

    return list
  }

  const listDir = (dir: string, label: string | null) => {
    const at = lookup(machine, user, dir)

    if (at?.node.kind !== 'dir') return
    if (!can(user, at.node, 'r')) {
      ctx.io.err(`ls: cannot open directory '${label ?? dir}': ${EACCES}\n`)
      code = 2

      return
    }

    let names = childrenOf(machine, at.path)

    if (!all && !almost) names = names.filter((name) => !name.startsWith('.'))
    if (all) names = ['.', '..', ...names]

    const entries = sorted(at.path, names)

    if (label !== null) out.push(`${label}:`)
    if (long) {
      const blocks = entries.reduce((sum, each) => sum + Math.ceil(sizeOf(each.node) / 4096) * 4, 0)

      out.push(`total ${blocks}`)
      for (const each of entries)
        out.push(lsLine(each.name, each.node, flags.has('h'), flags.has('F')))
    } else if (flags.has('1') || ctx.io.tty !== true) out.push(...entries.map((each) => each.name))
    else if (entries.length > 0)
      out.push(
        entries
          .map((each) => each.name + (flags.has('F') && each.node.kind === 'dir' ? '/' : ''))
          .join('  '),
      )
    if (flags.has('R'))
      for (const each of entries) {
        if (each.node.kind !== 'dir' || each.name === '.' || each.name === '..') continue

        const child = joinPath(at.path, each.name)

        out.push('')
        listDir(child, label === null ? `./${each.name}` : `${label}/${each.name}`)
      }
  }

  const files: string[] = []
  const dirs: string[] = []

  for (const target of targets) {
    let found

    try {
      found = find(ctx, target, !long || target.endsWith('/'))
    } catch (error) {
      if (error instanceof Fail) {
        ctx.io.err(`ls: cannot access '${target}': ${EACCES}\n`)
        code = 2
        continue
      }
      throw error
    }
    if (found === null) {
      ctx.io.err(`ls: cannot access '${target}': ${ENOENT}\n`)
      code = 2
      continue
    }
    if (found.node.kind === 'dir' && !flags.has('d')) dirs.push(target)
    else files.push(long ? lsLine(target, found.node, flags.has('h'), flags.has('F')) : target)
  }
  if (files.length > 0)
    out.push(...(long || flags.has('1') || ctx.io.tty !== true ? files : [files.join('  ')]))
  dirs.forEach((dir, index) => {
    if (files.length > 0 || index > 0) out.push('')
    listDir(
      ctx.sh.abs(dir),
      targets.length > 1 || flags.has('R')
        ? flags.has('R') && targets.length === 1
          ? dir === '.'
            ? '.'
            : dir
          : dir
        : null,
    )
  })
  ctx.io.out(joinLines(out))

  return code
}

/* ---------- Crear, copiar, mover, borrar ---------- */

const mkdir: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'm', { parents: 'p', mode: 'm' })

  if (rest.length === 0) throw new Fail('mkdir: missing operand')
  for (const dir of rest) {
    makeDir(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(dir), {
      parents: flags.has('p'),
      cmd: 'mkdir',
      shown: dir,
      ...opts(ctx),
    })

    const mode = values.get('m')

    if (mode !== undefined) {
      const node = own(ctx.sh.machine().fs, ctx.sh.abs(dir))

      if (node !== undefined) node.mode = parseInt(mode, 8)
    }
    if (flags.has('v')) ctx.io.out(`mkdir: created directory '${dir}'\n`)
  }

  return 0
}

const rmdir: CommandFn = (ctx) => {
  for (const dir of ctx.args.filter((arg) => !arg.startsWith('-'))) {
    const found = must(ctx, dir, 'failed to remove ')

    if (found.node.kind !== 'dir')
      throw new Fail(`rmdir: failed to remove '${dir}': Not a directory`)
    if (childrenOf(ctx.sh.machine(), found.path).length > 0)
      throw new Fail(`rmdir: failed to remove '${dir}': Directory not empty`)
    removePath(ctx.sh.machine(), ctx.sh.user(), found.path, 'rmdir', dir)
  }

  return 0
}

const touch: CommandFn = (ctx) => {
  const { rest } = getopts(ctx.args)

  if (rest.length === 0) throw new Fail('touch: missing file operand')
  for (const file of rest) {
    const found = find(ctx, file)

    if (found === null)
      writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(file), '', {
        cmd: 'touch',
        shown: file,
        ...opts(ctx),
      })
    else {
      if (!can(ctx.sh.user(), found.node, 'w') && found.node.owner !== ctx.sh.user().name)
        throw new Fail(`touch: cannot touch '${file}': ${EACCES}`)
      found.node.mtime = ctx.sh.now()
    }
  }

  return 0
}

/** Adónde va algo que se copia o se mueve: dentro de la carpeta si el destino es una. */
function destination(ctx: Ctx, src: string, dst: string): string {
  const target = find(ctx, dst)

  if (target?.node.kind === 'dir') return joinPath(target.path, baseOf(ctx.sh.abs(src)))

  return ctx.sh.abs(dst)
}

const cp: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { recursive: 'r', archive: 'a', verbose: 'v' })
  const recursive = flags.has('r') || flags.has('R') || flags.has('a')

  if (rest.length < 2)
    throw new Fail(
      rest.length === 0
        ? 'cp: missing file operand'
        : `cp: missing destination file operand after '${rest[0] ?? ''}'`,
    )

  const dst = rest.at(-1) ?? ''
  const sources = rest.slice(0, -1)

  if (sources.length > 1 && find(ctx, dst)?.node.kind !== 'dir')
    throw new Fail(`cp: target '${dst}': Not a directory`)

  let code = 0
  const machine = ctx.sh.machine()

  for (const src of sources) {
    const found = find(ctx, src)

    if (found === null) {
      ctx.io.err(`cp: cannot stat '${src}': ${ENOENT}\n`)
      code = 1
      continue
    }
    if (found.node.kind === 'dir' && !recursive) {
      ctx.io.err(`cp: -r not specified; omitting directory '${src}'\n`)
      code = 1
      continue
    }
    if (!can(ctx.sh.user(), found.node, 'r')) {
      ctx.io.err(`cp: cannot open '${src}' for reading: ${EACCES}\n`)
      code = 1
      continue
    }

    const to = destination(ctx, src, dst)

    if (to === found.path || to.startsWith(`${found.path}/`)) {
      ctx.io.err(`cp: cannot copy a directory, '${src}', into itself, '${dst}'\n`)
      code = 1
      continue
    }
    if (found.node.kind === 'file') {
      writeText(machine, ctx.sh.user(), to, found.node.text, {
        cmd: 'cp',
        shown: dst,
        ...opts(ctx),
      })

      const copy = own(machine.fs, to)

      if (copy?.kind === 'file') {
        if (found.node.size !== undefined) copy.size = found.node.size
        if (flags.has('a') || flags.has('p'))
          Object.assign(copy, {
            mode: found.node.mode,
            mtime: found.node.mtime,
            owner: found.node.owner,
            group: found.node.group,
          })
      }
    } else {
      const parent = lookup(machine, ctx.sh.user(), parentOf(to))

      if (parent === null) throw new Fail(`cp: cannot create directory '${dst}': ${ENOENT}`)
      if (!can(ctx.sh.user(), parent.node, 'w'))
        throw new Fail(`cp: cannot create directory '${dst}': ${EACCES}`)
      copyTree(machine, machine, ctx.sh.user(), found.path, to, {
        now: ctx.sh.now(),
        keep: flags.has('a'),
      })
    }
    if (flags.has('v')) ctx.io.out(`'${src}' -> '${to}'\n`)
  }

  return code
}

const mv: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)

  if (rest.length < 2)
    throw new Fail(
      rest.length === 0
        ? 'mv: missing file operand'
        : `mv: missing destination file operand after '${rest[0] ?? ''}'`,
    )

  const dst = rest.at(-1) ?? ''
  const sources = rest.slice(0, -1)
  const machine = ctx.sh.machine()

  if (sources.length > 1 && find(ctx, dst)?.node.kind !== 'dir')
    throw new Fail(`mv: target '${dst}': Not a directory`)

  let code = 0

  for (const src of sources) {
    const found = find(ctx, src, false)

    if (found === null) {
      ctx.io.err(`mv: cannot stat '${src}': ${ENOENT}\n`)
      code = 1
      continue
    }

    const to = destination(ctx, src, dst)

    if (to === found.path) continue
    if (to.startsWith(`${found.path}/`)) {
      ctx.io.err(`mv: cannot move '${src}' to a subdirectory of itself, '${dst}'\n`)
      code = 1
      continue
    }

    const from = lookup(machine, ctx.sh.user(), parentOf(found.path))
    const into = lookup(machine, ctx.sh.user(), parentOf(to))

    if (into === null) throw new Fail(`mv: cannot move '${src}' to '${dst}': ${ENOENT}`)
    if (
      (from !== null && !can(ctx.sh.user(), from.node, 'w')) ||
      !can(ctx.sh.user(), into.node, 'w')
    )
      throw new Fail(`mv: cannot move '${src}' to '${dst}': ${EACCES}`)
    if (own(machine.fs, to)?.kind === 'dir' && found.node.kind !== 'dir')
      throw new Fail(`mv: cannot overwrite directory '${dst}' with non-directory`)
    // Mover es cambiar la ruta (de él y de lo que cuelga): el contenido no se toca.
    for (const child of [found.path, ...descendantsOf(machine, found.path)]) {
      const node = own(machine.fs, child)

      if (node === undefined) continue
      drop(machine.fs, child)
      machine.fs[to + child.slice(found.path.length)] = node
    }
    if (flags.has('v')) ctx.io.out(`renamed '${src}' -> '${dst}'\n`)
  }

  return code
}

const rm: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { recursive: 'r', force: 'f', verbose: 'v' })
  const recursive = flags.has('r') || flags.has('R')
  const machine = ctx.sh.machine()
  let code = 0

  if (rest.length === 0 && !flags.has('f')) throw new Fail('rm: missing operand')
  for (const target of rest) {
    const path = ctx.sh.abs(target)

    if (
      path === '/' ||
      (recursive && ['/etc', '/usr', '/bin', '/var', '/home', '/boot', '/root'].includes(path))
    ) {
      ctx.io.err(
        path === '/'
          ? "rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n"
          : `rm: peer4u-sandbox: borrar ${path} entero rompería el servidor; aquí no se deja\n`,
      )
      code = 1
      continue
    }

    const found = find(ctx, target, false)

    if (found === null) {
      if (!flags.has('f')) {
        ctx.io.err(`rm: cannot remove '${target}': ${ENOENT}\n`)
        code = 1
      }
      continue
    }
    if (found.node.kind === 'dir' && !recursive) {
      ctx.io.err(`rm: cannot remove '${target}': Is a directory\n`)
      code = 1
      continue
    }
    try {
      removePath(machine, ctx.sh.user(), found.path, 'rm', target)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`${error.message}\n`)
      code = 1
      continue
    }
    if (flags.has('v')) ctx.io.out(`removed '${target}'\n`)
  }

  return code
}

const ln: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)

  if (!flags.has('s'))
    throw new Fail('ln: en el simulador solo hay enlaces simbólicos: usa ln -s destino nombre')

  const [target, name] = rest

  if (target === undefined) throw new Fail('ln: missing file operand')

  const link = ctx.sh.abs(name ?? baseOf(target))
  const machine = ctx.sh.machine()
  const existing = own(machine.fs, link)

  if (existing !== undefined) {
    if (!flags.has('f'))
      throw new Fail(`ln: failed to create symbolic link '${name ?? baseOf(target)}': File exists`)
    drop(machine.fs, link)
  }
  writeText(machine, ctx.sh.user(), link, '', { cmd: 'ln', ...opts(ctx) })

  const user = ctx.sh.user()

  machine.fs[link] = {
    kind: 'link',
    target,
    mode: 0o777,
    owner: user.name,
    group: user.groups[0] ?? user.name,
    mtime: ctx.sh.now(),
  }

  return 0
}

/* ---------- Permisos ---------- */

/** `u+x`, `go-w`, `a=r`, `+x`, `755`: el modo nuevo. */
function newMode(spec: string, mode: number, isDir: boolean): number {
  if (/^[0-7]{3,4}$/.test(spec)) return parseInt(spec, 8)

  let result = mode

  for (const clause of spec.split(',')) {
    const parsed = /^([ugoa]*)([-+=])([rwxX]*)$/.exec(clause)

    if (parsed === null) throw new Fail(`chmod: invalid mode: '${spec}'`)

    const [, who = '', op, perms = ''] = parsed
    const targets = who === '' || who.includes('a') ? 'ugo' : who
    let bits = 0

    for (const p of perms)
      bits |=
        p === 'r'
          ? 4
          : p === 'w'
            ? 2
            : p === 'x' || (p === 'X' && (isDir || (mode & 0o111) !== 0))
              ? 1
              : 0
    for (const t of targets) {
      const shift = t === 'u' ? 6 : t === 'g' ? 3 : 0

      if (op === '+') result |= bits << shift
      else if (op === '-') result &= ~(bits << shift)
      else result = (result & ~(7 << shift)) | (bits << shift)
    }
  }

  return result
}

function eachPath(
  ctx: Ctx,
  paths: string[],
  recursive: boolean,
  fn: (path: string, node: FsNode, shown: string) => void,
): number {
  let code = 0
  const machine = ctx.sh.machine()

  for (const target of paths) {
    const found = find(ctx, target)

    if (found === null) {
      ctx.io.err(`${ctx.name}: cannot access '${target}': ${ENOENT}\n`)
      code = 1
      continue
    }

    const all = recursive ? [found.path, ...descendantsOf(machine, found.path)] : [found.path]

    for (const path of all) {
      const node = own(machine.fs, path)

      if (node !== undefined) fn(path, node, path === found.path ? target : path)
    }
  }

  return code
}

const chmod: CommandFn = (ctx) => {
  const recursive = ctx.args.includes('-R')
  const args = ctx.args.filter((arg) => arg !== '-R' && arg !== '-v' && arg !== '--recursive')
  const [spec, ...paths] = args

  if (spec === undefined || paths.length === 0)
    throw new Fail(`chmod: missing operand${spec === undefined ? '' : ` after '${spec}'`}`)

  const user = ctx.sh.user()

  return eachPath(ctx, paths, recursive, (_path, node, shown) => {
    if (user.uid !== 0 && node.owner !== user.name)
      throw new Fail(`chmod: changing permissions of '${shown}': Operation not permitted`)
    node.mode = newMode(spec, node.mode, node.kind === 'dir')
  })
}

const chown: CommandFn = (ctx) => {
  const recursive = ctx.args.includes('-R')
  const [spec, ...paths] = ctx.args.filter((arg) => !arg.startsWith('-'))

  if (spec === undefined || paths.length === 0) throw new Fail(`${ctx.name}: missing operand`)

  const machine = ctx.sh.machine()
  const [owner, group] = ctx.name === 'chgrp' ? [undefined, spec] : spec.split(/[:.]/)

  if (owner !== undefined && owner !== '' && own(machine.users, owner) === undefined)
    throw new Fail(`chown: invalid user: '${spec}'`)
  if (group !== '' && own(machine.groups, group) === undefined)
    throw new Fail(`${ctx.name}: invalid group: '${spec}'`)

  const user = ctx.sh.user()

  return eachPath(ctx, paths, recursive, (_path, node, shown) => {
    if (user.uid !== 0)
      throw new Fail(`${ctx.name}: changing ownership of '${shown}': Operation not permitted`)
    if (owner !== undefined && owner !== '') node.owner = owner
    if (group !== '') node.group = group
    else if (spec.endsWith(':') && owner !== undefined)
      node.group = own(machine.users, owner)?.groups[0] ?? node.group
  })
}

const stat: CommandFn = (ctx) => {
  let code = 0

  for (const target of ctx.args.filter((arg) => !arg.startsWith('-'))) {
    const found = find(ctx, target, false)

    if (found === null) {
      ctx.io.err(`stat: cannot statx '${target}': ${ENOENT}\n`)
      code = 1
      continue
    }

    const { node } = found
    const kind =
      node.kind === 'dir'
        ? 'directory'
        : node.kind === 'link'
          ? 'symbolic link'
          : sizeOf(node) === 0
            ? 'regular empty file'
            : 'regular file'

    ctx.io.out(
      `  File: ${target}\n  Size: ${sizeOf(node)}\t\t${kind}\nAccess: (0${(node.mode & 0o777).toString(8)}/${modeString(node)})  Uid: (${node.owner})   Gid: (${node.group})\nModify: ${lsDate(node.mtime)}\n`,
    )
  }

  return code
}

/** `truncate -s 0 f`: vaciar un fichero sin borrarlo (quien lo tiene abierto sigue escribiendo en él). */
const truncate: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 's', { size: 's' })
  const size = values.get('s')

  if (size === undefined || rest.length === 0)
    throw new Fail("truncate: you must specify either '--size' or '--reference'")
  if (size !== '0')
    throw new Fail('truncate: en el simulador solo se vacía del todo: truncate -s 0 fichero')
  for (const file of rest)
    writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(file), '', {
      cmd: 'truncate',
      shown: file,
      ...opts(ctx),
    })

  return 0
}

/* ---------- Leer y escribir ---------- */

const cat: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)
  let n = 0

  return eachInput(ctx, rest, ({ text }) => {
    if (text.startsWith('#peer4u-gzip') || text.startsWith('#peer4u-tar')) {
      ctx.io.out('\u001f\u008b\b\u0000 (datos comprimidos: usa zcat, tar -tzf o tar -xzf)\n')

      return
    }
    ctx.io.out(
      flags.has('n')
        ? joinLines(linesOf(text).map((line) => `${String(++n).padStart(6)}\t${line}`))
        : text,
    )
  })
}

const echo: CommandFn = (ctx) => {
  let args = ctx.args
  let newline = true
  let interpret = false

  while (args[0] !== undefined && /^-[neE]+$/.test(args[0])) {
    if (args[0].includes('n')) newline = false
    if (args[0].includes('e')) interpret = true
    args = args.slice(1)
  }

  const text = args.join(' ')

  ctx.io.out((interpret ? escapes(text) : text) + (newline ? '\n' : ''))

  return 0
}

const printfCmd: CommandFn = (ctx) => {
  const [format, ...args] = ctx.args

  if (format === undefined) throw new Fail('printf: usage: printf format [arguments]', 2)
  ctx.io.out(printf(format, args))

  return 0
}

const tee: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)
  const text = ctx.io.stdin.readAll()

  for (const file of rest)
    writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(file), text, {
      append: flags.has('a'),
      cmd: 'tee',
      shown: file,
      ...opts(ctx),
    })
  ctx.io.out(text)

  return 0
}

const basename: CommandFn = (ctx) => {
  const [path = '', suffix] = ctx.args
  let base = baseOf(path.replace(/\/+$/, '') || '/')

  if (suffix !== undefined && base.endsWith(suffix) && base !== suffix)
    base = base.slice(0, -suffix.length)
  ctx.io.out(`${base}\n`)

  return 0
}

const dirname: CommandFn = (ctx) => {
  const path = ctx.args[0] ?? '.'

  ctx.io.out(`${path.includes('/') ? parentOf(path.replace(/\/+$/, '')) : '.'}\n`)

  return 0
}

const realpath: CommandFn = (ctx) => {
  for (const path of ctx.args.filter((arg) => !arg.startsWith('-')))
    ctx.io.out(`${find(ctx, path)?.path ?? ctx.sh.abs(path)}\n`)

  return 0
}

const file: CommandFn = (ctx) => {
  for (const path of ctx.args) {
    const found = find(ctx, path, false)

    if (found === null) ctx.io.out(`${path}: cannot open \`${path}' (No such file or directory)\n`)
    else if (found.node.kind === 'dir') ctx.io.out(`${path}: directory\n`)
    else if (found.node.kind === 'link')
      ctx.io.out(`${path}: symbolic link to ${found.node.target}\n`)
    else {
      const text = found.node.text

      ctx.io.out(
        `${path}: ${
          text.startsWith('#peer4u-gzip')
            ? 'gzip compressed data'
            : text.startsWith('#peer4u-tar')
              ? 'POSIX tar archive'
              : text.startsWith('#!/bin/bash') || text.startsWith('#!/usr/bin/env bash')
                ? 'Bourne-Again shell script, ASCII text executable'
                : text.startsWith('#!')
                  ? 'POSIX shell script, ASCII text executable'
                  : text === ''
                    ? 'empty'
                    : text.trimStart().startsWith('{')
                      ? 'JSON text data'
                      : 'ASCII text'
        }\n`,
      )
    }
  }

  return 0
}

const tree: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'L')
  const root = rest[0] ?? '.'
  const found = must(ctx, root, 'cannot access ')
  const machine = ctx.sh.machine()
  const max = Number(values.get('L') ?? 20)
  let dirs = 0
  let files = 0
  const out = [root]

  const walk = (dir: string, prefix: string, depth: number) => {
    if (depth > max) return

    const names = childrenOf(machine, dir).filter((name) => flags.has('a') || !name.startsWith('.'))

    names.forEach((name, index) => {
      const last = index === names.length - 1
      const path = joinPath(dir, name)
      const node = own(machine.fs, path)

      out.push(`${prefix}${last ? '└── ' : '├── '}${name}`)
      if (node?.kind === 'dir') {
        dirs++
        walk(path, `${prefix}${last ? '    ' : '│   '}`, depth + 1)
      } else files++
    })
  }

  walk(found.path, '', 1)
  out.push(
    '',
    `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`,
  )
  ctx.io.out(joinLines(out))

  return 0
}

/* ---------- find ---------- */

type Pred = (path: string, node: FsNode, depth: number) => boolean

const findCmd: CommandFn = (ctx) => {
  const args = ctx.args
  const starts: string[] = []
  let i = 0

  while (i < args.length && !(args[i] ?? '').startsWith('-') && args[i] !== '!' && args[i] !== '(')
    starts.push(args[i++] ?? '')
  if (starts.length === 0) starts.push('.')

  let maxdepth = Infinity
  let mindepth = 0
  let acted = false
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()
  const toDelete: string[] = []
  const batches: { cmd: string[]; paths: string[] }[] = []
  let code = 0
  const shownOf = new Map<string, string>()

  const sizeTest = (spec: string): Pred => {
    const parsed = /^([-+]?)(\d+)([ckMG]?)$/.exec(spec)

    if (parsed === null) throw new Fail(`find: invalid argument \`${spec}' to \`-size'`)

    const [, sign, number = '0', unit] = parsed
    const scale =
      unit === 'c'
        ? 1
        : unit === 'k'
          ? 1024
          : unit === 'M'
            ? 1024 ** 2
            : unit === 'G'
              ? 1024 ** 3
              : 512
    const n = Number(number)

    return (_p, node) => {
      if (node.kind !== 'file') return false

      const units = Math.ceil(sizeOf(node) / scale)

      return sign === '+' ? units > n : sign === '-' ? units < n : units === n
    }
  }
  const timeTest = (spec: string, unit: number): Pred => {
    const parsed = /^([-+]?)(\d+)$/.exec(spec)

    if (parsed === null) throw new Fail(`find: invalid argument \`${spec}'`)

    const n = Number(parsed[2])

    return (_p, node) => {
      const age = Math.floor((ctx.sh.now() - node.mtime) / unit)

      return parsed[1] === '+' ? age > n : parsed[1] === '-' ? age < n : age === n
    }
  }

  function primary(): Pred {
    const arg = args[i++]
    const value = () => {
      const v = args[i++]

      if (v === undefined) throw new Fail(`find: missing argument to \`${arg ?? ''}'`)

      return v
    }

    switch (arg) {
      case '(': {
        const inner = disjunction()

        if (args[i++] !== ')') throw new Fail("find: invalid expression; you have too many '('")

        return inner
      }
      case '!':
      case '-not': {
        const inner = primary()

        return (p, n, d) => !inner(p, n, d)
      }
      case '-name':
      case '-iname': {
        const pattern = value()
        const icase = arg === '-iname'

        return (p) =>
          globMatch(
            icase ? pattern.toLowerCase() : pattern,
            icase ? baseOf(p).toLowerCase() : baseOf(p),
            ctx.sh.budget,
          )
      }
      case '-path':
      case '-wholename': {
        const pattern = value()

        return (p) => globMatch(pattern, shownOf.get(p) ?? p, ctx.sh.budget)
      }
      case '-type': {
        const kind = value()

        return (_p, node) =>
          kind === 'f'
            ? node.kind === 'file'
            : kind === 'd'
              ? node.kind === 'dir'
              : kind === 'l'
                ? node.kind === 'link'
                : false
      }
      case '-size':
        return sizeTest(value())
      case '-mtime':
        return timeTest(value(), 86_400)
      case '-mmin':
        return timeTest(value(), 60)
      case '-user': {
        const name = value()

        return (_p, node) => node.owner === name
      }
      case '-group': {
        const name = value()

        return (_p, node) => node.group === name
      }
      case '-perm': {
        const spec = value()
        const want = parseInt(spec.replace(/^[-/]/, ''), 8)

        return (_p, node) =>
          spec.startsWith('-')
            ? (node.mode & want) === want
            : spec.startsWith('/')
              ? (node.mode & want) !== 0
              : (node.mode & 0o7777) === want
      }
      case '-empty':
        return (p, node) =>
          node.kind === 'dir' ? childrenOf(machine, p).length === 0 : sizeOf(node) === 0
      case '-newer': {
        const ref = must(ctx, value(), 'cannot stat ').node.mtime

        return (_p, node) => node.mtime > ref
      }
      case '-maxdepth':
        maxdepth = Number(value())

        return () => true
      case '-mindepth':
        mindepth = Number(value())

        return () => true
      case '-print':
        acted = true

        return (p) => {
          ctx.io.out(`${shownOf.get(p) ?? p}\n`)

          return true
        }
      case '-delete':
        acted = true

        return (p) => {
          toDelete.push(p)

          return true
        }
      case '-exec':
      case '-ok': {
        acted = true

        const cmd: string[] = []

        while (i < args.length && args[i] !== ';' && args[i] !== '+') cmd.push(args[i++] ?? '')

        const end = args[i++]

        if (end === undefined) throw new Fail("find: missing argument to `-exec'")
        if (end === '+') {
          const batch = { cmd, paths: [] as string[] }

          batches.push(batch)

          return (p) => {
            batch.paths.push(shownOf.get(p) ?? p)

            return true
          }
        }

        return (p) => {
          const shown = shownOf.get(p) ?? p
          const argv = cmd.map((part) => part.replaceAll('{}', shown))

          return ctx.sh.runArgv(argv, { ...ctx.io, tty: false }) === 0
        }
      }
      default:
        throw new Fail(`find: unknown predicate \`${arg ?? ''}'`)
    }
  }

  function conjunction(): Pred {
    let left = primary()

    while (i < args.length && args[i] !== ')' && args[i] !== '-o' && args[i] !== '-or') {
      if (args[i] === '-a' || args[i] === '-and') i++

      const a = left
      const b = primary()

      left = (p, n, d) => a(p, n, d) && b(p, n, d)
    }

    return left
  }

  function disjunction(): Pred {
    let left = conjunction()

    while (args[i] === '-o' || args[i] === '-or') {
      i++

      const a = left
      const b = conjunction()

      left = (p, n, d) => a(p, n, d) || b(p, n, d)
    }

    return left
  }

  const test: Pred = i < args.length ? disjunction() : () => true

  if (i < args.length) throw new Fail(`find: paths must precede expression: \`${args[i] ?? ''}'`)

  for (const start of starts) {
    const found = find(ctx, start)

    if (found === null) {
      ctx.io.err(`find: '${start}': ${ENOENT}\n`)
      code = 1
      continue
    }

    const walk = (path: string, shown: string, depth: number) => {
      ctx.sh.budget.tick(5)

      const node = own(machine.fs, path)

      if (node === undefined) return
      shownOf.set(path, shown)
      if (depth >= mindepth && depth <= maxdepth && test(path, node, depth) && !acted)
        ctx.io.out(`${shown}\n`)
      if (node.kind !== 'dir' || depth >= maxdepth) return
      if (!can(user, node, 'r') || !can(user, node, 'x')) {
        ctx.io.err(`find: '${shown}': ${EACCES}\n`)
        code = 1

        return
      }
      for (const name of childrenOf(machine, path))
        walk(
          joinPath(path, name),
          shown === '/' ? `/${name}` : `${shown.replace(/\/$/, '')}/${name}`,
          depth + 1,
        )
    }

    walk(found.path, start, 0)
  }
  for (const batch of batches)
    if (
      batch.paths.length > 0 &&
      ctx.sh.runArgv([...batch.cmd.filter((part) => part !== '{}'), ...batch.paths], {
        ...ctx.io,
        tty: false,
      }) !== 0
    )
      code = 1
  for (const path of toDelete.reverse()) {
    const node = own(machine.fs, path)

    if (node?.kind === 'dir' && childrenOf(machine, path).length > 0) {
      ctx.io.err(`find: cannot delete '${shownOf.get(path) ?? path}': Directory not empty\n`)
      code = 1
      continue
    }
    try {
      removePath(machine, user, path, 'find', shownOf.get(path) ?? path)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`find: cannot delete '${shownOf.get(path) ?? path}': ${EACCES}\n`)
      code = 1
    }
  }

  return code
}

/* ---------- Espacio en disco ---------- */

/** Lo que ocupa algo en disco, en bloques de 1 KiB (redondeado a 4 KiB, como ext4). */
function usage(machine: Machine, path: string): number {
  const node = own(machine.fs, path)

  if (node === undefined) return 0

  const self = Math.ceil(sizeOf(node) / 4096) * 4

  if (node.kind !== 'dir') return self

  return descendantsOf(machine, path).reduce((sum, child) => {
    const each = own(machine.fs, child)

    return sum + (each === undefined ? 0 : Math.ceil(sizeOf(each) / 4096) * 4)
  }, self)
}

const du: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'd', {
    'max-depth': 'd',
    summarize: 's',
    'human-readable': 'h',
  })
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()
  const max = flags.has('s') ? 0 : values.has('d') ? Number(values.get('d')) : Infinity
  const show = (kb: number) => (flags.has('h') ? human(kb * 1024) : String(kb))
  let total = 0
  let code = 0

  for (const target of rest.length === 0 ? ['.'] : rest) {
    const found = find(ctx, target)

    if (found === null) {
      ctx.io.err(`du: cannot access '${target}': ${ENOENT}\n`)
      code = 1
      continue
    }

    const lines: string[] = []
    const walk = (path: string, shown: string, depth: number): void => {
      const node = own(machine.fs, path)

      if (node === undefined) return
      if (node.kind === 'dir') {
        if (!can(user, node, 'r')) {
          ctx.io.err(`du: cannot read directory '${shown}': ${EACCES}\n`)
          code = 1

          return
        }
        for (const name of childrenOf(machine, path))
          walk(joinPath(path, name), `${shown.replace(/\/$/, '')}/${name}`, depth + 1)
      } else if (depth > 0 && (!flags.has('a') || depth > max)) return
      if (depth <= max) lines.push(`${show(usage(machine, path))}\t${shown}`)
    }

    walk(found.path, target, 0)
    total += usage(machine, found.path)
    ctx.io.out(joinLines(lines))
  }
  if (flags.has('c')) ctx.io.out(`${show(total)}\ttotal\n`)

  return code
}

/** Lo que ocupa una máquina: lo del sistema más sus ficheros. */
export function diskUsed(machine: Machine): number {
  return (
    machine.baseUsed +
    Object.values(machine.fs).reduce(
      (sum, node) => sum + (node.kind === 'file' ? sizeOf(node) : 0),
      0,
    )
  )
}

const df: CommandFn = (ctx) => {
  const { flags } = getopts(ctx.args)
  const machine = ctx.sh.machine()
  const used = diskUsed(machine)
  const size = machine.disk
  const avail = Math.max(0, size - used)
  const pct = `${Math.min(100, Math.ceil((used / size) * 100))}%`
  const show = (bytes: number) => (flags.has('h') ? human(bytes) : String(Math.round(bytes / 1024)))
  const header = flags.has('h')
    ? 'Filesystem      Size  Used Avail Use% Mounted on'
    : 'Filesystem     1K-blocks     Used Available Use% Mounted on'
  const row = (fs: string, s: number, u: number, a: number, p: string, at: string) =>
    flags.has('h')
      ? `${fs.padEnd(14)} ${show(s).padStart(5)} ${show(u).padStart(5)} ${show(a).padStart(5)} ${p.padStart(4)} ${at}`
      : `${fs.padEnd(14)} ${show(s).padStart(9)} ${show(u).padStart(8)} ${show(a).padStart(9)} ${p.padStart(4)} ${at}`

  ctx.io.out(
    joinLines([
      header,
      row('tmpfs', 400 * 1024 ** 2, 1024 ** 2, 399 * 1024 ** 2, '1%', '/run'),
      row('/dev/sda1', size, used, avail, pct, '/'),
      row('/dev/sda15', 105 * 1024 ** 2, 6 * 1024 ** 2, 99 * 1024 ** 2, '6%', '/boot/efi'),
    ]),
  )

  return 0
}

/* ---------- Paquetes: tar y gzip ---------- */

type Archive = { files: { path: string; node: FsNode }[] }

const GZ = '#peer4u-gzip v1\n'
const TAR = '#peer4u-tar v1\n'

function packTar(archive: Archive): string {
  return TAR + JSON.stringify(archive)
}

function unpackTar(text: string, name: string): Archive {
  const plain = text.startsWith(GZ) ? text.slice(GZ.length) : text

  if (!plain.startsWith(TAR))
    throw new Fail(`tar: ${name}: This does not look like a tar archive`, 2)
  try {
    return JSON.parse(plain.slice(TAR.length)) as Archive
  } catch {
    throw new Fail(`tar: ${name}: archivo dañado`, 2)
  }
}

/** Lo que dice ocupar un comprimido: una quinta parte (los registros comprimen bien). */
const compressed = (text: string, size: number): number =>
  Math.max(20, Math.round(size / 5) + (text.length > 0 ? 0 : 0))

const tar: CommandFn = (ctx) => {
  let args = ctx.args

  // `tar czf x.tgz dir` (sin guion) = `tar -czf x.tgz dir`.
  if (args[0] !== undefined && !args[0].startsWith('-') && /^[cxtzvfC]+$/.test(args[0]))
    args = [`-${args[0]}`, ...args.slice(1)]

  const { flags, values, rest } = getopts(args, 'fC', {
    create: 'c',
    extract: 'x',
    list: 't',
    gzip: 'z',
    file: 'f',
    directory: 'C',
    verbose: 'v',
  })
  const file = values.get('f')
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()

  if (file === undefined)
    throw new Fail(
      'tar: en el simulador hay que decir el fichero con -f (tar -czf copia.tar.gz carpeta)',
      2,
    )
  if (flags.has('c')) {
    if (rest.length === 0) throw new Fail('tar: Cowardly refusing to create an empty archive', 2)

    const files: Archive['files'] = []
    let size = 0
    const base = values.has('C') ? ctx.sh.abs(values.get('C') ?? '.') : ctx.sh.session().cwd

    for (const target of rest) {
      const found = lookup(
        machine,
        user,
        ctx.sh.abs(target.startsWith('/') ? target : joinPath(base, target)),
      )

      if (found === null) {
        ctx.io.err(`tar: ${target}: Cannot stat: ${ENOENT}\n`)
        continue
      }

      const clean = target.replace(/^\/+/, '').replace(/\/+$/, '')

      for (const path of [found.path, ...descendantsOf(machine, found.path)]) {
        const node = own(machine.fs, path)

        if (node === undefined) continue
        if (node.kind === 'file' && !can(user, node, 'r')) {
          ctx.io.err(`tar: ${path}: Cannot open: ${EACCES}\n`)
          continue
        }

        const name = clean + path.slice(found.path.length)

        files.push({ path: name, node: { ...node } })
        size += sizeOf(node)
        if (flags.has('v')) ctx.io.out(`${name}${node.kind === 'dir' ? '/' : ''}\n`)
      }
    }
    if (target(rest, ctx).includes(ctx.sh.abs(file)))
      throw new Fail('tar: el archivo no puede estar dentro de lo que se empaqueta', 2)

    let text = packTar({ files })

    if (flags.has('z') || file.endsWith('.gz') || file.endsWith('.tgz')) text = GZ + text
    writeText(machine, user, ctx.sh.abs(file), text, { cmd: 'tar', shown: file, ...opts(ctx) })

    const node = own(machine.fs, ctx.sh.abs(file))

    if (node?.kind === 'file')
      node.size = text.startsWith(GZ) ? compressed(text, size) : size + 10240

    return 0
  }

  const archive = unpackTar(readText(machine, user, ctx.sh.abs(file), 'tar', file), file)

  if (flags.has('t')) {
    for (const each of archive.files)
      ctx.io.out(
        flags.has('v')
          ? `${modeString(each.node)} ${each.node.owner}/${each.node.group} ${String(sizeOf(each.node)).padStart(8)} ${lsDate(each.node.mtime)} ${each.path}\n`
          : `${each.path}${each.node.kind === 'dir' ? '/' : ''}\n`,
      )

    return 0
  }
  if (flags.has('x')) {
    const into = values.has('C') ? ctx.sh.abs(values.get('C') ?? '.') : ctx.sh.session().cwd
    const dir = lookup(machine, user, into)

    if (dir?.node.kind !== 'dir')
      throw new Fail(`tar: ${values.get('C') ?? into}: Cannot open: ${ENOENT}`, 2)
    if (!can(user, dir.node, 'w'))
      throw new Fail(`tar: ${values.get('C') ?? into}: Cannot open: ${EACCES}`, 2)
    for (const each of archive.files) {
      if (each.path.split('/').includes('..'))
        throw new Fail(`tar: ${each.path}: Member name contains '..'`, 2)

      const path = joinPath(dir.path, each.path)

      if (
        rest.length > 0 &&
        !rest.some(
          (wanted) =>
            each.path === wanted.replace(/\/$/, '') ||
            each.path.startsWith(`${wanted.replace(/\/$/, '')}/`),
        )
      )
        continue
      machine.fs[path] = {
        ...each.node,
        owner: user.uid === 0 ? each.node.owner : user.name,
        group: user.uid === 0 ? each.node.group : (user.groups[0] ?? user.name),
      }
      if (flags.has('v')) ctx.io.out(`${each.path}\n`)
    }

    return 0
  }
  throw new Fail("tar: You must specify one of the '-Acdtrux' options", 2)
}

function target(rest: string[], ctx: Ctx): string[] {
  const machine = ctx.sh.machine()

  return rest.flatMap((each) => {
    const path = ctx.sh.abs(each)

    return [path, ...descendantsOf(machine, path)]
  })
}

const gzip: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { decompress: 'd', keep: 'k', stdout: 'c' })
  const decompress = flags.has('d') || ctx.name === 'gunzip'
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()

  if (rest.length === 0) throw new Fail(`${ctx.name}: compressed data not written to a terminal.`)
  for (const name of rest) {
    const path = ctx.sh.abs(name)
    const found = lookup(machine, user, path)

    if (found?.node.kind !== 'file')
      throw new Fail(`${ctx.name}: ${name}: ${found === null ? ENOENT : 'Is a directory'}`)

    const node = found.node
    const parent = lookup(machine, user, parentOf(path))

    if (parent !== null && !can(user, parent.node, 'w'))
      throw new Fail(`${ctx.name}: ${name}: ${EACCES}`)
    if (decompress) {
      if (!name.endsWith('.gz') || !node.text.startsWith(GZ))
        throw new Fail(`gzip: ${name}: not in gzip format`)

      const out = path.slice(0, -3)
      const original = node.text.slice(GZ.length)

      if (flags.has('c')) {
        ctx.io.out(original)
        continue
      }
      // Descomprimido vuelve a su tamaño de verdad (el del texto).
      const copy: FsNode = { ...node, text: original }

      drop(copy, 'size')
      machine.fs[out] = copy
      if (!flags.has('k')) drop(machine.fs, path)
    } else {
      if (name.endsWith('.gz')) throw new Fail(`gzip: ${name} already has .gz suffix -- unchanged`)

      const text = GZ + node.text

      machine.fs[`${path}.gz`] = { ...node, text, size: compressed(text, sizeOf(node)) }
      if (!flags.has('k')) drop(machine.fs, path)
    }
  }

  return 0
}

const zcat: CommandFn = (ctx) => {
  return eachInput(ctx, ctx.args, ({ name, text }) => {
    if (!text.startsWith(GZ)) throw new Fail(`gzip: ${name}: not in gzip format`)
    ctx.io.out(text.slice(GZ.length))
  })
}

/** El texto de un fichero, también si está comprimido (para `zgrep`). */
export function plainText(text: string): string {
  return text.startsWith(GZ) ? text.slice(GZ.length) : text
}

export const FILE_COMMANDS: Record<string, CommandFn> = {
  ls,
  mkdir,
  rmdir,
  touch,
  truncate,
  cp,
  mv,
  rm,
  ln,
  chmod,
  chown,
  chgrp: chown,
  stat,
  cat,
  echo,
  printf: printfCmd,
  tee,
  basename,
  dirname,
  realpath,
  readlink: realpath,
  file,
  tree,
  find: findCmd,
  du,
  df,
  tar,
  gzip,
  gunzip: gzip,
  zcat,
}
