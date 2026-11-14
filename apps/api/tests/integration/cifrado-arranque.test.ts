/**
 * El paso al arrancar (`core/crypto/seal-existing.ts`, `docs/cifrado.md`):
 * cifra lo que había en claro, no toca lo ya cifrado, rota de clave y no deja
 * arrancar con datos de una clave que no está.
 *
 * Familias de `docs/tests.md`: normal (una base de antes, con algo en cada
 * columna), límite (más filas que una vuelta: 500 + 1), vacío y enorme (base
 * vacía; 1 200 mensajes), imprevisible (dos arranques seguidos, una fila que ya
 * estaba cifrada, texto que parece cifrado) y permisos (con otra clave no
 * arranca; la descarga sigue siendo de su dueño, en `cifrado-campos.test.ts`).
 */

import { randomBytes } from 'node:crypto'

import { afterEach, describe, expect, it } from 'vitest'

import { buildApp } from '../../src/app/build-app.js'
import { compose } from '../../src/app/composition.js'
import { loadEnv } from '../../src/config/env.js'
import { createFieldCipher, devFieldCipher } from '../../src/core/crypto/fields.js'
import { sealExisting } from '../../src/core/crypto/seal-existing.js'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import { toText } from '../../src/core/db/rows.js'
import type { Db } from '../../src/core/db/database.js'
import { createFake42 } from '../helpers/fake-42.js'
import { makeApp, makeProvider } from '../helpers/test-app.js'

/** Lo que está cifrado hoy, columna a columna: si cambia, cambia `docs/cifrado.md`. */
const INVENTORY = [
  'event_messages.body',
  'notices.text',
  'tickets.subject',
  'tickets.body',
  'tickets.proposal',
  'tickets.answer',
  'user_blocks.reason',
  'help_bookings.note',
  'hidden_people.reason',
  'scrum_goals.note',
  'scrum_checkpoints.text',
  'scrum_entries.problem_other',
  'scrum_entries.solution_other',
  'scrum_entries.note',
].sort()

const AT = '2026-10-01T10:00:00.000Z'

const envWith = (keys: { DATA_KEY?: string; DATA_KEY_PREVIOUS?: string } = {}) =>
  loadEnv({
    FORTY_TWO_UID: 'u-test',
    FORTY_TWO_SECRET: 's-test',
    SESSION_SECRET: 'secreto-de-sesion-para-pruebas-de-treinta-y-dos',
    FRONTEND_URL: 'https://front.test',
    FORTY_TWO_REDIRECT_URI: 'https://back.test/api/auth/callback',
    LOG_LEVEL: 'silent',
    SYNC_ENABLED: 'false',
    ...keys,
  })

let db: Db | undefined
const apps: { close: () => Promise<void> }[] = []

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close()
  if (db !== undefined) closeDatabase(db)
  db = undefined
})

async function boot(base: Db, keys: { DATA_KEY?: string; DATA_KEY_PREVIOUS?: string } = {}) {
  const built = await buildApp({
    env: envWith(keys),
    db: base,
    fetchImpl: makeProvider().fetchImpl,
  })

  apps.push({ close: () => built.app.close() })

  return built
}

