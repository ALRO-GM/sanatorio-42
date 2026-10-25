/**
 * `test`, `[ … ]` y `[[ … ]]`: las comprobaciones de los guiones. Ficheros
 * (`-e -f -d -r -w -x -s -L`), textos (`-z -n = != < >`), números (`-eq -ne
 * -lt -le -gt -ge`), `!`, paréntesis y, en `[[ ]]`, `&&`, `||`, patrones
 * (`== *.log`) y expresiones regulares (`=~`, con el motor lineal).
 */

import { globMatch } from './expand.js'
import { can, Fail, lookup } from './fs.js'
import type { Budget } from './limits.js'
import type { Machine, User } from './model.js'
import { regex } from './regex.js'

type TestShell = {
  machine: () => Machine
  user: () => User
  abs: (path: string) => string
  budget: Budget
}

const UNARY = new Set(['-e', '-f', '-d', '-r', '-w', '-x', '-s', '-L', '-h', '-z', '-n', '-a'])
const BINARY = new Set([
  '=',
  '==',
  '!=',
  '<',
  '>',
  '-eq',
  '-ne',
  '-lt',
  '-le',
  '-gt',
  '-ge',
  '=~',
  '-nt',
  '-ot',
])

/** Quita la marca que pone `[[` al lado derecho de `==` (patrón) o de `=~` (regex). */
const bare = (arg: string): string =>
  arg.startsWith('\u0000') || arg.startsWith('\u0001') ? arg.slice(1) : arg

function file(sh: TestShell, op: string, path: string): boolean {
  let found

  try {
    found = lookup(sh.machine(), sh.user(), sh.abs(path), op !== '-L' && op !== '-h')
  } catch {
    return false
  }
  if (found === null) return false

  const { node } = found

  switch (op) {
    case '-e':
    case '-a':
      return true
    case '-f':
      return node.kind === 'file'
    case '-d':
      return node.kind === 'dir'
    case '-L':
    case '-h':
      return node.kind === 'link'
    case '-s':
      return node.kind !== 'file' || (node.size ?? node.text.length) > 0
    case '-r':
      return can(sh.user(), node, 'r')
    case '-w':
      return can(sh.user(), node, 'w')
    default:
      return can(sh.user(), node, 'x')
  }
}

function integer(text: string, extended: boolean): number {
  const value = text.trim()

  if (!/^-?\d+$/.test(value)) {
    if (extended && value === '') return 0
    throw new Fail(`bash: ${extended ? '[[' : '['}: ${text}: integer expression expected`, 2)
  }

  return Number(value)
}

function binary(sh: TestShell, a: string, op: string, b: string, extended: boolean): boolean {
  const right = bare(b)

  switch (op) {
    case '=':
    case '==':
      return b.startsWith('\u0000') ? globMatch(right, a, sh.budget) : a === right
    case '!=':
      return b.startsWith('\u0000') ? !globMatch(right, a, sh.budget) : a !== right
    case '<':
      return a < right
    case '>':
      return a > right
    case '=~':
      return regex(right, { ere: true }).test(a, sh.budget)
    case '-nt':
    case '-ot': {
      const ta = lookup(sh.machine(), sh.user(), sh.abs(a))?.node.mtime ?? 0
      const tb = lookup(sh.machine(), sh.user(), sh.abs(right))?.node.mtime ?? 0

      return op === '-nt' ? ta > tb : ta < tb
    }
    default: {
      const x = integer(a, extended)
      const y = integer(right, extended)

      return op === '-eq'
        ? x === y
        : op === '-ne'
          ? x !== y
          : op === '-lt'
            ? x < y
            : op === '-le'
              ? x <= y
              : op === '-gt'
                ? x > y
                : x >= y
    }
  }
}

/** Evalúa la expresión: 0 si es verdad, 1 si no, 2 si está mal escrita. */
export function testExpr(args: string[], sh: TestShell, extended: boolean): number {
  let pos = 0
  const and = extended ? '&&' : '-a'
  const or = extended ? '||' : '-o'

  function primary(): boolean {
    const arg = args[pos]

    if (arg === undefined) throw new Fail(`bash: ${extended ? '[[' : '['}: argument expected`, 2)
    if (arg === '!') {
      pos++

      return !primary()
    }
    if (arg === '(') {
      pos++

      const value = disjunction()

      if (args[pos] !== ')') throw new Fail("bash: [: `)' expected", 2)
      pos++

      return value
    }

    const op = args[pos + 1]

    if (op !== undefined && BINARY.has(op) && args[pos + 2] !== undefined) {
      pos += 3

      return binary(sh, bare(arg), op, args[pos - 1] ?? '', extended)
    }
    if (UNARY.has(arg) && args[pos + 1] !== undefined) {
      const value = bare(args[pos + 1] ?? '')

      pos += 2
      if (arg === '-z') return value === ''
      if (arg === '-n') return value !== ''

      return file(sh, arg, value)
    }
    pos++

    return bare(arg) !== ''
  }

  function conjunction(): boolean {
    let value = primary()

    while (args[pos] === and) {
      pos++

      const right = primary()

      value = value && right
    }

    return value
  }

  function disjunction(): boolean {
    let value = conjunction()

    while (args[pos] === or) {
      pos++

      const right = conjunction()

      value = value || right
    }

    return value
  }

  if (args.length === 0) return 1

  const value = disjunction()

  if (pos < args.length) throw new Fail(`bash: ${extended ? '[[' : '['}: too many arguments`, 2)

  return value ? 0 : 1
}
