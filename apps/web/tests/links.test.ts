import { describe, expect, it } from 'vitest'

import { chatHref, decodePart, intraHref, networkHref, recordHref } from '../src/shared/links'

describe('direcciones de la web', () => {
  it('un login normal va tal cual', () => {
    expect(recordHref('jdoe')).toBe('#/expediente/jdoe')
    expect(networkHref('jdoe')).toBe('#/red/jdoe')
    expect(networkHref()).toBe('#/red')
    expect(intraHref('jdoe')).toBe('https://profile.intra.42.fr/users/jdoe')
  })

  it('lo que podría cambiar la ruta se codifica', () => {
    expect(recordHref('a/b')).toBe('#/expediente/a%2Fb')
    expect(recordHref('../admin')).toBe('#/expediente/..%2Fadmin')
    expect(recordHref('a#b?c=d')).toBe('#/expediente/a%23b%3Fc%3Dd')
    expect(intraHref('x/../../logout')).toBe(
      'https://profile.intra.42.fr/users/x%2F..%2F..%2Flogout',
    )
    expect(intraHref('"><script>')).not.toContain('<')
  })

  it('la conversación con alguien se abre en los clusters, con el login codificado', () => {
    expect(chatHref('jdoe')).toBe('#/clusters/jdoe')
    expect(chatHref('a/b')).toBe('#/clusters/a%2Fb')
    expect(chatHref('')).toBe('#/clusters/')
    expect(decodePart(chatHref('ñ #?%').slice('#/clusters/'.length))).toBe('ñ #?%')
    expect(chatHref('x'.repeat(5000))).toHaveLength('#/clusters/'.length + 5000)
  })

  it('ida y vuelta: lo codificado se recupera igual', () => {
    for (const login of ['jdoe', 'a b', 'ñandú', 'a/b', '100%', '', 'x'.repeat(5000)]) {
      expect(decodePart(recordHref(login).slice('#/expediente/'.length))).toBe(login)
    }
  })

  it('una dirección mal escrita no revienta: da null', () => {
    expect(decodePart('%')).toBeNull()
    expect(decodePart('%E0%A4%A')).toBeNull()
    expect(decodePart('%zz')).toBeNull()
    expect(decodePart('')).toBe('')
  })
})
