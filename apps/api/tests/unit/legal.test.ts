/**
 * Privacidad y condiciones: aceptar la versión vigente y descargar lo tuyo.
 * Y una red: toda tabla con datos de una persona sale en su descarga.
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
    expect(data.tables.tickets?.map((row) => row.subject)).toEqual(['Mío'])
    expect(data.tables.legal_acceptances).toHaveLength(1)
    expect(data.tables.admin_second_factor?.[0]).not.toHaveProperty('secret')
    expect(JSON.stringify(data)).not.toContain('SECRETO')
    expect(JSON.stringify(data)).not.toContain('Suyo')
    // Lo que va por id de 42 (sus proyectos en la réplica) solo se busca con ese id.
    expect(data.tables.project_users ?? []).toEqual([])
    expect(data.tables.users?.map((row) => row.login)).toEqual(['ana'])
  })

  it('toda tabla con una columna de persona está en la descarga de algún módulo', async () => {
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
      declared.set(spec.table, new Set([...(spec.logins ?? []), ...(spec.userIds ?? [])]))
    }

    // Columnas que nombran a alguien pero no son «sus datos»: quién hizo algo
    // desde el panel, o el puesto (`host`) de un ordenador del cluster.
    const notTheirs = new Set([
      'user_roles.granted_by',
      'user_blocks.blocked_by',
      'tickets.answered_by',
      'settings.updated_by',
      'staff_accounts.created_by',
      'seats.host',
      'presence.host',
      'notices.from_login',
      'help_bookings.helper_tag',
      'help_bookings.requester_tag',
    ])
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    const missing: string[] = []

    for (const row of tables.rows) {
      const table = textOf(row, 'name')
      const columns = await db.execute(`PRAGMA table_info(${table})`)

      for (const column of columns.rows.map((info) => textOf(info, 'name'))) {
        const person =
          /login|helper|requester|^host$|author|creator|corrector|corrected|_by$|proposer|^user_id$/.test(
            column,
          )

        if (person && !notTheirs.has(`${table}.${column}`) && !declared.get(table)?.has(column)) {
          missing.push(`${table}.${column}`)
        }
      }
    }

    expect(missing).toEqual([])
    db.close()
  })
})
