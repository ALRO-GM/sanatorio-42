/**
 * Tests de el tablón de dudas, las guías y su grafo.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { projectUser, userId } from '../helpers/fixtures.js'
import { shortName } from '../../src/modules/doubts/doubts.service.js'
import { parseHours } from '../../src/modules/replica/index.js'
import { MADRID, HOUR, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('comunidad', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, clock, db, api } = community)
  })

  describe('tablón de dudas', () => {
    it('una duda pasa de abierta a "de especialista" y a resuelta', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, {
        body: '¿Por qué ft_split me da leaks?',
      })
      expect(doubt.status).toBe('open')

      await doubts.answer(actor('leo'), doubt.id, { body: 'A mí me pasaba igual' })
      expect((await doubts.detail(actor('ana'), doubt.id)).status).toBe('open')

      const replies = await doubts.answer(actor('eva'), doubt.id, {
        body: 'Libera cada palabra y luego el array',
      })
      expect(replies.map((reply) => reply.specialist)).toEqual([false, true])
      expect((await doubts.detail(actor('ana'), doubt.id)).status).toBe('specialist')

      // Hay que decir qué respuesta la resolvió.
      await expectCode(
        doubts.setResolved(actor('ana'), doubt.id, { resolved: true }),
        'invalid_input',
      )
      await doubts.setResolved(actor('ana'), doubt.id, {
        resolved: true,
        answerId: replies[1]?.id,
      })
      const board = await doubts.board(actor('leo'), 10)
      expect(board.doubts).toMatchObject([
        { id: doubt.id, status: 'resolved', answers: 2, mine: false },
      ])
    })

    it('solo quien la puso (o quien modera) la resuelve o la quita', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo pruebo sin tester?' })

      await expectCode(
        doubts.setResolved(actor('leo'), doubt.id, { resolved: true, answerId: 1 }),
        'forbidden',
      )
      await expectCode(doubts.remove(actor('leo'), doubt.id), 'forbidden')

      await doubts.remove(actor('moderadora', { admin: true }), doubt.id)
      expect((await doubts.board(actor('ana'), 10)).doubts).toEqual([])
    })

    it('quien puso la duda puede cambiar el texto, mientras no esté resuelta', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo pruevo sin tester?' })

      await expectCode(
        doubts.update(actor('leo'), doubt.id, { body: 'Otra cosa distinta' }),
        'forbidden',
      )
      await expectCode(doubts.update(actor('ana'), doubt.id, { body: '?' }), 'invalid_input')

      expect(
        await doubts.update(actor('ana'), doubt.id, { body: '¿Cómo pruebo sin tester?' }),
      ).toMatchObject({ id: doubt.id, body: '¿Cómo pruebo sin tester?', mine: true })

      // Resuelta, alguien ganó XP por responder a lo que decía: no se toca.
      const [answer] = await doubts.answer(actor('eva'), doubt.id, { body: 'Con un main propio' })
      await doubts.setResolved(actor('ana'), doubt.id, { resolved: true, answerId: answer?.id })
      await expectCode(
        doubts.update(actor('ana'), doubt.id, { body: 'Ahora pregunto otra cosa' }),
        'conflict',
      )
    })

    it('valida el texto y el proyecto', async () => {
      const { doubts } = services

      await expectCode(doubts.create(actor('ana'), 10, { body: 'eh' }), 'invalid_input')
      await expectCode(doubts.create(actor('ana'), 10, { body: 'x'.repeat(281) }), 'invalid_input')
      await expectCode(
        doubts.create(actor('ana'), 999, { body: 'una duda cualquiera' }),
        'not_found',
      )
    })

    it('la guía la escriben quienes aprobaron; el resto propone', async () => {
      const { doubts } = services
      const guide = { start: ['Lee el subject entero'], problems: [], concepts: ['Punteros'] }

      await expectCode(doubts.saveGuide(actor('ana'), 10, guide), 'forbidden')
      expect(await doubts.saveGuide(actor('eva'), 10, guide)).toMatchObject({
        start: ['Lee el subject entero'],
        updatedBy: 'eva',
      })

      await doubts.propose(actor('ana'), 10, {
        section: 'problems',
        body: 'Segfault al recibir NULL',
      })

      // Quien no puede editar no ve las propuestas; quien sí, las ve y decide.
      expect((await doubts.board(actor('ana'), 10)).proposals).toEqual([])
      const pending = (await doubts.board(actor('eva'), 10)).proposals
      expect(pending).toMatchObject([{ author: 'ana', section: 'problems' }])

      await expectCode(doubts.reviewProposal(actor('ana'), pending[0]?.id ?? 0, true), 'forbidden')
      await doubts.reviewProposal(actor('eva'), pending[0]?.id ?? 0, true)

      const board = await doubts.board(actor('eva'), 10)
      expect(board.guide.problems).toEqual(['Segfault al recibir NULL'])
      expect(board.proposals).toEqual([])
    })
  })

  describe('XP por resolver dudas', () => {
    const total = async (login: string): Promise<number> =>
      (await services.xp.expediente(actor(login))).xp.total

    /** `asker` pone una duda, `solver` la responde y `asker` la da por resuelta con esa respuesta. */
    const solve = async (asker: string, solver: string, body: string): Promise<number> => {
      const { doubts } = services
      const doubt = await doubts.create(actor(asker), 10, { body })
      const [answer] = await doubts.answer(actor(solver), doubt.id, { body: 'Prueba así' })

      await doubts.setResolved(actor(asker), doubt.id, { resolved: true, answerId: answer?.id })

      return doubt.id
    }

    it('gana XP quien escribió la respuesta que la resolvió, y la pierde si se reabre', async () => {
      const { doubts } = services
      const doubtId = await solve('ana', 'eva', '¿Cómo va va_arg?')

      expect(await total('eva')).toBe(25)
      expect((await doubts.detail(actor('ana'), doubtId)).solvedAnswerId).not.toBeNull()

      await doubts.setResolved(actor('ana'), doubtId, { resolved: false })

      expect(await total('eva')).toBe(0)
      expect(await doubts.detail(actor('ana'), doubtId)).toMatchObject({
        status: 'specialist',
        solvedAnswerId: null,
      })
    })

    it('resolverse la duda a uno mismo no da XP', async () => {
      await solve('ana', 'ana', '¿Dónde pongo el Makefile?')

      expect(await total('ana')).toBe(0)
    })

    it('la respuesta tiene que ser de esa duda', async () => {
      const { doubts } = services
      const otra = await doubts.create(actor('leo'), 10, { body: '¿Y los flags del bonus?' })
      const [ajena] = await doubts.answer(actor('eva'), otra.id, { body: 'No hacen falta' })
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo va va_arg?' })

      await expectCode(
        doubts.setResolved(actor('ana'), doubt.id, { resolved: true, answerId: ajena?.id }),
        'invalid_input',
      )
    })

    it('la misma pareja solo puntúa una vez al día', async () => {
      await solve('ana', 'eva', 'Primera duda de hoy')
      await solve('ana', 'eva', 'Segunda duda de hoy')
      expect(await total('eva')).toBe(25)

      // Otra persona sí cuenta, y mañana la misma pareja también.
      await solve('leo', 'eva', 'La duda de leo')
      expect(await total('eva')).toBe(50)
      clock.advance(24 * HOUR)
      await solve('ana', 'eva', 'La duda de mañana')
      expect(await total('eva')).toBe(75)
    })
  })

  describe('cambios de guía con responsables', () => {
    const total = async (login: string): Promise<number> =>
      (await services.xp.expediente(actor(login))).xp.total

    /** `author` propone una línea y devuelve el id de la propuesta. */
    const propose = async (author: string, body: string): Promise<number> => {
      const { doubts } = services

      await doubts.propose(actor(author), 10, { section: 'problems', body })

      const found = (await doubts.board(actor('eva'), 10)).proposals.find((p) => p.body === body)

      return found?.id ?? 0
    }

    /** `validator` valida una línea de `author` y devuelve el id del cambio. */
    const accept = async (author: string, validator: string, body: string): Promise<number> => {
      const { doubts } = services

      await doubts.reviewProposal(actor(validator), await propose(author, body), true)

      const change = (await doubts.board(actor(validator), 10)).recentChanges.find(
        (entry) => entry.body === body,
      )

      return change?.id ?? 0
    }

    beforeEach(async () => {
      // Más gente que ya aprobó ft_printf, para validar y para señalar.
      await services.repositories.replica.ingestProjectUsers(
        ['sol', 'teo', 'uma'].map((login) => projectUser(login, { status: 'finished' })),
        MADRID,
      )
    })

    it('validar un cambio da XP a quien lo propuso y a quien lo valida', async () => {
      const { doubts } = services
      const changeId = await accept('ana', 'eva', 'Cuidado con %% al final')

      expect(await total('ana')).toBe(15)
      expect(await total('eva')).toBe(5)
      expect((await doubts.board(actor('ana'), 10)).guide.problems).toEqual([
        'Cuidado con %% al final',
      ])

      // Quien validó no puede señalarlo; otra especialista sí.
      expect((await doubts.board(actor('eva'), 10)).recentChanges).toMatchObject([
        { id: changeId, proposer: 'ana', validator: 'eva', flags: 0, canFlag: false },
      ])
      expect((await doubts.board(actor('sol'), 10)).recentChanges).toMatchObject([
        { canFlag: true },
      ])
      // Quien no aprobó el proyecto no ve la lista de cambios.
      expect((await doubts.board(actor('leo'), 10)).recentChanges).toEqual([])
    })

    it('nadie valida su propio cambio', async () => {
      const proposalId = await propose('eva', 'Lee el man de stdarg')

      await expectCode(services.doubts.reviewProposal(actor('eva'), proposalId, true), 'forbidden')
    })

    it('la misma pareja solo puntúa una vez por semana', async () => {
      await accept('ana', 'eva', 'Primera línea')
      await accept('ana', 'eva', 'Segunda línea')

      expect(await total('ana')).toBe(15)
      expect(await total('eva')).toBe(5)

      // Con otra persona validando sí cuenta.
      await accept('ana', 'sol', 'Tercera línea')
      expect(await total('ana')).toBe(30)

      clock.advance(8 * 24 * HOUR)
      await accept('ana', 'eva', 'Cuarta línea')
      expect(await total('ana')).toBe(45)
    })

    it('con dos señales el cambio se retira y los dos pierden la XP', async () => {
      const { doubts } = services
      const changeId = await accept('ana', 'eva', 'Usa printf dentro de ft_printf')

      // Ni quien lo propuso, ni quien lo validó, ni quien no aprobó el proyecto.
      await expectCode(doubts.flagChange(actor('ana'), changeId), 'forbidden')
      await expectCode(doubts.flagChange(actor('eva'), changeId), 'forbidden')
      await expectCode(doubts.flagChange(actor('leo'), changeId), 'forbidden')

      // Una sola persona no basta, y no puede señalar dos veces.
      expect(await doubts.flagChange(actor('sol'), changeId)).toBe(false)
      await expectCode(doubts.flagChange(actor('sol'), changeId), 'conflict')
      expect(await total('ana')).toBe(15)

      expect(await doubts.flagChange(actor('teo'), changeId)).toBe(true)

      expect(await total('ana')).toBe(0)
      expect(await total('eva')).toBe(0)
      const board = await doubts.board(actor('sol'), 10)
      expect(board.guide.problems).toEqual([])
      expect(board.recentChanges).toEqual([])
      await expectCode(doubts.flagChange(actor('uma'), changeId), 'not_found')
    })

    it('pasado un mes, un cambio ya no se puede señalar', async () => {
      const changeId = await accept('ana', 'eva', 'Una línea que aguanta')

      clock.advance(31 * 24 * HOUR)

      await expectCode(services.doubts.flagChange(actor('sol'), changeId), 'conflict')
    })

    it('tres cambios rechazados son un mes sin proponer', async () => {
      const { doubts } = services

      for (const body of ['Uno', 'Dos', 'Tres']) {
        await doubts.reviewProposal(actor('eva'), await propose('ana', body), false)
      }

      await expectCode(
        doubts.propose(actor('ana'), 10, { section: 'start', body: 'Cuatro' }),
        'forbidden',
      )
      expect((await doubts.board(actor('ana'), 10)).sanctions.proposeBlockedUntil).toBe(
        new Date(clock.now() + 30 * 24 * HOUR).toISOString(),
      )
      // A quien rechazó no le pasa nada.
      expect((await doubts.board(actor('eva'), 10)).sanctions).toEqual({
        proposeBlockedUntil: null,
        reviewBlockedUntil: null,
      })

      clock.advance(31 * 24 * HOUR)
      await expect(
        doubts.propose(actor('ana'), 10, { section: 'start', body: 'Cuatro' }),
      ).resolves.toBeUndefined()
    })

    it('tres cambios validados y luego retirados son un mes sin validar', async () => {
      const { doubts } = services

      // Tres personas distintas proponen, para que no se bloquee antes quien propone.
      for (const [author, body] of [
        ['ana', 'Malo uno'],
        ['leo', 'Malo dos'],
        ['uma', 'Malo tres'],
      ] as const) {
        const changeId = await accept(author, 'eva', body)

        await doubts.flagChange(actor('sol'), changeId)
        await doubts.flagChange(actor('teo'), changeId)
      }

      const pending = await propose('ana', 'Este ya no lo valida eva')

      await expectCode(doubts.reviewProposal(actor('eva'), pending, true), 'forbidden')
      // Ni lo cuela editando la guía a mano.
      await expectCode(
        doubts.saveGuide(actor('eva'), 10, { start: ['Truco'], problems: [], concepts: [] }),
        'forbidden',
      )
      expect((await doubts.board(actor('eva'), 10)).sanctions.reviewBlockedUntil).not.toBeNull()
      // Otra especialista sigue pudiendo.
      await expect(doubts.reviewProposal(actor('sol'), pending, true)).resolves.toBeUndefined()

      clock.advance(31 * 24 * HOUR)
      await expect(
        doubts.reviewProposal(actor('eva'), await propose('leo', 'De vuelta'), true),
      ).resolves.toBeUndefined()
    })
  })

  describe('grafo del tablón', () => {
    const { replica } = { replica: () => services.repositories.replica }
    const all = (graph: Awaited<ReturnType<typeof services.doubts.graph>>) =>
      graph.circles.flatMap(({ circle, projects }) => projects.map((p) => ({ ...p, circle })))

    /** El nodo de ese proyecto en el grafo de esa persona. */
    const node = async (login: string, name: string) => {
      const found = all(await services.doubts.graph(actor(login), null)).find(
        (project) => project.name === name,
      )

      if (found === undefined) {
        throw new Error(`no hay ${name} en el grafo de ${login}`)
      }

      return found
    }

    beforeEach(async () => {
      // Las horas de los proyectos se dan por pedidas: el grafo no pregunta a 42.
      await replica().setState(`hours:${MADRID}`, {})
      await replica().ingestProjectUsers(
        [
          // Plan clásico: `ana` aprobó Libft y hace ft_printf; `leo` ya va por push_swap.
          projectUser('ana', { slug: '42cursus-ft_printf' }),
          projectUser('ana', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            status: 'finished',
          }),
          projectUser('leo', {
            projectId: 40,
            projectName: 'push_swap',
            slug: '42cursus-push_swap',
          }),
          // Plan nuevo: `nex` aprobó Libft, hace un módulo de Python y viene de la piscina.
          projectUser('nex', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            status: 'finished',
            createdAt: '2026-05-01T10:00:00.000Z',
          }),
          projectUser('nex', {
            projectId: 30,
            projectName: 'Python Module 00',
            slug: 'python-module-00',
            createdAt: '2026-06-20T10:00:00.000Z',
          }),
          projectUser('nex', {
            projectId: 90,
            projectName: 'C Piscine C 00',
            slug: 'c-piscine-c-00',
            status: 'finished',
            cursusIds: [9],
          }),
          // `pis` sigue en la piscina.
          projectUser('pis', {
            projectId: 90,
            projectName: 'C Piscine C 00',
            slug: 'c-piscine-c-00',
            cursusIds: [9],
          }),
        ],
        MADRID,
      )
    })

    it('cada persona ve su plan: clásico en C o nuevo con Python', async () => {
      const classic = await services.doubts.graph(actor('ana'), null)
      const next = await services.doubts.graph(actor('nex'), null)

      expect(classic.track).toBe('classic')
      expect(all(classic).map((p) => `${p.circle}:${p.name}`)).toEqual([
        '0:Libft',
        '1:ft_printf',
        '2:push_swap',
      ])

      // El plan nuevo comparte los primeros proyectos, pero tiene sus módulos
      // de Python y no el push_swap del plan clásico.
      expect(next.track).toBe('next')
      expect(all(next).map((p) => `${p.circle}:${p.name}`)).toEqual([
        '0:Libft',
        '1:ft_printf',
        '2:Python Module 00',
      ])
    })

    it('la piscina no sale, ni en el grafo ni entre los proyectos de quien ya es estudiante', async () => {
      const names = all(await services.doubts.graph(actor('nex'), null)).map((p) => p.name)

      expect(names.some((name) => /piscine/i.test(name))).toBe(false)
      expect((await replica().projectsOf('nex', true)).map((p) => p.name)).toEqual([
        'Python Module 00',
        'Libft',
      ])
      // Quien todavía está en la piscina sí ve los suyos: es lo único que tiene.
      expect((await replica().projectsOf('pis', true)).map((p) => p.name)).toEqual([
        'C Piscine C 00',
      ])
    })

    it('dice cómo va con cada proyecto y cuáles aún no tiene disponibles', async () => {
      const graph = await services.doubts.graph(actor('ana'), null)

      // Va por el círculo 1: es el más alto en el que tiene algo.
      expect(graph.currentCircle).toBe(1)
      expect(graph.knownUpTo).toBe(2)
      expect(await node('ana', 'Libft')).toMatchObject({ status: 'finished', locked: false })
      expect(await node('ana', 'ft_printf')).toMatchObject({
        status: 'in_progress',
        locked: false,
        short: 'printf',
      })
      // push_swap es del círculo 2: lo tendrá, pero todavía no.
      expect(await node('ana', 'push_swap')).toMatchObject({ status: 'todo', locked: true })
      expect(await node('leo', 'push_swap')).toMatchObject({ status: 'in_progress', locked: false })
    })

    it('aprende el plan de los rangos y las fechas de cada persona', async () => {
      // `nex` validó el rango 0 en mayo y el 1 en junio, y después se apuntó a
      // un proyecto que no está en ninguna tabla.
      await replica().ingestProjectUsers(
        [
          projectUser('nex', {
            projectId: 77,
            projectName: 'Proyecto Nuevo',
            slug: 'proyecto-nuevo',
            createdAt: '2026-06-25T10:00:00.000Z',
          }),
          projectUser('otra', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            createdAt: '2026-09-01T10:00:00.000Z',
          }),
          projectUser('otra', {
            projectId: 30,
            projectName: 'Python Module 00',
            slug: 'python-module-00',
          }),
        ],
        MADRID,
      )
      api.quests.set(userId('nex'), [
        { quest_id: 128, validated_at: '2026-03-12T10:00:00.000Z', quest: { slug: '42next' } },
        {
          quest_id: 44,
          validated_at: '2026-05-10T10:00:00.000Z',
          quest: { slug: 'common-core-rank-00' },
        },
        {
          quest_id: 45,
          validated_at: '2026-06-15T10:00:00.000Z',
          quest: { slug: 'common-core-rank-01' },
        },
        { quest_id: 37, validated_at: null, quest: { slug: 'common-core' } },
      ])

      const graph = await services.doubts.graph(actor('nex'), userId('nex'))

      expect(graph).toMatchObject({ track: 'next', currentCircle: 2 })
      expect(all(graph).find((p) => p.name === 'Proyecto Nuevo')).toMatchObject({ circle: 2 })

      // Solo se pregunta por sus hitos y su cursus, y no se repite al volver a abrir el grafo.
      const asked = api.calls.length

      await services.doubts.graph(actor('nex'), userId('nex'))
      expect(api.calls).toHaveLength(asked)
      expect(
        api.calls.every(
          (call) =>
            /^\/users\/\d+\/(quests_users|cursus_users)/.test(call) &&
            call.startsWith(`/users/${userId('nex')}/`),
        ),
      ).toBe(true)
      api.calls.length = 0

      // Lo aprendido vale para quien venga detrás en el mismo plan: lo verá
      // como algo que tendrá, aún cerrado.
      expect(await node('otra', 'Proyecto Nuevo')).toMatchObject({
        circle: 2,
        status: 'todo',
        locked: false,
      })
      expect(
        (await services.doubts.graph(actor('ana'), null)).circles.flatMap((c) => c.projects),
      ).not.toContainEqual(expect.objectContaining({ name: 'Proyecto Nuevo' }))
    })

    it('da las fechas del estado de salud: inicio, círculos completados y black hole', async () => {
      await replica().ingestUser(
        {
          id: userId('nex'),
          login: 'nex',
          cursus_users: [
            { cursus_id: 9, level: 7, begin_at: '2026-01-26T09:00:00.000Z' },
            {
              cursus_id: 21,
              level: 3.66,
              begin_at: '2026-05-18T07:42:00.000Z',
              blackholed_at: '2027-04-03T07:42:00.000Z',
            },
          ],
        },
        [MADRID],
      )
      api.quests.set(userId('nex'), [
        {
          quest_id: 45,
          validated_at: '2026-06-18T14:40:00.000Z',
          quest: { slug: 'common-core-rank-01' },
        },
        {
          quest_id: 44,
          validated_at: '2026-05-19T11:37:00.000Z',
          quest: { slug: 'common-core-rank-00' },
        },
        { quest_id: 37, validated_at: null, quest: { slug: 'common-core' } },
      ])

      // Las fechas son las del 42cursus, no las de la piscina.
      expect(await services.xp.health(actor('nex'), userId('nex'))).toEqual({
        startedAt: '2026-05-18T07:42:00.000Z',
        blackholedAt: '2027-04-03T07:42:00.000Z',
        currentCircle: 2,
        milestones: ['2026-05-19T11:37:00.000Z', '2026-06-18T14:40:00.000Z'],
        declared: null,
      })

      // Quien entró antes de que se guardasen las fechas no las tiene: se piden
      // a 42 una vez y quedan guardadas.
      api.cursus.set(userId('eva'), [
        { cursus_id: 9, level: 6, begin_at: '2026-01-26T09:00:00.000Z' },
        {
          cursus_id: 21,
          level: 2.1,
          begin_at: '2026-06-01T08:00:00.000Z',
          blackholed_at: '2027-02-01T08:00:00.000Z',
        },
      ])
      expect(await services.xp.health(actor('eva'), userId('eva'))).toMatchObject({
        startedAt: '2026-06-01T08:00:00.000Z',
        blackholedAt: '2027-02-01T08:00:00.000Z',
      })
      const asked = api.calls.filter((call) => call.includes('cursus_users')).length

      await services.xp.health(actor('eva'), userId('eva'))
      expect(api.calls.filter((call) => call.includes('cursus_users'))).toHaveLength(asked)

      // De quien no se sabe nada no se inventa nada: empieza en el círculo 0.
      api.calls.length = 0
      expect(await services.xp.health(actor('leo'), null)).toEqual({
        startedAt: null,
        blackholedAt: null,
        currentCircle: 0,
        milestones: [],
        declared: null,
      })
      expect(api.calls).toHaveLength(0)
    })

    it('avisa de las dudas sin responder a quien puede responderlas', async () => {
      const doubt = await services.doubts.create(actor('leo'), 10, { body: '¿Cómo va va_arg?' })

      // `ana` lo está haciendo y `eva` lo aprobó: a las dos les sirve saberlo.
      expect((await node('ana', 'ft_printf')).signals.unanswered).toBe(1)
      expect((await node('eva', 'ft_printf')).signals.unanswered).toBe(1)
      // A quien la puso no se le avisa de su propia duda.
      expect((await node('leo', 'ft_printf')).signals.unanswered).toBe(0)

      await services.doubts.answer(actor('eva'), doubt.id, { body: 'Pide un int.' })

      expect((await node('ana', 'ft_printf')).signals.unanswered).toBe(0)
    })

    it('no avisa de nada en proyectos a los que aún no se ha llegado', async () => {
      await services.doubts.create(actor('eva'), 20, { body: '¿Qué hace ft_lstmap?' })

      // `leo` no tiene Libft; `ana` la aprobó.
      expect((await node('leo', 'Libft')).signals).toEqual({
        unanswered: 0,
        proposals: 0,
        missingGuide: false,
      })
      expect((await node('ana', 'Libft')).signals.unanswered).toBe(1)
    })

    it('la guía que falta y las propuestas solo llegan a quien aprobó el proyecto', async () => {
      await services.doubts.propose(actor('leo'), 10, { section: 'start', body: 'Lee el subject' })

      expect((await node('eva', 'ft_printf')).signals).toMatchObject({
        proposals: 1,
        missingGuide: true,
      })
      expect((await node('ana', 'ft_printf')).signals).toMatchObject({
        proposals: 0,
        missingGuide: false,
      })

      await services.doubts.saveGuide(actor('eva'), 10, {
        start: ['Lee el subject'],
        problems: [],
        concepts: [],
      })

      expect((await node('eva', 'ft_printf')).signals.missingGuide).toBe(false)
    })

    it('dice las horas, la serie y si lo bordó con un 125', async () => {
      const { replica: repo } = services.repositories

      await repo.ingestProjectUsers(
        [
          {
            ...projectUser('ana', {
              projectId: 20,
              projectName: 'Libft',
              slug: '42cursus-libft',
              status: 'finished',
            }),
            final_mark: 125,
          },
        ],
        MADRID,
      )
      await db.execute('UPDATE projects SET hours = 55 WHERE id = 10')
      // Las horas ya se han pedido esta semana: no hay que preguntar a 42.
      await repo.setState(`hours:${MADRID}`, {})

      expect(await node('ana', 'Libft')).toMatchObject({ perfect: true, series: null, hours: null })
      expect(await node('ana', 'ft_printf')).toMatchObject({ perfect: false, hours: 55 })
      expect(await node('nex', 'Python Module 00')).toMatchObject({ series: 'Python' })
      expect((await services.doubts.graph(actor('ana'), null)).level).toBeNull()
    })

    it('entiende las estimaciones de 42', () => {
      expect(
        ['55 hours', '1 hour', 'about 2 days', '1 week', '', null, 'pronto'].map(parseHours),
      ).toEqual([55, 1, 16, 40, null, null, null])
    })

    it('abrevia los nombres para que quepan en el nodo', () => {
      expect(
        [
          'Libft',
          'get_next_line',
          'Python Module 07',
          'CPP Module 03',
          'Exam Rank 02',
          'Call Me Maybe',
          'Inception-of-Things',
        ].map(shortName),
      ).toEqual(['Libft', 'GNL', 'Py 07', 'C++ 03', 'Exam 02', 'CallMe', 'Inceptio…'])
    })
  })
})
