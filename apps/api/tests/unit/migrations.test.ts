/**
 * Tests de las migraciones.
 *
 * Lo importante aquí es que el esquema se aplique bien **y solo una vez**: si
 * la versión guardada no se respeta, una migración podría ejecutarse dos veces y
 * reventar al desplegar sobre una base que ya tenía datos.
 *
 * Todas las funciones son `async` porque `@libsql/client` no tiene API síncrona.
 */

import { describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'

import {
  assertSchemaIsCurrent,
  migrate,
  openDatabase,
  schemaVersion,
} from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { LATEST_VERSION, MIGRATIONS } from '../../src/core/db/migrations/index.js'
import { textOf } from '../helpers/rows.js'

/** Nombres de las tablas del esquema actual, sin las internas de SQLite. */
async function tableNames(db: Db): Promise<string[]> {
  const result = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_version'",
  )
  return result.rows.map((row) => textOf(row, 'name'))
}

describe('migraciones', () => {
  it('crea una base de datos nueva directamente en la última versión', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    expect(await schemaVersion(db)).toBe(LATEST_VERSION)
    await expect(assertSchemaIsCurrent(db)).resolves.toBeUndefined()

    db.close()
  })

  it('crea las tablas de la réplica y las de comunidad', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    expect((await tableNames(db)).sort()).toEqual([
      'agenda_events',
      'agenda_users',
      'availability',
      'board_attendees',
      'boards',
      'campus_members',
      'campuses',
      'corrections',
      'curriculum',
      'doubt_answers',
      'doubts',
      'event_alerts',
      'event_attendance',
      'event_checkins',
      'event_codes',
      'event_messages',
      'forty_two_stats',
      'guide_change_flags',
      'guide_changes',
      'guide_proposals',
      'guide_strikes',
      'guides',
      'help_blocks',
      'help_bookings',
      'help_days',
      'notices',
      'presence',
      'profiles',
      'project_pass_marks',
      'project_users',
      'projects',
      'quota_queue',
      'reactions',
      'request_stats',
      'seats',
      'settings',
      'sync_state',
      'therapy_checks',
      'therapy_groups',
      'therapy_members',
      'tickets',
      'usage_counts',
      'user_blocks',
      'user_levels',
      'user_limits',
      'user_roles',
      'user_tracks',
      'users',
      'xp_events',
    ])

    db.close()
  })

  it('no vuelve a aplicar migraciones ya ejecutadas', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    expect(await migrate(db)).toEqual([])
    expect(await schemaVersion(db)).toBe(LATEST_VERSION)

    db.close()
  })

  it('avisa si el esquema está por detrás del código', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    // Simula una base desplegada con un esquema anterior al del código.
    await db.execute('UPDATE schema_version SET version = 1 WHERE id = 1')

    await expect(assertSchemaIsCurrent(db)).rejects.toThrow(/está en la versión 1/)

    db.close()
  })

  it('aplica solo las migraciones que faltan y conserva los datos', async () => {
    // Cliente a pelo, sin pasar por `openDatabase`: este ya aplica todas, y lo
    // que se quiere aquí es una base que se quedó en la primera versión.
    const db = createClient({ url: 'file::memory:' })
    const [first] = MIGRATIONS

    if (first === undefined) {
      throw new Error('no hay migraciones')
    }

    await db.batch([
      ...first.statements,
      'CREATE TABLE schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)',
      { sql: 'INSERT INTO schema_version (id, version) VALUES (1, ?)', args: [first.version] },
      `INSERT INTO campuses (id, name, synced_at) VALUES (22, 'Madrid', '2026-01-01')`,
    ])

    expect(await migrate(db)).toEqual(MIGRATIONS.slice(1).map((migration) => migration.version))
    expect(await schemaVersion(db)).toBe(LATEST_VERSION)

    const campuses = await db.execute('SELECT name FROM campuses WHERE id = 22')
    expect(textOf(campuses.rows[0] ?? {}, 'name')).toBe('Madrid')

    db.close()
  })

  it('numera las migraciones de forma creciente y sin huecos', () => {
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual(
      MIGRATIONS.map((_migration, index) => index + 1),
    )
  })

  it('avisa si la base está por delante del código', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    // Una base de un despliegue futuro: el código viejo no debe escribir encima.
    await db.execute('UPDATE schema_version SET version = 99 WHERE id = 1')

    await expect(assertSchemaIsCurrent(db)).rejects.toThrow(/está en la versión 99/)

    db.close()
  })
})
