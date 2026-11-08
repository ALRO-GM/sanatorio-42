/**
 * `docker inspect`: lo que Docker sabe de un contenedor, una imagen, un
 * volumen o una red, en el JSON de la API de Docker (lo que se usa), y las
 * plantillas de Go de `-f` (`{{.State.Status}}`, `{{json .Config.Env}}`,
 * `{{index .Config.Labels "clave"}}`, `{{range .Mounts}}{{.Name}} {{end}}`).
 */

import { repoDigest } from './catalog.js'
import type { Env } from './fsview.js'
import { imageOf } from './fsview.js'
import { own } from './limits.js'
import type { Container, Image, Network, Volume } from './model.js'
import { imageSize } from './model.js'
import { healthOf } from './runtime.js'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** La hora de un momento del mundo (cada orden son unos segundos), en ISO. */
export const isoAt = (tick: number): string =>
  new Date(Date.UTC(2026, 10, 8, 9, 0, 0) + Math.max(0, tick) * 7000)
    .toISOString()
    .replace('.000Z', 'Z')

const portKey = (port: number): string => `${port}/tcp`

export function containerJson(env: Env, c: Container): Json {
  const health = healthOf(env, c)
  const ports: Record<string, Json> = {}

  for (const binding of c.ports) {
    const list = (ports[portKey(binding.container)] ?? []) as Json[]

    list.push({ HostIp: binding.ip, HostPort: String(binding.host) })
    ports[portKey(binding.container)] = list
  }

  const image = imageOf(env, c)
  const healthcheck = c.healthcheck ?? image?.config.healthcheck ?? null

  return {
    Id: c.id,
    Created: isoAt(c.created),
    Path: c.entrypoint[0] ?? c.cmd[0] ?? '',
    Args: [...c.entrypoint, ...c.cmd].slice(1),
    State: {
      Status: c.status,
      Running: c.status === 'running',
      Paused: c.status === 'paused',
      Restarting: c.status === 'restarting',
      OOMKilled: c.oomKilled,
      Dead: false,
      Pid: c.status === 'running' ? 4200 + c.created : 0,
      ExitCode: c.exitCode,
      Error: '',
      StartedAt: c.started < 0 ? '0001-01-01T00:00:00Z' : isoAt(c.started),
      FinishedAt: c.finished < 0 ? '0001-01-01T00:00:00Z' : isoAt(c.finished),
      ...(health === null
        ? {}
        : { Health: { Status: health, FailingStreak: health === 'healthy' ? 0 : 3, Log: [] } }),
    },
    Image: c.image,
    Name: `/${c.name}`,
    RestartCount: c.restartCount,
    HostConfig: {
      Binds: c.mounts
        .filter((m) => m.type !== 'tmpfs')
        .map((m) => `${m.source}:${m.target}${m.readOnly ? ':ro' : ''}`),
      PortBindings: ports,
      RestartPolicy: { Name: c.restart, MaximumRetryCount: 0 },
      AutoRemove: c.autoRemove,
      Memory: c.memory,
      NanoCpus: Math.round(c.cpus * 1e9),
      ReadonlyRootfs: c.readOnly,
      NetworkMode: Object.keys(c.networks)[0] ?? 'bridge',
    },
    Mounts: c.mounts.map((m) => ({
      Type: m.type,
      ...(m.type === 'volume' ? { Name: m.source } : {}),
      Source: m.type === 'volume' ? `/var/lib/docker/volumes/${m.source}/_data` : m.source,
      Destination: m.target,
      RW: !m.readOnly,
    })),
    Config: {
      Hostname: c.id.slice(0, 12),
      User: c.user,
      Env: c.env,
      Cmd: c.cmd.length === 0 ? null : c.cmd,
      Image: c.ref,
      WorkingDir: c.workdir,
      Entrypoint: c.entrypoint.length === 0 ? null : c.entrypoint,
      Labels: c.labels,
      ExposedPorts: Object.fromEntries((image?.config.exposed ?? []).map((port) => [port, {}])),
      ...(healthcheck === null ? {} : { Healthcheck: { Test: healthcheck.test } }),
    },
    NetworkSettings: {
      Ports: ports,
      IPAddress: own(c.networks, 'bridge')?.ip ?? '',
      Networks: Object.fromEntries(
        Object.entries(c.networks).map(([name, info]) => [
          name,
          { IPAddress: info.ip, Aliases: info.aliases },
        ]),
      ),
    },
  }
}

export function imageJson(env: Env, image: Image): Json {
  const tags = Object.entries(env.state.tags)
    .filter(([, id]) => id === image.id)
    .map(([tag]) => tag)
  const published = Object.entries(env.state.registry.tags)
    .filter(([, id]) => id === image.id)
    .map(([tag]) => `${tag.replace(/:[^:/]+$/, '')}@${repoDigest(image)}`)
  const pulled =
    image.created < 0
      ? tags.map((tag) => `${tag.replace(/:[^:/]+$/, '')}@${repoDigest(image)}`)
      : []
  const hc = image.config.healthcheck

  return {
    Id: image.id,
    RepoTags: tags,
    RepoDigests: [...new Set([...pulled, ...published])],
    Created: isoAt(image.created),
    Size: imageSize(image),
    Architecture: 'amd64',
    Os: 'linux',
    Config: {
      User: image.config.user,
      Env: image.config.env,
      Cmd: image.config.cmd,
      Entrypoint: image.config.entrypoint,
      WorkingDir: image.config.workdir === '/' ? '' : image.config.workdir,
      ExposedPorts: Object.fromEntries(image.config.exposed.map((port) => [port, {}])),
      Labels: image.config.labels,
      ...(hc === null
        ? {}
        : {
            Healthcheck: {
              Test: hc.test,
              Interval: hc.interval * 1e9,
              Timeout: hc.timeout * 1e9,
              Retries: hc.retries,
            },
          }),
    },
    RootFS: {
      Type: 'layers',
      Layers: image.layers.filter((layer) => layer.size > 0).map((layer) => layer.id),
    },
  }
}

