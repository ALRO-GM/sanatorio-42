/**
 * El mundo de la shell simulada: unas máquinas (ficheros, usuarios, procesos,
 * servicios y su registro) y la sesión de quien escribe. Todo son objetos
 * planos en memoria: no hay `fs`, ni procesos, ni red de verdad. Se puede
 * pasar a JSON, medir y copiar, y dos ejecuciones con las mismas órdenes dan
 * siempre lo mismo (el reloj es un contador, no la hora del ordenador).
 */

/** Un error de la shell que se enseña tal cual (como lo diría bash). */
export class ShellError extends Error {}

export type FileNode = {
  kind: 'file'
  text: string
  mode: number
  owner: string
  group: string
  mtime: number
  /**
   * Tamaño que dice tener, en bytes, si no es el del texto: así un registro
   * de 2 GB ocupa unas líneas en memoria pero `du` y `df` lo ven gordo.
   */
  size?: number
}

export type DirNode = { kind: 'dir'; mode: number; owner: string; group: string; mtime: number }

export type LinkNode = {
  kind: 'link'
  target: string
  mode: number
  owner: string
  group: string
  mtime: number
}

export type FsNode = FileNode | DirNode | LinkNode

export type User = {
  name: string
  uid: number
  home: string
  shell: string
  /** Grupos, el primero es el principal. */
  groups: string[]
}

export type Proc = {
  pid: number
  ppid: number
  user: string
  cmd: string
  /** Porcentajes inventados pero fijos: lo que enseñan `ps` y `top`. */
  cpu: number
  mem: number
  /** Memoria residente en kB. */
  rss: number
  state: 'R' | 'S' | 'T' | 'Z'
  tty: string
  /** El servicio al que pertenece, si es de uno. */
  service?: string
  /** No se va con SIGTERM (un proceso colgado): hace falta SIGKILL. */
  stubborn?: boolean
  /** Hora (del reloj del mundo) a la que empezó. */
  start: number
  /** Si acaba solo (un `sleep 60 &`), a qué hora. */
  until?: number
}

/** Lo que tiene que estar en un fichero para que un servicio arranque. */
export type ServiceNeed = { path: string; contains: string; error: string }

export type Service = {
  name: string
  description: string
  /** El comando del proceso principal. */
  exec: string
  user: string
  active: boolean
  enabled: boolean
  failed: boolean
  /** Puerto en el que escucha mientras está activo. */
  port?: number
  /** Si systemd lo vuelve a arrancar cuando muere (Restart=always). */
  restart?: boolean
  needs?: ServiceNeed[]
  /** Uso de CPU y memoria de su proceso. */
  cpu?: number
  mem?: number
  /**
   * Lo que responde por HTTP (`curl`): los ficheros de una carpeta (`root`),
   * rutas que devuelven un fichero (`routes`, como `/health`) o lo que
   * empieza por un prefijo, pasado a otro puerto (`proxy`, el de nginx a la app).
   */
  web?: { root?: string; routes?: Record<string, string>; proxy?: { prefix: string; port: number } }
}

/** Una línea del registro (`journalctl`): prioridad de 0 (emerg) a 7 (debug). */
export type LogEntry = { t: number; unit: string; prio: number; msg: string }

export type Machine = {
  name: string
  ip: string
  fs: Record<string, FsNode>
  users: Record<string, User>
  /** Grupos con su gid. */
  groups: Record<string, number>
  procs: Proc[]
  nextPid: number
  services: Record<string, Service>
  journal: LogEntry[]
  crontabs: Record<string, string>
  /** Paquetes instalados (`apt`), con su versión. */
  packages: Record<string, string>
  /** Tamaño del disco en bytes (`df`). */
  disk: number
  /** Bytes usados que no se ven como ficheros (el sistema). */
  baseUsed: number
  /** Si no responde (apagada o sin red). */
  down?: boolean
}

export type Session = {
  host: string
  user: string
  cwd: string
  /** Variables exportadas (las ven los programas) y las de la shell. */
  env: Record<string, string>
  vars: Record<string, string>
  status: number
  /** `set -e`, `set -u`, `set -o pipefail`, `set -x`. */
  opts: { errexit: boolean; nounset: boolean; pipefail: boolean; xtrace: boolean }
  aliases: Record<string, string>
  /** Funciones definidas, como árbol (es JSON: se guarda con el mundo). */
  funcs: Record<string, unknown>
  history: string[]
  oldpwd: string
  umask: number
}

export type World = {
  machines: Record<string, Machine>
  /** La sesión abierta; las de debajo, las de antes de un `ssh` o un `sudo -i`. */
  session: Session
  stack: Session[]
  /** Resolución de nombres (`dig`): nombre → IP. */
  dns: Record<string, string>
  /** Segundos desde el principio del mundo; cada orden lo avanza. */
  clock: number
  /** Semilla de `$RANDOM`, para que sea siempre la misma secuencia. */
  seed: number
}

/** El mundo de partida, en el que empieza el reloj (25 oct 2026, 09:00 UTC). */
export const EPOCH = Date.UTC(2026, 9, 25, 9, 0, 0) / 1000

/** El nombre corto de un proceso (`nginx` de `nginx: master process …`, `node` de `node /srv/…`). */
export const progName = (cmd: string): string =>
  (cmd.split(' ')[0] ?? '').replace(/^.*\//, '').replace(/:$/, '').replace(/^-/, '')

/** Una copia que se puede cambiar sin tocar el original (todo es JSON). */
export const cloneWorld = (world: World): World => JSON.parse(JSON.stringify(world)) as World
