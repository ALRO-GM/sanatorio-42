/**
 * El Dockerfile, de texto a instrucciones: líneas que siguen con `\`,
 * comentarios, opciones (`--from=build`, `--chown=app:app`,
 * `--mount=type=secret,id=npmrc`), la forma exec (`["node", "server.js"]`)
 * y la de shell, y las variables (`${NODE_VERSION}`, `$PORT`,
 * `${X:-def}`). Los errores dicen la línea, como `docker build`.
 */

import { LIMITS } from './limits.js'

export type Instruction = {
  /** Línea donde empieza (para los errores). */
  line: number
  /** En mayúsculas: `FROM`, `RUN`, `COPY`… */
  op: string
  /** Opciones `--clave=valor` del principio. */
  flags: Record<string, string>
  /** Lo que queda detrás de las opciones, tal cual. */
  rest: string
  /** El original (sin las continuaciones), para `docker history`. */
  text: string
}

export class DockerfileError extends Error {}

const KNOWN = new Set([
  'FROM',
  'RUN',
  'CMD',
  'LABEL',
  'MAINTAINER',
  'EXPOSE',
  'ENV',
  'ADD',
  'COPY',
  'ENTRYPOINT',
  'VOLUME',
  'USER',
  'WORKDIR',
  'ARG',
  'ONBUILD',
  'STOPSIGNAL',
  'HEALTHCHECK',
  'SHELL',
])

/** Lee un Dockerfile; lanza `DockerfileError` si una línea no se entiende. */
export function parseDockerfile(source: string): Instruction[] {
  const out: Instruction[] = []
  const lines = source.split('\n')
  let i = 0

  while (i < lines.length) {
    const start = i
    let text = (lines[i] ?? '').trim()

    i++
    if (text === '' || text.startsWith('#')) continue
    // Las líneas que acaban en `\` siguen en la siguiente (los comentarios de en medio se saltan).
    while (text.endsWith('\\') && i < lines.length) {
      const next = (lines[i] ?? '').trim()

      i++
      if (next.startsWith('#')) continue
      text = `${text.slice(0, -1).trimEnd()} ${next}`
    }
    text = text.replace(/\\$/, '').trim()

    const match = /^(\S+)\s*(.*)$/s.exec(text)
    const op = (match?.[1] ?? '').toUpperCase()

    if (!KNOWN.has(op))
      throw new DockerfileError(
        `dockerfile parse error on line ${start + 1}: unknown instruction: ${match?.[1] ?? text}`,
      )

    let rest = match?.[2] ?? ''
    const flags: Record<string, string> = {}

    for (
      let flag = /^--([a-z-]+)(?:=(\S*))?\s*/.exec(rest);
      flag !== null;
      flag = /^--([a-z-]+)(?:=(\S*))?\s*/.exec(rest)
    ) {
      // `HEALTHCHECK --interval=5s CMD …` también lleva opciones; `RUN --mount` puede repetirse.
      const name = flag[1] ?? ''

      flags[name] =
        flags[name] === undefined ? (flag[2] ?? 'true') : `${flags[name]};${flag[2] ?? ''}`
      rest = rest.slice(flag[0].length)
    }
    if (rest.trim() === '' && op !== 'HEALTHCHECK')
      throw new DockerfileError(
        `dockerfile parse error on line ${start + 1}: ${op} requires at least one argument`,
      )
    out.push({ line: start + 1, op, flags, rest: rest.trim(), text })
    if (out.length > LIMITS.dockerfileLines)
      throw new DockerfileError(
        `peer4u-sandbox: el Dockerfile es demasiado largo (como mucho ${LIMITS.dockerfileLines} instrucciones)`,
      )
  }
  if (out.length === 0) throw new DockerfileError('the Dockerfile cannot be empty')
  if (out.find((each) => each.op !== 'ARG')?.op !== 'FROM')
    throw new DockerfileError(
      'no build stage in current context: the first instruction must be FROM',
    )

  return out
}

/** `["node", "server.js"]` → la lista; `null` si no es la forma exec. */
export function execForm(rest: string): string[] | null {
  const text = rest.trim()

  if (!text.startsWith('[')) return null
  try {
    const parsed: unknown = JSON.parse(text)

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
  } catch {
    // Una lista mal escrita es forma shell, como hace Docker.
  }

  return null
}

/** La orden de CMD, ENTRYPOINT o RUN: forma exec tal cual; forma shell, con `/bin/sh -c`. */
export function commandOf(rest: string): string[] {
  return execForm(rest) ?? ['/bin/sh', '-c', rest]
}

/** Sustituye `$X`, `${X}`, `${X:-def}` y `${X:+alt}` con estas variables (las que falten, vacías). */
export function substitute(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(
    /\\\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([-+])([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (whole, braced?: string, op?: string, word?: string, bare?: string) => {
      if (whole === '\\$') return '$'

      const name = braced ?? bare ?? ''
      const value = Object.hasOwn(vars, name) ? vars[name] : undefined

      if (op === '-') return value === undefined || value === '' ? (word ?? '') : value
      if (op === '+') return value === undefined || value === '' ? '' : (word ?? '')

      return value ?? ''
    },
  )
}

/** `CLAVE=valor CLAVE2="dos palabras"` (o la forma vieja `CLAVE valor`) → pares. */
export function pairsOf(rest: string, op: string, line: number): [string, string][] {
  const text = rest.trim()

  if (!/^[^\s=]+=/.test(text)) {
    const [key = '', ...value] = text.split(/\s+/)

    if (value.length === 0 && op !== 'LABEL')
      throw new DockerfileError(
        `dockerfile parse error on line ${line}: ${op} must have two arguments`,
      )

    return [[key, value.join(' ')]]
  }

  const out: [string, string][] = []
  const pattern = /([^\s=]+)=("(?:[^"\\]|\\.)*"|'[^']*'|\S*)/g

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    const raw = match[2] ?? ''
    const value =
      raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\(.)/g, '$1')
        : raw.startsWith("'") && raw.endsWith("'")
          ? raw.slice(1, -1)
          : raw

    out.push([match[1] ?? '', value])
  }

  return out
}

/** `30s`, `1m30s`, `500ms` → segundos (los de Docker y compose). */
export function durationOf(text: string): number {
  let total = 0
  const pattern = /(\d+(?:\.\d+)?)(ms|s|m|h)/g
  let found = false

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    found = true

    const n = Number(match[1])

    total +=
      match[2] === 'ms' ? n / 1000 : match[2] === 'm' ? n * 60 : match[2] === 'h' ? n * 3600 : n
  }
  if (!found && /^\d+$/.test(text.trim())) return Number(text)

  return total
}
