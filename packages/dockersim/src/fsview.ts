/**
 * Lo que ve un contenedor como su sistema de ficheros: la imagen (de solo
 * lectura), su capa escribible encima y lo montado (volúmenes con nombre y
 * carpetas del anfitrión). Un montaje tapa lo que hubiera debajo en la imagen,
 * como en Docker; lo escrito en un bind mount aparece en el anfitrión y lo
 * escrito en la capa se pierde al borrar el contenedor.
 */

import { Fail, lookup, makeDir, writeText } from '@sanatorio/shellsim'
import type { Machine, World } from '@sanatorio/shellsim'

import { LIMITS, own } from './limits.js'
import type { Container, DockerState, Image, Mount } from './model.js'
import { dockerOf } from './model.js'

/** Lo que necesita cualquier operación sobre Docker: el mundo, su estado y la máquina anfitriona. */
export type Env = { world: World; state: DockerState; host: Machine }

/** El de un mundo del curso (la máquina con Docker es `dev1`), o `null` si no la tiene. */
export function envOfWorld(world: World): Env | null {
  const host = own(world.machines, 'dev1')

  return host === undefined ? null : { world, state: dockerOf(world), host }
}

/** Une y limpia una ruta de dentro del contenedor (relativa a `cwd`). */
export function clean(path: string, cwd = '/'): string {
  const full = path.startsWith('/') ? path : `${cwd}/${path}`
  const parts: string[] = []

  for (const part of full.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }

  return `/${parts.join('/')}`
}

const under = (path: string, dir: string): boolean =>
  dir === '/' || path === dir || path.startsWith(`${dir}/`)

/** El montaje que cubre una ruta (el más profundo). */
function mountAt(container: Container, path: string): Mount | undefined {
  return container.mounts
    .filter((mount) => under(path, mount.target))
    .sort((a, b) => b.target.length - a.target.length)[0]
}

const rel = (path: string, base: string): string => (path === base ? '/' : path.slice(base.length))

export function imageOf(env: Env, container: Container): Image | undefined {
  return own(env.state.images, container.image)
}

function hostFile(env: Env, path: string): string | null {
  const node = own(env.host.fs, path)

  return node?.kind === 'file' ? node.text : null
}

/** El texto de un fichero dentro del contenedor, o `null` si no existe. */
export function readFile(env: Env, container: Container, path: string): string | null {
  const mount = mountAt(container, path)

  if (mount?.type === 'bind')
    return hostFile(env, clean(`${mount.source}${rel(path, mount.target)}`))
  if (mount?.type === 'volume') {
    const volume = own(env.state.volumes, mount.source)

    return volume === undefined ? null : (own(volume.files, rel(path, mount.target)) ?? null)
  }
  if (mount?.type === 'tmpfs') return own(container.files, path) ?? null

  const changed = own(container.files, path)

  if (changed !== undefined) return changed
  if (container.deleted.some((gone) => under(path, gone))) return null

  return own(imageOf(env, container)?.files ?? {}, path) ?? null
}

/** Las rutas de los ficheros que cuelgan de una carpeta (a cualquier profundidad). */
export function filesUnder(env: Env, container: Container, dir: string): string[] {
  const found = new Set<string>()
  // Lo de la imagen y la capa, si no lo tapa un montaje (tmpfs vive en la capa).
  const add = (path: string): void => {
    const mount = mountAt(container, path)

    if (under(path, dir) && path !== dir && (mount === undefined || mount.type === 'tmpfs'))
      found.add(path)
  }
  const image = imageOf(env, container)

  for (const path of Object.keys(image?.files ?? {}))
    if (!container.deleted.some((gone) => under(path, gone))) add(path)
  for (const path of Object.keys(container.files)) add(path)
  for (const mount of container.mounts) {
    if (!under(mount.target, dir) && !under(dir, mount.target)) continue

    const paths =
      mount.type === 'volume'
        ? Object.keys(own(env.state.volumes, mount.source)?.files ?? {}).map((each) =>
            clean(`${mount.target}${each}`),
          )
        : mount.type === 'bind'
          ? Object.keys(env.host.fs)
              .filter((each) => under(each, mount.source) && env.host.fs[each]?.kind === 'file')
              .map((each) => clean(`${mount.target}${rel(each, mount.source)}`))
          : []

    for (const path of paths) if (under(path, dir) && path !== dir) found.add(path)
  }

  return [...found].sort()
}

