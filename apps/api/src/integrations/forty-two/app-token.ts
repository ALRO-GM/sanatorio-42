/**
 * Token de la aplicación (`client_credentials`).
 *
 * Con el `access_token` de la aplicación llega a casi todo lo que necesita la
 * web: proyectos, participantes y perfiles. Solo el login necesita un token de
 * usuario, y ese se pide una vez y se tira (ver `modules/auth/oauth-client.ts`).
 *
 * El token se guarda en memoria y se reutiliza hasta poco antes de caducar:
 * pedir otro cuesta una petición de las 1 200 por hora.
 */

import { ApiError, apiErrorFromNetwork } from './errors.js'

/** El único permiso que pide el token de la aplicación. */
const APP_SCOPE = 'public'

type AppTokenOptions = {
  tokenUrl: string
  uid: string
  secret: string
  userAgent: string
  fetchImpl?: typeof fetch
  /** Margen de seguridad antes de dar el token por caducado, en ms. */
  skewMs?: number
}

type Cached = { token: string; expiresAt: number }

/**
 * Un token por instancia.
 *
 * Si alguien necesita más de uno a la vez (por ejemplo, dos peticiones en
 * paralelo en cold start), la segunda pide el suyo: mejor gastar una petición
 * extra que bloquear a la primera esperando.
 */
export function createAppTokenProvider(options: AppTokenOptions) {
  const fetchImpl = options.fetchImpl ?? fetch
  const skewMs = options.skewMs ?? 60_000

  let cached: Cached | null = null
  let inFlight: Promise<string> | null = null

  async function requestToken(): Promise<Cached> {
    let response: Response

    try {
      response = await fetchImpl(options.tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${options.uid}:${options.secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': options.userAgent,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: options.uid,
          client_secret: options.secret,
          // Solo lectura pública, aunque la app tenga más permisos marcados en la
          // intra: el servidor no necesita nada más (comprobado el 2026-10-16).
          scope: APP_SCOPE,
        }).toString(),
      })
    } catch (cause) {
      throw apiErrorFromNetwork('/oauth/token', cause)
    }

    if (!response.ok) {
      const raw = await response.text()

      throw new ApiError(
        `No se pudo pedir el token de la aplicación (${response.status})`,
        response.status,
        {
          endpoint: '/oauth/token',
          body: { error: raw.slice(0, 200) },
        },
      )
    }

    const parsed: unknown = await response.json()

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('access_token' in parsed) ||
      typeof parsed.access_token !== 'string'
    ) {
      throw new ApiError('La respuesta de /oauth/token no trae access_token', response.status, {
        endpoint: '/oauth/token',
      })
    }

    const expiresIn =
      'expires_in' in parsed && typeof parsed.expires_in === 'number' ? parsed.expires_in : 0

    return { token: parsed.access_token, expiresAt: Date.now() + expiresIn * 1000 - skewMs }
  }

  return {
    async getToken(): Promise<string> {
      if (cached !== null && cached.expiresAt > Date.now()) {
        return cached.token
      }

      // `??=` en vez de `if (inFlight === null)`: pide token solo si no hay
      // ninguna petición en curso, que es justo lo que quiere este código.
      inFlight ??= requestToken()
        .then((result) => {
          cached = result
          return result.token
        })
        .finally(() => {
          inFlight = null
        })

      return inFlight
    },

    /**
     * Tira el token a la basura y pide otro en la próxima llamada.
     *
     * El cliente lo llama cuando la API responde `401`: puede que el token
     * esté caducado antes de tiempo, o que la app de 42 haya cambiado de
     * secreto. En los dos casos, reintentar con uno nuevo es lo único que
     * puede funcionar, así que el reintento se gasta solo.
     */
    invalidate(): void {
      cached = null
    },
  }
}

export type AppTokenProvider = ReturnType<typeof createAppTokenProvider>