/** Una base «de antes»: texto en claro en cada columna que ahora va cifrada. */
async function legacyBase(messages = 1): Promise<Db> {
  const base = await openDatabase({ url: 'file::memory:' })

  await base.batch(
    [
      ...Array.from({ length: messages }, (_value, index) => ({
        sql: `INSERT INTO event_messages (event_id, login, kind, body, created_at)
              VALUES ('dm:ana:eva', 'ana', 'text', ?, ?)`,
        args: [`mensaje ${index}`, AT],
      })),
      // Un aviso de «lo he visto», sin texto: se queda en NULL.
      `INSERT INTO event_messages (event_id, login, kind, created_at)
       VALUES ('dm:ana:eva', 'eva', 'seen', '${AT}')`,
      `INSERT INTO notices (login, kind, ref, text, created_at, updated_at)
       VALUES ('eva', 'chat', 'dm:ana:eva', 'mensaje 0', '${AT}', '${AT}')`,
      `INSERT INTO tickets (login, kind, subject, body, answer, proposal, created_at)
       VALUES ('ana', 'idea', 'Asunto', 'Cuerpo', 'Respuesta', 'Propuesta', '${AT}')`,
      `INSERT INTO user_blocks (login, reason, blocked_by, created_at)
       VALUES ('leo', 'Spam', 'root', '${AT}')`,
      `INSERT INTO help_bookings (campus_id, helper, requester, day, start_min, minutes, note, created_at)
       VALUES (22, 'eva', 'ana', '2026-10-07', 1020, 30, 'Nota', '${AT}')`,
      `INSERT INTO hidden_people (login, reason, hidden_by, hidden_at)
       VALUES ('leo', 'Pruebas', 'root', '${AT}')`,
      `INSERT INTO scrum_goals (login, campus_id, project_id, project_name, project_kind,
         target_day, note, created_at, updated_at)
       VALUES ('ana', 22, 10, 'ft_printf', 'c', '2026-10-09', 'Nota de la meta', '${AT}', '${AT}')`,
      `INSERT INTO scrum_checkpoints (goal_id, login, text, position)
       VALUES (1, 'ana', 'Leer la norma', 0)`,
      `INSERT INTO scrum_entries (goal_id, login, kind, day, problem_other, solution_other, note,
         created_at, updated_at)
       VALUES (1, 'ana', 'daily', '2026-10-06', 'Atasco', 'Salida', 'Nota del día', '${AT}', '${AT}')`,
    ],
    'write',
  )

  return base
}

/** Todos los valores de las columnas cifradas, como están guardados. */
async function allStored(base: Db): Promise<Map<string, unknown[]>> {
  const out = new Map<string, unknown[]>()

  for (const entry of INVENTORY) {
    const [table, column] = entry.split('.') as [string, string]
    // Por el propio valor: `user_blocks` no tiene `rowid`.
    const result = await base.execute(`SELECT ${column} AS v FROM ${table} ORDER BY 1`)

    out.set(
      entry,
      result.rows.map((row) => row.v),
    )
  }

  return out
}

