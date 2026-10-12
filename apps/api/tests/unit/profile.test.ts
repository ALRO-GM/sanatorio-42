/**
 * Tests de el expediente: niveles, títulos, logros y ranking.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { localMoment } from '../../src/core/time.js'
import { levelFor, titleUnlocked } from '../../src/modules/profile/xp.rules.js'
import { TUESDAY_AFTERNOON, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('comunidad', () => {
  const community = useCommunity()
  const { helpSession } = community
  let services: Community['services']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, api } = community)
  })

  describe('niveles y títulos', () => {
    it('el nivel sale de la XP acumulada', () => {
      expect(levelFor(0)).toEqual({ level: 1, floor: 0, next: 50 })
      expect(levelFor(49).level).toBe(1)
      expect(levelFor(50).level).toBe(2)
      // El ejemplo de la presentación: 340 XP es nivel 4, de 250 a 500.
      expect(levelFor(340)).toEqual({ level: 4, floor: 250, next: 500 })
      expect(levelFor(99_999).next).toBeNull()
    })

    it('un título solo vale a partir de su nivel', () => {
      expect(titleUnlocked('paciente', 1)).toBe(true)
      expect(titleUnlocked('jefe', 6)).toBe(false)
      expect(titleUnlocked('jefe', 7)).toBe(true)
      expect(titleUnlocked('inventado', 10)).toBe(false)
    })

    it('la hora de una terapia es la del campus, no la del servidor', () => {
      // 14:30 UTC de un martes es 16:30 en Madrid…
      expect(localMoment(TUESDAY_AFTERNOON, 'Europe/Madrid')).toEqual({
        day: '2026-10-06',
        weekday: 2,
        minutes: 16 * 60 + 30,
      })
      // …y ya es de noche en Tokio.
      expect(localMoment(TUESDAY_AFTERNOON, 'Asia/Tokyo').minutes).toBe(23 * 60 + 30)
      // Una zona desconocida no rompe nada: se usa UTC.
      expect(localMoment(TUESDAY_AFTERNOON, 'Marte/Olympus').minutes).toBe(14 * 60 + 30)
    })
  })

  describe('ranking', () => {
    it('ordena por XP de ayudar, sin contar la de asistir a terapias', async () => {
      const { xp } = services

      await helpSession('ana') // eva: 40
      await xp.award('leo', 'doubt_solved', 'doubt:1') // leo: 25
      await xp.award('ana', 'therapy_session', 'therapy:1:2026-10-06:1') // no cuenta

      const board = await xp.leaderboard(actor('leo'), 'month')

      expect(board.entries).toEqual([
        { rank: 1, login: 'eva', image: expect.any(String), xp: 40 },
        { rank: 2, login: 'leo', image: expect.any(String), xp: 25 },
      ])
      expect(board.me).toMatchObject({ rank: 2, login: 'leo' })
      // `ana` solo ha ido a terapia: no sale.
      expect((await xp.leaderboard(actor('ana'), 'all')).me).toBeNull()
    })

    it('el expediente de otra persona solo enseña su parte pública', async () => {
      const { xp } = services

      await xp.award('eva', 'specialist_help', 'help:1')

      const record = await xp.publicProfile('EVA')

      expect(record).toMatchObject({
        login: 'eva',
        image: expect.any(String),
        xp: { total: 40, level: 1 },
        title: 'paciente',
      })
      expect(record.achievements.find((entry) => entry.id === 'selfless_help')).toMatchObject({
        progress: 1,
      })
      // Lleva su estado de salud, pero nada de preferencias ni del desglose de XP.
      expect(record.health).toMatchObject({ currentCircle: 0, milestones: [], declared: null })
      expect(Object.keys(record).sort()).toEqual([
        'achievements',
        'hacks',
        'health',
        'image',
        'login',
        'reactions',
        'title',
        'xp',
      ])
      await expectCode(xp.publicProfile('nadie'), 'not_found')
      await expectCode(xp.publicProfile('../etc'), 'not_found')
      // Su estado de salud sí pregunta a 42 por sus hitos, una vez al día.
      api.calls.length = 0
    })

    it('el pace y el plazo anotados se guardan con el círculo en el que se está', async () => {
      const { xp } = services
      const eva = actor('eva')

      expect((await xp.health(eva, null)).declared).toBeNull()

      const health = await xp.declarePace(eva, null, { pace: 15, deadline: '2026-11-11' })

      expect(health.declared).toMatchObject({ pace: 15, circle: 0, deadline: '2026-11-11' })
      expect(health.declared?.updatedAt).toEqual(expect.any(String))
      // Anotarlo otra vez sustituye lo anterior, y lo ve quien mire su expediente.
      await xp.declarePace(eva, null, { pace: 18, deadline: '2026-12-14' })
      expect((await xp.publicProfile('eva')).health.declared).toMatchObject({
        pace: 18,
        deadline: '2026-12-14',
      })

      // Ni paces que no existen, ni fechas mal escritas, imposibles o absurdas.
      await expectCode(
        xp.declarePace(eva, null, { pace: 16, deadline: '2026-11-11' }),
        'invalid_input',
      )
      await expectCode(
        xp.declarePace(eva, null, { pace: 15, deadline: '11/11/2026' }),
        'invalid_input',
      )
      await expectCode(
        xp.declarePace(eva, null, { pace: 15, deadline: '2026-13-40' }),
        'invalid_input',
      )
      await expectCode(
        xp.declarePace(eva, null, { pace: 15, deadline: '2031-01-01' }),
        'invalid_input',
      )
      // Mirar su expediente pregunta a 42 por sus hitos, una vez al día.
      api.calls.length = 0
    })

    it('quien empata comparte puesto, y cada campus tiene el suyo', async () => {
      const { xp } = services

      await xp.award('ana', 'doubt_solved', 'doubt:1')
      await xp.award('leo', 'doubt_solved', 'doubt:2')

      expect(
        (await xp.leaderboard(actor('ana'), 'all')).entries.map((entry) => entry.rank),
      ).toEqual([1, 1])
      expect((await xp.leaderboard(actor('ana', { campusId: 58 }), 'all')).entries).toEqual([])
    })

    it('el expediente desglosa la XP: cuánta y cuántas veces por cada cosa', async () => {
      const { xp } = services

      await xp.award('ana', 'doubt_solved', 'doubt:1')
      await xp.award('ana', 'doubt_solved', 'doubt:2')
      await xp.award('ana', 'guide_review', 'change:1')

      const { earned, xp: level } = await xp.expediente(actor('ana'))

      expect(earned.doubt_solved).toEqual({ xp: 50, times: 2 })
      expect(earned.guide_review).toEqual({ xp: 5, times: 1 })
      expect(earned.board_host).toEqual({ xp: 0, times: 0 })
      expect(Object.values(earned).reduce((sum, kind) => sum + kind.xp, 0)).toBe(level.total)
    })
  })

  describe('expediente', () => {
    it('ponerse de guardia por primera vez desbloquea un logro, una sola vez', async () => {
      await services.xp.markFirstDuty('ana')
      await services.xp.markFirstDuty('ana')

      const { achievements, xp } = await services.xp.expediente(actor('ana'))

      expect(achievements.find((entry) => entry.id === 'first_duty')).toEqual({
        id: 'first_duty',
        goal: 1,
        progress: 1,
        unlocked: true,
      })
      expect(xp.total).toBe(0)
    })

    it('luce el título más alto que tenga y no deja ponerse uno bloqueado', async () => {
      const { xp } = services

      expect((await xp.expediente(actor('eva'))).title).toBe('paciente')

      // 25 + 25 XP: nivel 2, "interno".
      await xp.award('eva', 'doubt_solved', 'doubt:1')
      await xp.award('eva', 'doubt_solved', 'doubt:2')
      expect((await xp.expediente(actor('eva'))).title).toBe('interno')

      await expectCode(xp.updateSettings(actor('eva'), { title: 'jefe' }), 'forbidden')

      await xp.updateSettings(actor('eva'), { title: 'paciente' })
      expect((await xp.expediente(actor('eva'))).title).toBe('paciente')
    })

    it('guarda idioma y campus sin pisar lo que no viene', async () => {
      const { xp, repositories } = services

      await xp.updateSettings(actor('ana'), { lang: 'en' })
      // Los cuatro idiomas de la web valen; uno inventado, no.
      await xp.updateSettings(actor('ana'), { lang: 'ca' })
      await xp.updateSettings(actor('ana'), { lang: 'eu' })
      await expectCode(xp.updateSettings(actor('ana'), { lang: 'fr' }), 'invalid_input')
      await xp.updateSettings(actor('ana'), { lang: 'en' })
      await xp.updateSettings(actor('ana'), { campusId: 58 })

      expect(await repositories.profiles.get('ana')).toMatchObject({ lang: 'en', campusId: 58 })
      // El catálogo solo tiene Madrid y Barcelona: otro id no cuela.
      await expectCode(xp.updateSettings(actor('ana'), { campusId: 9999 }), 'invalid_input')
      await expectCode(xp.updateSettings(actor('ana'), { lang: 'klingon' }), 'invalid_input')
    })
  })
})
