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
      'admin_second_factor',
      'agenda_events',
      'agenda_users',
      'availability',
      'board_attendees',
      'boards',
      'broadcast_answers',
      'broadcasts',
      'campus_members',
      'campuses',
      'clicker',
      'clicker_alerts',
      'clicker_capital',
      'clicker_cheats',
      'clicker_clicks',
      'clicker_pool',
      'conversation_marks',
      'corrections',
      'curriculum_votes',
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
      'legal_acceptances',
      'notices',
      'pace_refs',
      'presence',
      'profiles',
      'project_pass_marks',
      'project_users',
      'projects',
      'quota_queue',
      'reactions',
      'report_exports',
      'request_stats',
      'seats',
      'settings',
      'staff_accounts',
      'staff_checks',
      'sync_state',
      'therapy_checks',
      'therapy_groups',
      'therapy_members',
      'tickets',
      'tour_rates',
      'tour_speeds',
      'usage_counts',
      'usage_flows',
      'usage_time',
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

  it('la 35 borra las faltas automáticas de las correcciones y nada más', async () => {
    const db = createClient({ url: 'file::memory:' })
    const before = MIGRATIONS.filter((migration) => migration.version < 35)

    await db.batch([
      ...before.flatMap((migration) => migration.statements),
      'CREATE TABLE schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)',
      'INSERT INTO schema_version (id, version) VALUES (1, 34)',
      `INSERT INTO event_messages (event_id, login, kind, reason, created_at) VALUES
        ('evaluation:1', 'ana', 'absent', 'missed', 'x'),
        ('evaluation:1', 'leo', 'absent', 'sick', 'x'),
        ('evaluation:2', 'ana', 'seen', NULL, 'x'),
        ('board:3', 'ana', 'absent', 'missed', 'x')`,
      `INSERT INTO event_alerts (event_id, login, event, starts_at, missed_at) VALUES
        ('evaluation:1', 'ana', '{}', 'x', 'x'),
        ('board:3', 'ana', '{}', 'x', 'x')`,
    ])

    expect(await migrate(db)).toEqual(
      MIGRATIONS.filter((migration) => migration.version >= 35).map((m) => m.version),
    )

    const messages = await db.execute(
      'SELECT event_id, login, kind FROM event_messages ORDER BY id',
    )
    // La falta que dijo la persona (`sick`) y la de una pizarra se quedan.
    expect(
      messages.rows.map(
        (row) => `${textOf(row, 'event_id')} ${textOf(row, 'login')} ${textOf(row, 'kind')}`,
      ),
    ).toEqual(['evaluation:1 leo absent', 'evaluation:2 ana seen', 'board:3 ana absent'])
    const alerts = await db.execute('SELECT event_id FROM event_alerts')
    expect(alerts.rows.map((row) => textOf(row, 'event_id'))).toEqual(['board:3'])

    db.close()
  })

  it('la 36 da por leído el «mensaje nuevo» de lo ya respondido, de todo quien administra', async () => {
    const db = createClient({ url: 'file::memory:' })

    await db.batch([
      ...MIGRATIONS.filter((m) => m.version < 36).flatMap((m) => m.statements),
      'CREATE TABLE schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)',
      'INSERT INTO schema_version (id, version) VALUES (1, 35)',
      `INSERT INTO tickets (id, login, kind, subject, body, status, created_at) VALUES
        (1, 'ana', 'issue', 'a', 'b', 'answered', 'x'),
        (2, 'ana', 'idea', 'a', 'b', 'closed', 'x'),
        (3, 'ana', 'idea', 'a', 'b', 'open', 'x')`,
      `INSERT INTO notices (login, kind, ref, created_at, updated_at, read_at) VALUES
        ('eva', 'ticket_new', 'ticket:1', 'x', 'x', NULL),
        ('leo', 'ticket_new', 'ticket:1', 'x', 'x', NULL),
        ('eva', 'ticket_new', 'ticket:2', 'x', 'x', NULL),
        ('eva', 'ticket_new', 'ticket:3', 'x', 'x', NULL),
        ('ana', 'ticket_answered', 'ticket:1', 'x', 'x', NULL),
        ('eva', 'ticket_new', 'ticket:9', 'x', 'x', NULL)`,
    ])
    await migrate(db)

    const unread = await db.execute(
      'SELECT login, kind, ref FROM notices WHERE read_at IS NULL ORDER BY id',
    )

    // Lo abierto, la respuesta que aún no ha visto `ana` y lo que no casa con nada, siguen.
    expect(
      unread.rows.map(
        (row) => `${textOf(row, 'login')} ${textOf(row, 'kind')} ${textOf(row, 'ref')}`,
      ),
    ).toEqual([
      'eva ticket_new ticket:3',
      'ana ticket_answered ticket:1',
      'eva ticket_new ticket:9',
    ])

    db.close()
  })

  it('la 37 pasa lo aprendido del plan a un voto por persona y proyecto', async () => {
    const db = createClient({ url: 'file::memory:' })

    await db.batch([
      ...MIGRATIONS.filter((m) => m.version < 37).flatMap((m) => m.statements),
      'CREATE TABLE schema_version (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL)',
      'INSERT INTO schema_version (id, version) VALUES (1, 36)',
      `INSERT INTO users (id, login, synced_at) VALUES (1, 'ana', 'x'), (2, 'leo', 'x'), (3, 'sol', 'x')`,
      `INSERT INTO projects (id, name, slug, core) VALUES
        (10, 'Libft', '42cursus-libft', 1), (20, 'Nuevo', 'nuevo', 1), (30, 'Fuera', 'fuera', 0)`,
      // `ana` validó el rango 0 en mayo y el 1 en junio; `sol` tiene un JSON roto.
      `INSERT INTO user_tracks (login, track, rank, ranks, fetched_at) VALUES
        ('ana', 'next', 1, '["2026-05-01T00:00:00Z","2026-06-01T00:00:00Z"]', 'x'),
        ('leo', 'classic', -1, '[]', 'x'),
        ('sol', 'next', 0, 'roto', 'x')`,
      `INSERT INTO project_users (id, user_id, project_id, status, synced_at, created_at_42) VALUES
        (1, 1, 10, 'finished', 'x', '2026-04-01T00:00:00Z'),
        (2, 1, 20, 'in_progress', 'x', '2026-06-20T00:00:00Z'),
        (3, 1, 30, 'in_progress', 'x', '2026-06-20T00:00:00Z'),
        (4, 2, 10, 'in_progress', 'x', '2026-09-01T00:00:00Z'),
        (5, 2, 20, 'in_progress', 'x', NULL),
        (6, 3, 10, 'in_progress', 'x', '2026-09-01T00:00:00Z')`,
      `INSERT INTO curriculum (track, project_id, circle) VALUES ('next', 20, 0)`,
    ])
    await migrate(db)

    const votes = await db.execute(
      'SELECT track, project_id, login, circle FROM curriculum_votes ORDER BY login, project_id',
    )

    // Lo que no es del common core, lo que no tiene fecha y el JSON roto no votan.
    expect(
      votes.rows.map(
        (row) =>
          `${textOf(row, 'login')} ${textOf(row, 'track')} ${Number(row.project_id)} ${Number(row.circle)}`,
      ),
    ).toEqual(['ana next 10 0', 'ana next 20 2', 'leo classic 10 0'])
    expect(await tableNames(db)).not.toContain('curriculum')

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
