/**
 * Los topes del git simulado. La terminal del curso no toca el ordenador de
 * nadie (todo es un objeto en memoria, sin `fs`, sin procesos, sin `eval`),
 * pero quien escribe puede intentar llenarlo: miles de ficheros, ficheros
 * enormes, cientos de ramas o commits. En la web eso colgaría la pestaña y en
 * la API (pruebas de grupo y corrección de retos) llenaría la memoria y la
 * base. Por eso cada orden se mide antes y después: si se pasa, falla con un
 * mensaje claro y el repositorio queda como estaba.
 *
 * Los números dejan de sobra para cualquier reto (el más grande usa 6
 * ficheros, 4 ramas y menos de 20 commits).
 */

import { GitError } from './model.js'
import type { Repo, Remote } from './model.js'

export const LIMITS = {
  /** Caracteres de una línea de la terminal (lo mismo que acepta la API). */
  line: 200,
  /** Palabras de una línea. */
  words: 40,
  /** Líneas de un intento que la API vuelve a ejecutar. */
  attemptLines: 300,
  /** Ficheros en el directorio de trabajo (o en el índice). */
  files: 40,
  /** Caracteres de un fichero. */
  fileChars: 1000,
  /** Caracteres de todos los ficheros juntos. */
  totalChars: 8000,
  /** Caracteres de una ruta o del nombre de una rama o un tag. */
  name: 60,
  /** Commits que puede haber en tu repositorio (o en origin). */
  commits: 200,
  branches: 30,
  tags: 30,
  stash: 10,
  /** Tamaño de todo el repositorio y el remoto juntos, en JSON. */
  worldBytes: 200_000,
} as const

/**
 * Nombres que no valen para nada (fichero, rama, tag): los de las propiedades
 * de un objeto de JavaScript. El estado son objetos planos y `constructor` o
 * `__proto__` como clave darían resultados raros en vez de un error.
 */
const RESERVED = new Set([...Object.getOwnPropertyNames(Object.prototype), '__proto__'])

/** El valor de una clave propia (nunca uno heredado del prototipo). */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

/** ¿Es un nombre reservado? (`constructor`, `__proto__`, `toString`…) */
export const reserved = (name: string): boolean => RESERVED.has(name)

/**
 * Una ruta de fichero dentro del repositorio: letras, números, `.`, `_`, `-` y
 * carpetas con `/`. Nada de rutas absolutas, `~`, `..` ni `.git`: no se puede
 * salir del repositorio simulado (ni hay nada fuera a lo que llegar).
 */
export function safePath(path: string): string {
  const parts = path.replace(/^\.\//, '').split('/')

  if (path.startsWith('/') || path.startsWith('~'))
    throw new GitError(`${path}: aquí no hay rutas absolutas; todo pasa dentro de ~/repo`)
  if (parts.some((part) => part === '..'))
    throw new GitError(`${path}: no se puede salir del repositorio con ..`)
  if (
    path.length > LIMITS.name ||
    !parts.every((part) => /^[A-Za-z0-9._-]+$/.test(part) && part !== '.') ||
    parts.some((part) => part === '.git' || reserved(part))
  )
    throw new GitError(
      `«${path.slice(0, LIMITS.name)}» no vale como fichero: letras, números, . _ - y carpetas con /`,
    )

  return parts.join('/')
}

/** El nombre de una rama o un tag nuevo, con las reglas de git (las que importan aquí). */
export function safeRef(name: string, what: 'rama' | 'tag'): string {
  if (
    name.length === 0 ||
    name.length > LIMITS.name ||
    !/^[A-Za-z0-9._/-]+$/.test(name) ||
    name.startsWith('-') ||
    name.startsWith('/') ||
    name.endsWith('/') ||
    name.endsWith('.') ||
    name.endsWith('.lock') ||
    name.includes('..') ||
    name.includes('//') ||
    name === 'HEAD' ||
    name.split('/').some((part) => part.startsWith('.') || reserved(part))
  )
    throw new GitError(`«${name.slice(0, LIMITS.name)}» no vale como nombre de ${what}`)

  return name
}

const size = (record: Record<string, string>): number =>
  Object.values(record).reduce((sum, text) => sum + text.length, 0)

function filesWithin(files: Record<string, string>, where: string): void {
  const paths = Object.keys(files)

  if (paths.length > LIMITS.files)
    throw new GitError(
      `demasiados ficheros en ${where} (${paths.length}): el máximo es ${LIMITS.files}`,
    )

  const big = paths.find((path) => (files[path] ?? '').length > LIMITS.fileChars)

  if (big !== undefined)
    throw new GitError(`${big} es demasiado grande: como mucho ${LIMITS.fileChars} caracteres`)
  if (size(files) > LIMITS.totalChars)
    throw new GitError(
      `los ficheros ocupan demasiado: como mucho ${LIMITS.totalChars} caracteres entre todos`,
    )
}

/**
 * Comprueba que el repositorio (y el remoto) siguen dentro de los topes.
 * Lanza un `GitError` que la terminal enseña tal cual.
 */
export function withinLimits(repo: Repo, remote: Remote | null): void {
  filesWithin(repo.work, 'el directorio de trabajo')
  filesWithin(repo.index, 'el índice')

  const commits = Math.max(
    Object.keys(repo.commits).length,
    remote === null ? 0 : Object.keys(remote.commits).length,
  )

  if (commits > LIMITS.commits)
    throw new GitError(`demasiados commits (${commits}): el máximo es ${LIMITS.commits}`)
  if (Object.keys(repo.branches).length > LIMITS.branches)
    throw new GitError(`demasiadas ramas: el máximo es ${LIMITS.branches}`)
  if (Object.keys(repo.tags).length > LIMITS.tags)
    throw new GitError(`demasiados tags: el máximo es ${LIMITS.tags}`)
  // En origin suben las ramas y los tags de todo el grupo (hasta seis personas).
  if (
    remote !== null &&
    (Object.keys(remote.branches).length > LIMITS.branches * 2 ||
      Object.keys(remote.tags).length > LIMITS.tags * 2)
  )
    throw new GitError('origin ya tiene demasiadas ramas o tags')
  if (repo.stash.length > LIMITS.stash)
    throw new GitError(`el stash está lleno: como mucho ${LIMITS.stash} entradas`)
  if (JSON.stringify({ repo, remote }).length > LIMITS.worldBytes)
    throw new GitError('el repositorio ha crecido demasiado para este simulador: empieza de nuevo')
}
