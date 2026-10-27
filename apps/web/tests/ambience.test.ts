/**
 * El ruido del Pomodoro se repite en bucle: el final del trozo tiene que
 * enlazar con el principio sin salto, y cada color tiene su carácter.
 */

import { describe, expect, it } from 'vitest'

import { noiseSamples } from '../src/features/focus/ambience'

const RATE = 8000

/** Un azar con semilla, para que el test no dependa de la suerte. */
function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648

    return state / 2_147_483_648
  }
}

/** La media del salto entre muestras seguidas: alto en el blanco, bajo en el marrón. */
function roughness(samples: Float32Array): number {
  let total = 0

  for (let index = 1; index < samples.length; index += 1) {
    total += Math.abs((samples[index] ?? 0) - (samples[index - 1] ?? 0))
  }

  return total / (samples.length - 1)
}

describe('ruido del Pomodoro', () => {
  it('el bucle enlaza sin salto: del final al principio no se brinca más que entre muestras', () => {
    const samples = noiseSamples('brown', RATE, seeded(7))
    const jump = Math.abs((samples[0] ?? 0) - (samples.at(-1) ?? 0))

    expect(jump).toBeLessThan(roughness(samples) * 20)
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1)
  })

  it('el blanco es más áspero que el rosa, y el rosa que el marrón', () => {
    const white = roughness(noiseSamples('white', RATE, seeded(1)))
    const pink = roughness(noiseSamples('pink', RATE, seeded(1)))
    const brown = roughness(noiseSamples('brown', RATE, seeded(1)))

    expect(white).toBeGreaterThan(pink)
    expect(pink).toBeGreaterThan(brown)
  })
})
