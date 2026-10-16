/**
 * Códigos de un solo uso (TOTP): con los vectores de la RFC 6238 y los bordes.
 */

import { describe, expect, it } from 'vitest'

import {
  base32Decode,
  base32Encode,
  codeAt,
  matchStep,
  newSecret,
  otpauthUri,
  stepOf,
} from '../../src/modules/admin/totp.js'

// El secreto de los ejemplos de la RFC 6238 para SHA1.
const RFC = new TextEncoder().encode('12345678901234567890')

describe('TOTP', () => {
  it('da los códigos de la RFC 6238 (SHA1, 8 cifras)', () => {
    expect(codeAt(RFC, stepOf(59_000), 8)).toBe('94287082')
    expect(codeAt(RFC, stepOf(1_111_111_109_000), 8)).toBe('07081804')
    expect(codeAt(RFC, stepOf(1_234_567_890_000), 8)).toBe('89005924')
    expect(codeAt(RFC, stepOf(20_000_000_000_000), 8)).toBe('65353130')
  })

  it('con seis cifras, las seis últimas', () => {
    expect(codeAt(RFC, stepOf(59_000))).toBe('287082')
  })

  it('base32 de ida y vuelta, y lo que no es base32 no se lee', () => {
    const secret = newSecret()

    expect(secret).toHaveLength(20)
    expect(base32Decode(base32Encode(secret))).toEqual(secret)
    expect(base32Encode(new TextEncoder().encode('foobar'))).toBe('MZXW6YTBOI')
    expect(base32Decode('mzxw 6ytb oi==')).toEqual(new TextEncoder().encode('foobar'))
    expect(base32Decode('ABC1')).toBeNull()
    expect(base32Decode('')).toEqual(new Uint8Array())
  })

  it('vale el código de ahora y el de medio minuto antes o después, no más', () => {
    const at = 1_234_567_890_000
    const now = stepOf(at)

    expect(matchStep(RFC, codeAt(RFC, now), at, null)).toBe(now)
    expect(matchStep(RFC, codeAt(RFC, now - 1), at, null)).toBe(now - 1)
    expect(matchStep(RFC, codeAt(RFC, now + 1), at, null)).toBe(now + 1)
    expect(matchStep(RFC, codeAt(RFC, now - 2), at, null)).toBeNull()
    expect(matchStep(RFC, codeAt(RFC, now + 2), at, null)).toBeNull()
  })

  it('un código ya usado no vale otra vez, ni uno anterior', () => {
    const at = 1_234_567_890_000
    const now = stepOf(at)

    expect(matchStep(RFC, codeAt(RFC, now), at, now)).toBeNull()
    expect(matchStep(RFC, codeAt(RFC, now - 1), at, now - 1)).toBeNull()
    expect(matchStep(RFC, codeAt(RFC, now + 1), at, now)).toBe(now + 1)
  })

  it('lo que no son seis cifras no se compara', () => {
    const at = 1_234_567_890_000

    for (const code of ['', '12345', '1234567', 'abcdef', ' 12345', '12 345', '١٢٣٤٥٦']) {
      expect(matchStep(RFC, code, at, null)).toBeNull()
    }
  })

  it('el QR lleva lo que las apps esperan', () => {
    const uri = otpauthUri('Sanatorio 42', 'albrodri', new TextEncoder().encode('foobar'))

    expect(uri.startsWith('otpauth://totp/Sanatorio%2042%3Aalbrodri?')).toBe(true)
    expect(new URL(uri).searchParams.get('secret')).toBe('MZXW6YTBOI')
    expect(new URL(uri).searchParams.get('digits')).toBe('6')
    expect(new URL(uri).searchParams.get('period')).toBe('30')
  })
})
