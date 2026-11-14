/**
 * «Aplasta bugs» (#104 del buzón): las cuentas del minijuego de la espera.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { CELLS, loadBest, nextCell, saveBest, stayMs } from '../src/features/maintenance/bugsquash'

/** Un almacenamiento en memoria: estos tests corren sin navegador. */
const memory = () => {
  const data = new Map<string, string>()

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('aplasta bugs: a dónde salta el bug', () => {
  it('normal: siempre a una casilla del tablero', () => {
    for (let index = 0; index < 50; index += 1) {
      const cell = nextCell(Math.random, index % CELLS)

      expect(cell).toBeGreaterThanOrEqual(0)
      expect(cell).toBeLessThan(CELLS)
    }
  })

  it('límite: nunca se queda en la misma, ni con el azar en sus extremos', () => {
    for (const value of [0, 0.5, 0.999_999]) {
      for (let current = 0; current < CELLS; current += 1) {
        const cell = nextCell(() => value, current)

        expect(cell).not.toBe(current)
        expect(cell).toBeLessThan(CELLS)
      }
    }
  })

  it('vacío: sin bug todavía, cualquier casilla vale (también la primera)', () => {
    expect(nextCell(() => 0, null)).toBe(0)
    expect(nextCell(() => 0.999_999, null)).toBe(CELLS - 2)
  })

  it('imprevisible: un azar fuera de rango no saca el bug del tablero', () => {
    for (const value of [-1, 1, 1.5, 42, Number.NaN]) {
      const cell = nextCell(() => value, 3)

      expect(cell).toBeLessThan(CELLS)
      expect(cell).not.toBe(3)
    }
  })
})

describe('aplasta bugs: ritmo y récord', () => {
  it('cuantos más aplastas, más deprisa, con un tope', () => {
    expect(stayMs(0)).toBeGreaterThan(stayMs(10))
    expect(stayMs(1_000_000)).toBe(stayMs(10_000))
    expect(stayMs(-5)).toBe(stayMs(0))
  })

  it('el récord se guarda solo si lo es, y lo raro guardado cuenta como nada', () => {
    vi.stubGlobal('localStorage', memory())
    expect(loadBest()).toBe(0)
    expect(saveBest(7)).toBe(7)
    expect(saveBest(3)).toBe(7)
    expect(loadBest()).toBe(7)
    localStorage.setItem('peer4u_bugsquash_best', 'abc')
    expect(loadBest()).toBe(0)
    localStorage.setItem('peer4u_bugsquash_best', '1e400')
    expect(loadBest()).toBe(0)
  })

  it('permisos: con el almacenamiento bloqueado ni leer ni guardar rompen la partida', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    })
    expect(loadBest()).toBe(0)
    expect(saveBest(5)).toBe(5)
  })
})
