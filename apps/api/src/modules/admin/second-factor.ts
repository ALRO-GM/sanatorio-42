/**
 * Segundo factor del panel de gestión.
 *
 * Entrar con 42 y estar en la lista de quien administra ya no basta para el
 * panel: hace falta además el código de una app de autenticación. Una cuenta de
 * 42 robada (o una sesión abierta en un ordenador del cluster) no da el panel.
 *
 * - Darse de alta: se genera un secreto, se enseña en un QR y se confirma con
 *   el primer código. Hasta confirmarlo se puede generar otro.
 * - Cada 12 horas se pide el código. Acertar deja en ese navegador una cookie
 *   firmada (`__Host-sanatorio_admin`) con quién y hasta cuándo: la de otro
 *   navegador, o la de otra persona, no vale.
 * - Cinco fallos en un cuarto de hora y hay que esperar. Un código usado no
 *   vale otra vez.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

import type { SecondFactorStatus } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createRateLimit } from '../../core/rate-limit.js'
import { parse } from '../../core/validation.js'
import { matchStep, newSecret, otpauthUri } from './totp.js'

/** Lo que dura el panel abierto tras escribir el código. */
export const ELEVATION_MS = 12 * 60 * 60_000

export const ELEVATION_COOKIE = '__Host-sanatorio_admin'

/** Fallos que caben antes de tener que esperar, y cuánto. */
const MAX_FAILURES = 5
const FAILURE_WINDOW_MS = 15 * 60_000

const ISSUER = 'Sanatorio 42'

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'escribe las seis cifras') })

export type SecondFactorOptions = {
  db: Db
  /** Secreto del servidor (`SESSION_SECRET`): firma la cookie y cifra los secretos. */
  secret: string
  now?: () => number
}

const base64url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url')

export function createSecondFactor(options: SecondFactorOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const key = createHash('sha256').update(`sanatorio-second-factor:${options.secret}`).digest()
  const failures = createRateLimit({ max: MAX_FAILURES, windowMs: FAILURE_WINDOW_MS, now })

  function seal(plain: Uint8Array): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const body = Buffer.concat([cipher.update(plain), cipher.final()])

    return [iv, cipher.getAuthTag(), body].map(base64url).join('.')
  }

  function open(sealed: string): Uint8Array | null {
    const [iv, tag, body] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'))

    if (iv === undefined || tag === undefined || body === undefined) return null

    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv)

      decipher.setAuthTag(tag)

      return new Uint8Array(Buffer.concat([decipher.update(body), decipher.final()]))
    } catch {
      return null
    }
  }

  const mac = (payload: string): string =>
    createHmac('sha256', key).update(`elevation:${payload}`).digest('base64url')

  /** El valor de la cookie: quién, hasta cuándo y la firma de las dos cosas. */
  function cookieFor(login: string, until: number): string {
    const payload = `${login}.${until}`

    return `${payload}.${mac(payload)}`
  }

  /** Hasta cuándo vale la cookie para esa persona, o `null` si no vale. */
  function untilOf(login: string, cookie: string | undefined): number | null {
    if (cookie === undefined) return null

    const last = cookie.lastIndexOf('.')
    const payload = cookie.slice(0, last)
    const signature = Buffer.from(cookie.slice(last + 1))
    const expected = Buffer.from(mac(payload))
    const [who, until] = [
      payload.slice(0, payload.lastIndexOf('.')),
      Number(payload.split('.').at(-1)),
    ]

    if (
      last <= 0 ||
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected) ||
      who !== login ||
      !Number.isFinite(until) ||
      until <= now()
    ) {
      return null
    }

    return until
  }

  async function row(login: string) {
    const result = await db.execute({
      sql: 'SELECT secret, confirmed_at, used_step FROM admin_second_factor WHERE login = ?',
      args: [login],
    })
    const found = result.rows[0]

    return found === undefined
      ? null
      : {
          secret: toText(found.secret),
          confirmed: found.confirmed_at !== null,
          usedStep: found.used_step === null ? null : toNumber(found.used_step),
        }
  }

  /**
   * Comprueba un código y lo da por usado. Devuelve la cookie del panel.
   *
   * @throws {DomainError} `rate_limited` tras cinco fallos; `invalid_input` si no vale.
   */
  async function check(login: string, input: unknown, confirming: boolean): Promise<string> {
    const { code } = parse(codeSchema, input)
    const stored = await row(login)

    if (stored === null || stored.confirmed === confirming) {
      throw domainError(
        'conflict',
        confirming ? 'Ya está dado de alta' : 'Primero da de alta tu app de autenticación',
      )
    }
    if (!failures.allowed(login)) {
      throw domainError(
        'rate_limited',
        `Demasiados códigos fallidos: espera ${Math.ceil(failures.retryAfter(login) / 60)} min`,
      )
    }

    const secret = open(stored.secret)
    const step = secret === null ? null : matchStep(secret, code, now(), stored.usedStep)

    if (step === null) {
      failures.hit(login)

      throw domainError('invalid_input', 'Ese código no vale (o ya se usó)')
    }

    failures.reset(login)
    await db.execute({
      sql: `UPDATE admin_second_factor SET used_step = ?,
              confirmed_at = COALESCE(confirmed_at, ?) WHERE login = ?`,
      args: [step, new Date(now()).toISOString(), login],
    })

    return cookieFor(login, now() + ELEVATION_MS)
  }

  return {
    /** `true` si esa persona tiene el panel abierto en el navegador de esa cookie. */
    elevated: (login: string, cookie: string | undefined): boolean =>
      untilOf(login, cookie) !== null,

    async status(login: string, cookie: string | undefined): Promise<SecondFactorStatus> {
      const until = untilOf(login, cookie)

      return {
        enrolled: (await row(login))?.confirmed ?? false,
        elevatedUntil: until === null ? null : new Date(until).toISOString(),
      }
    },

    /**
     * Un secreto nuevo para darse de alta, con lo que lleva el QR. Se puede
     * pedir otro mientras no se haya confirmado; después, no.
     */
    async setup(login: string): Promise<{ uri: string }> {
      const stored = await row(login)

      if (stored?.confirmed === true) {
        throw domainError('conflict', 'Ya está dado de alta')
      }

      const secret = newSecret()

      await db.execute({
        sql: `INSERT OR REPLACE INTO admin_second_factor (login, secret, confirmed_at, used_step, created_at)
              VALUES (?, ?, NULL, NULL, ?)`,
        args: [login, seal(secret), new Date(now()).toISOString()],
      })

      return { uri: otpauthUri(ISSUER, login, secret) }
    },

    /** Confirma el alta con el primer código. Devuelve la cookie del panel. */
    confirm: (login: string, input: unknown): Promise<string> => check(login, input, true),

    /** Abre el panel con un código. Devuelve la cookie del panel. */
    verify: (login: string, input: unknown): Promise<string> => check(login, input, false),
  }
}

export type SecondFactor = ReturnType<typeof createSecondFactor>
