import { describe, expect, it } from 'vitest'

import {
  decodePart,
  externalHref,
  intraHref,
  networkHref,
  progressHref,
  readProgressPreset,
  recordHref,
} from '../src/shared/links'

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

describe('direcciones de fuera', () => {
  it('solo pasan las https', () => {
    expect(externalHref('https://profile.intra.42.fr/events/1')).toBe(
      'https://profile.intra.42.fr/events/1',
    )

    for (const url of [
      null,
      'javascript:alert(1)',
      'JavaScript:x',
      'http://x',
      'data:text/html,x',
      '//x',
    ]) {
      expect(externalHref(url), String(url)).toBeNull()
    }
  })
})

describe('el Avance con opciones', () => {
  const health = (plan: 'classic' | 'next') =>
    progressHref({
      plan: [plan],
      pop: ['current', 'blackholed'],
      scope: ['campus'],
      paces: true,
      me: true,
    })

  it('el enlace del estado de salud, para C y para Python', () => {
    expect(health('classic')).toBe(
      '#/avance?plan=c&pop=current,blackholed&scope=campus&paces=1&me=1',
    )
    expect(health('next')).toBe(
      '#/avance?plan=python&pop=current,blackholed&scope=campus&paces=1&me=1',
    )
    expect(progressHref()).toBe('#/avance')
  })

  it('se lee lo que se entiende; lo demás, fuera', () => {
    expect(readProgressPreset(health('next'))).toEqual({
      plan: ['next'],
      pop: ['current', 'blackholed'],
      scope: ['campus'],
      paces: true,
      me: true,
      range: undefined,
    })
    // `active` es «en curso + terminado»; lo raro no se cuela.
    expect(readProgressPreset('#/avance?pop=active,zzz&plan=java&range=8')).toMatchObject({
      pop: ['current'],
      plan: undefined,
      range: '8',
    })
    expect(readProgressPreset('#/avance')).toBeNull()
    expect(readProgressPreset('#/red?plan=c')).toBeNull()
    expect(readProgressPreset('#/avance?x=1')).toBeNull()
  })
})
