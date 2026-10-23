/**
 * Privacidad y condiciones: aceptar la versión vigente y descargar lo tuyo.
 * Y una red: toda tabla con datos de una persona sale en su descarga, y de
 * las tablas «entre dos» cada cual se lleva solo lo suyo.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { compose } from '../../src/app/composition.js'
import { openDatabase } from '../../src/core/db/database.js'
import { LEGAL_VERSION } from '../../src/modules/legal/index.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'
import { createFake42 } from '../helpers/fake-42.js'
import { textOf } from '../helpers/rows.js'

describe('privacidad y condiciones', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('hay que aceptar la versión vigente, y solo esa', async () => {
    const { legal } = services

    expect(await legal.status(actor('ana'))).toEqual({ version: LEGAL_VERSION, acceptedAt: null })
    await expectCode(legal.accept(actor('ana'), { version: '2020-01-01' }), 'conflict')

    for (const wrong of [{}, { version: 'ayer' }, { version: 20261016 }, null]) {
      await expectCode(legal.accept(actor('ana'), wrong), 'invalid_input')
    }

    const accepted = await legal.accept(actor('ana'), { version: LEGAL_VERSION })

    expect(accepted.acceptedAt).not.toBeNull()
    // Aceptar otra vez no cambia la fecha; lo de `ana` no vale por `leo`.
    expect(await legal.accept(actor('ana'), { version: LEGAL_VERSION })).toEqual(accepted)
    expect((await legal.status(actor('leo'))).acceptedAt).toBeNull()
  })

  it('la descarga trae lo tuyo, no lo de otras personas ni los secretos', async () => {
    const { legal, admin } = services

    await admin.openTicket(actor('ana'), { kind: 'idea', subject: 'Mío', body: 'Algo largo' })
    await admin.openTicket(actor('leo'), { kind: 'idea', subject: 'Suyo', body: 'Algo largo' })
    await legal.accept(actor('ana'), { version: LEGAL_VERSION })
    await community.db.execute(
      `INSERT INTO admin_second_factor (login, secret, created_at) VALUES ('ana', 'SECRETO', 'x')`,
    )

    const data = await legal.export(actor('ana'), null)

    expect(data).toMatchObject({ login: 'ana', legalVersion: LEGAL_VERSION })
    expect(data.tables.tickets?.rows.map((row) => row.subject)).toEqual(['Mío'])
    expect(data.tables.legal_acceptances?.rows).toHaveLength(1)
    expect(data.tables.admin_second_factor?.rows[0]).not.toHaveProperty('secret')
    expect(JSON.stringify(data)).not.toContain('SECRETO')
    expect(JSON.stringify(data)).not.toContain('Suyo')
    // Lo que va por id de 42 (sus proyectos en la réplica) solo se busca con ese id.
    expect(data.tables.project_users).toBeUndefined()
    expect(data.tables.users?.rows.map((row) => row.login)).toEqual(['ana'])
    // Lo copiado de 42 va etiquetado aparte de lo de la app, y nada se quedó corto.
    expect(data.tables.users?.source).toBe('42')
    expect(data.tables.corrections?.source).toBe('42')
    expect(data.tables.tickets?.source).toBe('sanatorio')
    expect(Object.values(data.tables).every((table) => !table.truncated)).toBe(true)
  })

  it('en las tablas «entre dos» cada parte se lleva solo lo suyo', async () => {
    const { legal } = services
    const { db } = community

    await db.batch([
      {
        sql: `INSERT INTO help_bookings (campus_id, helper, requester, project_id, day, start_min, minutes,
                note, status, helper_tag, requester_tag, created_at, news_for)
              VALUES (22, 'ana', 'leo', 1, '2026-10-06', 1020, 30, 'NOTA DE LEO', 'confirmed',
                'paciente', 'puntual', 'x', 'leo')`,
        args: [],
      },
      {
        sql: `INSERT INTO corrections (id, campus_id, corrector, corrected, project_id, begin_at, final_mark, positive, passed)
              VALUES (7, 22, 'ana', 'leo', 1, 'x', 42, 1, 0)`,
        args: [],
      },
      {
        sql: `INSERT INTO reactions (from_login, to_login, kind, specialist, day, created_at)
              VALUES ('leo', 'ana', 'bug', 0, '2026-10-06', 'x')`,
        args: [],
      },
      {
        sql: `INSERT INTO event_attendance (event_id, login, host, title) VALUES ('board:1', 'leo', 'ana', 'Pizarra')`,
        args: [],
      },
      {
        sql: `INSERT INTO report_exports (code, login, requested_by, period_from, period_to, total_minutes,
                row_count, hash, content, created_at)
              VALUES ('C0D3', 'leo', 'ana', '2026-10-01', '2026-10-07', 90, 3, 'HASH', 'CSV DE LEO', 'x')`,
        args: [],
      },
      {
        sql: `INSERT INTO event_checkins (event_id, login, code, phase, outcome, created_at)
              VALUES ('board:1', 'ana', 'K0DE', 'start', 'ok', 'x')`,
        args: [],
      },
      {
        sql: `INSERT INTO help_blocks (blocker, blocked, created_at) VALUES ('leo', 'ana', 'x')`,
        args: [],
      },
      {
        sql: `INSERT INTO notices (login, kind, ref, from_login, text, created_at, updated_at)
              VALUES ('leo', 'help', 'r', 'ana', 'TEXTO PARA LEO', 'x', 'x')`,
        args: [],
      },
    ])

    const ana = (await legal.export(actor('ana'), null)).tables
    const leo = (await legal.export(actor('leo'), null)).tables
    const asText = JSON.stringify(ana)

    // Quien ayudó: ni la nota de quien pidió ni la etiqueta que le puso.
    expect(ana.help_bookings?.rows[0]).toMatchObject({ helper: 'ana', helper_tag: 'paciente' })
    expect(ana.help_bookings?.rows[0]).not.toHaveProperty('note')
    expect(ana.help_bookings?.rows[0]).not.toHaveProperty('requester_tag')
    // Quien pidió: su nota y cómo le describieron; no cómo describió.
    expect(leo.help_bookings?.rows[0]).toMatchObject({
      note: 'NOTA DE LEO',
      requester_tag: 'puntual',
    })
    expect(leo.help_bookings?.rows[0]).not.toHaveProperty('helper_tag')
    // La nota de una corrección es de quien fue corregido.
    expect(ana.corrections?.rows[0]).not.toHaveProperty('final_mark')
    expect(leo.corrections?.rows[0]).toMatchObject({ final_mark: 42 })
    // Una reacción recibida no dice quién la dio.
    expect(ana.reactions?.rows[0]).not.toHaveProperty('from_login')
    // Quien organizó no se lleva a cada asistente.
    expect(ana.event_attendance?.rows[0]).toEqual(
      expect.objectContaining({ host: 'ana', title: 'Pizarra' }),
    )
    expect(ana.event_attendance?.rows[0]).not.toHaveProperty('login')
    // El CSV de horas de otra persona no sale; el hash y el código escrito, nunca.
    expect(ana.report_exports?.rows[0]).not.toHaveProperty('content')
    expect(leo.report_exports?.rows[0]).toMatchObject({ content: 'CSV DE LEO' })
    expect(asText).not.toContain('HASH')
    expect(asText).not.toContain('K0DE')
    expect(ana.event_checkins?.rows[0]).toMatchObject({ outcome: 'ok' })
    // A quien bloquearon no se le dice quién.
    expect(ana.help_blocks?.rows).toEqual([{ created_at: 'x' }])
    expect(leo.help_blocks?.rows[0]).toMatchObject({ blocker: 'leo', blocked: 'ana' })
    // Quien provocó un aviso no lee el texto que le llegó a la otra persona.
    expect(ana.notices?.rows[0]).toMatchObject({ from_login: 'ana', kind: 'help' })
    expect(asText).not.toContain('TEXTO PARA LEO')
    expect(asText).not.toContain('NOTA DE LEO')
  })

  it('de una lista de gente solo sale el propio login', async () => {
    const { legal } = services
    const { db } = community

    await db.batch([
      {
        sql: `INSERT INTO therapy_checks (group_id, day, slot, present, checked_at)
              VALUES (1, '2026-10-06', 0, 'ana,leo,eva', 'x'), (1, '2026-10-07', 0, 'leo', 'x'),
                     (1, '2026-10-08', 0, '', 'x')`,
        args: [],
      },
      {
        sql: `INSERT INTO broadcasts (from_login, title, body, audience, created_at)
              VALUES ('eva', 'A dos', 'b', '{"kind":"logins","logins":["ana","leo"]}', 'x'),
                     ('eva', 'Al campus', 'b', '{"kind":"campus","campusId":22}', 'x'),
                     ('ana', 'De ana', 'b', '{"kind":"logins","logins":["leo","max"]}', 'x')`,
        args: [],
      },
    ])

    const ana = (await legal.export(actor('ana'), null)).tables
    const eva = (await legal.export(actor('eva'), null)).tables

    expect(ana.therapy_checks?.rows).toEqual([
      { group_id: 1, day: '2026-10-06', slot: 0, present: 'ana', checked_at: 'x' },
    ])
    // Destinataria: el comunicado con solo su login. Remitente: sin la lista.
    expect(ana.broadcasts?.rows.map((row) => [row.title, row.audience])).toEqual([
      ['A dos', 'ana'],
      ['De ana', undefined],
    ])
    expect(eva.broadcasts?.rows.map((row) => row.title)).toEqual(['A dos', 'Al campus'])
    expect(JSON.stringify(ana)).not.toContain('max')
    expect(JSON.stringify(eva)).not.toContain('"leo"')
  })

  it('toda columna de persona de cualquier tabla está en la descarga de algún módulo', async () => {
    const db = await openDatabase({ url: 'file::memory:' })
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
    const declared = new Map<string, Set<string>>()

    for (const spec of modules.flatMap((module) => module.personal ?? [])) {
      declared.set(
        spec.table,
        new Set([
          ...(spec.logins ?? []),
          ...(spec.userIds ?? []),
          ...(spec.lists ?? []).map((list) => list.column),
        ]),
      )
    }

    // Columnas que parecen nombrar a alguien pero no son una persona: el puesto
    // (`host`) de un ordenador del cluster.
    const notPeople = new Set(['seats.host', 'broken_seats.host', 'presence.host'])
    // Columnas con gente dentro que no son un login suelto ni una lista: se
    // declaran como lista en su módulo (`therapy_checks.present`,
    // `broadcasts.audience`) o se omiten con el porqué (`git_rooms.state`).
    const person =
      /^(login|host|helper|requester|creator|corrector|corrected|rater|blocker|blocked|validator|author|proposer|user_id|news_for|present|audience)$|_login$|_by$/
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    const missing: string[] = []

    for (const row of tables.rows) {
      const table = textOf(row, 'name')
      const columns = await db.execute(`PRAGMA table_info(${table})`)

      for (const column of columns.rows.map((info) => textOf(info, 'name'))) {
        if (
          person.test(column) &&
          !notPeople.has(`${table}.${column}`) &&
          !declared.get(table)?.has(column)
        ) {
          missing.push(`${table}.${column}`)
        }
      }
    }

    expect(missing).toEqual([])

    // Y lo declarado existe: una columna mal escrita rompería la descarga.
    const unknown: string[] = []

    for (const [table, columns] of declared) {
      const info = await db.execute(`PRAGMA table_info(${table})`)
      const real = new Set(info.rows.map((column) => textOf(column, 'name')))

      for (const column of columns) {
        if (!real.has(column)) unknown.push(`${table}.${column}`)
      }
      for (const spec of modules.flatMap((module) => module.personal ?? [])) {
        if (spec.table !== table) continue
        for (const column of [...(spec.omit ?? []), ...Object.values(spec.give ?? {}).flat()]) {
          if (!real.has(column)) unknown.push(`${table}.${column}`)
        }
      }
    }

    expect(unknown).toEqual([])
    db.close()
  })
})
