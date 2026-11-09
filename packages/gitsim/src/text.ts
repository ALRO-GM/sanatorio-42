/**
 * Lo que git escribe al comparar dos fotos de los ficheros: el resumen de un
 * commit («1 file changed, 1 insertion(+)»), el de un merge (`f | 2 +-`) y el
 * diff unificado de `git diff` y `git show`. Los ficheros son cortos (1000
 * caracteres como mucho), así que se comparan línea a línea con la subsecuencia
 * común más larga, sin trucos.
 */

import type { Files } from './model.js'

const linesOf = (text: string | undefined): string[] =>
  text === undefined || text === '' ? [] : text.split('\n')

type Op = { kind: ' ' | '-' | '+'; line: string }

/** Las líneas que se quitan (`-`), se ponen (`+`) o se quedan (` `). */
function lineOps(before: string | undefined, after: string | undefined): Op[] {
  const a = linesOf(before)
  const b = linesOf(after)
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const row = table[i] ?? []

      row[j] =
        a[i] === b[j]
          ? (table[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(table[i + 1]?.[j] ?? 0, row[j + 1] ?? 0)
    }
  }

  const ops: Op[] = []
  let i = 0
  let j = 0

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push({ kind: ' ', line: a[i] ?? '' })
      i++
      j++
    } else if (
      // Como git: lo que se quita va antes que lo que se pone.
      i < a.length &&
      (j >= b.length || (table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0))
    ) {
      ops.push({ kind: '-', line: a[i] ?? '' })
      i++
    } else {
      ops.push({ kind: '+', line: b[j] ?? '' })
      j++
    }
  }

  return ops
}

/** Los ficheros que cambian de una foto a otra, en orden. */
export function changedPaths(from: Files, to: Files): string[] {
  return [...new Set([...Object.keys(from), ...Object.keys(to)])]
    .filter((path) => from[path] !== to[path])
    .sort()
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

function counts(from: Files, to: Files): { path: string; plus: number; minus: number }[] {
  return changedPaths(from, to).map((path) => {
    const ops = lineOps(from[path], to[path])

    return {
      path,
      plus: ops.filter((op) => op.kind === '+').length,
      minus: ops.filter((op) => op.kind === '-').length,
    }
  })
}

/** « 1 file changed, 1 insertion(+)», o nada si no cambia ningún fichero. */
function summary(from: Files, to: Files): string[] {
  const all = counts(from, to)

  if (all.length === 0) return []

  const plus = all.reduce((sum, each) => sum + each.plus, 0)
  const minus = all.reduce((sum, each) => sum + each.minus, 0)
  const parts = [plural(all.length, 'file changed', 'files changed')]

  if (plus > 0 || minus === 0) parts.push(`${plural(plus, 'insertion', 'insertions')}(+)`)
  if (minus > 0 || plus === 0) parts.push(`${plural(minus, 'deletion', 'deletions')}(-)`)

  return [` ${parts.join(', ')}`]
}

/** Lo que dice `git commit` después de su primera línea: el resumen y los ficheros nuevos o borrados. */
export function commitStats(from: Files, to: Files): string[] {
  return [
    ...summary(from, to),
    ...changedPaths(from, to)
      .filter((path) => from[path] === undefined || to[path] === undefined)
      .map((path) => ` ${from[path] === undefined ? 'create' : 'delete'} mode 100644 ${path}`),
  ]
}

/** El diffstat de un merge: ` f.c | 2 +-` por fichero y el resumen. */
export function diffstat(from: Files, to: Files): string[] {
  const all = counts(from, to)
  const width = Math.max(0, ...all.map((each) => each.path.length))

  return [
    ...all.map((each) =>
      ` ${each.path.padEnd(width)} | ${each.plus + each.minus} ${'+'.repeat(each.plus)}${'-'.repeat(each.minus)}`.trimEnd(),
    ),
    ...summary(from, to),
  ]
}

/** `1,3` en la cabecera de un trozo; git omite `,1` y empieza en 0 si no hay líneas. */
const range = (count: number): string => (count === 0 ? '0,0' : count === 1 ? '1' : `1,${count}`)

/** El diff unificado de git, de cada fichero entero (sin el `index` con los hashes). */
export function unified(from: Files, to: Files): string[] {
  const out: string[] = []

  for (const path of changedPaths(from, to)) {
    const before = from[path]
    const after = to[path]
    const ops = lineOps(before, after)
    const old = ops.filter((op) => op.kind !== '+').length
    const fresh = ops.filter((op) => op.kind !== '-').length

    out.push(`diff --git a/${path} b/${path}`)
    if (before === undefined) out.push('new file mode 100644')
    if (after === undefined) out.push('deleted file mode 100644')
    out.push(before === undefined ? '--- /dev/null' : `--- a/${path}`)
    out.push(after === undefined ? '+++ /dev/null' : `+++ b/${path}`)
    if (ops.length > 0) {
      out.push(`@@ -${range(old)} +${range(fresh)} @@`)
      for (const op of ops) out.push(`${op.kind}${op.line}`)
    }
  }

  return out
}
