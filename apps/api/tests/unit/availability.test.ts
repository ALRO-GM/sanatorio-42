/**
 * Tests del repositorio de `availability`. Los de la réplica están en
 * `replica.test.ts`.
 *
 * Van contra una base SQLite real en memoria, no contra un mock. Con
 * `@libsql/client` las consultas son `async`, y un mock que devolviera lo que
 * espera el código no probaría nada: el error interesante en una consulta está
 * en el SQL, no en el `await`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createAvailabilityRepository } from '../../src/modules/peers/availability.repository.js'

describe('repositorios', () => {
  let db: Db

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  describe('availability', () => {
    it('devuelve false para alguien que nunca ha marcado su disponibilidad', async () => {
      const repo = createAvailabilityRepository(db)

      expect(await repo.get('nuevo')).toBe(false)
      expect(await repo.getUpdatedAt('nuevo')).toBeUndefined()
    })

    it('guarda y devuelve true', async () => {
      const repo = createAvailabilityRepository(db)

      expect(await repo.set('albrodri', true)).toBe(true)
      expect(await repo.get('albrodri')).toBe(true)
    })

    it('guarda y devuelve false explícito, en vez de dejar un undefined', async () => {
      const repo = createAvailabilityRepository(db)

      await repo.set('albrodri', true)
      expect(await repo.set('albrodri', false)).toBe(false)
      // La fila sigue existiendo: se puede volver a poner a true y se recuerda
      // cuándo se tocó por última vez.
      expect(await repo.get('albrodri')).toBe(false)
      expect(await repo.getUpdatedAt('albrodri')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('sobrescribe en vez de duplicar al marcar dos veces', async () => {
      const repo = createAvailabilityRepository(db)

      await repo.set('albrodri', true)
      await repo.set('albrodri', false)
      await repo.set('albrodri', true)

      const rows = await repo.listAll()
      expect(rows).toHaveLength(1)
      expect(Number(rows[0]?.available)).toBe(1)
    })

    it('devuelve todos los logins indexados en un mapa', async () => {
      const repo = createAvailabilityRepository(db)

      await repo.set('albrodri', true)
      await repo.set('mgomez', false)
      await repo.set('jdoe', true)

      const map = await repo.mapOfAll()

      expect(map.get('albrodri')).toBe(true)
      expect(map.get('jdoe')).toBe(true)
      // Guardado como false explícito, y en el mapa como false.
      expect(map.get('mgomez')).toBe(false)
      expect(map.size).toBe(3)
    })

    it('deja fuera a quien no ha marcado nada', async () => {
      const repo = createAvailabilityRepository(db)

      await repo.set('albrodri', true)

      expect((await repo.mapOfAll()).has('jdoe')).toBe(false)
    })
  })
})
