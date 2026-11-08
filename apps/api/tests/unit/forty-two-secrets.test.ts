/**
 * Tests del relevo del secreto de 42: el cambio por fecha, el cambio al ser
 * rechazado y lo que se cuenta al panel.
 */

import { describe, expect, it } from 'vitest'

import { createAppTokenProvider } from '../../src/integrations/forty-two/app-token.js'
import { createSecretKeeper } from '../../src/integrations/forty-two/secrets.js'
import { createOAuthClient } from '../../src/modules/auth/oauth-client.js'
import { createFakeFetch } from '../helpers/fake-api.js'

const DAY = Date.parse('2026-12-06T00:00:00Z')

const secretOf = (init: RequestInit | undefined): string | null =>
  new URLSearchParams(typeof init?.body === 'string' ? init.body : '').get('client_secret')

describe('relevo del secreto de 42', () => {
  it('usa el actual hasta el día de caducidad y el siguiente desde ese día', () => {
    let now = DAY - 1
    const keeper = createSecretKeeper({
      secret: 'viejo',
      next: 'nuevo',
      expiresOn: '2026-12-06',
      now: () => now,
    })

    expect(keeper.current()).toBe('viejo')
    expect(keeper.status()).toEqual({ expiresOn: '2026-12-06', hasNext: true, usingNext: false })

    now = DAY
    expect(keeper.current()).toBe('nuevo')
    expect(keeper.status()).toEqual({ expiresOn: '2026-12-06', hasNext: false, usingNext: true })
  })

  it('sin siguiente avisa y no tiene a qué cambiar', () => {
    const keeper = createSecretKeeper({ secret: 'solo', expiresOn: '2026-12-06' })

    expect(keeper.status().hasNext).toBe(false)
    expect(keeper.reject('solo')).toBe(false)
    expect(keeper.current()).toBe('solo')
  })

  it('si 42 rechaza el actual, pasa al siguiente una sola vez', () => {
    const log: string[] = []
    const keeper = createSecretKeeper({
      secret: 'viejo',
      next: 'nuevo',
      now: () => DAY,
      log: (line) => log.push(line),
    })

    expect(keeper.reject('viejo')).toBe(true)
    expect(keeper.current()).toBe('nuevo')
    expect(keeper.reject('nuevo')).toBe(false)
    expect(log).toHaveLength(1)
    expect(log.join()).not.toContain('nuevo')
  })

  it('el token de la aplicación reintenta con el siguiente tras un 401', async () => {
    const fake = createFakeFetch([
      { status: 401, body: { error: 'invalid_client' } },
      { body: { access_token: 'token-ok', expires_in: 7200 } },
    ])
    const tokens = createAppTokenProvider({
      tokenUrl: 'https://api.intra.42.fr/oauth/token',
      uid: 'u-test',
      secret: createSecretKeeper({ secret: 'viejo', next: 'nuevo' }),
      userAgent: 'test/1.0',
      fetchImpl: fake.fetchImpl,
    })

    expect(await tokens.getToken()).toBe('token-ok')
    expect(fake.calls.map((call) => secretOf(call.init))).toEqual(['viejo', 'nuevo'])
  })

  it('el login reintenta el canje con el siguiente tras un 401', async () => {
    const fake = createFakeFetch([
      { status: 401, body: { error: 'invalid_client' } },
      { body: { access_token: 'token-user' } },
    ])
    const oauth = createOAuthClient({
      authorizeUrl: 'https://api.intra.42.fr/oauth/authorize',
      tokenUrl: 'https://api.intra.42.fr/oauth/token',
      clientId: 'u-test',
      clientSecret: createSecretKeeper({ secret: 'viejo', next: 'nuevo' }),
      redirectUri: 'http://localhost/callback',
      userAgent: 'test/1.0',
      fetchImpl: fake.fetchImpl,
    })

    expect((await oauth.exchangeCode({ code: 'abc' })).access_token).toBe('token-user')
    expect(fake.calls.map((call) => secretOf(call.init))).toEqual(['viejo', 'nuevo'])
  })
})
