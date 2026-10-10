/**
 * Tests del repositorio de la réplica.
 *
 * Contra SQLite real en memoria: lo que hay que probar aquí es el SQL (el JOIN
 * que decide quién sale en la lista de compañeros), y eso un mock no lo prueba.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, nowIso, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createAvailabilityRepository } from '../../src/modules/peers/availability.repository.js'
import { createReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import type { ReplicaRepository } from '../../src/modules/replica/replica.repository.js'
import { activeLocation, apiUser, projectUser } from '../helpers/fixtures.js'

const MADRID = 22
const EVER = '1970-01-01T00:00:00.000Z'

describe('réplica', () => {
  let db: Db
  let replica: ReplicaRepository

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    replica = createReplicaRepository(db)
  })

  afterEach(() => {
    closeDatabase(db)
  })

  /** Deja a alguien de guardia: disponible y sentado. */
  async function onDuty(login: string, host = 'c1r1s1'): Promise<void> {
    await createAvailabilityRepository(db).set(login, true)
    await replica.replacePresence(MADRID, [activeLocation(login, host)])
  }

  describe('guardar', () => {
    it('guarda persona, campus, proyecto y estado de cada fila', async () => {
      const saved = await replica.ingestProjectUsers([projectUser('mgomez')], MADRID)

      expect(saved).toBe(1)
      expect(await replica.projectName(10)).toBe('ft_printf')
      expect(await replica.userExists('mgomez')).toBe(true)
      expect(await replica.countParticipants(10, MADRID)).toBe(1)
    })

    it('no guarda PII: ni email, ni wallet, ni puntos de corrección', async () => {
      await replica.ingestProjectUsers([projectUser('mgomez')], MADRID)

      const result = await db.execute('SELECT * FROM users')
      const row = JSON.stringify(result.rows[0])

      expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual([
        'active',
        'id',
        'image',
        'login',
        'name',
        'synced_at',
      ])
      expect(row).not.toContain('@student')
      expect(row).toContain('https://img/mgomez-medium.png')
    })

    it('recibir dos veces la misma fila la actualiza en vez de duplicarla', async () => {
      await replica.ingestProjectUsers([projectUser('mgomez', { id: 7 })], MADRID)
      await replica.ingestProjectUsers(
        [projectUser('mgomez', { id: 7, status: 'finished' })],
        MADRID,
      )

      expect((await replica.counts()).projectUsers).toBe(1)
      expect(await replica.isSpecialist('mgomez', 10)).toBe(true)
    })

    it('se salta las filas sin id o sin persona en vez de fallar el lote', async () => {
      const saved = await replica.ingestProjectUsers(
        [
          { status: 'in_progress', project: { id: 10, name: 'ft_printf' } },
          { id: 5, status: 'in_progress', project: { id: 10, name: 'ft_printf' }, user: null },
          projectUser('mgomez'),
        ],
        MADRID,
      )

      expect(saved).toBe(1)
    })

    it('un login reciclado por otra cuenta no tumba el lote', async () => {
      await replica.ingestProjectUsers(
        [projectUser('mgomez', { id: 1, user: { id: 500 } })],
        MADRID,
      )
      // 42 anonimiza la cuenta vieja y otra persona recibe el mismo login.
      await replica.ingestProjectUsers(
        [projectUser('mgomez', { id: 2, user: { id: 501 } })],
        MADRID,
      )

      expect((await replica.counts()).users).toBe(1)
    })

    it('las filas del perfil de alguien se guardan a su nombre', async () => {
      const owner = apiUser('albrodri')
      await replica.ingestUser(owner, [MADRID])
      await replica.ingestProjectUsers(
        [{ id: 9, status: 'in_progress', project: { id: 10, name: 'ft_printf' } }],
        undefined,
        owner,
      )

      expect(await replica.projectsOf('albrodri')).toEqual([{ id: 10, name: 'ft_printf' }])
    })
  })

  describe('compañeros', () => {
    const query = { projectId: 10, campusId: MADRID, presenceSince: EVER }

    it('devuelve a quien lo está haciendo, esté o no en el campus', async () => {
      await replica.ingestProjectUsers([projectUser('mgomez')], MADRID)

      expect(await replica.findPeers(query)).toEqual([
        {
          login: 'mgomez',
          image: 'https://img/mgomez-medium.png',
          location: null,
          available: false,
          status: 'in_progress',
        },
      ])
    })

    it('un especialista solo sale si está de guardia', async () => {
      await replica.ingestProjectUsers([projectUser('jdoe', { status: 'finished' })], MADRID)
      expect(await replica.findPeers(query)).toEqual([])

      await onDuty('jdoe', 'c2r4s6')

      expect(await replica.findPeers(query)).toMatchObject([
        { login: 'jdoe', location: 'c2r4s6', available: true, status: 'finished' },
      ])
    })

    it('quien terminó suspendiendo no es especialista', async () => {
      await replica.ingestProjectUsers(
        [projectUser('jdoe', { status: 'finished', validated: false })],
        MADRID,
      )
      await onDuty('jdoe')

      expect(await replica.findPeers(query)).toEqual([])
      expect(await replica.isSpecialist('jdoe', 10)).toBe(false)
    })

    it('deja fuera a quien pregunta, a otros campus y a las cuentas inactivas', async () => {
      await replica.ingestProjectUsers(
        [
          projectUser('albrodri'),
          projectUser('mgomez'),
          projectUser('tvega', { user: { 'active?': false } }),
        ],
        MADRID,
      )
      await replica.ingestProjectUsers([projectUser('lruiz')], 58)

      const peers = await replica.findPeers({ ...query, excludeLogin: 'albrodri' })

      expect(peers.map((peer) => peer.login)).toEqual(['mgomez'])
    })

    it('pone primero a quien está de guardia', async () => {
      await replica.ingestProjectUsers([projectUser('mgomez'), projectUser('lruiz')], MADRID)
      await onDuty('lruiz')

      expect((await replica.findPeers(query)).map((peer) => peer.login)).toEqual([
        'lruiz',
        'mgomez',
      ])
    })

    it('no se cree un puesto de una foto demasiado vieja', async () => {
      await replica.ingestProjectUsers([projectUser('mgomez')], MADRID)
      await replica.replacePresence(MADRID, [activeLocation('mgomez', 'c1r1s1')])

      const future = new Date(Date.now() + 60_000).toISOString()
      const [peer] = await replica.findPeers({ ...query, presenceSince: future })

      expect(peer?.location).toBeNull()
    })

    it('cuenta a todo el campus en el proyecto, no solo a los accionables', async () => {
      await replica.ingestProjectUsers(
        [projectUser('mgomez'), projectUser('jdoe', { status: 'finished' })],
        MADRID,
      )

      expect(await replica.countParticipants(10, MADRID)).toBe(2)
    })
  })

  describe('puestos', () => {
    it('quien no viene en la foto nueva deja de estar sentado', async () => {
      await replica.replacePresence(MADRID, [
        activeLocation('mgomez', 'c1r1s1'),
        activeLocation('jdoe', 'c1r1s2'),
      ])
      await replica.replacePresence(MADRID, [activeLocation('jdoe', 'c1r1s2')])

      expect(await replica.locationOf('mgomez', EVER)).toBeNull()
      expect(await replica.locationOf('jdoe', EVER)).toBe('c1r1s2')
    })

    it('la foto de un campus no borra la de otro', async () => {
      await replica.replacePresence(58, [activeLocation('lruiz', 'bcn1', 58)])
      await replica.replacePresence(MADRID, [])

      expect(await replica.locationOf('lruiz', EVER)).toBe('bcn1')
    })
  })

  describe('proyectos de una persona', () => {
    it('solo los que tiene en curso; con `includeFinished`, también los aprobados', async () => {
      await replica.ingestProjectUsers(
        [
          projectUser('mgomez', { projectId: 10, projectName: 'ft_printf' }),
          projectUser('mgomez', { projectId: 11, projectName: 'libft', status: 'finished' }),
          projectUser('mgomez', {
            projectId: 12,
            projectName: 'gnl',
            status: 'finished',
            validated: false,
          }),
        ],
        MADRID,
      )

      expect(await replica.projectsOf('mgomez')).toEqual([{ id: 10, name: 'ft_printf' }])
      expect(await replica.projectsOf('mgomez', true)).toEqual([
        { id: 10, name: 'ft_printf', status: 'in_progress' },
        { id: 11, name: 'libft', status: 'finished' },
      ])
    })
  })

  describe('estado de las tareas', () => {
    it('guarda y lee JSON, y un estado ilegible cuenta como ausente', async () => {
      expect(await replica.getState('x')).toBeUndefined()

      await replica.setState('x', { page: 3 })
      expect(await replica.getState('x')).toEqual({ page: 3 })

      await db.execute({
        sql: 'UPDATE sync_state SET value = ?, updated_at = ? WHERE key = ?',
        args: ['{roto', nowIso(), 'x'],
      })
      expect(await replica.getState('x')).toBeUndefined()
    })
  })
})
