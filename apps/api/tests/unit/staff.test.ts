/**
 * Tests de los documentos con código de verificación y de las cuentas de staff.
 *
 * Las reglas son funciones puras; el servicio se prueba de verdad, sobre SQLite
 * en memoria y con el reloj y el azar en la mano.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import {
  canonical,
  CODE_ALPHABET,
  CODE_LABEL,
  CODE_LENGTH,
  CODE_SPACE,
  fileName,
  formatKey,
  makeCode,
  normaliseCode,
  parseCsv,
  parseKey,
  sameDocument,
  withCode,
} from '../../src/modules/staff/staff.rules.js'
import {
  CHECKS_PER_WINDOW,
  COMPARE_MAX_CHARS,
  createStaffService,
  EXPORTS_PER_DAY,
} from '../../src/modules/staff/staff.service.js'
import type { StaffService } from '../../src/modules/staff/staff.service.js'
import { actor, expectCode } from '../helpers/community.js'

const BOM = '﻿'
const HEADER = '"login";"rol";"minutos_validados"'
const csvOf = (minutes: number): string => `${BOM}${HEADER}\r\n"ana";"asiste";"${minutes}"\r\n`

describe('reglas del código de verificación', () => {
  it('el alfabeto no tiene nada que se confunda al leerlo', () => {
    for (const confusing of ['0', 'O', '1', 'I', 'L']) {
      expect(CODE_ALPHABET).not.toContain(confusing)
    }
    expect(new Set(CODE_ALPHABET).size).toBe(CODE_ALPHABET.length)
    expect(CODE_SPACE).toBe(923_521)
  })

  it('un código tiene cuatro caracteres del alfabeto, también en los bordes', () => {
    expect(makeCode(() => 0)).toBe('AAAA')
    expect(makeCode((max) => max - 1)).toBe('9999')
    expect(makeCode(() => 7)).toHaveLength(CODE_LENGTH)
  })

  it('un azar que se sale del alfabeto es un fallo, no un código raro', () => {
    for (const bad of [-1, CODE_ALPHABET.length, 1.5, Number.NaN, Infinity]) {
      expect(() => makeCode(() => bad), String(bad)).toThrow(RangeError)
    }
  })

  it('lo que se teclea se pasa a la forma en que se guarda', () => {
    expect(normaliseCode('k7qf')).toBe('K7QF')
    expect(normaliseCode(' K7 QF ')).toBe('K7QF')
    expect(normaliseCode('K7-QF')).toBe('K7QF')
    expect(normaliseCode('\tk7qf\n')).toBe('K7QF')
  })

  it('lo que no puede ser un código da null', () => {
    for (const bad of [
      '',
      ' ',
      'K7Q',
      'K7QFX',
      'K7Q0',
      'K7QO',
      'K7Q1',
      'K7QI',
      'K7QL',
      'K7Q!',
      'K7QÑ',
      "' OR",
      '%%%%',
      'K'.repeat(33),
      'K7QF'.padEnd(40, ' '),
      1234,
      null,
      undefined,
      {},
      ['K7QF'],
    ]) {
      expect(normaliseCode(bad), JSON.stringify(bad)).toBeNull()
    }
  })

  it('el nombre del fichero lleva de quién es, el periodo y el código', () => {
    expect(fileName('jdoe', '2026-09-12', '2026-10-12', 'K7QF')).toBe(
      'horas-validadas_jdoe_2026-09-12_2026-10-12_K7QF.csv',
    )
    expect(fileName(null, '2026-09-12', '2026-10-12', 'K7QF')).toBe(
      'horas-validadas_todos_2026-09-12_2026-10-12_K7QF.csv',
    )
  })

  it('en el nombre no entra nada que pueda romper la cabecera ni la ruta', () => {
    const name = fileName('a"b\r\nSet-Cookie: x=1/../..\\c', '2026-09-12', '2026-10-12', 'K7QF')

    expect(name).toMatch(/^[A-Za-z0-9._-]+$/)
    expect(name).not.toContain('/')
    expect(fileName('', '', '', '')).toBe('horas-validadas_x___.csv')
    expect(fileName('ñ€😀', '2026-09-12', '2026-10-12', 'K7QF')).toContain('_x_')
    expect(fileName('a'.repeat(5000), '2026-09-12', '2026-10-12', 'K7QF').length).toBeLessThan(100)
  })

  it('el código va en la última línea del documento', () => {
    expect(withCode(csvOf(60), 'K7QF').split('\r\n').slice(-2)).toEqual([
      `"${CODE_LABEL}";"K7QF"`,
      '',
    ])
    // Aunque el documento llegue sin salto final.
    expect(withCode('"a"', 'K7QF')).toBe(`"a"\r\n"${CODE_LABEL}";"K7QF"\r\n`)
    expect(withCode('', 'K7QF')).toBe(`\r\n"${CODE_LABEL}";"K7QF"\r\n`)
  })

  it('es el mismo documento aunque cambien los saltos, la marca o el final', () => {
    const original = withCode(csvOf(60), 'K7QF')

    expect(sameDocument(original, original)).toBe(true)
    expect(sameDocument(original, original.replaceAll('\r\n', '\n'))).toBe(true)
    expect(sameDocument(original, original.replaceAll('\r\n', '\r'))).toBe(true)
    expect(sameDocument(original, original.replace(BOM, ''))).toBe(true)
    expect(sameDocument(original, `${original}\n\n   \n`)).toBe(true)
    expect(sameDocument(original, original.replaceAll('\r\n', '  \r\n'))).toBe(true)
  })

  it('no es el mismo si cambia una sola cifra, una fila o el código', () => {
    const original = withCode(csvOf(60), 'K7QF')

    expect(sameDocument(original, original.replace('"60"', '"61"'))).toBe(false)
    expect(sameDocument(original, original.replace('"60"', '"600"'))).toBe(false)
    expect(sameDocument(original, original.replace('K7QF', 'K7QG'))).toBe(false)
    expect(sameDocument(original, original.replace('"ana"', '"Ana"'))).toBe(false)
    expect(sameDocument(original, `${original}"ana";"asiste";"999"\r\n`)).toBe(false)
    expect(sameDocument(original, original.replace('"ana"', ' "ana"'))).toBe(false)
    expect(sameDocument(original, '')).toBe(false)
  })

  it('dos documentos vacíos son el mismo', () => {
    expect(canonical('')).toBe('')
    expect(sameDocument('', `${BOM}\r\n\r\n`)).toBe(true)
  })

  it('lee las celdas de un CSV de los que escribe la web', () => {
    expect(parseCsv(`${BOM}"a";"b"\r\n"1";"2"\r\n`)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseCsv('"con ""comillas""";"con;punto y coma"\r\n')).toEqual([
      ['con "comillas"', 'con;punto y coma'],
    ])
    expect(parseCsv('"dos\r\nlíneas";"x"\r\n')).toEqual([['dos\r\nlíneas', 'x']])
    expect(parseCsv('"";""\r\n')).toEqual([['', '']])
    expect(parseCsv('a;b\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('un CSV roto o vacío no rompe nada', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('\r\n\r\n')).toEqual([])
    expect(parseCsv(BOM)).toEqual([])
    expect(parseCsv('"sin cerrar;x\r\ny')).toEqual([['sin cerrar;x\r\ny']])
    expect(parseCsv(';')).toEqual([['', '']])
    expect(parseCsv('"'.repeat(1001))).toHaveLength(1)
    expect(parseCsv(`"${'x'.repeat(200_000)}"`)[0]?.[0]).toHaveLength(200_000)
  })

  it('una clave de staff lleva el id de su cuenta y vuelve entera', () => {
    const secret = 'A'.repeat(43)

    expect(parseKey(formatKey(7, secret))).toEqual({ id: 7, secret })
    expect(parseKey(`  ${formatKey(123456789, secret)}  `)).toEqual({ id: 123_456_789, secret })
  })

  it('lo que no tiene forma de clave da null', () => {
    const secret = 'A'.repeat(43)

    for (const bad of [
      '',
      's42',
      `s42-0-${secret}`,
      `s42--1-${secret}`,
      `s42-1.5-${secret}`,
      `s42-1234567890-${secret}`,
      `S42-1-${secret}`,
      `s42-1-${'A'.repeat(19)}`,
      `s42-1-${'A'.repeat(129)}`,
      `s42-1-${secret}!`,
      `s42-1-${secret} extra`,
      `x42-1-${secret}`,
      'a'.repeat(100_000),
      42,
      null,
      undefined,
      {},
    ]) {
      expect(parseKey(bad), JSON.stringify(bad)).toBeNull()
    }
  })
})

describe('documentos y cuentas de staff', () => {
  const START = Date.parse('2026-10-06T14:30:00.000Z')
  const DAY = 24 * 60 * 60_000
  const admin = actor('eva', { admin: true })
  let db: Db
  let at: number
  let picks: number[]
  let staff: StaffService

  /** Un azar que da los índices de `picks` y, cuando se acaban, sigue por su cuenta. */
  let counter: number
  const pick = (max: number): number => {
    const next = picks.shift()

    if (next !== undefined) return next

    // Un generador congruencial: siempre los mismos, y sin repetirse pronto.
    counter = (counter * 1_103_515_245 + 12_345) % 2_147_483_648

    return Math.floor((counter / 2_147_483_648) * max)
  }

  const input = (minutes: number, extra: Partial<Parameters<StaffService['issue']>[0]> = {}) => ({
    login: 'ana' as string | null,
    requestedBy: 'ana',
    from: '2026-09-06',
    to: '2026-10-06',
    totalMinutes: minutes,
    rows: 1,
    csv: csvOf(minutes),
    ...extra,
  })

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    at = START
    picks = []
    counter = 42
    staff = createStaffService({ db, now: () => at, pick })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  const account = async (name = 'Bocal Madrid') => {
    const created = await staff.createAccount(admin, { name })
    const identity = await staff.authenticate(created.key)

    if (identity === null) throw new Error('la clave recién creada no vale')

    return { ...created, identity }
  }

  describe('emitir', () => {
    it('devuelve el fichero con su código en el nombre y en la última línea', async () => {
      picks = [0, 1, 2, 3]

      const issued = await staff.issue(input(60))

      expect(issued.code).toBe('ABCD')
      expect(issued.fileName).toBe('horas-validadas_ana_2026-09-06_2026-10-06_ABCD.csv')
      expect(issued.csv).toBe(`${csvOf(60)}"${CODE_LABEL}";"ABCD"\r\n`)
    })

    it('el mismo documento pedido otra vez conserva su código', async () => {
      const first = await staff.issue(input(60))

      at += 3 * DAY

      const again = await staff.issue(input(60))
      const total = await db.execute('SELECT COUNT(*) AS n FROM report_exports')

      expect(again).toEqual(first)
      expect(total.rows[0]?.n).toBe(1)
    })

    it('si cambia algo (las horas, el periodo, de quién es o quién lo pide) es otro', async () => {
      const codes = new Set([
        (await staff.issue(input(60))).code,
        (await staff.issue(input(61))).code,
        (await staff.issue(input(60, { to: '2026-10-07' }))).code,
        (await staff.issue(input(60, { login: 'leo' }))).code,
        (await staff.issue(input(60, { login: null }))).code,
        (await staff.issue(input(60, { requestedBy: 'eva' }))).code,
      ])

      expect(codes.size).toBe(6)
    })

    it('si el código que sale ya existe, se prueba otro sin pisar nada', async () => {
      picks = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]

      const first = await staff.issue(input(60))
      const second = await staff.issue(input(61))

      expect(first.code).toBe('AAAA')
      expect(second.code).toBe('BBBB')
      expect((await staff.issue(input(60))).csv).toContain('"60"')
    })

    it('si no queda ningún código libre lo dice, en vez de quedarse dando vueltas', async () => {
      const stuck = createStaffService({ db, now: () => at, pick: () => 0 })

      await stuck.issue(input(60))
      await expectCode(stuck.issue(input(61)), 'conflict')
    })

    it('tope diario: caben justo los que dice y el siguiente espera a mañana', async () => {
      for (let minutes = 1; minutes <= EXPORTS_PER_DAY; minutes += 1) {
        await staff.issue(input(minutes))
      }

      await expectCode(staff.issue(input(EXPORTS_PER_DAY + 1)), 'rate_limited')
      // Repetir uno ya emitido no gasta: sigue saliendo.
      expect((await staff.issue(input(1))).csv).toContain('"1"')
      // El tope es de cada persona.
      expect((await staff.issue(input(1, { requestedBy: 'leo' }))).code).toHaveLength(4)

      at += DAY

      expect((await staff.issue(input(EXPORTS_PER_DAY + 1))).code).toHaveLength(4)
    })

    it('guarda totales con sentido aunque lleguen negativos, con decimales o enormes', async () => {
      await staff.issue(input(1, { totalMinutes: -5, rows: -1 }))
      await staff.issue(input(2, { totalMinutes: 59.6, rows: 2.4 }))
      await staff.issue(input(3, { totalMinutes: Number.MAX_SAFE_INTEGER, rows: 1e9 }))

      const stored = await db.execute(
        'SELECT total_minutes, row_count FROM report_exports ORDER BY created_at, total_minutes',
      )

      expect(stored.rows.map((row) => [row.total_minutes, row.row_count])).toEqual([
        [0, 0],
        [60, 2],
        [Number.MAX_SAFE_INTEGER, 1e9],
      ])
    })

    it('un documento vacío y uno enorme también se emiten', async () => {
      const empty = await staff.issue(input(0, { csv: '' }))
      const huge = await staff.issue(
        input(0, { csv: `${HEADER}\r\n${'"x";"y";"1"\r\n'.repeat(20_000)}` }),
      )

      expect(empty.csv).toBe(`\r\n"${CODE_LABEL}";"${empty.code}"\r\n`)
      expect(huge.csv.endsWith(`"${CODE_LABEL}";"${huge.code}"\r\n`)).toBe(true)
    })
  })

  describe('cuentas', () => {
    it('solo las crea, las ve y las retira quien administra', async () => {
      const someone = actor('leo')

      await expectCode(staff.accounts(someone), 'forbidden')
      await expectCode(staff.createAccount(someone, { name: 'Bocal' }), 'forbidden')
      await expectCode(staff.revoke(someone, 1), 'forbidden')
    })

    it('crear una cuenta devuelve su clave una vez; en la base solo queda su resumen', async () => {
      const { account: created, key } = await staff.createAccount(admin, { name: 'Bocal Madrid' })
      const stored = await db.execute('SELECT * FROM staff_accounts')
      const secret = key.split('-').slice(2).join('-')

      expect(created).toMatchObject({
        name: 'Bocal Madrid',
        createdBy: 'eva',
        lastUsedAt: null,
        revokedAt: null,
      })
      expect(key).toMatch(new RegExp(`^s42-${created.id}-[A-Za-z0-9_-]{43}$`))
      expect(JSON.stringify(stored.rows)).not.toContain(secret)
      expect((await staff.accounts(admin)).accounts).toEqual([created])
      expect(JSON.stringify(await staff.accounts(admin))).not.toContain('key')
    })

    it('el nombre: de 3 a 40 caracteres, sin nada raro, y sin repetir', async () => {
      for (const name of ['abc', 'a'.repeat(40), 'Bocal 42.Madrid_sur-2']) {
        expect((await staff.createAccount(admin, { name })).account.name).toBe(name)
      }

      for (const name of [
        '',
        '  ',
        'ab',
        'a'.repeat(41),
        '-abc',
        'abc-',
        'a<b>c',
        "a'; DROP TABLE staff_accounts; --",
        'ñandú',
        'a\nb',
        42,
        null,
        undefined,
      ]) {
        await expectCode(staff.createAccount(admin, { name }), 'invalid_input')
      }

      await expectCode(staff.createAccount(admin, {}), 'invalid_input')
      await expectCode(staff.createAccount(admin, null), 'invalid_input')
      await expectCode(staff.createAccount(admin, { name: 'ABC' }), 'conflict')
      await expectCode(staff.createAccount(admin, { name: '  abc  ' }), 'conflict')
    })

    it('la clave buena entra y apunta cuándo; cualquier otra, no', async () => {
      const first = await staff.createAccount(admin, { name: 'Bocal uno' })
      const second = await staff.createAccount(admin, { name: 'Bocal dos' })
      const secretOf = (key: string): string => key.split('-').slice(2).join('-')

      at += 5000

      expect(await staff.authenticate(first.key)).toEqual({
        id: first.account.id,
        name: 'Bocal uno',
      })
      expect(
        (await staff.accounts(admin)).accounts.find((a) => a.id === first.account.id),
      ).toMatchObject({
        lastUsedAt: new Date(at).toISOString(),
      })

      for (const bad of [
        `${first.key}x`,
        first.key.slice(0, -1),
        first.key.toUpperCase(),
        // El secreto de una cuenta con el id de otra.
        formatKey(second.account.id, secretOf(first.key)),
        formatKey(9999, secretOf(first.key)),
        formatKey(first.account.id, 'A'.repeat(43)),
        '',
        's42-1-',
        'a'.repeat(100_000),
        null,
        undefined,
        42,
        { key: first.key },
      ]) {
        expect(await staff.authenticate(bad), JSON.stringify(bad)).toBeNull()
      }
    })

    it('retirar el acceso deja la clave sin valor y no se puede retirar dos veces', async () => {
      const { account: created, key, identity } = await account()

      expect(await staff.active(identity.id)).toBe(true)

      await staff.revoke(admin, created.id)

      expect(await staff.active(identity.id)).toBe(false)
      expect(await staff.authenticate(key)).toBeNull()
      expect((await staff.accounts(admin)).accounts[0]?.revokedAt).toBe(new Date(at).toISOString())
      await expectCode(staff.revoke(admin, created.id), 'not_found')
      await expectCode(staff.revoke(admin, 9999), 'not_found')
      await expectCode(staff.revoke(admin, -1), 'not_found')
      // Y quien tenía la sesión abierta ya no comprueba nada.
      await expectCode(staff.document(identity, 'AAAA'), 'unauthenticated')
    })

    it('una cuenta que no existe no está activa', async () => {
      for (const id of [0, -1, 9999, Number.MAX_SAFE_INTEGER]) {
        expect(await staff.active(id)).toBe(false)
      }
    })
  })

  describe('comprobar', () => {
    it('con el código, el staff ve el documento tal como se emitió', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60))

      expect(await staff.document(identity, issued.code)).toEqual({
        code: issued.code,
        login: 'ana',
        requestedBy: 'ana',
        from: '2026-09-06',
        to: '2026-10-06',
        totalMinutes: 60,
        rows: 1,
        issuedAt: new Date(START).toISOString(),
        fileName: issued.fileName,
        header: ['login', 'rol', 'minutos_validados'],
        lines: [['ana', 'asiste', '60']],
      })
    })

    it('vale tecleado en minúsculas o con espacios, y el de todo el mundo no es de nadie', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60, { login: null, requestedBy: 'eva' }))
      const typed = ` ${issued.code.slice(0, 2).toLowerCase()} ${issued.code.slice(2).toLowerCase()} `
      const found = await staff.document(identity, typed)

      expect(found.login).toBeNull()
      expect(found.requestedBy).toBe('eva')
      expect(found.fileName).toContain('_todos_')
    })

    it('un código que no es de ningún documento da not_found y queda apuntado', async () => {
      const { identity } = await account()

      for (const bad of ['ZZZZ', '', 'K7Q', '0000', "' OR 1=1 --", 'a'.repeat(5000), null, 42]) {
        await expectCode(staff.document(identity, bad), 'not_found')
      }

      const log = await db.execute('SELECT staff, code, outcome FROM staff_checks ORDER BY id')

      expect(log.rows).toHaveLength(8)
      expect(
        log.rows.every((row) => row.outcome === 'unknown' && row.staff === 'Bocal Madrid'),
      ).toBe(true)
      // Lo que se apunta de un código absurdo va recortado.
      expect(log.rows.every((row) => typeof row.code === 'string' && row.code.length <= 16)).toBe(
        true,
      )
    })

    it('tope de comprobaciones: caben justo las que dice, y vuelve al pasar la ventana', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60))

      for (let index = 0; index < CHECKS_PER_WINDOW; index += 1) {
        await staff.document(identity, issued.code)
      }

      await expectCode(staff.document(identity, issued.code), 'rate_limited')
      await expectCode(
        staff.compare(identity, issued.code, { content: issued.csv }),
        'rate_limited',
      )

      at += 10 * 60_000 - 1
      await expectCode(staff.document(identity, issued.code), 'rate_limited')

      at += 1
      expect((await staff.document(identity, issued.code)).code).toBe(issued.code)
    })

    it('el tope es de cada cuenta: una no deja sin intentos a otra', async () => {
      const one = await account('Bocal uno')
      const two = await account('Bocal dos')

      for (let index = 0; index < CHECKS_PER_WINDOW; index += 1) {
        await expectCode(staff.document(one.identity, 'ZZZZ'), 'not_found')
      }

      await expectCode(staff.document(one.identity, 'ZZZZ'), 'rate_limited')
      await expectCode(staff.document(two.identity, 'ZZZZ'), 'not_found')
    })

    it('comparar: el fichero recibido es el emitido, aunque cambien los saltos de línea', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60))

      expect(await staff.compare(identity, issued.code, { content: issued.csv })).toEqual({
        identical: true,
      })
      expect(
        await staff.compare(identity, issued.code, {
          content: issued.csv.replaceAll('\r\n', '\n'),
        }),
      ).toEqual({ identical: true })
    })

    it('comparar: un fichero retocado, vacío o de otro documento no es el emitido', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60))
      const other = await staff.issue(input(90))

      for (const content of [
        issued.csv.replace('"60"', '"600"'),
        '',
        other.csv,
        'cualquier cosa',
      ]) {
        expect(await staff.compare(identity, issued.code, { content })).toEqual({
          identical: false,
        })
      }

      const log = await db.execute("SELECT outcome FROM staff_checks WHERE outcome = 'different'")

      expect(log.rows).toHaveLength(4)
    })

    it('comparar: sin fichero, con otra cosa o con uno demasiado grande es invalid_input', async () => {
      const { identity } = await account()
      const issued = await staff.issue(input(60))

      for (const body of [undefined, null, {}, { content: 42 }, { content: null }, [], 'texto']) {
        await expectCode(staff.compare(identity, issued.code, body), 'invalid_input')
      }

      expect(
        await staff.compare(identity, issued.code, { content: 'x'.repeat(COMPARE_MAX_CHARS) }),
      ).toEqual({ identical: false })
      await expectCode(
        staff.compare(identity, issued.code, { content: 'x'.repeat(COMPARE_MAX_CHARS + 1) }),
        'invalid_input',
      )
      await expectCode(staff.compare(identity, 'ZZZZ', { content: issued.csv }), 'not_found')
    })
  })
})