/** ¿Hay una carpeta ahí (porque lo es en el anfitrión, en la imagen o porque algo cuelga de ella)? */
export function isDir(env: Env, container: Container, path: string): boolean {
  if (['/', '/tmp', '/etc', '/usr', '/var', '/root', '/home', '/bin', '/data'].includes(path))
    return true

  const image = imageOf(env, container)

  if (image !== undefined && clean(image.config.workdir) === path) return true
  if (container.mounts.some((mount) => under(mount.target, path))) return true

  const mount = mountAt(container, path)

  if (mount?.type === 'bind')
    return own(env.host.fs, clean(`${mount.source}${rel(path, mount.target)}`))?.kind === 'dir'

  return filesUnder(env, container, path).length > 0
}

function writeHost(env: Env, path: string, text: string | null): void {
  const root = env.host.users.root

  if (root === undefined) throw new Fail('peer4u-sandbox: el anfitrión no tiene root')
  if (text === null) {
    Reflect.deleteProperty(env.host.fs, path)

    return
  }

  const now = env.world.clock + Date.UTC(2026, 10, 8, 9, 0, 0) / 1000
  const parent = path.slice(0, path.lastIndexOf('/')) || '/'

  if (lookup(env.host, root, parent) === null)
    makeDir(env.host, root, parent, { parents: true, cmd: 'docker', now, umask: 0o022 })
  writeText(env.host, root, path, text, { cmd: 'docker', now, umask: 0o022 })
}

/** Escribe (o borra, con `null`) un fichero dentro del contenedor. */
export function writeFile(env: Env, container: Container, path: string, text: string | null): void {
  const mount = mountAt(container, path)

  if (mount?.readOnly === true || (mount === undefined && container.readOnly))
    throw new Fail(`can't create '${path}': Read-only file system`)
  if (mount?.type === 'bind') {
    writeHost(env, clean(`${mount.source}${rel(path, mount.target)}`), text)

    return
  }
  if (mount?.type === 'volume') {
    const volume = own(env.state.volumes, mount.source)

    if (volume === undefined) throw new Fail(`volume ${mount.source} not found`)
    if (text === null) Reflect.deleteProperty(volume.files, rel(path, mount.target))
    else volume.files[rel(path, mount.target)] = text
    if (Object.keys(volume.files).length > LIMITS.files)
      throw new Fail('peer4u-sandbox: demasiados ficheros en el volumen')

    return
  }
  if (text === null) {
    Reflect.deleteProperty(container.files, path)
    if (
      own(imageOf(env, container)?.files ?? {}, path) !== undefined ||
      !container.deleted.includes(path)
    )
      container.deleted.push(path)

    return
  }
  container.files[path] = text
  container.deleted = container.deleted.filter((gone) => !under(path, gone))
  if (Object.keys(container.files).length > LIMITS.files)
    throw new Fail('peer4u-sandbox: demasiados ficheros en el contenedor')
}

/**
 * Un volumen con nombre que se monta vacío donde la imagen ya tiene ficheros
 * se llena con ellos (lo hace Docker: así un volumen en `/usr/share/nginx/html`
 * empieza con la página de bienvenida).
 */
export function seedVolumes(env: Env, container: Container): void {
  const image = imageOf(env, container)

  for (const mount of container.mounts) {
    if (mount.type !== 'volume') continue

    const volume = own(env.state.volumes, mount.source)

    if (volume === undefined || Object.keys(volume.files).length > 0) continue
    for (const [path, text] of Object.entries(image?.files ?? {}))
      if (under(path, mount.target) && path !== mount.target)
        volume.files[rel(path, mount.target)] = text
  }
}
