/**
 * Transporte HTTP contra la API. Usa la cookie de sesión.
 */

import type { ErrorBody } from '@sanatorio/contracts'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Cuánto se espera antes de rendir la petición.
 *
 * Una API caída se cuelga indefinidamente. Este tope convierte el cuelgue en un
 * error visible, que es lo único que la web sabe mostrar.
 */
const TIMEOUT_MS = 15_000

/**
 * Error de una llamada a la API.
 *
 * `network` es `true` si no hubo respuesta (sin servidor, sin red o timeout) y
 * `status` trae el código si el servidor respondió con un error. Esa distinción
 * es la que permite decir "no puedes entrar" (401) sin confundirlo con "no hay
 * servidor".
 */
export class ApiError extends Error {
  readonly network: boolean
  readonly status: number | undefined
  /** Motivo que explica el servidor ("El grupo está completo"), en español. */
  readonly serverMessage: string | undefined

  constructor(
    message: string,
    details: { network?: boolean; status?: number; serverMessage?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'ApiError'
    this.network = details.network ?? false
    this.status = details.status
    this.serverMessage = details.serverMessage
  }
}

/** Quien quiere saber que la API ha cerrado por mantenimiento (`docs/mantenimiento.md`). */
const maintenanceListeners = new Set<(until: string | null) => void>()

/**
 * Avisa cuando una respuesta dice que la web está en mantenimiento (un `503`
 * con `error: 'maintenance'`): así se pasa a la pantalla de mantenimiento
 * desde cualquier petición, sin preguntar aparte. Devuelve cómo dejar de oír.
 */
export function onMaintenance(listener: (until: string | null) => void): () => void {
  maintenanceListeners.add(listener)

  return () => {
    maintenanceListeners.delete(listener)
  }
}

/** URL completa de una ruta de la API, para las navegaciones (login). */
export function apiUrl(path: string): string {
  return BASE + path
}

/** Una petición ya comprobada: devuelve la respuesta o lanza `ApiError`. */
export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  // El idioma de la web (lo pone el proveedor de textos en <html lang>), para
  // lo que llega ya escrito del servidor, como las preguntas de Not-games.
  const headers = new Headers(init.headers)

  headers.set(
    'x-lang',
    typeof document === 'undefined' ? 'es' : document.documentElement.lang || 'es',
  )

  try {
    response = await fetch(BASE + path, {
      credentials: 'include',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...init,
      headers,
    })
  } catch (cause) {
    throw new ApiError('No se puede conectar con el servidor', { network: true, cause })
  }

  if (!response.ok) {
    let serverMessage: string | undefined

    try {
      const body = (await response.json()) as Partial<ErrorBody> & { until?: string | null }

      serverMessage = body.message
      if (response.status === 503 && body.error === 'maintenance') {
        for (const listener of maintenanceListeners) listener(body.until ?? null)
      }
    } catch {
      // Sin cuerpo legible: se queda el código de estado.
    }

    throw new ApiError(`${response.status} ${response.statusText}`, {
      status: response.status,
      ...(serverMessage === undefined ? {} : { serverMessage }),
    })
  }

  return response
}

/** `GET` (o lo que diga `init`) que devuelve JSON. */
export async function getJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await (await fetchApi(path, init)).json()) as T
}

/** Petición con cuerpo JSON que devuelve JSON. */
export function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  return getJson<T>(path, jsonInit(method, body))
}

/** Petición de la que no se espera cuerpo (`204`). */
export async function send(method: string, path: string, body?: unknown): Promise<void> {
  await fetchApi(path, jsonInit(method, body))
}

function jsonInit(method: string, body: unknown): RequestInit {
  return body === undefined
    ? { method }
    : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

/** Un entero de cabecera, o `null` si no viene. */
export function intHeader(response: Response, name: string): number | null {
  const raw = response.headers.get(name)

  if (raw === null || raw.trim() === '') {
    return null
  }

  const value = Number(raw)

  return Number.isNaN(value) ? null : value
}
