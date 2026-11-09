/**
 * Usuarios y dueños de ficheros dentro de una imagen, lo justo para que
 * `USER` se note como en Docker: `id` da el uid que daría (`adduser -S` en
 * alpine empieza en el 100), `COPY` deja los ficheros de root salvo con
 * `--chown`, `WORKDIR` crea la carpeta del `USER` de ese momento (BuildKit) y
 * quien no es root no escribe donde no es suyo («Permission denied»).
 */

import { clean } from './fsview.js'
import type { Image } from './model.js'

/** Los uid y gid de las cuentas que traen las imágenes del catálogo. */
const BUILTIN: Record<string, { uid: number; gid: number }> = {
  root: { uid: 0, gid: 0 },
  nginx: { uid: 101, gid: 101 },
  node: { uid: 1000, gid: 1000 },
  postgres: { uid: 70, gid: 70 },
  redis: { uid: 999, gid: 1000 },
  nonroot: { uid: 65532, gid: 65532 },
}

type Account = { uid: number; gid: number; group: string }

/** Las cuentas que hay en la imagen: las del catálogo que trae y las creadas al construir. */
function accountsOf(image: Image | undefined): Record<string, Account> {
  const builtin = Object.fromEntries(
    Object.entries(BUILTIN)
      .filter(([name]) => (image?.users ?? ['root']).includes(name))
      .map(([name, each]) => [name, { ...each, group: name }]),
  )

  return { ...builtin, ...(image?.accounts ?? {}) }
}

const alpineOf = (image: Image | undefined): boolean =>
  image !== undefined && (image.kind === 'alpine' || image.base.includes('alpine'))

/** El nombre de cuenta de un `USER` (`1001` → `app` si existe; `0` → `root`). */
export function userName(image: Image | undefined, user: string): string {
  const name = user.split(':')[0] ?? ''

  if (name === '' || name === '0') return 'root'
  if (!/^\d+$/.test(name)) return name

  return (
    Object.entries(accountsOf(image)).find(([, each]) => each.uid === Number(name))?.[0] ?? name
  )
}

/**
 * Lo que escribe `id` para el usuario de `USER` o `--user` (`app`, `1001`,
 * `app:app`, `0`), como en Docker: en alpine el grupo principal sale también
 * como suplementario (`groups=101(app),101(app)`); un uid sin cuenta, sin nombre.
 */
export function idLine(image: Image | undefined, user: string): string {
  const name = userName(image, user)
  const alpine = alpineOf(image)

  if (name === 'root')
    return alpine
      ? 'uid=0(root) gid=0(root) groups=0(root),0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel),11(floppy),20(dialout),26(tape),27(video)'
      : 'uid=0(root) gid=0(root) groups=0(root)'
  if (/^\d+$/.test(name)) return `uid=${name} gid=0(root) groups=0(root)`

  const account = accountsOf(image)[name] ?? { uid: 1000, gid: 1000, group: name }
  const group = `${account.gid}(${account.group})`

  return `uid=${account.uid}(${name}) gid=${group} groups=${alpine && account.group !== 'nogroup' ? `${group},${group}` : group}`
}

const isRoot = (image: Image | undefined, user: string): boolean => userName(image, user) === 'root'

/** Opciones de `adduser`/`useradd`/`addgroup`/`groupadd` que llevan valor. */
const TAKES = new Set([
  '-G',
  '-g',
  '-u',
  '-s',
  '-h',
  '-d',
  '-k',
  '-c',
  '--uid',
  '--gid',
  '--home',
  '--shell',
  '--ingroup',
])

function parseArgs(words: string[]): { flags: Record<string, string>; loose: string[] } {
  const flags: Record<string, string> = {}
  const loose: string[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? ''

    if (TAKES.has(word)) {
      flags[word] = words[i + 1] ?? ''
      i++
    } else if (word.startsWith('-')) flags[word] = ''
    else loose.push(word)
  }

  return { flags, loose }
}

function freeId(used: Set<number>, from: number, step: 1 | -1): number {
  let id = from

  while (used.has(id)) id += step

  return id
}

/**
 * Lo que hace en la imagen un `addgroup`, `groupadd`, `adduser` o `useradd`.
 * Devuelve el usuario creado (o `null`).
 */