describe('cifrar lo de antes al arrancar', () => {
  it('cada módulo declara sus columnas cifradas, y son estas', async () => {
    db = await openDatabase({ url: 'file::memory:' })

    const { modules } = compose(db, createFake42().client, {
      sync: {
        trackedCampusIds: [22],
        defaultCampusId: 22,
        hourlyReserve: 300,
        backfillIntervalMs: 0,
        locationsTtlMs: 1,
        locationsIdleMs: 1,
        deltaTtlMs: 1,
        deltaIdleMs: 1,
        requestPageBudget: 1,
      },
    })
    const declared = modules
      .flatMap((module) => module.sealed ?? [])
      .map((column) => `${column.table}.${column.column}`)
      .sort()

    expect(declared).toEqual(INVENTORY)
  })

  it('una base de antes queda cifrada entera, y se lee igual que antes', async () => {
    const key = randomBytes(32)

    db = await legacyBase()
    await boot(db, { DATA_KEY: key.toString('base64') })

    const cipher = createFieldCipher({ current: key })

    for (const [column, values] of await allStored(db)) {
      const texts = values.filter((value) => value !== null)

      expect(texts.length, column).toBeGreaterThan(0)
      for (const value of texts) {
        expect(cipher.isCurrent(toText(value)), column).toBe(true)
      }
    }
    expect(
      (await db.execute("SELECT body FROM event_messages WHERE kind = 'seen'")).rows[0]?.body,
    ).toBeNull()

    const [first] = (await db.execute('SELECT body FROM event_messages ORDER BY id LIMIT 1')).rows

    expect(cipher.open(toText(first?.body))).toBe('mensaje 0')
  })

  it('arrancar otra vez no cambia nada: lo ya cifrado con la clave de ahora no se toca', async () => {
    db = await legacyBase()
    await boot(db)

    const before = await allStored(db)

    await boot(db)

    expect(await allStored(db)).toEqual(before)
    expect(await sealExisting(db, devFieldCipher, [{ table: 'tickets', column: 'body' }])).toEqual(
      {},
    )
  })

  it('más filas que una vuelta (1 200 mensajes): todas, sin dejarse ninguna', async () => {
    db = await legacyBase(1200)

    const done = await sealExisting(db, devFieldCipher, [
      { table: 'event_messages', column: 'body' },
    ])

    expect(done).toEqual({ 'event_messages.body': 1200 })
    expect(
      (
        await db.execute(
          "SELECT COUNT(*) AS n FROM event_messages WHERE body IS NOT NULL AND body NOT LIKE 'v1:%'",
        )
      ).rows[0]?.n,
    ).toBe(0)
  })

  it('una base vacía arranca sin nada que hacer', async () => {
    db = await openDatabase({ url: 'file::memory:' })

    await boot(db)

    expect(await sealExisting(db, devFieldCipher, [{ table: 'notices', column: 'text' }])).toEqual(
      {},
    )
  })

  it('rotar: con la nueva en DATA_KEY y la vieja en DATA_KEY_PREVIOUS, todo pasa a la nueva', async () => {
    const old = randomBytes(32)
    const fresh = randomBytes(32)

    db = await legacyBase()
    await boot(db, { DATA_KEY: old.toString('base64') })
    await boot(db, {
      DATA_KEY: fresh.toString('base64'),
      DATA_KEY_PREVIOUS: old.toString('base64'),
    })

    const now = createFieldCipher({ current: fresh })

    for (const [column, values] of await allStored(db)) {
      for (const value of values.filter((entry) => entry !== null)) {
        expect(now.isCurrent(toText(value)), column).toBe(true)
      }
    }

    // Ya sin la vieja, arranca: no queda nada suyo.
    await boot(db, { DATA_KEY: fresh.toString('base64') })
  })

  it('con datos de una clave que no está, no arranca, y dice qué falta', async () => {
    db = await legacyBase()
    await boot(db, { DATA_KEY: randomBytes(32).toString('base64') })

    await expect(boot(db, { DATA_KEY: randomBytes(32).toString('base64') })).rejects.toThrow(
      /clave que no está cargada/,
    )
  })

  it('un texto de antes que parece cifrado pero no lo es se cifra como texto', async () => {
    db = await openDatabase({ url: 'file::memory:' })
    await db.execute(
      `INSERT INTO tickets (login, kind, subject, body, created_at)
       VALUES ('ana', 'idea', 'v1: idea', 'v1:no:es:cifrado', '${AT}')`,
    )
    await sealExisting(db, devFieldCipher, [
      { table: 'tickets', column: 'subject' },
      { table: 'tickets', column: 'body' },
    ])

    const [row] = (await db.execute('SELECT subject, body FROM tickets')).rows

    expect(devFieldCipher.open(toText(row?.subject))).toBe('v1: idea')
    expect(devFieldCipher.open(toText(row?.body))).toBe('v1:no:es:cifrado')
  })

  it('por HTTP: lo que mandas se guarda cifrado y tu descarga lo trae en claro', async () => {
    const built = await makeApp()

    apps.push(built)

    const cookie = await built.login()
    const sent = await built.app.inject({
      method: 'POST',
      url: '/tickets',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        kind: 'issue',
        subject: 'No carga',
        body: 'El mapa sale en blanco',
      }),
    })

    expect(sent.statusCode).toBe(201)
    expect((await built.db.execute('SELECT body FROM tickets')).rows[0]?.body).toMatch(/^v1:/)

    const exported = await built.app.inject({
      method: 'GET',
      url: '/me/export',
      headers: { cookie },
    })
    const tables = (
      JSON.parse(exported.body) as { tables: Record<string, { rows: Record<string, unknown>[] }> }
    ).tables

    expect(tables.tickets?.rows[0]?.body).toBe('El mapa sale en blanco')
    expect(tables.tickets?.rows[0]?.subject).toBe('No carga')
  })
})
