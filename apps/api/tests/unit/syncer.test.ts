/**
 * Tests del sincronizador.
 *
 * Lo que se comprueba aquí es la promesa de fondo del diseño: que 42 se copia
 * poco a poco, que no se pierde nada por el camino y que las peticiones se
 * gastan donde importa. Va contra una API de 42 en miniatura que filtra de
 * verdad (ver `helpers/fake-42.ts`) y con reloj manual.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import type { ReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import { createSyncer } from '../../src/modules/replica/syncer.js'
import type { Syncer, SyncerConfig } from '../../src/modules/replica/syncer.js'
import { createFakeClock } from '../helpers/fake-api.js'
import { createFake42 } from '../helpers/fake-42.js'
import type { Fake42 } from '../helpers/fake-42.js'
import { activeLocation, projectUser } from '../helpers/fixtures.js'

const MADRID = 22
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

const CONFIG: SyncerConfig = {
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

describe('sincronizador', () => {
  let db: Db
  let replica: ReplicaRepository
  let api: Fake42
  let clock: ReturnType<typeof createFakeClock>
  const logs: string[] = []

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    replica = createReplicaRepository(db)
    api = createFake42(2)
    clock = createFakeClock(Date.parse('2026-10-10T12:00:00.000Z'))
    logs.length = 0
  })

  afterEach(() => {
    closeDatabase(db)
  })

  function makeSyncer(config: Partial<SyncerConfig> = {}): Syncer {
    return createSyncer({
      client: api.client,
      replica,
      config: { ...CONFIG, ...config },
      now: clock.now,
      sleep: async () => undefined,
      log: (message) => logs.push(message),
    })
  }

  /** Una fila modificada hace `daysAgo` días respecto al reloj del test. */
  function row(login: string, daysAgo: number, options: Parameters<typeof projectUser>[1] = {}) {
    return projectUser(login, {
      ...options,
      updatedAt: new Date(clock.now() - daysAgo * DAY).toISOString(),
    })
  }

  /** Llama a `tick` hasta que no quede nada que hacer. */
  async function drain(syncer: Syncer, max = 200): Promise<number> {
    let steps = 0

    while (steps < max && (await syncer.tick())) {
      steps += 1
    }

    return steps
  }

  describe('relleno histórico', () => {
    it('copia el campus entero aunque la API no respete ningún orden', async () => {
      // Desordenadas a propósito, y repartidas entre ayer y hace seis años.
      api.rows.set(MADRID, [
        row('a', 400, { status: 'finished' }),
        row('b', 1),
        row('c', 2200, { status: 'finished' }),
        row('d', 35, { status: 'finished' }),
        row('e', 3),
        row('f', 800, { status: 'finished' }),
        row('g', 12, { status: 'finished' }),
        row('h', 90),
      ])

      const syncer = makeSyncer()
      await drain(syncer)

      expect((await replica.counts()).projectUsers).toBe(8)
      expect((await syncer.status()).campuses[0]?.backfill.phase).toBe('done')
    })

    it('copia primero a quien tiene algo en curso', async () => {
      api.rows.set(MADRID, [
        row('a', 400, { status: 'finished' }),
        row('b', 500),
        row('c', 2, { status: 'finished' }),
      ])
      const syncer = makeSyncer()

      // El primer paso del relleno es la fase "en curso".
      await syncer.backfillStep(MADRID)

      expect(api.calls[0]).toContain('filter[status]=in_progress')
      expect(await replica.projectsOf('b')).toHaveLength(1)
    })

    it('se retoma donde iba tras un reinicio, sin volver a empezar', async () => {
      api.rows.set(
        MADRID,
        Array.from({ length: 9 }, (_, index) => row(`u${index}`, index + 1)),
      )

      const first = makeSyncer()
      await first.backfillStep(MADRID)
      await first.backfillStep(MADRID)
      const before = api.calls.length

      // Proceso nuevo, misma base: el estado está en `sync_state`.
      const second = makeSyncer()
      await second.backfillStep(MADRID)

      expect(api.calls[before]).toContain('page=3')
    })

    it('lo de hace más de dos años va por trimestres: nunca pide "todo lo anterior" de golpe', async () => {
      // Con París, "todo lo anterior a hace dos años" era un millón de filas y
      // 42 no llegaba a contestar.
      api.rows.set(MADRID, [row('a', 1), row('b', 1000), row('c', 3000), row('d', 4500)])
      const syncer = makeSyncer()

      await drain(syncer, 400)

      // Las que piden desde 1970 sin ser la fase «en curso» ni la del total (hasta ahora).
      const sinceEver = api.calls
        .map(decodeURIComponent)
        .filter((call) => !call.includes('status') && call.includes('=1970'))
        .map((call) => /range\[updated_at\]=[^,]+,([^&]+)/.exec(call)?.[1] ?? '')
        .filter((to) => Date.parse(to) < clock.now())

      expect((await replica.counts()).projectUsers).toBe(4)
      // Solo la última, la de antes de 2013 (con un trimestre de margen).
      expect(sinceEver).toHaveLength(1)
      expect(Date.parse(sinceEver[0] ?? '')).toBeLessThan(Date.parse('2013-04-02T00:00:00.000Z'))
    })

    it('un relleno a punto de pedir "todo lo anterior" lo parte en trimestres', async () => {
      api.rows.set(MADRID, [row('a', 3000)])
      await replica.setState('backfill:22', {
        phase: 'all',
        anchor: '2026-10-01T00:00:00.000Z',
        from: '1970-01-01T00:00:00.000Z',
        to: '2024-12-01T00:00:00.000Z',
        page: 1,
        rows: 0,
        total: 1,
      })
      const syncer = makeSyncer()

      await syncer.backfillStep(MADRID)

      expect(decodeURIComponent(api.calls[0] ?? '')).toContain(
        'range[updated_at]=2024-09-01T00:00:00.000Z,2024-12-01T00:00:00.000Z',
      )
    })

    it('una vez copiado no vuelve a gastar ni una petición', async () => {
      api.rows.set(MADRID, [row('a', 1)])
      const syncer = makeSyncer()
      await drain(syncer)
      const before = api.calls.length

      expect(await syncer.backfillStep(MADRID)).toBe(false)
      expect(api.calls.length).toBe(before)
    })

    it('se para cuando quedan pocas peticiones en la hora', async () => {
      api.rows.set(
        MADRID,
        Array.from({ length: 20 }, (_, index) => row(`u${index}`, index + 1)),
      )
      const syncer = makeSyncer()

      // La primera respuesta ya dice que la cuota anda por debajo de la reserva.
      api.hourlyRemaining = 120
      await drain(syncer)

      expect((await syncer.status()).campuses[0]?.backfill.phase).not.toBe('done')
      // La única petición es la de puestos, que salió antes de saber la cuota.
      expect(api.calls.filter((call) => call.startsWith('/projects_users'))).toHaveLength(0)
    })

    it('de noche va de corrido, sin su pausa, y solo con turno de la cuota', async () => {
      api.rows.set(
        MADRID,
        Array.from({ length: 6 }, (_, index) => row(`u${index}`, index * 40 + 1)),
      )
      let turn = false
      const asked: string[] = []
      const night = createSyncer({
        client: api.client,
        replica,
        // De día, una petición por minuto: de noche no se espera.
        config: { ...CONFIG, backfillIntervalMs: 60_000 },
        quota: {
          allows: () => true,
          allowsBulk: (job) => {
            asked.push(job)
            return turn
          },
          // El mantenimiento recibe la reserva del modo.
          upkeep: () => 0,
          paced: () => false,
          defer: () => Promise.resolve(true),
        },
        now: clock.now,
        sleep: async () => undefined,
      })

      // Sin turno (otra tarea de más prioridad, o la reserva del modo) no copia.
      await drain(night)
      expect(asked).toContain('initial')
      expect((await night.status()).campuses[0]?.backfill.rows).toBe(0)

      // Con turno, del tirón: el reloj no se mueve y aun así termina.
      turn = true
      await drain(night)
      expect((await night.status()).campuses[0]?.backfill.phase).toBe('done')

      // Copiado el campus, ya no pide turno.
      asked.length = 0
      await night.tick()
      expect(asked).toEqual([])
    })
  })

  describe('cambios', () => {
    it('recoge lo que cambia después de empezar el relleno', async () => {
      api.rows.set(MADRID, [row('a', 5)])
      const syncer = makeSyncer()
      await drain(syncer)

      // Media hora después, alguien aprueba y alguien empieza un proyecto.
      clock.advance(30 * MINUTE)
      api.rows.set(MADRID, [
        row('a', 0, { id: 900, status: 'finished' }),
        row('nuevo', 0, { id: 901 }),
      ])
      await syncer.pullDelta(MADRID)

      expect(await replica.projectsOf('nuevo')).toHaveLength(1)
      expect(await replica.isSpecialist('a', 10)).toBe(true)
    })

    it('pregunta solo por lo posterior a la última vez', async () => {
      const syncer = makeSyncer()
      await syncer.pullDelta(MADRID)
      clock.advance(10 * MINUTE)
      await syncer.pullDelta(MADRID)

      const last = api.calls.at(-1) ?? ''
      const [from, to] = /range\[updated_at\]=([^&]+)/.exec(last)?.[1]?.split(',') ?? []

      // Desde la vez anterior menos un minuto de solape, hasta ahora.
      expect(from).toBe(new Date(clock.now() - 11 * MINUTE).toISOString())
      expect(to).toBe(new Date(clock.now()).toISOString())
    })

    it('si no caben en una vuelta, sigue con la misma ventana en la siguiente', async () => {
      const syncer = makeSyncer()
      await syncer.pullDelta(MADRID)
      clock.advance(10 * MINUTE)
      // 14 cambios con páginas de 2: más de las 5 páginas de una vuelta.
      api.rows.set(
        MADRID,
        Array.from({ length: 14 }, (_, index) => row(`u${index}`, 0)),
      )

      await syncer.pullDelta(MADRID)
      expect((await replica.counts()).projectUsers).toBe(10)

      clock.advance(MINUTE)
      await syncer.pullDelta(MADRID)
      expect((await replica.counts()).projectUsers).toBe(14)
    })
  })

  describe('puestos', () => {
    it('una foto nueva sustituye a la anterior', async () => {
      api.locations.set(MADRID, [
        activeLocation('mgomez', 'c1r1s1'),
        activeLocation('jdoe', 'c1r1s2'),
      ])
      const syncer = makeSyncer()
      await syncer.pollLocations(MADRID)

      api.locations.set(MADRID, [activeLocation('jdoe', 'c1r1s2')])
      await syncer.pollLocations(MADRID)

      expect((await replica.counts()).present).toBe(1)
    })

    it('con gente en la web se refrescan cada dos minutos; sin nadie, cada quince', async () => {
      const syncer = makeSyncer()
      await drain(syncer)
      const polls = (): number => api.calls.filter((call) => call.includes('/locations')).length
      const base = polls()

      // Sin nadie: a los 3 minutos todavía no toca.
      clock.advance(3 * MINUTE)
      await drain(syncer)
      expect(polls()).toBe(base)

      // Alguien entra: ahora sí.
      syncer.touch()
      await drain(syncer)
      expect(polls()).toBe(base + 1)

      // Y sin actividad vuelve a esperar los quince.
      clock.advance(14 * MINUTE)
      await drain(syncer)
      expect(polls()).toBe(base + 1)
      clock.advance(2 * MINUTE)
      await drain(syncer)
      expect(polls()).toBe(base + 2)
    })
  })

  describe('llamadas críticas dentro de una petición', () => {
    it('con la réplica al día, abrir un proyecto no cuesta ninguna petición', async () => {
      api.rows.set(MADRID, [row('a', 1)])
      const syncer = makeSyncer()
      await drain(syncer)
      const before = api.calls.length

      const result = await syncer.ensureFresh(MADRID, 10)

      expect(result.partial).toBe(false)
      expect(api.calls.length).toBe(before)
    })

    it('en un campus a medio copiar pide ese proyecto, una sola vez', async () => {
      api.rows.set(MADRID, [row('a', 400, { status: 'finished' }), row('b', 1)])
      const syncer = makeSyncer()

      await syncer.ensureFresh(MADRID, 10)
      const afterFirst = api.calls.length
      await syncer.ensureFresh(MADRID, 10)

      expect(api.calls.some((call) => call.includes('filter[project_id]=10'))).toBe(true)
      expect((await replica.counts()).projectUsers).toBe(2)
      expect(api.calls.length).toBe(afterFirst)
    })

    it('un proyecto grande sale parcial y lo termina el bucle de fondo', async () => {
      api.rows.set(
        MADRID,
        Array.from({ length: 9 }, (_, index) => row(`u${index}`, index + 1)),
      )
      const syncer = makeSyncer({ requestPageBudget: 1 })

      expect((await syncer.ensureFresh(MADRID, 10)).partial).toBe(true)

      await drain(syncer)

      expect((await syncer.ensureFresh(MADRID, 10)).partial).toBe(false)
      expect((await replica.counts()).projectUsers).toBe(9)
    })

    it('un campus sin réplica funciona bajo demanda y caduca', async () => {
      api.rows.set(58, [row('bcn', 1)])
      api.locations.set(58, [activeLocation('bcn', 'bcn1', 58)])
      const syncer = makeSyncer()

      await syncer.ensureFresh(58, 10)
      expect(await replica.locationOf('bcn', '1970-01-01T00:00:00.000Z')).toBe('bcn1')

      const calls = api.calls.length
      await syncer.ensureFresh(58, 10)
      expect(api.calls.length).toBe(calls)

      // Nadie más refresca ese campus: pasado un rato se vuelve a pedir.
      clock.advance(16 * MINUTE)
      await syncer.ensureFresh(58, 10)
      expect(api.calls.length).toBeGreaterThan(calls)
    })

    it('con la cuota casi agotada, una visita ya no pide nada', async () => {
      api.rows.set(58, [row('bcn', 1)])
      const syncer = makeSyncer()
      // Una primera petición cualquiera, para que el cliente sepa cuánto queda.
      api.hourlyRemaining = 12
      await syncer.pollLocations(MADRID)
      const before = api.calls.length

      await syncer.ensureFresh(58, 10)

      expect(api.calls.length).toBe(before)
    })

    it('si 42 falla, no revienta: sirve lo que hay y lo anota', async () => {
      const syncer = makeSyncer()
      api.failOn = { match: 'api.intra.42.fr', status: 503 }

      await expect(syncer.ensureFresh(MADRID, 10)).resolves.toEqual({ partial: true })
      expect(logs.join('\n')).toContain('Se sirve lo que hay')
    })
  })

  describe('fallos en el bucle', () => {
    it('una tarea que falla se aparta y deja pasar a las demás', async () => {
      api.rows.set(MADRID, [row('a', 1)])
      api.failOn = { match: '/locations', status: 403 }
      const syncer = makeSyncer()

      await drain(syncer)

      // Los puestos fallan, pero el campus se copia igual.
      expect((await syncer.status()).campuses[0]?.backfill.phase).toBe('done')
      expect(api.calls.filter((call) => call.includes('/locations'))).toHaveLength(1)
    })
  })

  describe('login', () => {
    it('guarda el campus y los proyectos que ya trae el perfil, sin pedir nada', async () => {
      const syncer = makeSyncer()

      const result = await syncer.ingestLogin({
        id: 1,
        login: 'albrodri',
        campus_users: [
          { campus_id: 58, is_primary: false },
          { campus_id: MADRID, is_primary: true },
        ],
        projects_users: [{ id: 1, status: 'in_progress', project: { id: 10, name: 'ft_printf' } }],
      })

      expect(result.campusId).toBe(MADRID)
      expect(await replica.projectsOf('albrodri')).toEqual([{ id: 10, name: 'ft_printf' }])
      expect(api.calls).toHaveLength(0)
    })

    it('sin campus en el perfil cae al de por defecto', async () => {
      const result = await makeSyncer().ingestLogin({ id: 1, login: 'albrodri' })

      expect(result.campusId).toBe(MADRID)
    })
  })
})
