/**
 * Cliente de la API de 42.
 *
 * Una sola puerta de entrada a la API: aquí viven el token, el ritmo, los
 * reintentos, los timeouts y la paginación. El resto del backend solo ve
 * funciones tipadas, y ninguna hace `fetch` directamente.
 *
 * Los endpoints que usamos y sus rarezas, todas verificadas contra la API real:
 *
 * | Endpoint                                           | Particularidad |
 * |----------------------------------------------------|----------------|
 * | `/v2/campus/:id/locations?filter[active]=true`     | **Todos** los puestos ocupados del campus, normalmente en una página. Sin el filtro es el histórico (751 077 filas en Madrid). |
 * | `/v2/projects_users?filter[campus]=:id`            | Estado **y** persona en la misma fila. Admite `filter[project_id]`, `filter[status]` y `range[updated_at]`. **Ignora `sort`**: el orden es el que quiera la API. |
 * | `/v2/users/:login/projects_users`                  | Los proyectos de una persona. Solo como último recurso: el login ya los trae en `/v2/me`. |
 * | `/v2/campus`                                       | 54 campus, una página. |
 * | `/v2/me`                                           | Necesita token de **usuario**. Va en `auth/oauth-client.ts`, no aquí. |
 * | `?filter[project_id]=a,b`                          | Solo devuelve los del primer id. Un proyecto por petición. |
 *
 * `range[updated_at]=desde,hasta` es lo que hace barata la réplica: una vez
 * copiado un campus, mantenerlo al día es preguntar "¿qué ha cambiado desde la
 * última vez?", que casi siempre cabe en una petición.
 */

import type { AppTokenProvider } from './app-token.js'
import type { Throttle } from './throttle.js'
import { ApiError, apiErrorFromNetwork, apiErrorFromResponse, endpointFromUrl } from './errors.js'
import type {
  ApiCampus,
  ApiCursusUser,
  ApiEvent,
  ApiEventsUser,
  ApiExam,
  ApiLocation,
  ApiProjectSession,
  ApiProjectUser,
  ApiQuestUser,
  ApiScaleTeam,
  ApiCorrectionPoint,
  ApiExamUser,
} from './types.js'
import { defaultSleep, readInt } from './headers.js'

/** Configuración del cliente. */
type FortyTwoClientOptions = {
  /** Raíz de la API v2, con barra final. */
  apiV2Base: string
  /** `User-Agent` de la aplicación. */
  userAgent: string
  /** Timeout de cada petición. */
  timeoutMs: number
  /** Peticiones por página. Máximo de la API: 100. */
  pageSize: number
  /** Ritmo de las peticiones, guiado por las cabeceras de cuota de la API. */
  throttle: Throttle
  /** Token de la aplicación. */
  tokens: AppTokenProvider
  /** `fetch` inyectable, para los tests. */
  fetchImpl?: typeof fetch
  /** Intentos antes de rendirse, sin contar el primero. */
  maxRetries?: number
  /** Base del backoff exponencial, en milisegundos. */
  backoffBaseMs?: number
  /** Tope del backoff, para no esperar minutos. */
  backoffMaxMs?: number
  /** `sleep` inyectable, para no esperar de verdad en los tests. */
  sleep?: (ms: number) => Promise<void>
}

const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BACKOFF_BASE_MS = 500
const DEFAULT_BACKOFF_MAX_MS = 10_000

/** Principio de los tiempos, para un `range[updated_at]` sin límite inferior. */
const EPOCH = '1970-01-01T00:00:00.000Z'

/** Filtros de `getCampusProjectUsersPage`. */
type ProjectUsersQuery = {
  campusId: number
  projectId?: number | undefined
  /** `in_progress`, `finished`… Un solo valor: la API no combina varios. */
  status?: string | undefined
  /** Límites de `updated_at`, en ISO-8601. Ambos incluidos. */
  updatedFrom?: string | undefined
  updatedTo?: string | undefined
  page?: number | undefined
}

/** Filtros de `getCampusScaleTeamsPage`. */
type ScaleTeamsQuery = {
  campusId: number
  /** Solo las de id mayor que este, ordenadas por id. */
  afterId?: number | undefined
  /** Límites de `updated_at`, en ISO-8601. Van los dos o ninguno. */
  updatedFrom?: string | undefined
  updatedTo?: string | undefined
  page?: number | undefined
}

