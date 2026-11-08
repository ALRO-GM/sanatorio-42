/**
 * El estado de Docker simulado: imágenes (con sus capas), contenedores,
 * volúmenes, redes, el registro remoto y la caché de construcción. Vive en el
 * mundo de la shell (`world.ext.docker`), así que es JSON como lo demás: se
 * copia, se mide y dos ejecuciones con las mismas órdenes dan lo mismo. No hay
 * nada de verdad detrás: ni procesos, ni red, ni disco.
 */

import type { World } from '@sanatorio/shellsim'

/** Lo que hace el proceso principal de una imagen del catálogo (o de lo que se construye encima). */
export type Kind =
  'hello' | 'alpine' | 'debian' | 'nginx' | 'postgres' | 'redis' | 'node' | 'python' | 'distroless'

export type Layer = {
  id: string
  /** Bytes que añade (0 en las de solo metadatos: ENV, CMD, USER…). */
  size: number
  /** La instrucción que la creó, como la enseña `docker history`. */
  createdBy: string
}

/** `HEALTHCHECK`: `test` como en la API de Docker (`['CMD-SHELL', 'orden']`, `['CMD', …]` o `['NONE']`). */
export type HealthSpec = { test: string[]; interval: number; timeout: number; retries: number }

export type ImageConfig = {
  user: string
  /** `CLAVE=valor`, en orden. */
  env: string[]
  cmd: string[] | null
  entrypoint: string[] | null
  workdir: string
  /** `80/tcp`… */
  exposed: string[]
  labels: Record<string, string>
  healthcheck: HealthSpec | null
}

export type Image = {
  /** `sha256:` y 64 cifras hexadecimales, calculado del contenido. */
  id: string
  layers: Layer[]
  config: ImageConfig
  /** Ficheros de la imagen (ruta → texto); las carpetas se deducen. */
  files: Record<string, string>
  /** Tamaño que dice tener un fichero si no es el de su texto (`node_modules` de 180 MB). */
  sizes: Record<string, number>
  /** Usuarios que existen dentro (`root`, `nginx`, `node`, el `app` que se crea…). */
  users: string[]
  kind: Kind
  /** La imagen del catálogo de la que parte (`node:22-alpine`). */
  base: string
  /** Contador del mundo en el que se creó. */
  created: number
  /** Vulnerabilidades conocidas de su base (para `docker scout cves`). */
  cves: { critical: number; high: number; medium: number }
  /** Plataformas para las que está construida. */
  platforms: string[]
}

export type Mount = {
  type: 'volume' | 'bind' | 'tmpfs'
  /** Nombre del volumen o ruta absoluta del anfitrión. */
  source: string
  target: string
  readOnly: boolean
}

export type PortBinding = { ip: string; host: number; container: number }

export type Status = 'created' | 'running' | 'exited' | 'restarting' | 'paused'

export type RestartPolicy = 'no' | 'always' | 'unless-stopped' | 'on-failure'

export type Container = {
  id: string
  name: string
  /** El id de la imagen. */
  image: string
  /** Cómo se pidió la imagen (`nginx:1.27`), para enseñarla y comparar. */
  ref: string
  created: number
  started: number
  finished: number
  status: Status
  exitCode: number
  oomKilled: boolean
  /** Lo que se ejecuta: el entrypoint y el cmd ya juntos. */
  entrypoint: string[]
  cmd: string[]
  env: string[]
  user: string
  workdir: string
  ports: PortBinding[]
  mounts: Mount[]
  /** Redes a las que está conectado: IP y alias (el nombre del servicio de compose). */
  networks: Record<string, { ip: string; aliases: string[] }>
  restart: RestartPolicy
  restartCount: number
  /** Límite de memoria en bytes (0: sin límite) y de CPU. */
  memory: number
  cpus: number
  healthcheck: HealthSpec | null
  /** La capa escribible: lo cambiado (ruta → texto) y lo borrado. */
  files: Record<string, string>
  deleted: string[]
  logs: string[]
  autoRemove: boolean
  readOnly: boolean
  labels: Record<string, string>
}

export type Volume = {
  name: string
  /** Ficheros, con la ruta relativa a la raíz del volumen (`/PG_VERSION`). */
  files: Record<string, string>
  created: number
  labels: Record<string, string>
}

export type Network = {
  name: string
  id: string
  driver: 'bridge' | 'host' | 'null'
  /** El tercer número de su subred: 17 para `bridge` (172.17.0.0/16), 18, 19… */
  subnet: number
  labels: Record<string, string>
}

/** Un registro remoto: lo publicado en él (referencia completa → imagen). */
export type Registry = { images: Record<string, Image>; tags: Record<string, string> }

export type DockerState = {
  images: Record<string, Image>
  /** `nginx:1.27` → id. Una imagen sin etiqueta es «colgante» (`<none>`). */
  tags: Record<string, string>
  containers: Container[]
  volumes: Record<string, Volume>
  networks: Record<string, Network>
  /** Lo publicado en los registros (`ghcr.io/peer4u/api:1.0.0`); Docker Hub es el catálogo fijo. */
  registry: Registry
  /** Registros en los que se ha hecho `docker login`. */
  logins: string[]
  /** Las claves de los pasos ya construidos (la caché de capas). */
  cache: string[]
  /** Contador para las IP y los nombres que pone Docker. */
  seq: number
}

export function emptyState(): DockerState {
  return {
    images: {},
    tags: {},
    containers: [],
    volumes: {},
    networks: {
      bridge: { name: 'bridge', id: 'b1a2c3d4e5f6', driver: 'bridge', subnet: 17, labels: {} },
      host: { name: 'host', id: 'a0b0c0d0e0f0', driver: 'host', subnet: 0, labels: {} },
      none: { name: 'none', id: 'f0e0d0c0b0a0', driver: 'null', subnet: 0, labels: {} },
    },
    registry: { images: {}, tags: {} },
    logins: [],
    cache: [],
    seq: 1,
  }
}

/** El estado de Docker del mundo (lo crea vacío la primera vez). */
export function dockerOf(world: World): DockerState {
  world.ext ??= {}

  const found = world.ext.docker as DockerState | undefined

  if (found !== undefined) return found

  const fresh = emptyState()

  world.ext.docker = fresh

  return fresh
}

export const MB = 1024 * 1024

/** `CLAVE=valor` → el valor de `CLAVE` en una lista de entorno. */
export function envValue(env: readonly string[], key: string): string | undefined {
  for (let i = env.length - 1; i >= 0; i--) {
    const item = env[i] ?? ''

    if (item.startsWith(`${key}=`)) return item.slice(key.length + 1)
  }

  return undefined
}

/** Pone (o cambia) una variable en una lista de entorno, sin repetirla. */
export function setEnv(env: readonly string[], key: string, value: string): string[] {
  return [...env.filter((item) => !item.startsWith(`${key}=`)), `${key}=${value}`]
}

export const imageSize = (image: Image): number =>
  image.layers.reduce((sum, layer) => sum + layer.size, 0)
