/**
 * Tests de las terapias de grupo.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { MADRID, MINUTE, HOUR, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('comunidad', () => {
  const community = useCommunity()
  const { seat } = community
  let services: Community['services']
  let clock: Community['clock']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, clock, api } = community)
  })

  describe('terapias de grupo', () => {
    const martesYJueves = {
      projectId: 10,
      place: 'Cluster 1 · Planta 2',
      // Martes 6 (hoy) y jueves 8 de octubre.
      dates: ['2026-10-08', '2026-10-06'],
      start: '16:00',
      end: '18:00',
      capacity: 2,
    }

    it('quien abre el grupo entra en él y los demás lo ven', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      expect(group).toMatchObject({
        projectName: 'ft_printf',
        dates: ['2026-10-06', '2026-10-08'],
        joined: true,
        mine: true,
        inSession: true,
      })
      expect(group.members.map((member) => member.login)).toEqual(['ana'])

      const [seen] = await therapy.list(actor('leo'), 10)
      expect(seen).toMatchObject({ id: group.id, joined: false, mine: false })
    })

    it('no deja pasar de las plazas', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      await therapy.join(actor('leo'), group.id)
      await expectCode(therapy.join(actor('eva'), group.id), 'conflict')

      // Unirse dos veces no es un error ni ocupa otra plaza.
      await expect(therapy.join(actor('leo'), group.id)).resolves.toBeUndefined()
    })

    it('rechaza horarios imposibles y proyectos que no existen', async () => {
      const { therapy } = services

      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, end: '15:00' }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: [] }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, projectId: 999 }),
        'not_found',
      )
    })

    const conPuestos = { ...martesYJueves, seats: ['c1r2s1', 'c1r2s2'] }

    it('cada media hora en tu puesto da XP, comprobado con los puestos de 42', async () => {
      const { therapy, xp } = services
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // 16:30: primera media hora de la sesión de 16:00 a 18:00.
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)
      // La misma media hora no se comprueba dos veces.
      clock.advance(5 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      // 17:00: segunda media hora.
      clock.advance(25 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)

      expect((await xp.expediente(actor('ana'))).xp.total).toBe(20)
      expect((await xp.expediente(actor('leo'))).xp.total).toBe(20)
    })

    it('solo cuenta quien está en un puesto reservado, y hacen falta dos', async () => {
      const { therapy, xp } = services
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // `leo` está en el campus, pero en otro puesto: `ana` se queda sola.
      await seat({ ana: 'c1r2s1', leo: 'c3r1s1' })
      expect(await therapy.checkAttendance()).toBe(0)

      // Llegar tarde no recupera la media hora ya comprobada.
      clock.advance(10 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      clock.advance(20 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)
      expect((await xp.expediente(actor('leo'))).xp.total).toBe(10)
    })

    it('fuera de horario o sin puestos reservados no hay nada que comprobar', async () => {
      const { therapy } = services
      const sinPuestos = await therapy.create(actor('ana'), martesYJueves)
      await therapy.join(actor('leo'), sinPuestos.id)

      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      await therapy.close(actor('ana'), sinPuestos.id)
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // Miércoles a la misma hora: no hay sesión.
      clock.advance(24 * HOUR)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)
    })

    it('los días son concretos: ni fechas pasadas ni cosas que no son un día', async () => {
      const { therapy } = services

      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['2026-10-05'] }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['martes'] }),
        'invalid_input',
      )
      // Ni con más de dos meses de antelación: un año mal escrito no entra.
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['2027-10-06'] }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['2026-10-06', '2026-12-20'] }),
        'invalid_input',
      )
      // Repetidos fuera, y en orden.
      const group = await therapy.create(actor('ana'), {
        ...martesYJueves,
        dates: ['2026-10-20', '2026-10-06', '2026-10-20'],
      })
      expect(group.dates).toEqual(['2026-10-06', '2026-10-20'])
    })

    it('los puestos se tocan, son como mucho seis y de ellos salen las plazas', async () => {
      const { therapy } = services
      const con = (seats: string[]) => therapy.create(actor('ana'), { ...martesYJueves, seats })

      // Cuatro puestos en dos filas seguidas: cuatro plazas, se pida lo que se pida.
      expect(
        await therapy.create(actor('ana'), {
          ...martesYJueves,
          capacity: 12,
          seats: ['c1r2s1', 'c1r2s2', 'c1r3s1', 'c1r4s1'],
        }),
      ).toMatchObject({ capacity: 4 })
      // Un hueco en medio de la fila o una fila sin nadie entre medias: no se tocan.
      await expectCode(con(['c1r1s1', 'c1r1s3']), 'invalid_input')
      await expectCode(con(['c1r1s1', 'c1r3s1']), 'invalid_input')
      // En diagonal sí se tocan.
      await expect(con(['c1r5s1', 'c1r6s2'])).resolves.toMatchObject({ capacity: 2 })
      // Tres filas de separación, dos clusters, un solo puesto o siete: no.
      await expectCode(con(['c1r1s1', 'c1r4s1']), 'invalid_input')
      await expectCode(con(['c1r1s1', 'c2r1s1']), 'invalid_input')
      await expectCode(con(['c1r1s1']), 'invalid_input')
      await expectCode(
        con(['1', '2', '3', '4', '5', '6', '7'].map((n) => `c1r1s${n}`)),
        'invalid_input',
      )
    })

    it('al apuntarte dices cómo llevas el proyecto, y un grupo de repaso pide el 100 %', async () => {
      const { therapy } = services

      // Abrir uno de repaso sin tenerlo terminado no tiene sentido.
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, kind: 'review', progress: 80 }),
        'conflict',
      )

      const review = await therapy.create(actor('ana'), {
        ...martesYJueves,
        kind: 'review',
        progress: 100,
      })

      expect(review).toMatchObject({
        kind: 'review',
        members: [{ login: 'ana', progress: 100 }],
      })
      await expectCode(therapy.join(actor('leo'), review.id, { progress: 90 }), 'conflict')
      await expectCode(therapy.join(actor('leo'), review.id), 'conflict')
      await therapy.join(actor('leo'), review.id, { progress: 100 })

      // En uno normal vale cualquier porcentaje, o no decirlo.
      const study = await therapy.create(actor('eva'), { ...martesYJueves, capacity: 4 })

      await therapy.join(actor('leo'), study.id, { progress: 35 })
      await therapy.join(actor('ana'), study.id)
      expect(
        (await therapy.list(actor('eva'))).find((group) => group.id === study.id),
      ).toMatchObject({
        kind: 'study',
        members: expect.arrayContaining([
          expect.objectContaining({ login: 'eva', progress: null }),
          expect.objectContaining({ login: 'leo', progress: 35 }),
          expect.objectContaining({ login: 'ana', progress: null }),
        ]),
      })
      await expectCode(therapy.join(actor('sol'), study.id, { progress: 150 }), 'invalid_input')
    })

    it('cada grupo tiene su chat, solo para quien está dentro', async () => {
      const { therapy, meet } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      const id = `group:${group.id}`

      await therapy.join(actor('leo'), group.id, { progress: 40 })
      await meet.send(actor('leo'), null, { id, kind: 'text', body: '¿Hay que llevar algo?' })

      expect((await meet.thread(actor('ana'), null, id)).messages).toMatchObject([
        { login: 'leo', body: '¿Hay que llevar algo?' },
      ])
      await expectCode(meet.thread(actor('eva'), null, id), 'forbidden')
    })

    it('un especialista puede ofrecerse a preevaluar; quien aún lo hace, no', async () => {
      await services.xp.updateSettings(actor('eva'), { preReview: true })
      // `ana` lo marca también, pero aún lo está haciendo: no cuenta.
      await services.xp.updateSettings(actor('ana'), { preReview: true })

      expect((await services.xp.expediente(actor('eva'))).preReview).toBe(true)

      // En la sala de espera solo cuenta para quien ya aprobó el proyecto.
      const peers = await services.repositories.replica.findPeers({
        projectId: 10,
        campusId: MADRID,
        presenceSince: new Date(0).toISOString(),
      })
      const flags = Object.fromEntries(peers.map((peer) => [peer.login, peer.preReview]))

      expect(flags.ana).toBe(false)
      // Cambiar otra preferencia no borra la marca.
      await services.xp.updateSettings(actor('eva'), { lang: 'en' })
      expect((await services.xp.expediente(actor('eva'))).preReview).toBe(true)
    })

    it('quien lo abrió puede cambiarlo; nadie más', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      await therapy.join(actor('leo'), group.id)

      await expectCode(therapy.update(actor('leo'), group.id, martesYJueves), 'forbidden')

      const updated = await therapy.update(actor('ana'), group.id, {
        ...martesYJueves,
        place: 'Cluster 3',
        dates: ['2026-10-06', '2026-10-09'],
        end: '19:00',
        seats: ['c3r1s1', 'c3r1s2', 'c3r2s1'],
      })

      expect(updated).toMatchObject({
        id: group.id,
        place: 'Cluster 3',
        dates: ['2026-10-06', '2026-10-09'],
        end: '19:00',
        // Las plazas son los puestos elegidos.
        capacity: 3,
        seats: ['c3r1s1', 'c3r1s2', 'c3r2s1'],
      })
      // La gente apuntada sigue apuntada.
      expect(updated.members.map((member) => member.login)).toEqual(['ana', 'leo'])
      // Ni quien modera: solo quien lo abrió. Eso sí, puede cerrarlo.
      await expectCode(
        therapy.update(actor('moderadora', { admin: true }), group.id, martesYJueves),
        'forbidden',
      )
      expect(
        (await therapy.list(actor('moderadora', { admin: true }))).find(
          (one) => one.id === group.id,
        ),
      ).toMatchObject({ mine: false, canClose: true, joined: false })
    })

    it('al cambiarlo no caben menos plazas que gente, ni días nuevos en el pasado', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), { ...martesYJueves, capacity: 3 })
      await therapy.join(actor('leo'), group.id)
      await therapy.join(actor('eva'), group.id)

      await expectCode(
        therapy.update(actor('ana'), group.id, { ...martesYJueves, capacity: 2 }),
        'conflict',
      )

      // El jueves, el martes 6 ya pasó: se puede conservar, pero no añadir el lunes 5.
      clock.advance(48 * HOUR)
      await expect(
        therapy.update(actor('ana'), group.id, {
          ...martesYJueves,
          capacity: 3,
          dates: ['2026-10-06', '2026-10-08', '2026-10-12'],
        }),
      ).resolves.toMatchObject({ dates: ['2026-10-06', '2026-10-08', '2026-10-12'] })
      await expectCode(
        therapy.update(actor('ana'), group.id, {
          ...martesYJueves,
          capacity: 3,
          dates: ['2026-10-05', '2026-10-08'],
        }),
        'invalid_input',
      )
    })

    it('un grupo que se queda vacío desaparece de todas partes', async () => {
      const { therapy, calendar, map, repositories } = services
      const week = ['2026-10-05T00:00:00.000Z', '2026-10-12T00:00:00.000Z'] as const
      const sessions = async (login: string) =>
        (await calendar.between(actor(login), null, ...week)).events.filter(
          (event) => event.kind === 'therapy',
        )
      const reserved = async () =>
        (await map.forCampus(actor('leo'))).clusters
          .flatMap((cluster) => cluster.seats)
          .filter((seat) => seat.reservation !== null)

      const group = await therapy.create(actor('ana'), {
        ...martesYJueves,
        seats: ['c1r2s1', 'c1r2s2'],
      })
      await repositories.replica.setState(`locations:${MADRID}`, { at: clock.now(), count: 0 })

      expect(await sessions('ana')).toHaveLength(2)
      expect(await reserved()).toHaveLength(2)

      // `ana` se sale y no queda nadie.
      await therapy.leave(actor('ana'), group.id)

      expect(await therapy.list(actor('leo'))).toEqual([])
      expect(await sessions('ana')).toEqual([])
      expect(await reserved()).toEqual([])
      // Y no ocupa hueco de los grupos que `ana` puede tener abiertos.
      await expectCode(therapy.join(actor('leo'), group.id), 'conflict')

      // El mapa pone al día la réplica al abrirse: esas peticiones no son de la comunidad.
      api.calls.length = 0
    })

    it('un grupo se cierra solo cuando pasa su último día', async () => {
      const { therapy } = services
      await therapy.create(actor('ana'), martesYJueves)

      // El jueves 8 sigue ahí; el viernes 9 ya no.
      clock.advance(48 * HOUR)
      expect(await therapy.list(actor('leo'))).toHaveLength(1)
      clock.advance(24 * HOUR)
      expect(await therapy.list(actor('leo'))).toEqual([])
    })

    it('solo cierra quien lo abrió, y se cierra solo al quedarse vacío', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      await expectCode(therapy.close(actor('leo'), group.id), 'forbidden')

      await therapy.leave(actor('ana'), group.id)
      expect(await therapy.list(actor('leo'))).toEqual([])
    })

    it('los grupos de un campus no se ven desde otro', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      const desdeBarcelona = actor('leo', { campusId: 58 })

      expect(await therapy.list(desdeBarcelona)).toEqual([])
      await expectCode(therapy.join(desdeBarcelona, group.id), 'not_found')
    })
  })
})
