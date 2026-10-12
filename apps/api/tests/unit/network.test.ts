/**
 * Red de correcciones: las cuentas (endogamia, comunidades), la copia desde 42
 * y lo que devuelve el servicio.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { compose } from '../../src/app/composition.js'
import type { Services } from '../../src/app/composition.js'
import type { Actor } from '../../src/core/actor.js'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import type { ApiScaleTeam } from '../../src/integrations/forty-two/types.js'
import {
  analyse,
  mergePairs,
  passMarkOf,
  select,
} from '../../src/modules/network/network.analysis.js'
import { rowsOf } from '../../src/modules/network/network.sync.js'
import { createFake42 } from '../helpers/fake-42.js'
import { createFakeClock } from '../helpers/fake-api.js'
import { projectUser, userId } from '../helpers/fixtures.js'

const MADRID = 22
const MINUTE = 60_000
const NOW = Date.parse('2026-10-06T14:30:00.000Z')

const actor = (login: string): Actor => ({ login, campusId: MADRID, admin: false })

let nextId = 1

/** Una corrección ya hecha, como la manda 42. */
function scaleTeam(
  corrector: string,
  corrected: string | string[],
  extra: Partial<ApiScaleTeam & { updated_at: string }> = {},
): ApiScaleTeam & { updated_at?: string } {
  return {
    id: nextId++,
    begin_at: '2026-09-01T10:00:00.000Z',
    corrector: { id: userId(corrector), login: corrector },
    correcteds: [corrected].flat().map((login) => ({ id: userId(login), login })),
    team: { project_id: 10 },
    final_mark: 100,
    flag: { name: 'Ok', positive: true },
    ...extra,
  }
}

const pair = (corrector: string, corrected: string, count = 1) => ({ corrector, corrected, count })

