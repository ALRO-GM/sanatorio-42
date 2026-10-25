/**
 * Qué comandos cuentan para las estrellas. No se mira el texto del comando
 * sino **lo que cambia**: cuenta el que mueve la historia, las ramas, HEAD,
 * los tags, el stash o el remoto. Así las formas equivalentes cuentan igual
 * sin tener una lista de cada una:
 *
 * - Mirar no cuenta: `status`, `log`, `diff`, `show`, `git branch` a secas…
 * - Preparar ficheros no cuenta: `echo`, `rm`, `git add` (con `.`, `-A`,
 *   `--all`, `*` o fichero a fichero, tantas veces como quieras),
 *   `git restore`, `git reset HEAD f`… Por eso `git add` + `git commit` vale
 *   lo mismo que `git commit -am`.
 * - `git fetch` no cuenta: solo trae lo de origin, no toca tus ramas. Así
 *   `fetch` + `merge` vale lo mismo que `pull`.
 * - Crear una rama y cambiarte a ella cuenta uno, se haga con `switch -c`,
 *   `checkout -b` o con `git branch x` seguido de `git switch x`.
 * - Lo que falla no cuenta (no cambia nada), y repetir algo que ya está
 *   (`git switch main` estando en main) tampoco.
 */

import type { World } from './run.js'

/** Lo que mira el recuento: si cambia, el comando cuenta. */
function footprint(world: World): string {
  const { repo, remote } = world

  return JSON.stringify([
    repo.branches,
    repo.head,
    repo.tags,
    repo.stash,
    repo.merging,
    remote === null ? null : [remote.branches, remote.tags],
  ])
}

/** Solo ha aparecido una rama nueva (lo que hace `git branch x`): su nombre. */
function onlyCreated(before: World, after: World): string | null {
  const created = Object.keys(after.repo.branches).filter(
    (name) => !Object.hasOwn(before.repo.branches, name),
  )
  const [name] = created

  if (created.length !== 1 || name === undefined) return null

  const branches = { ...after.repo.branches }

  Reflect.deleteProperty(branches, name)

  return footprint({ ...after, repo: { ...after.repo, branches } }) === footprint(before)
    ? name
    : null
}

/** Solo ha cambiado HEAD, a la rama `name` (lo que hace `git switch name`). */
function onlyMovedTo(before: World, after: World, name: string): boolean {
  return (
    after.repo.head.kind === 'branch' &&
    after.repo.head.name === name &&
    footprint({ ...after, repo: { ...after.repo, head: before.repo.head } }) === footprint(before)
  )
}

/**
 * Un contador: se le pasa cada comando que ha salido bien (el mundo antes y
 * después) y dice si cuenta. Recuerda la rama recién creada para no contar
 * dos veces «crearla y cambiarse a ella».
 */
export function createCounter(): (before: World, after: World) => boolean {
  let created: string | null = null

  return (before, after) => {
    if (footprint(before) === footprint(after)) return false

    const pending = created

    created = onlyCreated(before, after)
    if (pending !== null && onlyMovedTo(before, after, pending)) return false

    return true
  }
}
