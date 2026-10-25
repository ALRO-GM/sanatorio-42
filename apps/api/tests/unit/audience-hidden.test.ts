/**
 * Las personas ocultas en `core/audience.ts` (`docs/personas-ocultas.md`):
 * cada grupo con su lista, a sí mismo se ve cada cual, y el panel lo olvida
 * al cambiarla.
 */

import { describe, expect, it } from 'vitest'

import { audienceKey, createAudience, seesFor, shownFor } from '../../src/core/audience.js'

const students = { campusId: 22, pool: false }
const pool = { campusId: 22, pool: true }

function setup() {
  let time = 0
  let reads = 0
  const hidden = { students: ['Oculta'], pool: ['pisci2'] }
  const audience = createAudience(
    () => Promise.resolve(['pisci', 'pisci2']),
    () => time,
    (fromPool) => {
      reads += 1

      return Promise.resolve(fromPool ? hidden.pool : hidden.students)
    },
  )

  return {
    audience,
    hidden,
    reads: () => reads,
    later: (ms: number) => {
      time += ms
    },
  }
}

describe('personas ocultas en quién ve a quién', () => {
  it('cada grupo deja fuera a los suyos, sin mayúsculas, y a sí mismo se ve', async () => {
    const { audience } = setup()
    const student = await seesFor(audience, students)
    const piscinero = await seesFor(audience, pool)

    expect(student('oculta')).toBe(false)
    expect(student('OCULTA')).toBe(false)
    expect(student('amiga')).toBe(true)
    expect(student('pisci')).toBe(false)
    expect(piscinero('pisci')).toBe(true)
    expect(piscinero('pisci2')).toBe(false)
    // Oculta a los estudiantes no es oculta a los piscineros (aunque no la ven por ser de otro mundo).
    expect((await shownFor(audience, pool))('oculta')).toBe(true)
    expect((await shownFor(audience, students))('oculta')).toBe(false)
    expect((await seesFor(audience, { ...students, login: 'oculta' }))('oculta')).toBe(true)
    expect((await shownFor(audience, { ...students, login: 'Oculta' }))('oculta')).toBe(true)
    expect((await seesFor(audience, { ...pool, login: 'pisci2' }))('pisci2')).toBe(true)
  })

  it('lo leído vale un rato, y el panel lo olvida al cambiarlo', async () => {
    const { audience, hidden, reads, later } = setup()

    await seesFor(audience, students)
    await seesFor(audience, students)
    expect(reads()).toBe(1)

    hidden.students = []
    later(10_000)
    expect((await seesFor(audience, students))('oculta')).toBe(false)

    const before = await audienceKey(audience, students)

    audience.forget()
    expect((await seesFor(audience, students))('oculta')).toBe(true)
    expect(await audienceKey(audience, students)).not.toBe(before)

    // Y, sin olvidarlo, al cabo de medio minuto se vuelve a leer.
    hidden.students = ['amiga']
    later(31_000)
    expect((await seesFor(audience, students))('amiga')).toBe(false)
  })

  it('la clave de lo guardado lleva a quien mira solo si está oculto', async () => {
    const { audience } = setup()

    expect(await audienceKey(audience, { ...students, login: 'amiga' })).toBe('0')
    expect(await audienceKey(audience, { ...students, login: 'oculta' })).toBe('0|oculta')
    expect(await audienceKey(audience, students)).toBe('0')
  })

  it('si falla la lectura, no se queda guardado el fallo', async () => {
    let fail = true
    const audience = createAudience(
      () => Promise.resolve([]),
      () => 0,
      () => (fail ? Promise.reject(new Error('sin base')) : Promise.resolve(['x'])),
    )

    await expect(seesFor(audience, students)).rejects.toThrow('sin base')
    fail = false
    // Se da tiempo a que el `catch` borre lo guardado.
    await Promise.resolve()
    expect((await seesFor(audience, students))('x')).toBe(false)
  })
})
