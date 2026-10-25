/**
 * El sistema de ficheros simulado de una máquina: rutas, permisos y las
 * operaciones de siempre (leer, escribir, crear, borrar). Los ficheros son un
 * mapa plano `ruta absoluta → nodo`; una carpeta es un nodo `dir` y sus hijos
 * son las rutas que cuelgan de ella. Los errores son los de coreutils
 * («No such file or directory», «Permission denied»), para que lo que se
 * aprende aquí se reconozca en un servidor de verdad.
 */

import { drop, LIMITS, own, safeName } from './limits.js'
import type { DirNode, FileNode, FsNode, Machine, User } from './model.js'
import { ShellError } from './model.js'

/** Un fallo de un comando: va a la salida de errores con su código, y la orden sigue. */
export class Fail extends Error {
  constructor(
    message: string,
    readonly code = 1,
  ) {
    super(message)
  }
}

export const ENOENT = 'No such file or directory'
export const EACCES = 'Permission denied'

/** Une y limpia una ruta: `~`, `.`, `..` y barras de más. Siempre absoluta. */
export function normalize(path: string, cwd: string, home: string): string {
  if (path.length > LIMITS.path) throw new Fail(`${path.slice(0, 30)}…: File name too long`)

  let full = path

  if (path === '~' || path.startsWith('~/')) full = home + path.slice(1)
  else if (!path.startsWith('/')) full = `${cwd}/${path}`

  const parts: string[] = []

  for (const part of full.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }

  return `/${parts.join('/')}`
}

export const parentOf = (path: string): string => {
  const at = path.lastIndexOf('/')

  return at <= 0 ? '/' : path.slice(0, at)
}

export const baseOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1) || '/'

const join = (dir: string, name: string): string => (dir === '/' ? `/${name}` : `${dir}/${name}`)