export function volumeJson(volume: Volume): Json {
  return {
    CreatedAt: isoAt(volume.created),
    Driver: 'local',
    Labels: volume.labels,
    Mountpoint: `/var/lib/docker/volumes/${volume.name}/_data`,
    Name: volume.name,
    Scope: 'local',
  }
}

export function networkJson(env: Env, network: Network): Json {
  return {
    Name: network.name,
    Id: network.id,
    Driver: network.driver,
    Scope: 'local',
    IPAM: {
      Config:
        network.subnet === 0
          ? []
          : [{ Subnet: `172.${network.subnet}.0.0/16`, Gateway: `172.${network.subnet}.0.1` }],
    },
    Containers: Object.fromEntries(
      env.state.containers
        .filter((c) => c.status === 'running' && own(c.networks, network.name) !== undefined)
        .map((c) => [
          c.id,
          { Name: c.name, IPv4Address: `${own(c.networks, network.name)?.ip ?? ''}/16` },
        ]),
    ),
    Labels: network.labels,
  }
}

/** Un valor como lo imprime Go con `{{.X}}`: listas `[a b]`, mapas `map[k:v]`. */
function goText(value: Json | undefined): string {
  if (value === undefined || value === null) return '<no value>'
  if (Array.isArray(value)) return `[${value.map(goText).join(' ')}]`
  if (typeof value === 'object')
    return `map[${Object.keys(value)
      .sort()
      .map((key) => `${key}:${goText(value[key])}`)
      .join(' ')}]`

  return String(value)
}

function at(root: Json, path: string): Json | undefined {
  let value: Json | undefined = root

  for (const part of path.split('.').filter(Boolean)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
    value = own(value, part)
  }

  return value
}

export class TemplateError extends Error {}

/** Evalúa una plantilla de Go sencilla sobre un objeto. */
export function template(src: string, root: Json): string {
  const tokens = src.split(/(\{\{-?\s*[^}]*?\s*-?\}\})/).filter((token) => token !== '')
  let pos = 0

  function value(expr: string, dot: Json): Json | undefined {
    const words = expr.match(/"[^"]*"|\S+/g) ?? []
    const [fn = '', ...args] = words
    const arg = (word: string | undefined): Json | undefined =>
      word === undefined
        ? undefined
        : word.startsWith('"')
          ? word.slice(1, -1)
          : word === '.'
            ? dot
            : at(dot, word)

    if (fn === 'json') return JSON.stringify(arg(args[0]) ?? null)
    if (fn === 'index') {
      const base = arg(args[0])
      const key = arg(args[1])

      if (Array.isArray(base)) return base[Number(key)]
      if (base !== null && typeof base === 'object' && typeof key === 'string')
        return own(base, key) ?? null

      return undefined
    }
    if (fn === 'join') {
      const list = arg(args[0])

      return Array.isArray(list) ? list.map(goText).join(goText(arg(args[1]) ?? '')) : ''
    }
    if (fn === 'len') {
      const list = arg(args[0])

      return Array.isArray(list)
        ? list.length
        : list !== null && typeof list === 'object'
          ? Object.keys(list).length
          : 0
    }
    if (fn === 'upper' || fn === 'lower') {
      const text = goText(arg(args[0]))

      return fn === 'upper' ? text.toUpperCase() : text.toLowerCase()
    }
    if (fn.startsWith('.') && args.length === 0) return fn === '.' ? dot : at(dot, fn)

    throw new TemplateError(`template: :1: function "${fn}" not defined`)
  }

  function block(dot: Json, stop: boolean): string {
    let out = ''

    while (pos < tokens.length) {
      const token = tokens[pos++] ?? ''
      const action = /^\{\{-?\s*(.*?)\s*-?\}\}$/s.exec(token)

      if (action === null) {
        out += token
        continue
      }

      const expr = action[1] ?? ''

      if (expr === 'end') {
        if (!stop) throw new TemplateError('template: :1: unexpected {{end}}')

        return out
      }
      if (expr.startsWith('range ')) {
        const list = value(expr.slice(6), dot)
        const start = pos
        const items = Array.isArray(list)
          ? list
          : list !== null && typeof list === 'object'
            ? Object.values(list)
            : []

        if (items.length === 0) block(dot, true)
        for (const item of items) {
          pos = start
          out += block(item, true)
        }
        continue
      }

      const result = value(expr, dot)

      out += typeof result === 'string' ? result : goText(result)
    }
    if (stop) throw new TemplateError('template: :1: unexpected EOF')

    return out
  }

  return block(root, false)
}
