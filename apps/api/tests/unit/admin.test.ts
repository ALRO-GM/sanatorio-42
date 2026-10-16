/**
 * Tests de la administración: permisos, buzón, consumo, presupuesto y uso.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { compose } from '../../src/app/composition.js'
import {
  forecast,
  levelOf,
  perPerson,
  periodOf,
  planDay,
  planHour,
  stopAt,
  worst,
} from '../../src/modules/admin/budget.rules.js'
import { HOUR, MADRID, MINUTE, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const SYNC = {
  trackedCampusIds: [MADRID],
  defaultCampusId: MADRID,
  hourlyReserve: 300,
  backfillIntervalMs: 0,
  locationsTtlMs: 2 * MINUTE,
  locationsIdleMs: 15 * MINUTE,
  deltaTtlMs: 5 * MINUTE,
  deltaIdleMs: 30 * MINUTE,
  requestPageBudget: 2,
}

describe('comunidad', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, clock, db, api } = community)
  })

  describe('administración y uso', () => {
    it('las estadísticas reparten el tiempo por hora, elemento y persona', async () => {
      const { usage, admin } = services
      const boss = actor('eva', { admin: true })

      // 14:30 UTC: `ana` mira el tablón, parte del rato con otra ventana delante.
      await usage.record(actor('ana'), {
        counts: { 'nav.tablon': 2, 'expediente.health': 1 },
        time: { 'nav.tablon': [300, 60, 0] },
      })
      await usage.record(actor('leo'), { counts: {}, time: { 'nav.red': [120, 0, 600] } })
      admin.count('ana', 2000)
      admin.count('ana', 1000)
      // El tráfico se apunta en la hora en que se vuelca, que es cada poco.
      await admin.flush()

      // Una hora después, `ana` sigue con la pestaña oculta.
      clock.advance(HOUR)
      await usage.record(actor('ana'), { counts: {}, time: { 'nav.tablon': [0, 0, 900] } })

      const stats = await usage.stats(boss, {})

      expect(stats.login).toBeNull()
      expect(stats.totals).toMatchObject({
        clicks: 3,
        seen: 420,
        back: 60,
        hidden: 1500,
        requests: 2,
        bytes: 3000,
        people: 2,
      })
      // Una fila por hora (UTC), con cuánta gente hubo.
      expect(stats.hours).toMatchObject([
        { day: '2026-10-06', hour: 14, people: 2, seen: 420, hidden: 600, requests: 2 },
        { day: '2026-10-06', hour: 15, people: 1, seen: 0, hidden: 900 },
      ])
      // Las secciones llevan tiempo; un bloque, solo pulsaciones.
      expect(stats.keys).toMatchObject([
        { key: 'nav.tablon', seen: 300, back: 60, hidden: 900, clicks: 2, people: 1 },
        { key: 'nav.red', seen: 120, hidden: 600, people: 1 },
        { key: 'expediente.health', clicks: 1, seen: 0, people: 1 },
      ])
      // Por persona, quien más la ha visto primero.
      expect(stats.users.map((user) => [user.login, user.seen, user.requests])).toEqual([
        ['ana', 300, 2],
        ['leo', 120, 0],
      ])

      // Las de una sola persona no traen la lista de gente.
      const mine = await usage.stats(boss, { login: 'leo' })

      expect(mine).toMatchObject({ login: 'leo', users: [], totals: { seen: 120, people: 1 } })
      expect(mine.keys.map((row) => row.key)).toEqual(['nav.red'])

      // Fuera del periodo no hay nada, y solo las ve quien administra.
      expect((await usage.stats(boss, { from: '2026-09-01', to: '2026-09-30' })).hours).toEqual([])
      await expectCode(usage.stats(actor('ana'), {}), 'forbidden')
      // Un envío con más tiempo del que cabe en un envío no entra.
      await expectCode(
        usage.record(actor('ana'), { counts: {}, time: { 'nav.tablon': [5000, 0, 0] } }),
        'invalid_input',
      )
    })

    it('los recorridos dicen por dónde se entra, por dónde se pasa y dónde se acaba', async () => {
      const { usage } = services
      const boss = actor('eva', { admin: true })

      // `ana` entra seis veces por el expediente; casi siempre sigue al tablón,
      // donde se queda un buen rato, y de ahí a veces a la red, donde acaba.
      await usage.record(actor('ana'), {
        counts: {},
        flows: { 'start>expediente': 6, 'expediente>tablon': 5, 'tablon>red': 2 },
        time: { 'nav.expediente': [30, 0, 0], 'nav.tablon': [900, 0, 0] },
      })
      await usage.record(actor('ana'), { counts: {}, time: { 'nav.red': [300, 0, 0] } })
      await usage.record(actor('leo'), {
        counts: {},
        flows: { 'start>tablon': 1, 'tablon>red': 3 },
      })

      const seen = await usage.flows(boss, {})

      expect(seen.sessions).toBe(7)
      expect(seen.flows[0]).toEqual({ from: 'start', to: 'expediente', count: 6, people: 1 })
      expect(seen.flows.find((flow) => flow.to === 'red')).toMatchObject({ count: 5, people: 2 })

      const [first, second, third] = seen.sections

      // El tablón: seis llegadas, cinco siguen. Mucho rato cada vez.
      expect(first).toEqual({
        key: 'tablon',
        visits: 6,
        entries: 1,
        exits: 1,
        onward: 5,
        seen: 900,
        avgSeen: 150,
        exitRate: 1 / 6,
        role: 'stay',
      })
      // El expediente: se entra por ahí, cinco segundos y a otra cosa.
      expect(second).toMatchObject({
        key: 'expediente',
        visits: 6,
        entries: 6,
        exits: 1,
        avgSeen: 5,
        role: 'pass',
      })
      // La red: de ahí no se va a ningún sitio.
      expect(third).toMatchObject({ key: 'red', visits: 5, exits: 5, exitRate: 1, role: 'end' })

      // Las de una sola persona.
      expect((await usage.flows(boss, { login: 'leo' })).sessions).toBe(1)
      await expectCode(usage.flows(actor('ana'), {}), 'forbidden')
      await expectCode(
        usage.record(actor('ana'), { counts: {}, flows: { 'tablon->red': 1 } }),
        'invalid_input',
      )
    })

    it('se puede dejar fuera a quien más usa la web, a quien menos, o a los dos', async () => {
      const { usage } = services
      const boss = actor('eva', { admin: true })
      // Diez personas, cada una más activa que la anterior; la última, muchísimo.
      const people = Array.from({ length: 10 }, (_, index) => `p${index}`)

      for (const [index, login] of people.entries()) {
        await usage.record(actor(login), {
          counts: {},
          time: { 'nav.tablon': [index === 9 ? 900 : (index + 1) * 10, 0, 0] },
          flows: { 'start>tablon': index + 1 },
        })
      }

      const all = await usage.stats(boss, {})

      expect(all.segment).toEqual({ low: 0, high: 100, people: 10, of: 10 })
      expect(all.totals).toMatchObject({ seen: 450 + 900, people: 10 })

      // Sin el 10 % más activo: se va quien lo desfiguraba todo.
      const calm = await usage.stats(boss, { high: '90' })

      expect(calm.segment).toEqual({ low: 0, high: 90, people: 9, of: 10 })
      expect(calm.totals).toMatchObject({ seen: 450, people: 9 })
      expect(calm.users.map((user) => user.login)).not.toContain('p9')

      // Solo el centro: sin el 20 % de cada extremo.
      const middle = await usage.stats(boss, { low: '20', high: '80' })

      expect(middle.segment).toMatchObject({ people: 6, of: 10 })
      expect(middle.users.map((user) => user.login).sort()).toEqual([
        'p2',
        'p3',
        'p4',
        'p5',
        'p6',
        'p7',
      ])

      // Los recorridos, con el mismo tramo.
      const flows = await usage.flows(boss, { low: '20', high: '80' })

      expect(flows.segment).toMatchObject({ people: 6, of: 10 })
      expect(flows.sessions).toBe(3 + 4 + 5 + 6 + 7 + 8)
      expect(flows.sections[0]).toMatchObject({ key: 'tablon', seen: 30 + 40 + 50 + 60 + 70 + 80 })

      // Al mirar a una sola persona no hay tramo que valga.
      expect((await usage.stats(boss, { login: 'p9', high: '50' })).totals.seen).toBe(900)
      await expectCode(usage.stats(boss, { low: '120' }), 'invalid_input')
    })

    it('quien administra ve quién está conectado y cuánto lleva su sesión', async () => {
      const { usage, repositories } = services
      const boss = actor('eva', { admin: true })
      const at = (): string => new Date(clock.now()).toISOString()
      const start = at()

      await repositories.profiles.touch('ana', start)
      clock.advance(3 * MINUTE)
      await repositories.profiles.touch('ana', at())
      await repositories.profiles.touch('leo', at())

      // `ana` lleva tres minutos; `leo` acaba de llegar.
      expect((await usage.online(boss)).people).toMatchObject([
        { login: 'ana', since: start, seenAt: at() },
        { login: 'leo', since: at() },
      ])

      // Sin señales de vida un rato, deja de salir; al volver, es otra sesión.
      clock.advance(20 * MINUTE)
      await repositories.profiles.touch('leo', at())
      expect((await usage.online(boss)).people).toMatchObject([{ login: 'leo', since: at() }])
      await expectCode(usage.online(actor('ana')), 'forbidden')
    })

    it('el uso por horas no se borra solo: se quita a mano, entero o por fechas', async () => {
      const { usage, admin } = services
      const boss = actor('eva', { admin: true })

      await usage.record(actor('ana'), { counts: { 'nav.tablon': 1 } })
      clock.advance(200 * 24 * HOUR)
      await usage.record(actor('ana'), { counts: { 'nav.red': 1 } })

      // Medio año después sigue lo de octubre.
      const kept = await usage.stats(boss, { from: '2026-10-01', to: '2026-10-31' })

      expect(kept.keys.map((row) => row.key)).toEqual(['nav.tablon'])

      // Lo que se puede borrar, con cuántas filas tiene cada cosa.
      const { kinds } = await admin.data(boss)

      expect(kinds.map((kind) => kind.id)).toEqual(
        expect.arrayContaining([
          'traffic',
          'tickets',
          'notices',
          'messages',
          'event_alerts',
          'broadcasts',
          'checkins',
          'usage',
          'flows',
          'clicker_capital',
          'clicker_alerts',
          'clicker_cheats',
        ]),
      )
      expect(kinds.find((kind) => kind.id === 'usage')).toEqual({ id: 'usage', rows: 2 })
      await expectCode(admin.data(actor('ana')), 'forbidden')
      await expectCode(admin.wipe(boss, { kind: 'inventado' }, true), 'not_found')
      await expectCode(admin.wipe(boss, { kind: 'usage', before: 'ayer' }, true), 'invalid_input')

      // Antes de borrar se enseña qué es: cuántas filas y las más recientes.
      const preview = await admin.preview(boss, { kind: 'usage', login: 'ana' })

      expect(preview.rows).toBe(2)
      expect(preview.columns).toEqual([
        'login',
        'day',
        'hour',
        'key',
        'clicks',
        'seen_s',
        'back_s',
        'hidden_s',
      ])
      expect(preview.sample.map((row) => row[3])).toEqual(['nav.red', 'nav.tablon'])
      expect((await admin.preview(boss, { kind: 'usage', login: 'nadie' })).sample).toEqual([])
      await expectCode(admin.preview(actor('ana'), { kind: 'usage' }), 'forbidden')
      await expectCode(admin.preview(boss, { kind: 'inventado' }), 'not_found')

      // Contar no borra; borrar lo de antes de 2027 se lleva solo lo viejo.
      expect(await admin.wipe(boss, { kind: 'usage', before: '2027-01-01' }, false)).toEqual({
        rows: 1,
      })
      expect(await admin.wipe(boss, { kind: 'usage', before: '2027-01-01' }, true)).toEqual({
        rows: 1,
      })

      const old = await usage.stats(boss, { from: '2026-10-01', to: '2026-10-31' })
      const recent = await usage.stats(boss, { from: '2027-04-01', to: '2027-05-01' })

      expect(old.keys).toEqual([])
      expect(recent.keys.map((row) => row.key)).toEqual(['nav.red'])
      // Lo que ordena las pestañas no se toca.
      expect((await usage.community()).counts['nav.tablon']).toBe(1)
    })

    it('el uso de la comunidad suma a todos, sin que una persona lo decida sola', async () => {
      const { usage } = services

      await usage.record(actor('ana'), { counts: { 'nav.tablon': 3, 'expediente.health': 1 } })
      await usage.record(actor('ana'), { counts: { 'nav.tablon': 2 } })
      // `leo` pulsa sin parar: de él cuentan como mucho 50.
      await usage.record(actor('leo'), { counts: { 'nav.red': 200 } })
      await usage.record(actor('leo'), { counts: { 'nav.tablon': 1 } })

      expect(await usage.community()).toEqual({
        counts: { 'nav.tablon': 6, 'expediente.health': 1, 'nav.red': 50 },
      })
      await expectCode(usage.record(actor('ana'), { counts: { 'DROP TABLE': 1 } }), 'invalid_input')
      await expectCode(usage.record(actor('ana'), { counts: { 'nav.red': 9999 } }), 'invalid_input')
    })

    it('administración: permisos, bloqueos y buzón con respuesta', async () => {
      const { admin } = services
      const boss = actor('eva', { admin: true })

      // Nada de esto es para quien no administra.
      await expectCode(admin.people(actor('ana')), 'forbidden')
      await expectCode(admin.tickets(actor('ana')), 'forbidden')
      await expectCode(admin.setRole(actor('ana'), { login: 'ana', admin: true }), 'forbidden')

      // Dar permiso y bloquear se nota al momento en lo que ve la sesión.
      await admin.setRole(boss, { login: 'Leo', admin: true })
      await admin.block(boss, { login: 'ana', reason: 'Spam en los chats', days: 7 })
      expect(await admin.accessOf('leo')).toEqual({ admin: true, block: null })
      expect(await admin.accessOf('ana')).toMatchObject({
        admin: false,
        block: { reason: 'Spam en los chats' },
      })
      expect(await admin.people(boss)).toMatchObject({
        admins: [{ login: 'leo', fixed: false, grantedBy: 'eva' }],
        blocks: [{ login: 'ana', blockedBy: 'eva' }],
      })
      // No se puede bloquear uno a sí mismo.
      await expectCode(admin.block(boss, { login: 'eva', reason: 'porque sí' }), 'conflict')

      // El bloqueo caduca solo.
      clock.advance(8 * 24 * 60 * MINUTE)
      expect((await admin.accessOf('ana')).block).toBeNull()
      await admin.unblock(boss, 'ana')

      // Buzón: una sugerencia y una denuncia; la denuncia tiene que decir de qué.
      const idea = await admin.openTicket(actor('ana'), {
        kind: 'idea',
        subject: 'Modo compacto',
        body: 'Estaría bien poder ver más cosas a la vez.',
      })

      await expectCode(
        admin.openTicket(actor('ana'), {
          kind: 'report',
          subject: 'Insultos',
          body: 'En el chat.',
        }),
        'invalid_input',
      )
      await admin.openTicket(actor('ana'), {
        kind: 'report',
        subject: 'Insultos',
        body: 'Mensaje fuera de lugar en el chat.',
        target: 'message:12',
      })
      expect(await admin.tickets(boss)).toHaveLength(2)

      const answered = await admin.answerTicket(boss, idea.id, {
        answer: 'Apuntado para la próxima.',
      })

      expect(answered).toMatchObject({ status: 'answered', answeredBy: 'eva' })
      // Quien lo mandó ve la respuesta; lo pendiente va primero en el buzón.
      expect(
        (await admin.myTickets(actor('ana'))).find((ticket) => ticket.id === idea.id),
      ).toMatchObject({
        answer: 'Apuntado para la próxima.',
      })
      expect((await admin.tickets(boss))[0]).toMatchObject({ kind: 'report', status: 'open' })
      // Tres avisos en diez minutos, abiertos o no; después, a esperar.
      await admin.openTicket(actor('leo'), { kind: 'idea', subject: 'Una', body: 'Primera idea' })
      await admin.openTicket(actor('leo'), { kind: 'idea', subject: 'Dos', body: 'Segunda idea' })
      await admin.openTicket(actor('leo'), { kind: 'idea', subject: 'Tres', body: 'Tercera idea' })
      await expectCode(
        admin.openTicket(actor('leo'), { kind: 'idea', subject: 'Cuatro', body: 'Otra más' }),
        'conflict',
      )
      await expectCode(admin.answerTicket(boss, 9999, { answer: 'x' }), 'not_found')
    })

    it('un mensaje del buzón dice su tipo y su sección; el título es opcional', async () => {
      const { admin } = services

      const bug = await admin.openTicket(actor('ana'), {
        kind: 'issue',
        category: 'bug',
        section: 'red',
        body: 'El grafo va a tirones\ncuando hay mucha gente',
      })

      expect(bug).toMatchObject({
        category: 'bug',
        section: 'red',
        subject: 'El grafo va a tirones',
      })
      // Con título, se respeta; sin tipo ni sección, quedan vacíos.
      expect(
        await admin.openTicket(actor('leo'), {
          kind: 'idea',
          subject: 'Con título',
          body: 'Hola qué tal',
        }),
      ).toMatchObject({ subject: 'Con título', category: null, section: null })

      // Lo que no es un tipo o una sección no entra.
      for (const wrong of [
        { category: 'queja' },
        { section: 'Red' },
        { section: '../admin' },
        { section: 'x' },
        { section: 'a'.repeat(21) },
        { subject: 'ab' },
        { subject: 'a'.repeat(121) },
      ]) {
        await expectCode(
          admin.openTicket(actor('sol'), { kind: 'idea', body: 'Un mensaje normal', ...wrong }),
          'invalid_input',
        )
      }
    })

    it('una denuncia dice su motivo; con uno claro no hace falta explicarlo', async () => {
      const { admin } = services
      const spam = await admin.openTicket(actor('ana'), {
        kind: 'report',
        reason: 'spam',
        body: '',
        target: 'message:7',
      })

      expect(spam).toMatchObject({ reason: 'spam', subject: 'Denuncia', body: '' })
      // «Otro» sin explicación, no; con ella, sí.
      await expectCode(
        admin.openTicket(actor('leo'), {
          kind: 'report',
          reason: 'other',
          body: 'mal',
          target: 'message:7',
        }),
        'invalid_input',
      )
      expect(
        await admin.openTicket(actor('leo'), {
          kind: 'report',
          reason: 'other',
          body: 'Publica mis datos',
          target: 'message:7',
        }),
      ).toMatchObject({ reason: 'other' })
      // Sin motivo sigue haciendo falta el texto, y un motivo fuera de una denuncia no vale.
      await expectCode(
        admin.openTicket(actor('sol'), { kind: 'report', body: '', target: 'message:7' }),
        'invalid_input',
      )
      await expectCode(
        admin.openTicket(actor('sol'), { kind: 'idea', reason: 'spam', body: 'Una idea larga' }),
        'invalid_input',
      )
      await expectCode(
        admin.openTicket(actor('sol'), {
          kind: 'report',
          reason: 'odio',
          body: '',
          target: 'message:7',
        }),
        'invalid_input',
      )
    })

    it('el consumo se cuenta por persona y el tope se reparte entre quienes están', async () => {
      const { admin } = services
      const boss = actor('eva', { admin: true })

      // Con el presupuesto de fábrica y poca gente, el tope es el máximo (3000).
      for (let request = 0; request < 3000; request += 1) {
        expect(await admin.allow('ana', false)).toBe(true)
      }
      expect(await admin.allow('ana', false)).toBe(false)
      // Quien administra no se queda fuera, y un tope a mano manda sobre el automático.
      expect(await admin.allow('eva', true)).toBe(true)
      await admin.setLimit(boss, { login: 'leo', perHour: 10 })
      for (let request = 0; request < 10; request += 1) await admin.allow('leo', false)
      expect(await admin.allow('leo', false)).toBe(false)

      admin.count('ana', 1500)
      admin.count('ana', 500)
      admin.count('leo', 100)

      const report = await admin.consumption(boss)

      // Son las 14:30 UTC: quedan diez horas para repartir el 90 % de 720 000.
      expect(report.limit).toMatchObject({ budget: 64_800, activePeople: 3, perPerson: 3000 })
      expect(report.budget.day).toMatchObject({
        allowance: 648_000,
        used: 3013,
        left: 644_987,
        limitedBy: 'day',
      })
      expect(report.top[0]).toMatchObject({ login: 'ana', requests: 2, bytes: 2000, limited: 1 })
      expect(report.top.find((entry) => entry.login === 'leo')).toMatchObject({
        limited: 1,
        manualLimit: 10,
      })
      expect(report.recent).toMatchObject([{ requests: 3, bytes: 2100, people: 2 }])
      expect(report.pattern).toMatchObject([{ weekday: 2, hour: 14, requests: 3 }])
      // Tres peticiones no llegan ni de lejos al 80 % del presupuesto.
      expect(report.warnings).toEqual([])

      // A la hora siguiente el contador empieza de cero.
      clock.advance(61 * MINUTE)
      expect(await admin.allow('ana', false)).toBe(true)
      await expectCode(admin.consumption(actor('ana')), 'forbidden')
    })

    describe('presupuesto de peticiones', () => {
      const settings = {
        dailyRequests: 240_000,
        monthlyBytes: null,
        renewDay: 1,
        share: 1,
        minPerPerson: 100,
        maxPerPerson: 3000,
        saving: false,
      }
      const at = (iso: string): number => Date.parse(iso)

      it('lo de hoy sale del tope diario o de lo que queda del mes entre los días que faltan', () => {
        const idle = { bytesPeriod: 0, requestsPeriod: 0 }

        // Sin límite mensual manda el diario, con su colchón.
        expect(planDay({ ...settings, share: 0.85 }, idle, at('2026-10-06T14:30:00Z'))).toEqual({
          requests: 204_000,
          limitedBy: 'day',
        })

        // Quedan 26 GB y 26 días (del 6 al 31): 1 GB al día. A 100 kB por petición, 10 000.
        const month = { ...settings, monthlyBytes: 30_000_000_000 }
        const used = { bytesPeriod: 4_000_000_000, requestsPeriod: 40_000 }

        expect(planDay(month, used, at('2026-10-06T14:30:00Z'))).toEqual({
          requests: 8846,
          limitedBy: 'month',
        })
        // El último día del periodo se puede gastar todo lo que queda.
        expect(planDay(month, used, at('2026-10-31T23:00:00Z'))).toEqual({
          requests: 230_000,
          limitedBy: 'month',
        })
        // Con el mes agotado no queda nada, y el modo ahorro lo deja todo en un cuarto.
        expect(
          planDay(month, { ...used, bytesPeriod: 31_000_000_000 }, at('2026-10-06T00:00:00Z'))
            .requests,
        ).toBe(0)
        expect(
          planDay({ ...settings, saving: true }, idle, at('2026-10-06T00:00:00Z')).requests,
        ).toBe(60_000)
      })

      it('el mes se cuenta desde el día en que se renueva, también al cambiar de mes y de año', () => {
        const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
        const period = (iso: string, renewDay: number): [string, string, number] => {
          const { start, end, daysLeft } = periodOf(at(iso), renewDay)

          return [day(start), day(end), daysLeft]
        }

        expect(period('2026-10-06T14:30:00Z', 1)).toEqual(['2026-10-01', '2026-11-01', 26])
        // Se renueva el 15: el día 6 todavía es el periodo de septiembre…
        expect(period('2026-10-06T14:30:00Z', 15)).toEqual(['2026-09-15', '2026-10-15', 9])
        // …y el mismo 15 empieza uno nuevo, entero.
        expect(period('2026-10-15T00:00:00Z', 15)).toEqual(['2026-10-15', '2026-11-15', 31])
        expect(period('2026-12-31T23:59:00Z', 1)).toEqual(['2026-12-01', '2027-01-01', 1])
        expect(period('2027-01-01T00:00:00Z', 1)).toEqual(['2027-01-01', '2027-02-01', 31])
      })

      it('lo de cada hora sale de lo que queda del día, y lo de cada persona de cuánta gente hay', () => {
        // A las 14 quedan diez horas: lo que no se gastó por la mañana sigue ahí.
        expect(planHour(240_000, 40_000, at('2026-10-06T14:30:00Z'))).toBe(20_000)
        expect(planHour(240_000, 0, at('2026-10-06T00:10:00Z'))).toBe(10_000)
        expect(planHour(240_000, 239_000, at('2026-10-06T23:10:00Z'))).toBe(1000)
        // Pasarse no da un presupuesto negativo.
        expect(planHour(240_000, 300_000, at('2026-10-06T14:30:00Z'))).toBe(0)

        expect(perPerson(settings, 20_000, 1)).toBe(3000)
        expect(perPerson(settings, 20_000, 40)).toBe(500)
        // El mínimo se respeta aunque no quede nada: la web no se queda colgada.
        expect(perPerson(settings, 0, 40)).toBe(100)
        expect(perPerson({ ...settings, saving: true }, 20_000, 1)).toBe(750)

        // A media mañana (un cuarto del día) con 30 000 servidas: acabaría en 120 000.
        expect(forecast(30_000, at('2026-10-06T06:00:00Z'))).toBe(120_000)
      })

      it('se regula desde el panel y vale desde la siguiente petición', async () => {
        const { admin } = services
        const boss = actor('eva', { admin: true })

        await expectCode(admin.setBudget(actor('ana'), { saving: true }), 'forbidden')
        await expectCode(admin.setBudget(boss, { share: 2 }), 'invalid_input')
        await expectCode(
          admin.setBudget(boss, { minPerPerson: 500, maxPerPerson: 100 }),
          'invalid_input',
        )

        // Solo se manda lo que cambia: un máximo de 10 por persona.
        const status = await admin.setBudget(boss, { minPerPerson: 10, maxPerPerson: 10 })

        expect(status.settings).toMatchObject({ dailyRequests: 720_000, maxPerPerson: 10 })
        for (let request = 0; request < 10; request += 1) {
          expect(await admin.allow('ana', false)).toBe(true)
        }
        expect(await admin.allow('ana', false)).toBe(false)

        // El modo ahorro deja el día en un cuarto.
        expect((await admin.setBudget(boss, { saving: true })).day.allowance).toBe(162_000)
        expect((await admin.consumption(boss)).budget.settings.saving).toBe(true)
      })

      it('gastando cada día todo lo permitido, el mes nunca llega al corte del 90 %', () => {
        const month = { ...settings, dailyRequests: 10_000_000, monthlyBytes: 30_000_000_000 }
        let bytes = 0
        let requests = 0

        // Octubre entero, a 100 kB por petición y sin dejar nada sin gastar.
        for (let day = 1; day <= 31; day += 1) {
          const allowed = planDay(
            month,
            { bytesPeriod: bytes, requestsPeriod: requests },
            at(`2026-10-${String(day).padStart(2, '0')}T00:00:00Z`),
          ).requests

          requests += allowed
          bytes = requests * 100_000
        }

        expect(bytes).toBeLessThanOrEqual(stopAt(month.monthlyBytes))
        expect(bytes).toBeGreaterThan(0.89 * month.monthlyBytes)
        // Como mucho se llega justo al corte el último día, nunca se pasa.
        // Al 90 % solo entra quien administra; al 95 %, nadie. Sin límite no hay corte.
        expect(levelOf(month, 26_999_999_999)).toBe('ok')
        expect(levelOf(month, 27_000_000_000)).toBe('admin_only')
        expect(levelOf(month, 28_499_999_999)).toBe('admin_only')
        expect(levelOf(month, 28_500_000_000)).toBe('stopped')
        expect(levelOf({ ...month, monthlyBytes: null }, 1e15)).toBe('ok')
        // Entre lo que cuenta la web y lo que dice la máquina, manda lo peor.
        expect(worst('ok', 'admin_only')).toBe('admin_only')
        expect(worst('stopped', 'admin_only')).toBe('stopped')
      })

      it('al 90 % del tráfico del mes solo queda quien administra; al 95 %, nadie; y vuelve al renovarse', async () => {
        const { admin, quota } = services
        const boss = actor('eva', { admin: true })

        // Un límite de 10 MB: los cortes están en 9 y en 9,5 MB.
        await admin.setBudget(boss, { monthlyBytes: 10_000_000 })
        expect(await admin.level()).toBe('ok')
        expect(admin.halted()).toBe(false)
        expect(quota.allows('critical')).toBe(true)

        admin.count('ana', 8_000_000)
        expect(await admin.level()).toBe('ok')
        // Lo que sale sin sesión cuenta igual.
        admin.count('(sin sesión)', 1_000_000)
        expect(await admin.level()).toBe('admin_only')

        expect((await admin.consumption(boss)).budget).toMatchObject({
          level: 'admin_only',
          month: {
            bytesUsed: 9_000_000,
            stopAt: 9_000_000,
            hardStopAt: 9_500_000,
            bytesLeft: 0,
          },
        })
        expect(admin.renewsAt()).toBe('2026-11-01T00:00:00.000Z')
        // Con un corte no se pide nada a 42, ni lo crítico: no corre nada de fondo.
        expect(admin.halted()).toBe(true)
        expect(quota.allows('critical')).toBe(false)
        expect(quota.allows('background')).toBe(false)

        // Lo que gasta quien administra también cuenta: al 95 % se acaba para todos.
        admin.count('eva', 500_000)
        expect(await admin.level()).toBe('stopped')

        // Un reinicio no lo levanta: lo servido está en la base.
        await admin.flush()
        const restarted = compose(db, api.client, { now: clock.now, sync: SYNC }).services.admin

        expect(await restarted.level()).toBe('stopped')

        // El 1 de noviembre el límite se renueva y el servicio vuelve solo.
        clock.advance(26 * 24 * HOUR)
        expect(await admin.level()).toBe('ok')
        expect(await restarted.level()).toBe('ok')
        expect(quota.allows('critical')).toBe(true)
      })

      it('si la guardia de la máquina va por delante de la cuenta de la web, manda ella', async () => {
        let guard: 'ok' | 'admin_only' | 'stopped' = 'ok'
        const guarded = compose(db, api.client, {
          now: clock.now,
          sync: SYNC,
          guardLevel: () => Promise.resolve(guard),
        }).services.admin

        expect(await guarded.level()).toBe('ok')

        // Lo que dice la guardia se relee cada minuto.
        guard = 'admin_only'
        clock.advance(61_000)
        expect(await guarded.level()).toBe('admin_only')

        guard = 'stopped'
        clock.advance(61_000)
        expect(await guarded.level()).toBe('stopped')
        expect(guarded.halted()).toBe(true)
      })

      it('un reinicio no pone el contador a cero', async () => {
        const boss = actor('eva', { admin: true })

        await services.admin.setBudget(boss, { minPerPerson: 10, maxPerPerson: 10 })
        for (let request = 0; request < 10; request += 1) {
          await services.admin.allow('ana', false)
          services.admin.count('ana', 1000)
        }
        await services.admin.flush()

        // Otro proceso sobre la misma base, a la misma hora.
        const restarted = compose(db, api.client, {
          now: clock.now,
          sync: {
            trackedCampusIds: [MADRID],
            defaultCampusId: MADRID,
            hourlyReserve: 300,
            backfillIntervalMs: 0,
            locationsTtlMs: 2 * MINUTE,
            locationsIdleMs: 15 * MINUTE,
            deltaTtlMs: 5 * MINUTE,
            deltaIdleMs: 30 * MINUTE,
            requestPageBudget: 2,
          },
        }).services.admin

        expect(await restarted.allow('ana', false)).toBe(false)
        expect(await restarted.allow('leo', false)).toBe(true)
        expect((await restarted.consumption(boss)).budget.day.used).toBe(12)
      })
    })

    it('el mapa de calor del uso es solo para admins y agrupa a la gente', async () => {
      const { usage } = services

      await usage.record(actor('ana'), { counts: { 'nav.tablon': 3 } })
      await usage.record(actor('leo'), { counts: { 'nav.tablon': 40, 'nav.red': 5 } })

      await expectCode(usage.heatmap(actor('ana'), {}), 'forbidden')

      const admin = actor('eva', { admin: true })

      // Sin la mitad más activa, queda solo `ana`.
      expect(await usage.heatmap(admin, { high: '50' })).toMatchObject({
        segment: { low: 0, high: 50, people: 1, of: 2 },
        rows: [{ key: 'nav.tablon', counts: [3] }],
      })

      expect(await usage.heatmap(admin, {})).toEqual({
        by: 'total',
        segment: { low: 0, high: 100, people: 2, of: 2 },
        groups: [{ id: 'all', people: 2 }],
        rows: [
          { key: 'nav.red', counts: [5] },
          { key: 'nav.tablon', counts: [43] },
        ],
      })
      // Por actividad: `ana` es ocasional y `leo` habitual.
      expect(await usage.heatmap(admin, { by: 'activity' })).toMatchObject({
        groups: [
          { id: 'casual', people: 1 },
          { id: 'regular', people: 1 },
        ],
        rows: [
          { key: 'nav.red', counts: [0, 5] },
          { key: 'nav.tablon', counts: [3, 40] },
        ],
      })
      // De nadie se sabe aquí el plan ni el año: todos al mismo grupo.
      expect((await usage.heatmap(admin, { by: 'cohort' })).groups).toEqual([
        { id: 'unknown', people: 2 },
      ])
      await expectCode(usage.heatmap(admin, { by: 'altura' }), 'invalid_input')
    })
  })
})