export function addAccount(image: Image, part: string, alpine: boolean): string | null {
  const [cmd = '', ...rest] = part.split(/\s+/)
  const { flags, loose } = parseArgs(rest)
  const system = '-S' in flags || '-r' in flags || '--system' in flags
  const accounts = (image.accounts ??= {})
  const groups = (image.groups ??= {})
  const builtin = Object.entries(BUILTIN)
    .filter(([name]) => image.users.includes(name))
    .map(([, each]) => each)
  const usedUids = new Set([
    ...builtin.map((each) => each.uid),
    ...Object.values(accounts).map((each) => each.uid),
  ])
  const usedGids = new Set([100, ...builtin.map((each) => each.gid), ...Object.values(groups)])

  if (cmd === 'addgroup' || cmd === 'groupadd') {
    // `addgroup app grupo` (busybox) mete a un usuario en un grupo: no crea nada.
    if (cmd === 'addgroup' && loose.length > 1) return null

    const name = loose.at(-1)

    if (name === undefined) return null

    const asked = flags['-g'] ?? flags['--gid']

    groups[name] =
      asked !== undefined && /^\d+$/.test(asked)
        ? Number(asked)
        : system
          ? alpine
            ? freeId(usedGids, 101, 1)
            : freeId(usedGids, 999, -1)
          : freeId(usedGids, 1000, 1)

    return null
  }

  const name = loose.at(-1)

  if (name === undefined) return null

  const askedUid = flags['-u'] ?? flags['--uid']
  const uid =
    askedUid !== undefined && /^\d+$/.test(askedUid)
      ? Number(askedUid)
      : system
        ? alpine
          ? freeId(usedUids, 100, 1)
          : freeId(usedUids, 999, -1)
        : freeId(usedUids, 1000, 1)
  // El grupo: el de -G (busybox) o -g (useradd); si no, alpine -S usa nogroup y lo demás crea
  // un grupo con su nombre.
  const groupName = cmd === 'adduser' ? (flags['-G'] ?? flags['--ingroup']) : flags['-g']
  let gid: number
  let group: string

  if (groupName !== undefined && /^\d+$/.test(groupName)) {
    gid = Number(groupName)
    group = Object.entries(groups).find(([, id]) => id === gid)?.[0] ?? groupName
  } else if (groupName !== undefined) {
    gid = groups[groupName] ?? freeId(usedGids, 1000, 1)
    groups[groupName] = gid
    group = groupName
  } else if (alpine && system) {
    gid = 65533
    group = 'nogroup'
  } else {
    gid = groups[name] ?? (usedGids.has(uid) ? freeId(usedGids, 1000, 1) : uid)
    groups[name] = gid
    group = name
  }
  accounts[name] = { uid, gid, group }
  if (!image.users.includes(name)) image.users.push(name)

  return name
}

const under = (path: string, dir: string): boolean =>
  dir === '/' || path === dir || path.startsWith(`${dir}/`)

/** Quién es dueño de una ruta de la imagen (un fichero o una carpeta). */
export function ownerOf(image: Image | undefined, path: string): string {
  const owners = image?.owners ?? {}
  const found = owners[path]

  if (found !== undefined) return found

  const home = /^\/home\/([^/]+)/.exec(path)?.[1]

  if (home !== undefined && (image?.users ?? []).includes(home)) return home

  return 'root'
}

/** Carpetas donde escribe cualquiera (con el bit pegajoso, como `/tmp`). */
const OPEN = ['/tmp', '/var/tmp', '/dev', '/run/lock']

/** ¿Puede `user` crear o cambiar `path` en la imagen? (las carpetas, por su dueño). */
export function canWrite(image: Image | undefined, user: string, path: string): boolean {
  if (isRoot(image, user)) return true
  if (OPEN.some((dir) => under(path, dir) && path !== dir)) return true

  const name = userName(image, user)
  const exists = image?.files[path] !== undefined

  if (exists) return ownerOf(image, path) === name

  const parent = path.slice(0, path.lastIndexOf('/')) || '/'

  return ownerOf(image, parent) === name
}

/** Apunta de quién son unas rutas (y las carpetas nuevas por encima, hasta `top`). */
export function setOwner(image: Image, paths: readonly string[], user: string, top?: string): void {
  const owners = (image.owners ??= {})
  const name = userName(image, user)
  const set = (path: string) => {
    if (name === 'root') Reflect.deleteProperty(owners, path)
    else owners[path] = name
  }

  for (const path of paths) {
    set(path)
    if (top === undefined) continue
    for (let dir = path.slice(0, path.lastIndexOf('/')); under(dir, top) && dir !== '';) {
      if (owners[dir] === undefined && !dirExisted(image, dir, paths)) set(dir)
      if (dir === top) break
      dir = dir.slice(0, dir.lastIndexOf('/'))
    }
  }
}

/** ¿Había ya algo en esa carpeta antes de estas rutas? */
function dirExisted(image: Image, dir: string, fresh: readonly string[]): boolean {
  if (dir === image.config.workdir) return true

  return Object.keys(image.files).some((file) => under(file, dir) && !fresh.includes(file))
}

/** `chown [-R] dueño[:grupo] rutas` dentro de un `RUN` (solo root puede). */
export function chown(image: Image, words: readonly string[], wd: string): void {
  const recursive = words.some((word) => /^-\w*R/.test(word) || word === '--recursive')
  const [who = '', ...targets] = words.slice(1).filter((word) => !word.startsWith('-'))
  const name = userName(image, who)
  const owners = (image.owners ??= {})

  for (const target of targets) {
    const top = clean(target, wd)
    const paths = recursive
      ? [top, ...Object.keys(image.files).filter((file) => under(file, top))]
      : [top]

    for (const path of paths)
      if (name === 'root') Reflect.deleteProperty(owners, path)
      else owners[path] = name
  }
}
