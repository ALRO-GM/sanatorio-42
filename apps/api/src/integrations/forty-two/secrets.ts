/**
 * El secreto de la app de 42 y su relevo.
 *
 * 42 caduca el secreto de una aplicación cada cuatro semanas. Mientras tanto,
 * la intra ya enseña el siguiente («Next secret»), que vale desde el primer día.
 * Con los dos en el entorno, la web cambia sola:
 *
 * - el día de caducidad (`FORTY_TWO_SECRET_EXPIRES`, desde las 00:00 UTC) pasa
 *   a usar el siguiente, que para entonces ya funciona;
 * - y si 42 rechaza el que se está usando (`401` en `/oauth/token`), prueba el
 *   otro sin esperar a la fecha. Así tampoco importa la hora exacta del relevo.
 *
 * Si no hay siguiente, o ya se está usando, el panel de administración avisa:
 * hay que poner el nuevo antes de la próxima caducidad.
 *
 * Los secretos no salen nunca de aquí: el estado solo dice fechas y si hay relevo.
 */

import type { FortyTwoSecretStatus } from '@sanatorio/contracts'

import type { Env } from '../../config/env.js'

type SecretKeeperOptions = {
  secret: string
  /** El «Next secret», o vacío si todavía no hay. */
  next?: string
  /** Último día de validez de `secret` (`YYYY-MM-DD`), o vacío si no se sabe. */
  expiresOn?: string
  now?: () => number
  /** Para dejar rastro de los relevos (nunca con el secreto). */
  log?: (message: string) => void
}

export type SecretKeeper = {
  /** El secreto que toca usar ahora. */
  current(): string
  /**
   * 42 rechazó `used`. Devuelve `true` si hay otro que probar: quien llama
   * repite la petición con `current()`.
   */
  reject(used: string): boolean
  status(): FortyTwoSecretStatus
}

export function createSecretKeeper(options: SecretKeeperOptions): SecretKeeper {
  const next = options.next ?? ''
  const expiresOn = options.expiresOn ?? ''
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  const rejected = new Set<string>()

  const expired = (): boolean => expiresOn !== '' && now() >= Date.parse(`${expiresOn}T00:00:00Z`)

  /** Por orden de preferencia. */
  const order = (): string[] => {
    if (next === '') return [options.secret]

    return expired() ? [next, options.secret] : [options.secret, next]
  }

  const current = (): string => {
    const list = order()

    return list.find((secret) => !rejected.has(secret)) ?? options.secret
  }

  return {
    current,

    reject(used) {
      if (next === '' || rejected.has(used)) return false

      rejected.add(used)
      // Rechazados los dos, no hay nada más que probar.
      const other = order().find((secret) => !rejected.has(secret))

      if (other === undefined) return false

      log(
        other === next
          ? 'secreto de 42 rechazado: se pasa al siguiente'
          : 'secreto siguiente de 42 rechazado: se vuelve al actual',
      )

      return true
    },

    status() {
      const usingNext = next !== '' && current() === next

      return {
        expiresOn: expiresOn === '' ? null : expiresOn,
        hasNext: next !== '' && !usingNext,
        usingNext,
      }
    },
  }
}

/** Un secreto suelto, sin relevo (los tests y quien no lo necesite). */
export const keeperOf = (secret: string | SecretKeeper): SecretKeeper =>
  typeof secret === 'string' ? createSecretKeeper({ secret }) : secret

/** El guardián del entorno: secreto, siguiente y fecha de caducidad. */
export const secretsFromEnv = (
  env: Pick<Env, 'FORTY_TWO_SECRET' | 'FORTY_TWO_NEXT_SECRET' | 'FORTY_TWO_SECRET_EXPIRES'>,
  extra: Pick<SecretKeeperOptions, 'now' | 'log'> = {},
): SecretKeeper =>
  createSecretKeeper({
    secret: env.FORTY_TWO_SECRET,
    next: env.FORTY_TWO_NEXT_SECRET,
    expiresOn: env.FORTY_TWO_SECRET_EXPIRES,
    ...extra,
  })
