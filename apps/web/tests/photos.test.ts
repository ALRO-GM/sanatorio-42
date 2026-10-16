/**
 * Fotos: las de la CDN de 42 se piden a la API, que las sirve con su token.
 */

import { describe, expect, it } from 'vitest'

import { photoUrl } from '../src/shared/api/photos'

const CDN = 'https://cdn.intra.42.fr/users/abc/medium_ana.jpg'

describe('dirección de las fotos', () => {
  it('las de la CDN de 42 salen de la API', () => {
    expect(photoUrl('ana', CDN, true)).toMatch(/\/avatars\/ana$/)
    expect(photoUrl('3b3-borrada', CDN, true)).toMatch(/\/avatars\/3b3-borrada$/)
  })

  it('con la API de mentira, o si no es de la CDN, tal cual', () => {
    expect(photoUrl('ana', CDN, false)).toBe(CDN)
    expect(photoUrl('ana', 'https://example.org/a.png', true)).toBe('https://example.org/a.png')
    expect(photoUrl('ana', 'data:image/png;base64,AAAA', true)).toBe('data:image/png;base64,AAAA')
  })

  it('sin foto no hay dirección', () => {
    expect(photoUrl('ana', null, true)).toBeNull()
    expect(photoUrl('ana', '', true)).toBeNull()
  })

  it('un login raro no se mete en la dirección: se queda la de 42', () => {
    expect(photoUrl('../admin', CDN, true)).toBe(CDN)
    expect(photoUrl('Ana', CDN, true)).toBe(CDN)
    expect(photoUrl('', CDN, true)).toBe(CDN)
    expect(photoUrl('a'.repeat(41), CDN, true)).toBe(CDN)
  })
})
