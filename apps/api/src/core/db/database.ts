/**
 * Apertura de la base de datos y migraciones.
 *
 * Se usa `@libsql/client`: trae binarios precompilados para x86 y ARM (la
 * imagen de Docker sale igual en las dos) y el mismo código vale para un fichero
 * SQLite local, que es lo que se usa en producción, y para un servidor
 * libSQL/Turso si algún día hiciera falta sacar la base de la máquina.
 *
 * El precio es que las consultas son `async`.
 */

import { mkdirSync } from 'node:fs'

import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'

import { LATEST_VERSION, MIGRATIONS } from './migrations/index.js'

export type Db = Client

export type DatabaseOptions = {
  /** `libsql://…` para Turso, `file:…` para un SQLite local. */
  url: string
  /** Token de Turso. Se ignora con `file:`. */
  authToken?: string | undefined
}

/**
 * Abre la conexión y ejecuta las migraciones pendientes.
 *
 * Con `file:` se crean los directorios que falten: `data/` no existe en un repo
 * recién clonado y SQLite no crea directorios por su cuenta.
 */
export async function openDatabase(options: DatabaseOptions): Promise<Db> {
  if (options.url.startsWith('file:')) {
    ensureParentDirectory(options.url)
  }

  const db = createClient({
    url: options.url,
    ...(options.authToken === undefined || options.authToken === ''
      ? {}
      : { authToken: options.authToken }),
  })

  await migrate(db)

  return db
}

/**
 * Ejecuta las migraciones que falten, una a una y dentro de su transacción.
 *
 * Cada migración se aplica junto a la actualización de la versión, de modo
 * que un fallo a mitad no deja la base en un estado intermedio. `batch` es
 * atómico: o entra la migración entera, o no entra nada.
 */
export async function migrate(db: Db): Promise<number[]> {
  const current = await schemaVersion(db)
  const pending = MIGRATIONS.filter((migration) => migration.version > current)

  const applied: number[] = []
  for (const migration of pending) {
    await db.batch([
      ...migration.statements,
      CREATE_SCHEMA_VERSION,
      {
        sql: 'INSERT INTO schema_version (id, version) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET version = excluded.version',
        args: [migration.version],
      },
    ])
    applied.push(migration.version)
  }

  return applied
}

/** Tabla de una sola fila con la versión del esquema. */
const CREATE_SCHEMA_VERSION =
  'CREATE TABLE IF NOT EXISTS schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)'

/**
 * Versión del esquema actualmente aplicada. `0` en una base recién creada.
 *
 * Se guarda en una tabla y no en `PRAGMA user_version` porque los servidores
 * libSQL remotos no dejan escribir ese PRAGMA.
 */
export async function schemaVersion(db: Db): Promise<number> {
  const table = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'",
  )

  if (table.rows.length === 0) {
    return 0
  }

  const result = await db.execute('SELECT version FROM schema_version WHERE id = 1')

  return Number(result.rows[0]?.version ?? 0)
}

/**
 * Comprueba que la base de datos está al día con el código.
 *
 * Útil al arrancar: si alguien despliega un código nuevo sin las migraciones
 * correspondientes, es mejor fallar con un mensaje claro que con un error raro
 * más tarde.
 */
export async function assertSchemaIsCurrent(db: Db): Promise<void> {
  const current = await schemaVersion(db)
  if (current !== LATEST_VERSION) {
    throw new Error(
      `El esquema de la base de datos está en la versión ${current} y el código ` +
        `espera la ${LATEST_VERSION}. Ejecuta las migraciones antes de arrancar.`,
    )
  }
}

/** Cierra la conexión. Idempotente. */
export function closeDatabase(db: Db): void {
  db.close()
}

/** Marca de tiempo ISO-8601, formato único para todas las columnas `*_at`. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Crea el directorio que contiene el fichero de la base, si falta. */
function ensureParentDirectory(url: string): void {
  const path = url.slice('file:'.length).split('?')[0] ?? ''
  const separator = path.lastIndexOf('/')

  if (separator <= 0) {
    return
  }

  mkdirSync(path.slice(0, separator), { recursive: true })
}