/** Los nombres que cuelgan de una carpeta, en orden. */
export function childrenOf(machine: Machine, dir: string): string[] {
  const prefix = dir === '/' ? '/' : `${dir}/`
  const names: string[] = []

  for (const path of Object.keys(machine.fs)) {
    if (path !== '/' && path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      names.push(path.slice(prefix.length))
  }

  return names.sort((a, b) => a.localeCompare(b, 'en'))
}

/** Todo lo que cuelga de una ruta, a cualquier profundidad (sin ella). */
export function descendantsOf(machine: Machine, dir: string): string[] {
  const prefix = dir === '/' ? '/' : `${dir}/`

  return Object.keys(machine.fs)
    .filter((path) => path !== dir && path.startsWith(prefix))
    .sort()
}

function inGroup(user: User, group: string): boolean {
  return user.groups.includes(group)
}

/** ¿Puede este usuario leer (`r`), escribir (`w`) o entrar/ejecutar (`x`)? */
export function can(user: User, node: FsNode, what: 'r' | 'w' | 'x'): boolean {
  const bit = what === 'r' ? 4 : what === 'w' ? 2 : 1

  if (user.uid === 0) return what !== 'x' || node.kind === 'dir' || (node.mode & 0o111) !== 0

  const shift = user.name === node.owner ? 6 : inGroup(user, node.group) ? 3 : 0

  return ((node.mode >> shift) & bit) !== 0
}

/** Lo que hay en una ruta (siguiendo enlaces) y la ruta real; `null` si no existe. */
export function lookup(
  machine: Machine,
  user: User,
  path: string,
  follow = true,
): { path: string; node: FsNode } | null {
  let current = path

  for (let hop = 0; hop < 8; hop++) {
    // Para llegar hay que poder entrar en cada carpeta del camino.
    let dir = parentOf(current)
    const chain: string[] = []

    while (dir !== '/') {
      chain.unshift(dir)
      dir = parentOf(dir)
    }
    for (const step of ['/', ...chain]) {
      const node = own(machine.fs, step)

      if (node === undefined) return null
      if (node.kind === 'link') {
        const target = normalize(node.target, parentOf(step), '/')
        const rest = current.slice(step.length)

        current = target + rest

        return lookup(machine, user, current, follow)
      }
      if (node.kind !== 'dir') throw new Fail(`${path}: Not a directory`)
      if (!can(user, node, 'x')) throw new Fail(`${path}: ${EACCES}`)
    }

    const node = own(machine.fs, current)

    if (node === undefined) return null
    if (node.kind === 'link' && follow) {
      current = normalize(node.target, parentOf(current), '/')
      continue
    }

    return { path: current, node }
  }

  throw new Fail(`${path}: Too many levels of symbolic links`)
}

export function readText(
  machine: Machine,
  user: User,
  path: string,
  cmd: string,
  shown = path,
): string {
  const found = lookup(machine, user, path)

  if (found === null) throw new Fail(`${cmd}: ${shown}: ${ENOENT}`)
  if (found.node.kind === 'dir') throw new Fail(`${cmd}: ${shown}: Is a directory`)
  if (!can(user, found.node, 'r')) throw new Fail(`${cmd}: ${shown}: ${EACCES}`)

  return found.node.kind === 'file' ? found.node.text : ''
}

/** El dueño y el grupo de lo que cree este usuario. */
const ownership = (user: User) => ({ owner: user.name, group: user.groups[0] ?? user.name })

function checkName(path: string): void {
  for (const part of path.split('/').filter(Boolean)) safeName(part)
}

/** La carpeta donde se va a crear algo: tiene que existir y poder escribirse. */
function writableParent(machine: Machine, user: User, path: string, cmd: string, shown: string) {
  const parent = lookup(machine, user, parentOf(path))

  if (parent === null) throw new Fail(`${cmd}: ${shown}: ${ENOENT}`)
  if (parent.node.kind !== 'dir') throw new Fail(`${cmd}: ${shown}: Not a directory`)
  if (!can(user, parent.node, 'w')) throw new Fail(`${cmd}: ${shown}: ${EACCES}`)

  return parent.path
}

/** Escribe (o añade a) un fichero; lo crea con 644 menos la umask si no existe. */
export function writeText(
  machine: Machine,
  user: User,
  path: string,
  text: string,
  opts: { append?: boolean; cmd: string; shown?: string; now: number; umask: number },
): void {
  const shown = opts.shown ?? path

  if (path === '/dev/null') return

  const found = lookup(machine, user, path)

  if (found !== null) {
    if (found.node.kind === 'dir') throw new Fail(`${opts.cmd}: ${shown}: Is a directory`)
    if (!can(user, found.node, 'w')) throw new Fail(`${opts.cmd}: ${shown}: ${EACCES}`)

    const node = found.node as FileNode
    const next = opts.append === true ? node.text + text : text

    if (next.length > LIMITS.fileChars)
      throw new ShellError(
        `peer4u-sandbox: ${shown} sería demasiado grande: como mucho ${LIMITS.fileChars} caracteres`,
      )
    // Añadir a un registro gordo no lo encoge; reescribirlo, sí.
    const sized = node.size

    node.text = next
    node.mtime = opts.now
    if (opts.append === true && sized !== undefined) node.size = sized + text.length
    else delete node.size

    return
  }
  checkName(path)

  const dir = writableParent(machine, user, path, opts.cmd, shown)
  const real = join(dir, baseOf(path))

  machine.fs[real] = {
    kind: 'file',
    text,
    mode: 0o666 & ~opts.umask,
    ...ownership(user),
    mtime: opts.now,
  }
}

export function makeDir(
  machine: Machine,
  user: User,
  path: string,
  opts: { parents?: boolean; cmd: string; shown?: string; now: number; umask: number },
): void {
  const shown = opts.shown ?? path
  const found = lookup(machine, user, path)

  if (found !== null) {
    if (opts.parents === true && found.node.kind === 'dir') return
    throw new Fail(`${opts.cmd}: cannot create directory '${shown}': File exists`)
  }
  if (opts.parents === true && lookup(machine, user, parentOf(path)) === null)
    makeDir(machine, user, parentOf(path), { ...opts, shown: parentOf(path) })
  checkName(path)

  let dir: string

  try {
    dir = writableParent(machine, user, path, opts.cmd, shown)
  } catch (error) {
    if (error instanceof Fail)
      throw new Fail(
        `${opts.cmd}: cannot create directory '${shown}': ${error.message.split(': ').at(-1) ?? ENOENT}`,
      )
    throw error
  }

  const node: DirNode = {
    kind: 'dir',
    mode: 0o777 & ~opts.umask,
    ...ownership(user),
    mtime: opts.now,
  }

  machine.fs[join(dir, baseOf(path))] = node
}

/** Borra una ruta (y lo que cuelga de ella). Hace falta poder escribir en la carpeta. */
export function removePath(machine: Machine, user: User, path: string, cmd: string, shown: string) {
  const parent = lookup(machine, user, parentOf(path))

  if (parent !== null && !can(user, parent.node, 'w'))
    throw new Fail(`${cmd}: cannot remove '${shown}': ${EACCES}`)
  for (const child of descendantsOf(machine, path)) drop(machine.fs, child)
  drop(machine.fs, path)
}

/** Copia un nodo (y lo que cuelga de él) a otra ruta, de esta máquina o de otra. */
export function copyTree(
  from: Machine,
  to: Machine,
  user: User,
  src: string,
  dst: string,
  opts: { now: number; keep: boolean },
): void {
  const node = own(from.fs, src)

  if (node === undefined) return

  const copy = (each: FsNode): FsNode =>
    opts.keep ? { ...each } : { ...each, ...ownership(user), mtime: opts.now }

  checkName(dst)
  to.fs[dst] = copy(node)
  for (const child of descendantsOf(from, src)) {
    const inner = own(from.fs, child)

    if (inner !== undefined) to.fs[dst + child.slice(src.length)] = copy(inner)
  }
}

/** El tamaño que dice tener un nodo, en bytes. */
export const sizeOf = (node: FsNode): number =>
  node.kind === 'file' ? (node.size ?? node.text.length) : 4096

/** `-rw-r--r--` de un nodo. */
export function modeString(node: FsNode): string {
  const kind = node.kind === 'dir' ? 'd' : node.kind === 'link' ? 'l' : '-'
  let out = kind

  for (const shift of [6, 3, 0]) {
    const bits = (node.mode >> shift) & 7

    out += (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-') + (bits & 1 ? 'x' : '-')
  }

  return out
}

export { join as joinPath }
