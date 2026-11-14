/**
 * Cifrado de campos (`core/crypto/fields.ts`, `docs/cifrado.md`): lo que entra
 * sale igual, lo de antes en claro se sigue leyendo, y lo tocado o de otra
 * clave no se lee: da error.
 *
 * Familias de `docs/tests.md`: normal (ida y vuelta), límite (vacío, un
 * carácter, texto que parece cifrado), vacío y enorme (cadena vacía, 1 MB),
 * imprevisible (tocado, truncado, cabecera cambiada, no texto) y permisos (otra
 * clave no abre lo ajeno; la anterior solo sirve si se carga).
 */

import { randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { loadEnv } from '../../src/config/env.js'
import {
  createFieldCipher,
  DEV_DATA_KEY,
  devFieldCipher,
  fieldCipherFromEnv,
  parseDataKey,
  SealedFieldError,
} from '../../src/core/crypto/fields.js'

const key = (): Buffer => randomBytes(32)

/** Cambia un carácter base64url por otro distinto en la posición dada. */
function flip(text: string, at: number): string {
  const swapped = text[at] === 'A' ? 'B' : 'A'

  return `${text.slice(0, at)}${swapped}${text.slice(at + 1)}`
}

describe('cifrado de campos', () => {
  const cipher = createFieldCipher({ current: key() })

  it('lo que se cifra se abre igual, con acentos, emojis de texto y saltos de línea', () => {
    for (const text of ['hola', '¿Quedamos a las 18:00?\nEn c2r7', 'ñ — «» 😀 中文', '0']) {
      const sealed = cipher.seal(text)

      expect(sealed).toMatch(/^v1:[A-Za-z0-9_-]{8}:/)
      // Un texto de un carácter puede salir por casualidad dentro del base64.
      if (text.length > 1) expect(sealed).not.toContain(text)
      expect(cipher.open(sealed)).toBe(text)
      expect(cipher.isCurrent(sealed)).toBe(true)
    }
  })

  it('el mismo texto dos veces no da lo mismo: cada valor lleva su iv', () => {
    expect(cipher.seal('igual')).not.toBe(cipher.seal('igual'))
  })

  it('vacío y enorme: la cadena vacía y 1 MB van y vuelven', () => {
    expect(cipher.open(cipher.seal(''))).toBe('')

    const big = 'x'.repeat(1024 * 1024)

    expect(cipher.open(cipher.seal(big))).toBe(big)
  })

  it('lo de antes, en claro, se lee tal cual (también si empieza por «v1:»)', () => {
    for (const legacy of ['mensaje viejo', 'v1: hola', 'v1:abc:def', '']) {
      expect(cipher.open(legacy)).toBe(legacy)
      expect(cipher.isCurrent(legacy)).toBe(false)
    }
  })

  it('opcionales: null y lo que no es texto no se cifran ni se abren', () => {
    expect(cipher.sealOrNull(null)).toBeNull()
    expect(cipher.sealOrNull(undefined)).toBeNull()
    expect(cipher.openOrNull(null)).toBeNull()
    expect(cipher.openOrNull(42)).toBeNull()
    expect(cipher.openOrNull(cipher.sealOrNull('nota'))).toBe('nota')
  })

  it('un valor tocado (datos, etiqueta o iv) no se lee: da error', () => {
    const sealed = cipher.seal('quedamos en la cafetería')
    const [version, id, iv, body, tag] = sealed.split(':') as [
      string,
      string,
      string,
      string,
      string,
    ]

    for (const tampered of [
      [version, id, iv, flip(body, 2), tag].join(':'),
      [version, id, iv, body, flip(tag, 3)].join(':'),
      [version, id, flip(iv, 0), body, tag].join(':'),
      // Un trozo de los datos de menos.
      [version, id, iv, body.slice(4), tag].join(':'),
    ]) {
      expect(() => cipher.open(tampered)).toThrow(SealedFieldError)
    }
  })

  it('cambiar la huella de la cabecera no cuela, aunque sea de una clave cargada', () => {
    const old = key()
    const both = createFieldCipher({ current: key(), previous: [old] })
    const fromOld = createFieldCipher({ current: old })
    const sealed = both.seal('texto')
    const parts = sealed.split(':')

    // La huella de la otra clave: la abre otra clave y la cabecera no encaja.
    parts[1] = fromOld.keyId

    expect(() => both.open(parts.join(':'))).toThrow(SealedFieldError)
  })

  it('con otra clave no se abre lo ajeno', () => {
    const sealed = cipher.seal('privado')
    const other = createFieldCipher({ current: key() })

    expect(() => other.open(sealed)).toThrow(/clave que no está cargada/)
    expect(other.isCurrent(sealed)).toBe(false)
  })

  it('rotar: con la vieja como anterior se lee lo viejo, y lo nuevo va con la nueva', () => {
    const old = key()
    const before = createFieldCipher({ current: old })
    const after = createFieldCipher({ current: key(), previous: [old] })
    const sealed = before.seal('de antes')

    expect(after.open(sealed)).toBe('de antes')
    expect(after.isCurrent(sealed)).toBe(false)
    expect(after.isCurrent(after.seal('de ahora'))).toBe(true)
    expect(after.keyId).not.toBe(before.keyId)
  })

  it('una clave que no son 32 bytes no se acepta', () => {
    expect(() => createFieldCipher({ current: randomBytes(16) })).toThrow(/32 bytes/)
    expect(() => createFieldCipher({ current: key(), previous: [randomBytes(31)] })).toThrow()
  })
})

describe('la clave del entorno', () => {
  const good = randomBytes(32).toString('base64')

  it('una clave de 32 bytes en base64 vale, con espacios alrededor', () => {
    expect(parseDataKey(` ${good}\n`)).toHaveLength(32)
  })

  it('corta, larga, vacía o con caracteres raros, no', () => {
    for (const bad of [
      '',
      randomBytes(16).toString('base64'),
      randomBytes(33).toString('base64'),
      'no es base64 ni de lejos!!',
      `${good}$`,
    ]) {
      expect(() => parseDataKey(bad), bad).toThrow(/32 bytes en base64/)
    }
  })

  it('sin DATA_KEY, la de desarrollo; con ella, la suya; y las anteriores, por comas', () => {
    const old = randomBytes(32)

    expect(fieldCipherFromEnv({ DATA_KEY: '', DATA_KEY_PREVIOUS: '' }).keyId).toBe(
      devFieldCipher.keyId,
    )

    const sealedOld = createFieldCipher({ current: old }).seal('viejo')
    const fromEnv = fieldCipherFromEnv({
      DATA_KEY: good,
      DATA_KEY_PREVIOUS: ` ${old.toString('base64')}, `,
    })

    expect(fromEnv.keyId).not.toBe(devFieldCipher.keyId)
    expect(fromEnv.open(sealedOld)).toBe('viejo')
    expect(() => fieldCipherFromEnv({ DATA_KEY: good, DATA_KEY_PREVIOUS: 'corta' })).toThrow(
      /DATA_KEY_PREVIOUS/,
    )
  })

  it('la de desarrollo es fija: lo cifrado en local se sigue leyendo al reiniciar', () => {
    expect(createFieldCipher({ current: DEV_DATA_KEY }).open(devFieldCipher.seal('local'))).toBe(
      'local',
    )
  })
})

describe('arrancar con o sin DATA_KEY', () => {
  const MINIMO: NodeJS.ProcessEnv = {
    FORTY_TWO_UID: 'u-test',
    FORTY_TWO_SECRET: 's-test',
    FORTY_TWO_REDIRECT_URI: 'https://sanatorio.example.org/api/auth/callback',
    SESSION_SECRET: 'secreto-de-sesion-para-pruebas-de-treinta-y-dos',
    FRONTEND_URL: 'https://sanatorio.example.org',
  }
  const clave = Buffer.alloc(32, 7).toString('base64')

  it('en producción no arranca sin ella, y dice qué falta', () => {
    expect(() => loadEnv({ ...MINIMO, NODE_ENV: 'production' })).toThrow(/Falta DATA_KEY/)
    expect(() => loadEnv({ ...MINIMO, NODE_ENV: 'production', DATA_KEY: '   ' })).toThrow(
      /Falta DATA_KEY/,
    )
  })

  it('en producción, con una clave buena, arranca', () => {
    expect(loadEnv({ ...MINIMO, NODE_ENV: 'production', DATA_KEY: clave }).DATA_KEY).toBe(clave)
  })

  it('una clave mal copiada no arranca en ningún sitio', () => {
    expect(() => loadEnv({ ...MINIMO, DATA_KEY: clave.slice(0, 20) })).toThrow(/32 bytes/)
    expect(() => loadEnv({ ...MINIMO, DATA_KEY: clave, DATA_KEY_PREVIOUS: 'x' })).toThrow(
      /DATA_KEY_PREVIOUS/,
    )
  })

  it('fuera de producción, sin clave, arranca (con la de desarrollo)', () => {
    expect(loadEnv({ ...MINIMO, NODE_ENV: 'development' }).DATA_KEY).toBe('')
    expect(loadEnv(MINIMO).DATA_KEY).toBe('')
  })
})
