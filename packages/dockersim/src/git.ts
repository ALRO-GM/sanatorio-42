/**
 * Un `git` mínimo para etiquetar imágenes con el commit, como en CI:
 * `git rev-parse --short HEAD` y `git log --oneline -1`. Lee el `.git` de la
 * carpeta en la que estás (o de una de arriba). El curso de git tiene su propio
 * motor; esto solo contesta lo que se usa al etiquetar.
 */

import { Fail } from '@sanatorio/shellsim'
import type { CommandFn } from '@sanatorio/shellsim'

import { own } from './limits.js'

export const git: CommandFn = (ctx) => {
  const fs = ctx.sh.machine().fs
  let dir = ctx.sh.session().cwd
  let sha: string | null = null

  for (;;) {
    const head = own(fs, `${dir}/.git/HEAD`)

    if (head?.kind === 'file') {
      const ref = /^ref: (.*)$/m.exec(head.text)?.[1]
      const node = ref === undefined ? head : own(fs, `${dir}/.git/${ref}`)

      sha = node?.kind === 'file' ? node.text.trim() : null
      break
    }
    if (dir === '/') break
    dir = dir.slice(0, dir.lastIndexOf('/')) || '/'
  }
  if (sha === null)
    throw new Fail('fatal: not a git repository (or any of the parent directories): .git', 128)

  const [verb, ...args] = ctx.args

  if (verb === 'rev-parse' && args.includes('HEAD')) {
    ctx.io.out(`${args.includes('--short') ? sha.slice(0, 7) : sha}\n`)

    return 0
  }
  if (verb === 'log') {
    ctx.io.out(`${sha.slice(0, 7)} (HEAD -> main) Último commit\n`)

    return 0
  }
  if (verb === 'describe') {
    ctx.io.out('v1.4.0\n')

    return 0
  }
  throw new Fail(
    `peer4u-sandbox: aquí git solo contesta rev-parse HEAD, log y describe (el curso de git tiene su terminal)`,
    1,
  )
}