/** El 42cursus. Las correcciones de la piscina no interesan. */
const CORE_CURSUS_ID = 21

/** Tope superior de un `range[id]` abierto. */
const MAX_ID = 2_000_000_000

/** Tope de elementos acumulados al paginar. Cinturón de seguridad. */
const MAX_ITEMS = 20_000

/** Una página de resultados, con los metadatos que manda la API en las cabeceras. */
type Page<T> = {
  items: T[]
  /** Registros por página que dice la API. */
  perPage: number
  /**
   * Número **total de registros**, no de páginas.
   *
   * La documentación oficial dice lo contrario ("count of pages") pero su propio
   * ejemplo la desmiente: con `X-Total: 17570`, `X-Per-Page: 30` y
   * `rel="last"` apuntando a la página 586. Y 17 570 / 30 redondeado hacia
   * arriba da exactamente 586. Comprobado también con datos reales:
   * `?filter[project_id]=2689&per_page=100` devuelve `X-Total: 2047` y
   * `rel="last"` en la página 21.
   */
  total: number
}

/** El único sitio del que se bajan fotos. */
const CDN_HOST = 'cdn.intra.42.fr'

/** Lo que se acepta como foto: lo que sube la gente a la intra. */
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/** Una foto `medium` pesa unas decenas de kB; un original de móvil, megas. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

export class FortyTwoClient {
  private readonly apiV2Base: string
  private readonly userAgent: string
  private readonly timeoutMs: number
  private readonly pageSize: number
  private readonly throttle: Throttle
  private readonly tokens: AppTokenProvider
  private readonly fetchImpl: typeof fetch
  private readonly maxRetries: number
  private readonly backoffBaseMs: number
  private readonly backoffMaxMs: number
  private readonly sleep: (ms: number) => Promise<void>
  private requests = 0

  constructor(options: FortyTwoClientOptions) {
    this.apiV2Base = options.apiV2Base
    this.userAgent = options.userAgent
    this.timeoutMs = options.timeoutMs
    this.pageSize = options.pageSize
    this.throttle = options.throttle
    this.tokens = options.tokens
    this.fetchImpl = options.fetchImpl ?? fetch
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.backoffBaseMs = options.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS
    this.backoffMaxMs = options.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS
    this.sleep = options.sleep ?? defaultSleep
  }

  // --- Endpoints ----------------------------------------------------------

  /**
   * `GET /v2/campus/:id/locations?filter[active]=true`, **una página**.
   *
   * Cada fila es un puesto ocupado ahora mismo, con la persona anidada. Un
   * sábado por la tarde Madrid son 27 filas; un martes a mediodía, unas 300.
   */
  async getActiveLocationsPage(campusId: number, page = 1): Promise<Page<ApiLocation>> {
    return this.requestPage<ApiLocation>(
      `/campus/${campusId}/locations?filter[active]=true&page=${page}&per_page=${this.pageSize}`,
    )
  }

  /**
   * `GET /v2/projects_users?filter[campus]=:id…`, **una página**.
   *
   * Es la llamada que alimenta la réplica. Cada fila trae `status`,
   * `validated?`, `project { id, name }` y el `user` anidado con su avatar.
   *
   * Los filtros se combinan: por proyecto (cuando alguien abre uno que aún no
   * está copiado), por estado (para copiar primero a quien lo está haciendo) y
   * por fecha de modificación (para pedir solo lo nuevo).
   *
   * No hay parámetro de orden porque la API lo ignora en este endpoint: quien
   * pagine tiene que hacerlo sobre un conjunto que no cambie (una ventana de
   * `range[updated_at]` ya pasada), no fiarse de "lo siguiente".
   */
  async getCampusProjectUsersPage(query: ProjectUsersQuery): Promise<Page<ApiProjectUser>> {
    const params = [`filter[campus]=${query.campusId}`]

    if (query.projectId !== undefined) {
      params.push(`filter[project_id]=${query.projectId}`)
    }
    if (query.status !== undefined) {
      params.push(`filter[status]=${encodeURIComponent(query.status)}`)
    }
    if (query.updatedFrom !== undefined || query.updatedTo !== undefined) {
      const from = query.updatedFrom ?? EPOCH
      const to = query.updatedTo ?? new Date().toISOString()
      params.push(`range[updated_at]=${from},${to}`)
    }
    params.push(`page=${query.page ?? 1}`, `per_page=${this.pageSize}`)

    return this.requestPage<ApiProjectUser>(`/projects_users?${params.join('&')}`)
  }

  /** `GET /v2/campus`: el catálogo de campus. 54 filas, una página. */
  async getCampuses(): Promise<ApiCampus[]> {
    return this.fetchAllPages<ApiCampus>('/campus?sort=id')
  }

  /**
   * `GET /v2/scale_teams` de un campus en el 42cursus, **una página**.
   *
   * Dos formas de pedirlo, las dos comprobadas contra la API real:
   *
   *  - `afterId`: ordenado por id a partir de uno dado. Sirve para copiar todo
   *    de una vez y poder seguir donde se dejó.
   *  - `updatedFrom`/`updatedTo`: lo que ha cambiado en una ventana. Sirve para
   *    mantenerlo al día (correcciones nuevas y las que por fin tienen nota).
   */
  async getCampusScaleTeamsPage(query: ScaleTeamsQuery): Promise<Page<ApiScaleTeam>> {
    const params = [`filter[campus_id]=${query.campusId}`, `filter[cursus_id]=${CORE_CURSUS_ID}`]

    if (query.afterId !== undefined) {
      params.push('sort=id', `range[id]=${query.afterId + 1},${MAX_ID}`)
    }
    if (query.updatedFrom !== undefined && query.updatedTo !== undefined) {
      params.push(`range[updated_at]=${query.updatedFrom},${query.updatedTo}`)
    }
    params.push(`page=${query.page ?? 1}`, `per_page=${this.pageSize}`)

    return this.requestPage<ApiScaleTeam>(`/scale_teams?${params.join('&')}`)
  }

  /** `GET /v2/users/:id/cursus_users`: nivel, inicio y black hole en cada cursus. */
  async getUserCursus(userId: number): Promise<ApiCursusUser[]> {
    return this.fetchAllPages<ApiCursusUser>(`/users/${userId}/cursus_users`)
  }

  /**
   * `GET /v2/users/:id/correction_point_historics`: cómo han cambiado sus
   * puntos de evaluación. Para saber cuántos ha donado a la bolsa.
   */
  async getCorrectionPoints(userId: number): Promise<ApiCorrectionPoint[]> {
    return this.fetchAllPages<ApiCorrectionPoint>(`/users/${userId}/correction_point_historics`)
  }

  /** `GET /v2/users/:id/quests_users`: los hitos de alguien (rangos del common core, plan). */
  async getUserQuests(userId: number): Promise<ApiQuestUser[]> {
    return this.fetchAllPages<ApiQuestUser>(`/users/${userId}/quests_users`)
  }

  /**
   * `GET /v2/project_sessions` de un campus en el 42cursus: todos sus proyectos,
   * con las horas estimadas. Son un par de páginas.
   */
  async getProjectSessions(campusId: number): Promise<ApiProjectSession[]> {
    return this.fetchAllPages<ApiProjectSession>(
      `/project_sessions?filter[campus_id]=${campusId}&filter[cursus_id]=21`,
    )
  }

  // --- Agenda: eventos, exámenes y correcciones ---------------------------------

  /** `GET /v2/campus/:id/events`: los eventos de un campus que empiezan en ese intervalo. */
  async getCampusEvents(campusId: number, from: string, to: string): Promise<ApiEvent[]> {
    return this.fetchAllPages<ApiEvent>(
      `/campus/${campusId}/events?range[begin_at]=${from},${to}&sort=begin_at`,
    )
  }

  /** `GET /v2/campus/:id/exams`: los exámenes de un campus en ese intervalo. */
  async getCampusExams(campusId: number, from: string, to: string): Promise<ApiExam[]> {
    return this.fetchAllPages<ApiExam>(
      `/campus/${campusId}/exams?range[begin_at]=${from},${to}&sort=begin_at`,
    )
  }

  /**
   * `GET /v2/users/:id/events_users`: las últimas inscripciones de alguien.
   *
   * Solo la primera página, de las más recientes: lo que interesa es a qué
   * eventos próximos está apuntado, no su historial.
   */
  async getUserEventsUsers(userId: number): Promise<ApiEventsUser[]> {
    const page = await this.requestPage<ApiEventsUser>(
      `/users/${userId}/events_users?sort=-id&page=1&per_page=${this.pageSize}`,
    )

    return page.items
  }

  /** `GET /v2/exams/:id/exams_users`: quién está apuntado a un examen. */
  async getExamUsers(examId: number): Promise<ApiExamUser[]> {
    return this.fetchAllPages<ApiExamUser>(`/exams/${examId}/exams_users`)
  }

  /** `GET /v2/users/:id/exams`: los exámenes a los que alguien está apuntado, en ese intervalo. */
  async getUserExams(userId: number, from: string, to: string): Promise<ApiExam[]> {
    return this.fetchAllPages<ApiExam>(`/users/${userId}/exams?range[begin_at]=${from},${to}`)
  }

  /** `GET /v2/users/:id/scale_teams`: sus correcciones concertadas en ese intervalo. */
  async getUserScaleTeams(userId: number, from: string, to: string): Promise<ApiScaleTeam[]> {
    return this.fetchAllPages<ApiScaleTeam>(
      `/users/${userId}/scale_teams?range[begin_at]=${from},${to}`,
    )
  }

  /**
   * `GET /v2/users/:login/projects_users`: los proyectos de una persona.
   *
   * Son una o dos páginas (alguien con 40 proyectos cabe en una de 100), así que
   * aquí sí se recorre entera. Solo se usa si el perfil del login no los traía.
   */
  async getUserProjects(login: string): Promise<ApiProjectUser[]> {
    return this.fetchAllPages<ApiProjectUser>(`/users/${encodeURIComponent(login)}/projects_users`)
  }

  /**
   * Una foto de perfil de la CDN de 42 (`cdn.intra.42.fr`).
   *
   * Desde octubre de 2026 la CDN contesta 403 a quien no lleva sesión de la
   * intra: el navegador solo ve las fotos si tiene la intra abierta. Con el token
   * de la aplicación sí las da. No pasa por el ritmo de la API: la CDN no cuenta
   * en la cuota de peticiones (no manda sus cabeceras).
   *
   * @throws {ApiError} Si la dirección no es de la CDN, 42 no la da o lo que
   *   llega no es una imagen razonable.
   */
  async getCdnImage(url: string): Promise<{ type: string; body: Uint8Array }> {
    const endpoint = 'cdn.intra.42.fr'
    let parsed: URL

    try {
      parsed = new URL(url)
    } catch {
      throw new ApiError('Dirección de foto no válida', 0, { endpoint, code: 'bad_request' })
    }
    // Solo la CDN de 42: lo que venga en `image` no debe servir para pedir
    // cualquier cosa desde el servidor.
    if (parsed.protocol !== 'https:' || parsed.hostname !== CDN_HOST) {
      throw new ApiError('La foto no es de la CDN de 42', 0, { endpoint, code: 'bad_request' })
    }

    const token = await this.tokens.getToken()
    let response: Response

    try {
      response = await this.fetchImpl(parsed.href, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': this.userAgent },
        redirect: 'error',
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (cause) {
      throw apiErrorFromNetwork(endpoint, cause)
    }

    if (!response.ok) {
      throw apiErrorFromResponse(response.status, endpoint, '', response.headers)
    }

    const type = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''

    if (!IMAGE_TYPES.has(type)) {
      throw new ApiError(`La CDN no ha dado una imagen (${type})`, 0, {
        endpoint,
        code: 'bad_request',
      })
    }

    const body = new Uint8Array(await response.arrayBuffer())

    if (body.byteLength === 0 || body.byteLength > MAX_IMAGE_BYTES) {
      throw new ApiError('Foto vacía o demasiado grande', 0, { endpoint, code: 'bad_request' })
    }

    return { type, body }
  }

  // --- Cuota ---------------------------------------------------------------

  /** Peticiones que quedan esta hora según la última respuesta, o `undefined`. */
  hourlyRemaining(): number | undefined {
    return this.throttle.hourlyRemaining()
  }

  /** Peticiones hechas por esta instancia desde que arrancó, reintentos incluidos. */
  requestCount(): number {
    return this.requests
  }

  /** Tamaño de página con el que pide este cliente. */
  perPage(): number {
    return this.pageSize
  }

  // --- Paginación ---------------------------------------------------------

  /**
   * Recorre todas las páginas de un endpoint y devuelve la lista completa.
   *
   * El corte es por tamaño: si una página viene con menos elementos de los
   * pedidos, es la última. Con `per_page=100` y menos de 100 elementos se ahorra
   * una petición inútil.
   */
  private async fetchAllPages<T>(path: string): Promise<T[]> {
    const collected: T[] = []

    for (let page = 1; ; page += 1) {
      const separator = path.includes('?') ? '&' : '?'
      const result = await this.requestPage<T>(
        `${path}${separator}page=${page}&per_page=${this.pageSize}`,
      )
      collected.push(...result.items)

      if (result.items.length < this.pageSize || collected.length > MAX_ITEMS) {
        return collected
      }
    }
  }

  /** Una petición que devuelve un array, leyendo los metadatos de las cabeceras. */
  private async requestPage<T>(path: string): Promise<Page<T>> {
    const url = `${this.apiV2Base}${path}`
    const { body, headers } = await this.requestWithRetries(url)

    if (!Array.isArray(body)) {
      throw new ApiError(`${endpointFromUrl(url)} no ha devuelto una lista`, 200, {
        endpoint: endpointFromUrl(url),
        code: 'bad_request',
      })
    }

    return {
      items: body as T[],
      perPage: readInt(headers, 'x-per-page') ?? this.pageSize,
      // Si la API no manda la cabecera, se asume que lo que ha venido es todo.
      total: readInt(headers, 'x-total') ?? (body as T[]).length,
    }
  }

  // --- Petición -----------------------------------------------------------

  /** Una petición con reintentos, que devuelve cuerpo y cabeceras. */
  private async requestWithRetries(url: string): Promise<{ body: unknown; headers: Headers }> {
    const endpoint = endpointFromUrl(url)
    let lastError: ApiError | null = null

    for (let attempt = 0; ; attempt += 1) {
      // Cada intento pasa por el ritmo: los reintentos también cuentan, y saltarse
      // el control aquí convertiría un 503 en un 429.
      await this.throttle.before()
      this.requests += 1

      try {
        const response = await this.fetchOnce(url)

        if (!response.ok) {
          throw apiErrorFromResponse(
            response.status,
            endpoint,
            await response.text(),
            response.headers,
          )
        }

        return { body: await response.json(), headers: response.headers }
      } catch (cause) {
        if (!(cause instanceof ApiError)) {
          throw cause
        }

        lastError = cause

        // Aunque la respuesta sea un error, las cabeceras de cuota vienen igual,
        // y son las que dicen cuándo se podrá volver a pedir.
        if (cause.headers !== undefined) {
          this.throttle.observe(cause.headers)
        }

        // Un 401 con token de app no se arregla reintentando. Se descarta el
        // token por si estuviera caducado, pero se da por perdido el intento.
        if (cause.status === 401) {
          this.tokens.invalidate()
        }

        if (!cause.retryable || attempt >= this.maxRetries) {
          throw cause
        }

        await this.sleep(this.backoffFor(attempt, cause.retryAfterSeconds))
      }
    }

    // El bucle de arriba siempre devuelve o lanza; esto es solo para que el
    // compilador no se queje de una ruta de retorno imposible.
    throw (
      lastError ??
      new ApiError('Petición fallida sin error', 0, { endpoint, code: 'network_error' })
    )
  }

  /** Un intento de `fetch`, con timeout. */
  private async fetchOnce(url: string): Promise<Response> {
    const token = await this.tokens.getToken()

    try {
      const response = await this.fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      })

      this.throttle.observe(response.headers)

      return response
    } catch (cause) {
      // `AbortSignal.timeout` lanza un `TimeoutError`. Lo mapeamos al error
      // tipado para que el reintento y los logs lo traten como timeout.
      throw apiErrorFromNetwork(endpointFromUrl(url), cause)
    }
  }

  /**
   * Cuánto esperar antes del siguiente intento.
   *
   * Si la API mandó `Retry-After`, se hace caso: es ella quien sabe cuándo
   * termina el límite. Si no, backoff exponencial con un tope, porque esperar
   * 2^n sin tope puede pasar de 10 s a horas.
   */
  private backoffFor(attempt: number, retryAfterSeconds: number | undefined): number {
    if (retryAfterSeconds !== undefined) {
      return Math.min(retryAfterSeconds * 1000, this.backoffMaxMs)
    }
    const exponential = this.backoffBaseMs * 2 ** attempt
    // Un poco de dispersión: si varias peticiones fallan a la vez, no se vuelven
    // a caer a la vez.
    const jitter = Math.random() * this.backoffBaseMs

    return Math.min(exponential + jitter, this.backoffMaxMs)
  }
}
