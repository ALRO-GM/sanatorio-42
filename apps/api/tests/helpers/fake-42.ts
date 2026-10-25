/**
 * Una API de 42 en miniatura, para probar la sincronización.
 *
 * No devuelve respuestas enlatadas: guarda filas y **aplica los filtros** como
 * la API real (`filter[campus]`, `filter[project_id]`, `filter[status]`,
 * `range[updated_at]`, paginación). Así los tests comprueban lo que importa del
 * sincronizador, que es que con esas herramientas acabe copiándolo todo.
 *
 * Dos rarezas de la API real que se reproducen a propósito:
 *
 * - **ignora `sort`**: las filas salen en el orden en que se guardaron, que aquí
 *   es deliberadamente distinto del cronológico;
 * - manda en cada respuesta cuántas peticiones quedan en la hora.
 */

import { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import { createThrottle } from '../../src/integrations/forty-two/throttle.js'
import type {
  ApiLocation,
  ApiProjectUser,
  ApiCursusUser,
  ApiEvent,
  ApiExam,
  ApiQuestUser,
  ApiScaleTeam,
} from '../../src/integrations/forty-two/types.js'
import { createFakeSleep, stubAppTokens } from './fake-api.js'

export type Fake42 = {
  client: FortyTwoClient
  /** Filas de `projects_users` por campus. Se pueden tocar entre peticiones. */
  rows: Map<number, ApiProjectUser[]>
  /** Puestos ocupados por campus. */
  locations: Map<number, ApiLocation[]>
  /** Hitos (rangos, plan) por id de persona. */
  quests: Map<number, ApiQuestUser[]>
  /** Paso por cada cursus, por id de persona. */
  cursus: Map<number, ApiCursusUser[]>
  /** Correcciones por campus. `updated_at` solo lo usa el filtro de novedades. */
  scaleTeams: Map<number, (ApiScaleTeam & { updated_at?: string })[]>
  /** Historial de puntos de evaluación, por id de persona. */
  points: Map<
    number,
    { id: number; reason: string; sum: number; total: number; created_at: string }[]
  >
  /** Eventos y exámenes de cada campus (`/campus/:id/events` y `/exams`), sin filtrar por fecha. */
  events: Map<number, ApiEvent[]>
  exams: Map<number, ApiExam[]>
  /** Rutas pedidas, en orden, sin el host. */
  calls: string[]
  /** Lo que dirá `x-hourly-ratelimit-remaining` en la próxima respuesta. */
  hourlyRemaining: number
  /** Si se pone, la próxima petición a una ruta que lo contenga falla con ese status. */
  failOn: { match: string; status: number } | null
}

export function createFake42(pageSize = 2): Fake42 {
  const state: Fake42 = {
    client: undefined as unknown as FortyTwoClient,
    rows: new Map(),
    locations: new Map(),
    quests: new Map(),
    cursus: new Map(),
    scaleTeams: new Map(),
    points: new Map(),
    events: new Map(),
    exams: new Map(),
    calls: [],
    hourlyRemaining: 1200,
    failOn: null,
  }

  const fetchImpl = (async (input: Parameters<typeof fetch>[0]) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw)
    const path = url.pathname.replace(/^\/v2/, '')
    state.calls.push(`${path}${decodeURIComponent(url.search)}`)

    const headers = {
      'content-type': 'application/json',
      'x-secondly-ratelimit-remaining': '2',
      'x-hourly-ratelimit-remaining': String(state.hourlyRemaining),
    }

    if (state.failOn !== null && raw.includes(state.failOn.match)) {
      return new Response('{}', { status: state.failOn.status, headers })
    }

    let items: unknown[] = []
    const campusLocations = /^\/campus\/(\d+)\/locations$/.exec(path)
    const campusAgenda = /^\/campus\/(\d+)\/(events|exams)$/.exec(path)

    if (campusLocations !== null) {
      items = state.locations.get(Number(campusLocations[1])) ?? []
    } else if (campusAgenda !== null) {
      items =
        (campusAgenda[2] === 'events' ? state.events : state.exams).get(Number(campusAgenda[1])) ??
        []
    } else if (path === '/projects_users') {
      const range = url.searchParams.get('range[updated_at]')?.split(',')
      const projectId = url.searchParams.get('filter[project_id]')
      const status = url.searchParams.get('filter[status]')

      items = (state.rows.get(Number(url.searchParams.get('filter[campus]'))) ?? []).filter(
        (row) =>
          (projectId === null || row.project?.id === Number(projectId)) &&
          (status === null || row.status === status) &&
          (range === undefined ||
            ((row.updated_at ?? '') >= (range[0] ?? '') &&
              (row.updated_at ?? '') <= (range[1] ?? ''))),
      )
    } else if (/^\/users\/\d+\/quests_users$/.test(path)) {
      items = state.quests.get(Number(path.split('/')[2])) ?? []
    } else if (/^\/users\/\d+\/correction_point_historics$/.test(path)) {
      items = state.points.get(Number(path.split('/')[2])) ?? []
    } else if (/^\/users\/\d+\/cursus_users$/.test(path)) {
      items = state.cursus.get(Number(path.split('/')[2])) ?? []
    } else if (path === '/scale_teams') {
      const ids = url.searchParams.get('range[id]')?.split(',').map(Number)
      const updated = url.searchParams.get('range[updated_at]')?.split(',')

      items = (state.scaleTeams.get(Number(url.searchParams.get('filter[campus_id]'))) ?? [])
        .filter(
          (row) =>
            (ids === undefined || (row.id >= (ids[0] ?? 0) && row.id <= (ids[1] ?? Infinity))) &&
            (updated === undefined ||
              ((row.updated_at ?? '') >= (updated[0] ?? '') &&
                (row.updated_at ?? '') <= (updated[1] ?? ''))),
        )
        .sort((a, b) => a.id - b.id)
    } else if (path === '/campus') {
      items = [{ id: 22, name: 'Madrid', time_zone: 'Europe/Madrid' }]
    }

    const page = Number(url.searchParams.get('page') ?? '1')
    const perPage = Number(url.searchParams.get('per_page') ?? '30')

    return new Response(JSON.stringify(items.slice((page - 1) * perPage, page * perPage)), {
      status: 200,
      headers: { ...headers, 'x-total': String(items.length), 'x-per-page': String(perPage) },
    })
  }) as typeof fetch

  const { sleep } = createFakeSleep()

  state.client = new FortyTwoClient({
    apiV2Base: 'https://api.intra.42.fr/v2',
    userAgent: 'test/1.0',
    timeoutMs: 1_000,
    pageSize,
    maxRetries: 0,
    throttle: createThrottle({ minIntervalMs: 0, sleep }),
    tokens: stubAppTokens().provider,
    fetchImpl,
    sleep,
  })

  return state
}