describe('red de correcciones', () => {
  describe('cuentas', () => {
    const members = new Set(['ana', 'eva', 'leo', 'sol'])

    it('junta los dos sentidos y descarta las parejas de dos personas de fuera', () => {
      const pairs = mergePairs(
        [pair('eva', 'ana', 3), pair('ana', 'eva', 2), pair('ana', 'x1'), pair('x1', 'x2', 9)],
        members,
      )

      expect(pairs).toEqual([
        { a: 'ana', b: 'eva', ab: 2, ba: 3 },
        { a: 'ana', b: 'x1', ab: 1, ba: 0 },
      ])
    })

    it('la endogamia sube con la repetición y con las correcciones devueltas', () => {
      // `ana` y `eva` se corrigen entre sí cinco veces; `leo` y `sol`, una sola
      // y en un sentido.
      const { people, totals } = analyse(
        mergePairs([pair('ana', 'eva', 3), pair('eva', 'ana', 2), pair('leo', 'sol')], members),
        members,
      )

      // 5 correcciones con 1 persona: repite 4/5; devueltas 2·min(3,2)=4 de 5.
      expect(people.get('ana')).toMatchObject({
        given: 3,
        received: 2,
        partners: 1,
        repetition: 0.8,
        reciprocity: 0.8,
        endogamy: 80,
      })
      expect(people.get('leo')).toMatchObject({ given: 1, received: 0, endogamy: 0 })
      expect(totals).toMatchObject({ corrections: 6, people: 4, pairs: 2, mutualPairs: 1 })
      // Media ponderada por actividad: (5·0,8 + 5·0,8 + 0 + 0) / 12.
      expect(totals.endogamy).toBe(67)
    })

    it('quien es de fuera sale marcado y no cuenta en la media del campus', () => {
      const { people, totals } = analyse(
        mergePairs([pair('ana', 'x1', 4), pair('x1', 'ana', 4)], members),
        members,
      )

      expect(people.get('x1')).toMatchObject({ external: true })
      expect(people.get('ana')).toMatchObject({ external: false, endogamy: 94 })
      expect(totals.endogamy).toBe(94)
    })

    it('separa en comunidades los grupos que no se cruzan', () => {
      const rows = [
        pair('ana', 'eva', 4),
        pair('eva', 'leo', 4),
        pair('leo', 'ana', 4),
        pair('sol', 'x1', 2),
      ]
      const { people, totals } = analyse(mergePairs(rows, members), members)

      expect(totals.communities).toBe(2)
      expect(new Set(['ana', 'eva', 'leo'].map((login) => people.get(login)?.community))).toEqual(
        new Set([0]),
      )
      expect(people.get('sol')?.community).toBe(1)
    })

    it('encuentra los grupos aunque estén unidos por algún puente', () => {
      // Dos pandillas de cuatro que se corrigen mucho, y un cruce suelto entre ellas.
      const gang = (names: string[]) =>
        names.flatMap((a, index) => names.slice(index + 1).map((b) => pair(a, b, 5)))
      const everyone = new Set(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4'])
      const { people, totals } = analyse(
        mergePairs(
          [...gang(['a1', 'a2', 'a3', 'a4']), ...gang(['b1', 'b2', 'b3', 'b4']), pair('a1', 'b1')],
          everyone,
        ),
        everyone,
      )
      const group = (prefix: string) =>
        new Set([1, 2, 3, 4].map((n) => people.get(`${prefix}${n}`)?.community))

      expect(totals.communities).toBe(2)
      expect(group('a').size).toBe(1)
      expect(group('b').size).toBe(1)
      expect(group('a')).not.toEqual(group('b'))
    })

    it('deduce la nota mínima de un proyecto de cómo ha acabado la gente', () => {
      const marks = (...pairs: [number, number][]) =>
        pairs.map(([mark, people]) => ({ mark, people }))

      // Nadie valida por debajo de 100 y hay suspensos con 93: la mínima es 100.
      expect(passMarkOf(marks([100, 300], [125, 80]), marks([0, 40], [93, 3]))).toBe(100)
      // Se valida desde 91 y nadie suspende cerca: es la habitual de 80.
      expect(passMarkOf(marks([91, 5], [100, 200]), marks([0, 30]))).toBe(80)
      // Una validación a mano con un 0 entre quinientas no baja la mínima.
      expect(passMarkOf(marks([0, 1], [100, 500]), marks([60, 10]))).toBe(100)
      // Si con la habitual habría suspensos "aprobados", se queda la nota vista.
      expect(passMarkOf(marks([90, 50], [100, 50]), marks([85, 20]))).toBe(90)
      // Proyectos que se validan a mano con cualquier nota: nunca menos de 50.
      expect(passMarkOf(marks([0, 20], [30, 5]), [])).toBe(50)
      // Sin nadie que lo haya validado no hay de dónde sacarla.
      expect(passMarkOf([], marks([0, 3]))).toBeNull()
    })

    it('elige qué pintar: los más activos, o una persona y su entorno', () => {
      const analysis = analyse(
        mergePairs(
          [pair('ana', 'eva', 5), pair('eva', 'leo', 2), pair('leo', 'sol'), pair('sol', 'ana')],
          members,
        ),
        members,
      )

      // Con un mínimo de 2 desaparecen las uniones de una sola corrección.
      expect(select(analysis, { focus: null, min: 2, limit: 10 })).toMatchObject({
        logins: ['eva', 'ana', 'leo'],
        hidden: null,
      })
      // Centrado en `leo`: él primero, y solo quien se ha cruzado con él.
      const around = select(analysis, { focus: 'leo', min: 1, limit: 10 })

      expect(around.logins).toEqual(['leo', 'eva', 'sol'])
      expect(around.links).toHaveLength(2)
      // El tope avisa de lo que deja fuera.
      expect(select(analysis, { focus: null, min: 1, limit: 2 }).hidden).toMatchObject({ nodes: 2 })
      expect(select(analysis, { focus: 'nadie', min: 1, limit: 10 }).logins).toEqual([])
    })
  })

  describe('copia desde 42', () => {
    it('una corrección de grupo da una fila por persona; las ocultas y sin nota, ninguna', () => {
      expect(rowsOf(scaleTeam('eva', ['ana', 'leo']), MADRID)).toHaveLength(2)
      expect(rowsOf(scaleTeam('eva', 'ana', { final_mark: null }), MADRID)).toEqual([])
      expect(rowsOf(scaleTeam('eva', 'ana', { corrector: 'invisible' }), MADRID)).toEqual([])
      expect(rowsOf(scaleTeam('eva', 'ana', { correcteds: 'invisible' }), MADRID)).toEqual([])
    })
  })

  describe('servicio', () => {
    let db: Db
    let services: Services
    let clock: ReturnType<typeof createFakeClock>
    let api: ReturnType<typeof createFake42>

    beforeEach(async () => {
      nextId = 1
      db = await openDatabase({ url: 'file::memory:' })
      clock = createFakeClock(NOW)
      api = createFake42()
      services = compose(db, api.client, {
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
      }).services

      await services.repositories.replica.ingestProjectUsers(
        [projectUser('ana'), projectUser('leo'), projectUser('eva')],
        MADRID,
      )
    })

    afterEach(() => {
      closeDatabase(db)
    })

    /** Da vueltas hasta que el histórico está copiado. */
    const copyAll = async (): Promise<void> => {
      for (let turn = 0; turn < 10; turn += 1) {
        await services.corrections.step()

        if ((await services.corrections.status(MADRID)).phase === 'done') {
          return
        }
      }
    }

    it('copia el histórico por páginas y luego solo pide lo nuevo', async () => {
      // 13 correcciones con páginas de 2.
      api.scaleTeams.set(
        MADRID,
        Array.from({ length: 13 }, (_, index) =>
          scaleTeam(index % 2 === 0 ? 'eva' : 'ana', index % 2 === 0 ? 'ana' : 'eva'),
        ),
      )

      expect(await services.corrections.status(MADRID)).toMatchObject({ phase: 'pending', rows: 0 })

      // Con una API que responde al instante, una vuelta se lo lleva todo:
      // siete peticiones, cada una a partir del último id de la anterior.
      await services.corrections.step()
      expect(await services.corrections.status(MADRID)).toMatchObject({
        phase: 'done',
        rows: 13,
        total: 13,
      })
      expect(api.calls).toHaveLength(7)
      expect(api.calls[1]).toContain('range[id]=3,')

      // Con el histórico hecho y sin que pase el tiempo, no se pide nada.
      api.calls.length = 0
      await services.corrections.step()
      expect(api.calls).toHaveLength(0)

      // A los diez minutos pide solo lo cambiado: una nueva y una que cambia de nota.
      clock.advance(11 * MINUTE)
      const changedAt = new Date(clock.now() - MINUTE).toISOString()
      const rows = api.scaleTeams.get(MADRID) ?? []

      rows.push(scaleTeam('leo', 'ana', { updated_at: changedAt }))
      const first = rows[0]

      if (first !== undefined) {
        rows[0] = { ...first, final_mark: 0, updated_at: changedAt }
      }

      await services.corrections.step()
      expect(api.calls).toHaveLength(2)
      expect(api.calls[0]).toContain('range[updated_at]=')
      expect(await services.corrections.status(MADRID)).toMatchObject({ rows: 14 })
    })

    it('si se corta a medias, sigue donde lo dejó', async () => {
      api.scaleTeams.set(
        MADRID,
        Array.from({ length: 6 }, () => scaleTeam('eva', 'ana')),
      )
      // Falla la tercera página (la que empieza tras el id 4).
      api.failOn = { match: 'range[id]=5,', status: 500 }
      await services.corrections.step().catch(() => undefined)
      expect(await services.corrections.status(MADRID)).toMatchObject({ phase: 'copying', rows: 4 })

      api.failOn = null
      api.calls.length = 0
      await services.corrections.step()
      expect(api.calls[0]).toContain('range[id]=5,')
      expect(await services.corrections.status(MADRID)).toMatchObject({ phase: 'done', rows: 6 })
    })

    it('no gasta la reserva horaria de la API', async () => {
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana'),
        scaleTeam('ana', 'eva'),
        scaleTeam('leo', 'ana'),
      ])
      api.hourlyRemaining = 320

      // La primera petición se hace sin saber cuánto queda; al verlo, para.
      await services.corrections.step()
      await services.corrections.step()
      expect(api.calls).toHaveLength(1)
    })

    it('devuelve el grafo con filtros de fecha, proyecto, persona y mínimo', async () => {
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana'),
        scaleTeam('ana', 'eva'),
        scaleTeam('eva', 'ana', { begin_at: '2026-03-01T10:00:00.000Z' }),
        scaleTeam('leo', 'ana', { team: { project_id: 99 } }),
        scaleTeam('fuera', 'leo'),
        scaleTeam('fuera', 'otra'),
      ])
      await copyAll()
      api.calls.length = 0

      const all = await services.network.graph(actor('ana'), {})

      expect(all.totals).toMatchObject({ corrections: 5, people: 4, pairs: 3, mutualPairs: 1 })
      expect(all.nodes.map((node) => node.login)).toEqual(['ana', 'eva', 'leo', 'fuera'])
      expect(all.nodes.find((node) => node.login === 'fuera')).toMatchObject({ external: true })
      expect(all.nodes.find((node) => node.login === 'ana')).toMatchObject({
        external: false,
        image: 'https://img/ana-medium.png',
        cohort: 2026,
        given: 1,
        received: 3,
      })
      expect(all.topPairs[0]).toEqual({ source: 'ana', target: 'eva', forth: 1, back: 2 })
      expect(all.sync).toMatchObject({ phase: 'done', rows: 6 })

      expect(
        (await services.network.graph(actor('ana'), { from: '2026-08-01' })).totals,
      ).toMatchObject({
        corrections: 4,
      })
      expect(
        (await services.network.graph(actor('ana'), { to: '2026-03-01' })).totals,
      ).toMatchObject({
        corrections: 1,
      })
      expect(
        (await services.network.graph(actor('ana'), { projectId: '99' })).totals,
      ).toMatchObject({
        corrections: 1,
        people: 2,
      })
      expect(
        (await services.network.graph(actor('ana'), { login: 'LEO' })).nodes.map(
          (node) => node.login,
        ),
      ).toEqual(['leo', 'ana', 'fuera'])
      expect(
        (await services.network.graph(actor('ana'), { min: '3' })).nodes.map((node) => node.login),
      ).toEqual(['ana', 'eva'])

      // Solo las uniones mutuas: de las tres parejas, solo `ana` y `eva` se devuelven.
      expect(
        (await services.network.graph(actor('ana'), { mutual: '1' })).nodes.map(
          (node) => node.login,
        ),
      ).toEqual(['ana', 'eva'])
      // Por veredicto: todas estas aprobaron, así que suspendidas no hay ninguna.
      expect(
        (await services.network.graph(actor('ana'), { verdict: 'pass' })).totals,
      ).toMatchObject({
        corrections: 5,
      })
      expect((await services.network.graph(actor('ana'), { verdict: 'fail' })).nodes).toEqual([])

      // Otro campus no ve nada de este, y nada de esto pregunta a 42.
      expect((await services.network.graph({ ...actor('ana'), campusId: 58 }, {})).nodes).toEqual(
        [],
      )
      expect(api.calls).toHaveLength(0)

      await expect(services.network.graph(actor('ana'), { from: 'ayer' })).rejects.toMatchObject({
        code: 'invalid_input',
      })
    })

    it('da el detalle de una pareja, la línea de tiempo y cuánto aprueba cada quien', async () => {
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana'),
        scaleTeam('eva', 'ana', { final_mark: 0, flag: { name: 'Crash', positive: false } }),
        scaleTeam('eva', 'leo', { begin_at: '2026-08-10T10:00:00.000Z' }),
        scaleTeam('ana', 'eva', { begin_at: '2026-09-20T10:00:00.000Z' }),
      ])
      await copyAll()

      const detail = await services.network.pair(actor('ana'), { a: 'ANA', b: 'eva' })

      expect(detail).toMatchObject({ a: 'ana', b: 'eva', forth: 1, back: 2 })
      expect(detail.corrections).toHaveLength(3)
      // La más reciente primero, con el nombre del proyecto y el veredicto.
      expect(detail.corrections[0]).toMatchObject({
        corrector: 'ana',
        corrected: 'eva',
        project: 'ft_printf',
        mark: 100,
        positive: true,
      })
      expect(detail.corrections.filter((row) => row.positive === false)).toHaveLength(1)
      await expect(services.network.pair(actor('ana'), { a: 'ana' })).rejects.toMatchObject({
        code: 'invalid_input',
      })

      const graph = await services.network.graph(actor('ana'), {})

      expect(graph.timeline).toEqual([
        { month: '2026-08', corrections: 1 },
        { month: '2026-09', corrections: 3 },
      ])
      // De las cuatro de ft_printf aprobaron tres.
      expect(graph.projects).toEqual([
        { id: 10, name: 'ft_printf', corrections: 4, passRate: 0.75 },
      ])
      const eva = graph.nodes.find((node) => node.login === 'eva')
      const ana = graph.nodes.find((node) => node.login === 'ana')

      // Como correctora, `eva` aprobó dos de los tres proyectos ajenos que evaluó;
      // a ella solo la han evaluado una vez, que no llega para opinar.
      expect(eva).toMatchObject({ givenPassRate: 0.667, receivedPassRate: null })
      // A `ana` le evaluaron dos veces su proyecto: tampoco llega al mínimo.
      expect(ana).toMatchObject({ givenPassRate: null, receivedPassRate: null })
    })

    it('dice con quién te has corregido tú', async () => {
      api.scaleTeams.set(MADRID, [
        scaleTeam('ana', 'eva'),
        scaleTeam('eva', 'ana'),
        scaleTeam('eva', 'ana'),
        scaleTeam('leo', 'ana'),
        scaleTeam('eva', 'leo'),
      ])
      await copyAll()

      expect(await services.network.mine(actor('ana'))).toEqual({
        partners: [
          { login: 'eva', gave: 1, got: 2 },
          { login: 'leo', gave: 0, got: 1 },
        ],
      })
      expect(await services.network.mine(actor('nadie'))).toEqual({ partners: [] })
    })

    it('el veredicto sale de la nota: un 0 con marca de "Ok" es un suspenso', async () => {
      // Así lo manda 42: la marca es buena aunque la nota sea 0 o no llegue.
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana', { final_mark: 0 }),
        scaleTeam('eva', 'ana', { final_mark: 10 }),
        scaleTeam('eva', 'ana', { final_mark: 100 }),
        scaleTeam('eva', 'ana', { final_mark: 125 }),
        // Y una marca mala suspende por alta que sea la nota.
        scaleTeam('leo', 'ana', { final_mark: 100, flag: { name: 'Cheat', positive: false } }),
      ])
      await copyAll()

      const detail = await services.network.pair(actor('ana'), { a: 'eva', b: 'ana' })

      expect(detail.corrections.map((row) => [row.mark, row.positive]).sort()).toEqual([
        [0, false],
        [10, false],
        [100, true],
        [125, true],
      ])

      const graph = await services.network.graph(actor('ana'), {})

      // A `ana` le han aprobado dos de cinco; `eva` aprobó dos de las cuatro que hizo.
      expect(graph.nodes.find((node) => node.login === 'ana')?.receivedPassRate).toBe(0.4)
      expect(graph.nodes.find((node) => node.login === 'eva')?.givenPassRate).toBe(0.5)
      expect(
        (await services.network.graph(actor('ana'), { verdict: 'fail' })).totals,
      ).toMatchObject({
        corrections: 3,
      })
    })

    it('la nota mínima de cada proyecto se aprende de la réplica', async () => {
      // En el proyecto 10 se valida con 100 y se suspende con 90: un 85 no aprueba.
      await services.repositories.replica.ingestProjectUsers(
        [
          projectUser('uno', { status: 'finished', validated: true, finalMark: 100 }),
          projectUser('dos', { status: 'finished', validated: false, finalMark: 90 }),
        ],
        MADRID,
      )
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana', { final_mark: 85 }),
        // De un proyecto del que no se sabe nada vale la mínima habitual, 80.
        scaleTeam('eva', 'ana', { final_mark: 85, team: { project_id: 555 } }),
      ])
      await copyAll()
      // El histórico se copió antes de saber las notas mínimas: una vuelta más las aplica.
      await services.corrections.step()

      const detail = await services.network.pair(actor('ana'), { a: 'eva', b: 'ana' })

      expect(detail.corrections.find((row) => row.project === 'ft_printf')?.positive).toBe(false)
      expect(detail.corrections.find((row) => row.project === null)?.positive).toBe(true)
    })

    it('repasa el histórico entero una vez al día, solo si nadie usa la web', async () => {
      const rows = [
        scaleTeam('eva', 'ana'),
        scaleTeam('ana', 'eva'),
        scaleTeam('leo', 'ana'),
      ] as const

      api.scaleTeams.set(MADRID, [...rows])
      await copyAll()

      // 42 anula la segunda y le cambia la nota a la tercera sin avisar por `updated_at`.
      const [first, , third] = rows

      api.scaleTeams.set(MADRID, [first, { ...third, final_mark: 0 }])
      clock.advance(25 * 60 * MINUTE)

      // Con alguien dentro, solo se piden las novedades (una petición).
      services.sync.touch()
      api.calls.length = 0
      await services.corrections.step()
      expect(api.calls).toHaveLength(1)
      expect(await services.corrections.status(MADRID)).toMatchObject({ rows: 3 })

      // Cuando ya no hay nadie, el repaso recorre todo, corrige y borra.
      clock.advance(11 * MINUTE)
      await services.corrections.step()
      expect(await services.corrections.status(MADRID)).toMatchObject({ rows: 2 })
      expect(
        (await services.network.pair(actor('ana'), { a: 'leo', b: 'ana' })).corrections[0],
      ).toMatchObject({ mark: 0, positive: false })

      // Y no se repite hasta el día siguiente.
      clock.advance(11 * MINUTE)
      api.calls.length = 0
      await services.corrections.step()
      expect(api.calls.every((call) => call.includes('range[updated_at]'))).toBe(true)
    })

    it('ordena a los más estrictos, a partir de un mínimo de evaluaciones', async () => {
      api.scaleTeams.set(MADRID, [
        // `eva` evalúa cuatro y suspende una; `leo`, dos y las suspende; `ana`, una que aprueba.
        scaleTeam('eva', 'ana'),
        scaleTeam('eva', 'ana'),
        scaleTeam('eva', 'leo'),
        scaleTeam('eva', 'leo', { final_mark: 0 }),
        scaleTeam('leo', 'ana', { final_mark: 0 }),
        scaleTeam('leo', 'eva', { final_mark: 10 }),
        scaleTeam('ana', 'eva'),
      ])
      await copyAll()

      const all = await services.network.strictest(actor('ana'), { min: '1' })

      expect(all).toMatchObject({ min: 1, eligible: 3, campusFailRate: 0.429 })
      expect(
        all.people.map((person) => [person.login, person.judged, person.failed, person.failRate]),
      ).toEqual([
        ['leo', 2, 2, 1],
        ['eva', 4, 1, 0.25],
        ['ana', 1, 0, 0],
      ])
      // Al revés, los que menos suspenden primero.
      expect(
        (await services.network.strictest(actor('ana'), { min: '1', order: 'asc' })).people.map(
          (person) => person.login,
        ),
      ).toEqual(['ana', 'eva', 'leo'])
      // Subir el mínimo deja fuera a quien ha evaluado poco.
      const steady = await services.network.strictest(actor('ana'), { min: '3' })

      expect(steady.eligible).toBe(1)
      expect(steady.people.map((person) => person.login)).toEqual(['eva'])
      await expect(services.network.strictest(actor('ana'), { min: '0' })).rejects.toMatchObject({
        code: 'invalid_input',
      })
    })

    it('junta varios campus en el mismo grafo, o todos', async () => {
      const BARCELONA = 46

      api.scaleTeams.set(MADRID, [scaleTeam('eva', 'ana'), scaleTeam('ana', 'eva')])
      await copyAll()
      // Otro campus con lo suyo, y una corrección que cruza de uno a otro.
      await db.batch(
        [
          ['pau', 'nil'],
          ['nil', 'pau'],
          ['pau', 'ana'],
        ].map(([corrector, corrected], index) => ({
          sql: `INSERT INTO corrections (id, campus_id, corrector, corrected, begin_at, final_mark, positive)
                VALUES (?, ?, ?, ?, '2026-05-01T10:00:00.000Z', 100, 1)`,
          args: [9000 + index, BARCELONA, corrector ?? '', corrected ?? ''],
        })),
        'write',
      )

      // La gente de ese campus, como la dejaría su réplica.
      await db.batch(
        ['pau', 'nil'].flatMap((login, index) => [
          {
            sql: `INSERT INTO users (id, login, synced_at) VALUES (?, ?, '2026-01-01T00:00:00.000Z')`,
            args: [7000 + index, login],
          },
          {
            sql: 'INSERT INTO campus_members (campus_id, user_id) VALUES (?, ?)',
            args: [BARCELONA, 7000 + index],
          },
        ]),
        'write',
      )

      // Sin pedir nada, solo el propio.
      const own = await services.network.graph(actor('ana'), {})

      expect(own.campuses).toEqual([MADRID])
      expect(own.available.map((campus) => campus.id)).toEqual(
        [MADRID, BARCELONA].sort((a, b) => a - b),
      )
      expect(own.totals.corrections).toBe(2)

      const both = await services.network.graph(actor('ana'), {
        campuses: `${MADRID},${BARCELONA}`,
      })

      expect(both.campuses).toEqual([MADRID, BARCELONA].sort((a, b) => a - b))
      expect(both.totals.corrections).toBe(5)
      expect(both.nodes.map((node) => node.login).sort()).toEqual(['ana', 'eva', 'nil', 'pau'])
      expect(both.nodes.find((node) => node.login === 'ana')).toMatchObject({ campusId: MADRID })
      expect(both.nodes.find((node) => node.login === 'pau')).toMatchObject({
        campusId: BARCELONA,
        external: false,
      })
      // Y la pareja que cruza de un campus a otro se puede mirar.
      expect(
        await services.network.pair(actor('ana'), { a: 'pau', b: 'ana', campuses: 'all' }),
      ).toMatchObject({ forth: 1, back: 0 })
      expect((await services.network.graph(actor('ana'), { campuses: 'all' })).totals).toEqual(
        both.totals,
      )
      // Un campus sin correcciones no se puede pedir: queda el propio.
      expect((await services.network.graph(actor('ana'), { campuses: '999' })).campuses).toEqual([
        MADRID,
      ])
      await expect(
        services.network.graph(actor('ana'), { campuses: 'todos' }),
      ).rejects.toMatchObject({
        code: 'invalid_input',
      })
    })

    it('busca personas por el principio del login', async () => {
      api.scaleTeams.set(MADRID, [
        scaleTeam('eva', 'ana'),
        scaleTeam('eva', 'leo'),
        scaleTeam('ana', 'eva'),
      ])
      await copyAll()

      expect(await services.network.people(actor('ana'), 'e')).toEqual([
        { login: 'eva', image: 'https://img/eva-medium.png', corrections: 3 },
      ])
      expect(await services.network.people(actor('ana'), '%')).toEqual([])
      expect(await services.network.people(actor('ana'), undefined)).toEqual([])
    })
  })
})
