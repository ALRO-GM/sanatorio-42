/**
 * Sincronizador: copia 42 poco a poco y gasta peticiones solo donde importa.
 *
 * La API da 1 200 peticiones por hora. La web no puede permitirse pedirle nada
 * en cada visita, así que aquí se decide **qué** se pide, **cuándo** y **con qué
 * prioridad**. Hay cinco tareas, de más a menos urgente:
 *
 * | Tarea        | Qué pide                                              | Coste              | Cadencia |
 * |--------------|-------------------------------------------------------|--------------------|----------|
 * | Puestos      | `/campus/:id/locations?filter[active]=true`           | 1-4 peticiones     | 2 min con gente, 15 min sin nadie |
 * | Proyecto     | `projects_users` de **un** proyecto y campus          | 1-3 peticiones     | una vez, al abrirlo, si el campus aún no está copiado |
 * | Cambios      | `projects_users?range[updated_at]=<cursor>,<ahora>`   | casi siempre 1     | 5 min con gente, 30 min sin nadie |
 * | Catálogo     | `/campus`                                             | 1 petición         | semanal |
 * | Relleno      | `projects_users` del campus, por ventanas de tiempo   | 1 por paso         | cada 5 s hasta acabar, una sola vez |
 *
 * Con el campus ya copiado, una hora con gente son unas 50-130 peticiones; en
 * reposo, unas 10. El relleno inicial de Madrid (156 671 filas) son ~1 600
 * peticiones repartidas en algo más de dos horas.
 *
 * Dos formas de avanzar, que comparten todo el código:
 *
 * - `start()` arranca un bucle que llama a `tick()`. Es lo que usa `main.ts`
 *   en una máquina que vive entre peticiones.
 * - `ensureFresh()` se llama **dentro** de una petición web y hace solo lo
 *   imprescindible para esa pantalla, con tope. Con el bucle andando casi nunca
 *   tiene nada que hacer; sin él (`SYNC_ENABLED=false`) es lo que mantiene la web viva.
 *
 * La reserva (`hourlyReserve`) separa las dos: el trabajo de fondo se para
 * cuando quedan pocas peticiones en la hora, y lo que queda es para logins y
 * para quien está mirando.
 */

import type { BackfillPhase, SyncStatus } from '@sanatorio/contracts'

import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { hourlyQuota } from './quota.js'
import type { QuotaGate } from './quota.js'
import type { ReplicaRepository } from './replica.repository.js'
import type { ApiLocation, ApiUser } from '../../integrations/forty-two/types.js'
import { isoAt } from '../../core/time.js'

export type SyncerConfig = {
  /** Campus que se replican en segundo plano. */
  trackedCampusIds: readonly number[]
  /** Campus de quien no trae ninguno en su perfil. */
  defaultCampusId: number
  /** Cuota horaria que el trabajo de fondo no toca. */
  hourlyReserve: number
  /** Pausa entre pasos del relleno histórico. */
  backfillIntervalMs: number
  locationsTtlMs: number
  locationsIdleMs: number
  deltaTtlMs: number
  deltaIdleMs: number
  /** Páginas que se bajan como mucho dentro de una petición web. */
  requestPageBudget: number
}

type SyncerOptions = {
  client: FortyTwoClient
  replica: ReplicaRepository
  config: SyncerConfig
  /** Quién puede gastar cuota de 42. Sin ella, solo cuenta lo que queda en la hora. */
  quota?: QuotaGate
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  /** Rastro de lo que hace y de lo que falla. Por defecto, a ninguna parte. */
  log?: (message: string) => void
}

/**
 * Por dónde va el relleno.
 *
 * La API **ignora `sort`** en `projects_users` filtrado por campus (comprobado:
 * `sort=-updated_at`, `sort=-id` y sin `sort` devuelven lo mismo), así que no se
 * puede pedir "lo siguiente más antiguo". Lo que sí respeta es
 * `range[updated_at]`, y con eso basta: se recorre el pasado por **ventanas de
 * tiempo fijas**, de la más reciente a la más antigua, y cada ventana se pagina
 * por número de página.
 *
 * Una ventana del pasado es un conjunto que solo puede encoger (una fila que
 * cambia sale de ella y la recoge la tarea de cambios, que camina hacia delante
 * desde `anchor`), así que un corte a medias se retoma en la misma ventana y
 * página sin perder nada.
 */
type BackfillState = {
  phase: BackfillPhase
  /** Instante en que empezó: de aquí hacia delante se ocupa la tarea de cambios. */
  anchor: string
  /** Ventana en curso: `updated_at` entre `from` y `to`. */
  from: string
  to: string
  /** Página dentro de la ventana. */
  page: number
  /** Filas guardadas hasta ahora. */
  rows: number
  /** Filas que dice la API que hay en la fase actual, para el porcentaje. */
  total: number | null
  finishedAt?: string
}

/**
 * Cambios pendientes de un campus.
 *
 * Normalmente solo `cursor` (desde cuándo preguntar) y `at` (cuándo se
 * preguntó). Si una vuelta se queda corta de páginas, `until` y `page` guardan
 * la ventana a medias para seguir por donde iba.
 */
type DeltaState = { cursor: string; at: number; until?: string; page?: number }
type LocationsState = { at: number; count: number }
type ProjectState = { at: number; nextPage: number | null }
type CatalogState = { at: number }

const MINUTE = 60_000

/** Si nadie ha usado la web en este tiempo, se pasa a las cadencias de reposo. */
const ACTIVITY_WINDOW_MS = 10 * MINUTE

/** El catálogo de campus cambia un par de veces al año. */
const CATALOG_TTL_MS = 7 * 24 * 60 * MINUTE

/** Un proyecto pedido bajo demanda en un campus sin réplica se da por bueno este rato. */
const PROJECT_TTL_MS = 15 * MINUTE

/**
 * Solape al mover el cursor de cambios.
 *
 * Una fila que 42 escribe justo mientras preguntamos puede quedar a un lado u
 * otro del corte. Retroceder un minuto la vuelve a traer; como guardar es
 * idempotente, repetir filas no cuesta nada.
 */
const DELTA_OVERLAP_MS = MINUTE

/** Páginas por vuelta de la tarea de cambios; lo que sobre sigue en la siguiente. */
const DELTA_MAX_PAGES = 5

/** Principio de los tiempos: límite inferior de la última ventana del relleno. */
const EPOCH = '1970-01-01T00:00:00.000Z'

/** Tamaño de las ventanas recientes del relleno. */
const BACKFILL_WINDOW_MS = 30 * 24 * 60 * MINUTE

/**
 * Cuántas ventanas recientes se recorren de una en una antes de pedir "todo lo
 * anterior" de golpe.
 *
 * Dos años de ventanas mensuales hacen que lo reciente (quien está cursando
 * ahora) llegue primero. Más atrás ya no merece la pena afinar: cada ventana
 * vacía cuesta una petición.
 */
const BACKFILL_RECENT_WINDOWS = 24

/** Páginas por sondeo de puestos. 1 000 personas sentadas a la vez no las hay. */
const LOCATIONS_MAX_PAGES = 10

/** Espera del bucle cuando no hay nada que hacer. */
const IDLE_SLEEP_MS = 5_000

/** Espera tras un fallo de la API, para no insistirle a un servicio caído. */
const ERROR_SLEEP_MS = 60_000

/** Lo más que se aparta una tarea que no deja de fallar. */
const MAX_BACKOFF_MS = 15 * MINUTE

export function createSyncer(options: SyncerOptions) {
  const { client, replica, config } = options
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? defaultSleep
  const log = options.log ?? (() => undefined)

  let lastActivityAt = 0
  let lastBackfillAt = 0
  let running = false
  let loop: Promise<void> | undefined

  /** Proyectos abiertos que no cupieron en su petición y hay que terminar. */
  const pendingProjects = new Map<string, { campusId: number; projectId: number }>()

  /** Tareas en curso, para que el bucle y una petición web no hagan lo mismo a la vez. */
  const inFlight = new Map<string, Promise<unknown>>()

  function single<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = inFlight.get(key)

    if (existing !== undefined) {
      return existing as Promise<T>
    }

    const promise = task().finally(() => {
      inFlight.delete(key)
    })
    inFlight.set(key, promise)

    return promise
  }

  /** Tareas que han fallado y hasta cuándo no se reintentan. */
  const backoff = new Map<string, { until: number; delayMs: number }>()

  /**
   * Ejecuta una tarea de fondo sin dejar que su fallo pare a las demás.
   *
   * Si la API responde mal a una tarea concreta (un campus sin permiso, un 503
   * que dura), esa tarea se aparta un rato, cada vez más largo, y el resto
   * sigue. Sin esto, la primera de la lista que fallara dejaría a todas las
   * de detrás sin turno.
   *
   * @returns `false` si la tarea está apartada y no se ha intentado.
   */
  async function guarded(key: string, task: () => Promise<unknown>): Promise<boolean> {
    const penalty = backoff.get(key)

    if (penalty !== undefined && now() < penalty.until) {
      return false
    }

    try {
      await task()
      backoff.delete(key)
    } catch (error) {
      const delayMs = Math.min((penalty?.delayMs ?? ERROR_SLEEP_MS / 2) * 2, MAX_BACKOFF_MS)
      backoff.set(key, { until: now() + delayMs, delayMs })
      log(`${key}: ${describe(error)}. Se reintenta en ${Math.round(delayMs / 1000)} s`)
    }

    return true
  }

  const quota = options.quota ?? hourlyQuota(client, config.hourlyReserve)
  const isTracked = (campusId: number): boolean => config.trackedCampusIds.includes(campusId)
  const isActive = (): boolean => now() - lastActivityAt < ACTIVITY_WINDOW_MS

  /**
   * `true` si se puede gastar en trabajo de fondo.
   *
   * Antes de la primera respuesta no se sabe cuánto queda; se asume que sí,
   * porque la propia respuesta lo dirá y el siguiente paso ya lo tendrá en
   * cuenta.
   */
  function canSpend(reserve = config.hourlyReserve): boolean {
    return quota.allows('background', reserve)
  }

  /**
   * `true` si una visita puede provocar una llamada a 42. Con la cuota de la
   * hora casi agotada ya no: es lo que impide que alguien abriendo proyectos de
   * campus sin réplica deje a los demás sin poder iniciar sesión.
   */
  const canServe = (): boolean => quota.allows('critical')

  // --- Tareas ---------------------------------------------------------------

  /** Foto de los puestos ocupados de un campus. */
  async function pollLocations(campusId: number): Promise<void> {
    await single(`locations:${campusId}`, async () => {
      const locations: ApiLocation[] = []

      for (let page = 1; page <= LOCATIONS_MAX_PAGES; page += 1) {
        const result = await client.getActiveLocationsPage(campusId, page)
        locations.push(...result.items)

        if (result.items.length < result.perPage) {
          break
        }
      }

      const count = await replica.replacePresence(campusId, locations)
      await replica.setState(locationsKey(campusId), { at: now(), count } satisfies LocationsState)
    })
  }

  /**
   * Lo que ha cambiado en los proyectos de un campus desde la última vez.
   *
   * Se pide la ventana `[cursor, ahora]` entera, página a página. Casi siempre
   * es una sola petición con un puñado de filas.
   */
  async function pullDelta(campusId: number): Promise<void> {
    await single(`delta:${campusId}`, async () => {
      const backfill = await backfillState(campusId)
      const state = await replica.getState<DeltaState>(deltaKey(campusId))
      // La primera vez se arranca donde empezó el relleno: él cubre lo anterior.
      const from = state?.cursor ?? backfill.anchor
      // Si la vuelta anterior no terminó su ventana, se sigue con la misma: sin
      // orden garantizado, cambiar de ventana a media paginación saltaría filas.
      const until = state?.until ?? isoAt(now())
      let page = state?.page ?? 1

      for (let fetched = 0; fetched < DELTA_MAX_PAGES; fetched += 1) {
        const result = await client.getCampusProjectUsersPage({
          campusId,
          updatedFrom: from,
          updatedTo: until,
          page,
        })
        await replica.ingestProjectUsers(result.items, campusId)

        if (result.items.length < result.perPage) {
          await replica.setState(deltaKey(campusId), {
            cursor: isoAt(Date.parse(until) - DELTA_OVERLAP_MS),
            at: now(),
          } satisfies DeltaState)

          return
        }

        page += 1
      }

      // Quedan páginas: `at: 0` hace que toque otra vez enseguida.
      await replica.setState(deltaKey(campusId), {
        cursor: from,
        at: 0,
        until,
        page,
      } satisfies DeltaState)
    })
  }

  /** Estado del relleno de un campus; la primera vez lo crea anclado en "ahora". */
  async function backfillState(campusId: number): Promise<BackfillState> {
    const stored = await replica.getState<BackfillState>(backfillKey(campusId))

    if (stored !== undefined) {
      return stored
    }

    const anchor = isoAt(now())
    const fresh: BackfillState = {
      phase: 'in_progress',
      anchor,
      // La primera fase es una sola ventana: todo lo que está en curso.
      from: EPOCH,
      to: anchor,
      page: 1,
      rows: 0,
      total: null,
    }
    await replica.setState(backfillKey(campusId), fresh)

    return fresh
  }

  /**
   * Ventana siguiente a una que acaba de terminar, o `undefined` si era la última.
   *
   * Un milisegundo de solape en el límite: tanto si el rango de la API incluye
   * los extremos como si no, una fila justo en el corte no se queda fuera.
   */
  function nextWindow(state: BackfillState): { from: string; to: string } | undefined {
    if (state.from === EPOCH) {
      return undefined
    }

    const to = isoAt(Date.parse(state.from) + 1)
    const from = Date.parse(state.from) - BACKFILL_WINDOW_MS
    const recentLimit = Date.parse(state.anchor) - BACKFILL_RECENT_WINDOWS * BACKFILL_WINDOW_MS

    return { from: from <= recentLimit ? EPOCH : isoAt(from), to }
  }

  /**
   * Un paso del relleno histórico: una petición.
   *
   * Primero se copia a quien tiene algo **en curso**, que es lo que la web
   * enseña sí o sí ("pacientes como tú") y son pocas páginas (38 en Madrid).
   * Después todo lo demás, por ventanas de un mes hacia atrás.
   *
   * @returns `true` si ha hecho una petición; `false` si el campus ya está copiado.
   */
  async function backfillStep(campusId: number): Promise<boolean> {
    return single(`backfill:${campusId}`, async () => {
      const state = await backfillState(campusId)

      if (state.phase === 'done') {
        return false
      }

      const result = await client.getCampusProjectUsersPage({
        campusId,
        status: state.phase === 'in_progress' ? 'in_progress' : undefined,
        updatedFrom: state.from,
        updatedTo: state.to,
        page: state.page,
      })
      const saved = await replica.ingestProjectUsers(result.items, campusId)
      const next: BackfillState = { ...state, rows: state.rows + saved, page: state.page + 1 }

      // El total solo se puede leer de una ventana que lo abarque todo, y la
      // primera fase lo es.
      if (state.phase === 'in_progress' && state.total === null) {
        next.total = result.total
      }

      if (result.items.length < result.perPage) {
        if (state.phase === 'in_progress') {
          // Empieza el histórico completo, por la ventana más reciente. Antes,
          // una petición a la ventana entera solo para leer cuántas filas son:
          // es lo que permite enseñar un porcentaje durante las dos horas
          // siguientes, y las 100 filas que trae se guardan igual.
          const whole = await client.getCampusProjectUsersPage({
            campusId,
            updatedFrom: EPOCH,
            updatedTo: state.anchor,
          })
          next.rows += await replica.ingestProjectUsers(whole.items, campusId)

          Object.assign(next, {
            phase: 'all',
            from: isoAt(Date.parse(state.anchor) - BACKFILL_WINDOW_MS),
            to: state.anchor,
            page: 1,
            total: whole.total,
          })
          log(`campus ${campusId}: copiados los proyectos en curso (${next.rows} filas)`)
        } else {
          const following = nextWindow(state)

          if (following === undefined) {
            Object.assign(next, { phase: 'done', finishedAt: isoAt(now()) })
            log(`campus ${campusId}: réplica completa (${next.rows} filas)`)
          } else {
            Object.assign(next, { ...following, page: 1 })
          }
        }
      }

      await replica.setState(backfillKey(campusId), next)

      return true
    })
  }

  /**
   * Participantes de un proyecto en un campus, hasta `maxPages` páginas.
   *
   * Solo hace falta mientras el campus no esté copiado entero. Si la fase de
   * "en curso" ya terminó, se piden solo los aprobados, que es lo que falta.
   *
   * @returns `true` si el proyecto ha quedado completo.
   * @throws {ApiError} Tal cual, para que quien llama decida si sirve lo viejo.
   */
  async function syncProject(
    campusId: number,
    projectId: number,
    maxPages: number,
  ): Promise<boolean> {
    return single(`project:${campusId}:${projectId}`, async () => {
      const key = projectKey(campusId, projectId)
      const state = await replica.getState<ProjectState>(key)
      const phase = isTracked(campusId) ? (await backfillState(campusId)).phase : 'in_progress'
      let page = state?.nextPage ?? 1

      for (let fetched = 0; fetched < maxPages; fetched += 1) {
        const result = await client.getCampusProjectUsersPage({
          campusId,
          projectId,
          status: phase === 'all' ? 'finished' : undefined,
          page,
        })
        await replica.ingestProjectUsers(result.items, campusId)

        if (result.items.length < result.perPage) {
          await replica.setState(key, { at: now(), nextPage: null } satisfies ProjectState)
          pendingProjects.delete(key)

          return true
        }

        page += 1
      }

      await replica.setState(key, { at: state?.at ?? 0, nextPage: page } satisfies ProjectState)
      pendingProjects.set(key, { campusId, projectId })

      return false
    })
  }

  /** Catálogo de campus. */
  async function syncCatalog(): Promise<void> {
    await single('catalog', async () => {
      await replica.upsertCampuses(await client.getCampuses())
      await replica.setState(CATALOG_KEY, { at: now() } satisfies CatalogState)
    })
  }

  // --- Planificación --------------------------------------------------------

  async function locationsAge(campusId: number): Promise<number> {
    const state = await replica.getState<LocationsState>(locationsKey(campusId))

    return state === undefined ? Infinity : now() - state.at
  }

  async function deltaAge(campusId: number): Promise<number> {
    const state = await replica.getState<DeltaState>(deltaKey(campusId))

    return state === undefined ? Infinity : now() - state.at
  }

  /**
   * Un paso del trabajo de fondo: la tarea más urgente que toque, y solo una.
   *
   * Ir de una en una es lo que deja pasar a las peticiones web: comparten el
   * mismo ritmo de 2 por segundo, y así nunca esperan más que una petición.
   *
   * @returns `true` si ha hecho algo, para que el bucle no duerma.
   */
  async function tick(): Promise<boolean> {
    const active = isActive()

    // 1. Puestos. Con gente mirando se permite apurar más la cuota: es el dato
    //    que más rápido envejece y el que decide a quién vas a buscar.
    for (const campusId of config.trackedCampusIds) {
      const ttl = active ? config.locationsTtlMs : config.locationsIdleMs
      const reserve = active ? config.hourlyReserve / 3 : config.hourlyReserve

      if (
        (await locationsAge(campusId)) >= ttl &&
        canSpend(reserve) &&
        (await guarded(`puestos del campus ${campusId}`, () => pollLocations(campusId)))
      ) {
        return true
      }
    }

    // 2. Proyectos que alguien abrió y no cupieron en su petición.
    const pending = pendingProjects.entries().next().value

    if (pending !== undefined && canSpend(config.hourlyReserve / 3)) {
      const [key, { campusId, projectId }] = pending
      // Se quita antes de intentarlo: si quedan páginas, `syncProject` lo vuelve
      // a apuntar; si falla, no se queda aquí bloqueando la cola.
      pendingProjects.delete(key)

      if (await guarded(`proyecto ${projectId}`, () => syncProject(campusId, projectId, 2))) {
        return true
      }
    }

    if (!canSpend()) {
      return false
    }

    // 3. Cambios desde la última vez.
    for (const campusId of config.trackedCampusIds) {
      if (
        (await deltaAge(campusId)) >= (active ? config.deltaTtlMs : config.deltaIdleMs) &&
        (await guarded(`cambios del campus ${campusId}`, () => pullDelta(campusId)))
      ) {
        return true
      }
    }

    // 4. Catálogo de campus.
    const catalog = await replica.getState<CatalogState>(CATALOG_KEY)

    if (
      (catalog === undefined || now() - catalog.at >= CATALOG_TTL_MS) &&
      (await guarded('catálogo de campus', syncCatalog))
    ) {
      return true
    }

    // 5. Relleno histórico, con su propio ritmo.
    if (now() - lastBackfillAt >= config.backfillIntervalMs) {
      for (const campusId of config.trackedCampusIds) {
        const step = { done: false }
        const tried = await guarded(`relleno del campus ${campusId}`, async () => {
          step.done = await backfillStep(campusId)
        })

        if (tried && step.done) {
          lastBackfillAt = now()
          return true
        }
      }
    }

    return false
  }

  return {
    /** Anota que alguien está usando la web. Lo llaman las rutas con sesión. */
    touch(): void {
      lastActivityAt = now()
    },

    /** `true` si alguien ha usado la web hace poco. El trabajo pesado de fondo espera a que no. */
    isActive,

    /**
     * Guarda lo que trae el login, que es gratis.
     *
     * `/v2/me` ya se pide para saber quién entra, y su respuesta incluye el
     * campus y **todos** los proyectos de la persona con su estado. Guardarlo
     * aquí es lo que hace que "¿Qué te duele hoy?" no cueste ni una petición.
     *
     * @returns El campus principal de la persona.
     */
    async ingestLogin(profile: ApiUser): Promise<{ campusId: number }> {
      const campuses = profile.campus_users ?? []
      const primary = campuses.find((entry) => entry.is_primary === true) ?? campuses[0]
      const campusId = primary?.campus_id ?? config.defaultCampusId
      const campusIds = campuses.length > 0 ? campuses.map((entry) => entry.campus_id) : [campusId]

      await replica.ingestUser(profile, campusIds)
      await replica.ingestProjectUsers(profile.projects_users ?? [], undefined, profile)

      return { campusId }
    },

    /**
     * Proyectos de alguien de quien no hay ninguna fila. Una o dos peticiones.
     *
     * Solo pasa si el perfil del login vino sin `projects_users`.
     */
    async ensureUserProjects(login: string, owner?: { id: number; login: string }): Promise<void> {
      if (await replica.hasProjectsOf(login)) {
        return
      }

      const rows = await client.getUserProjects(login)
      await replica.ingestProjectUsers(rows, undefined, owner)
    },

    /**
     * Lo imprescindible para enseñar un proyecto de un campus, **dentro de la
     * petición**.
     *
     * Son las únicas llamadas a 42 que puede provocar una visita:
     *
     * - los puestos, si la foto es más vieja que su cadencia;
     * - los participantes del proyecto, si el campus no está copiado y ese
     *   proyecto no se ha pedido todavía;
     * - los cambios, solo si llevan tanto sin pedirse que está claro que no hay
     *   bucle de fondo.
     *
     * Ningún fallo de la API sale de aquí: se anota y se sirve lo que haya.
     *
     * @returns `partial: true` si faltan participantes por bajar.
     */
    async ensureFresh(campusId: number, projectId?: number): Promise<{ partial: boolean }> {
      lastActivityAt = now()
      let partial = false

      // Con la cuota de la hora casi agotada ya no se pide nada desde una
      // visita: lo poco que queda es para que la gente pueda seguir entrando
      // (el login son dos peticiones). Se sirve lo que haya en la réplica.
      if (!canServe()) {
        log(`campus ${campusId}: cuota casi agotada, se sirve la réplica tal cual`)
        return { partial }
      }

      const attempt = async (what: string, task: () => Promise<void>): Promise<void> => {
        try {
          await task()
        } catch (error) {
          log(`${what}: ${describe(error)}. Se sirve lo que hay`)
        }
      }

      if ((await locationsAge(campusId)) >= config.locationsTtlMs) {
        await attempt(`puestos del campus ${campusId}`, () => pollLocations(campusId))
      }

      if (isTracked(campusId) && (await deltaAge(campusId)) >= config.deltaIdleMs * 2) {
        await attempt(`cambios del campus ${campusId}`, () => pullDelta(campusId))
      }

      if (projectId !== undefined) {
        const tracked = isTracked(campusId)
        const copied = tracked && (await backfillState(campusId)).phase === 'done'

        if (!copied) {
          const state = await replica.getState<ProjectState>(projectKey(campusId, projectId))
          // En un campus replicado basta pedirlo una vez: después lo mantiene la
          // tarea de cambios. En uno bajo demanda caduca, porque nadie más lo
          // refresca.
          const stale = state?.nextPage !== null || (!tracked && now() - state.at >= PROJECT_TTL_MS)

          if (stale) {
            partial = true
            await attempt(`proyecto ${projectId} del campus ${campusId}`, async () => {
              partial = !(await syncProject(campusId, projectId, config.requestPageBudget))
            })
          }
        }
      }

      return { partial }
    },

    /**
     * Refresca la foto de puestos de un campus si se ha quedado vieja, y nada más.
     *
     * Es lo que usan las comprobaciones automáticas (asistencia a terapias,
     * sesiones de ayuda): necesitan saber quién está sentado ahora, pero no son
     * una persona usando la web, así que no cuentan como actividad ni tiran del
     * resto de la réplica.
     */
    async ensureLocations(campusId: number): Promise<void> {
      if (!canServe() || (await locationsAge(campusId)) < config.locationsTtlMs) {
        return
      }

      try {
        await pollLocations(campusId)
      } catch (error) {
        log(`puestos del campus ${campusId}: ${describe(error)}. Se comprueba con lo que hay`)
      }
    },

    tick,
    pollLocations,
    pullDelta,
    backfillStep,
    syncProject,
    syncCatalog,

    /** Arranca el bucle de fondo. Idempotente. */
    start(): void {
      if (running) {
        return
      }
      running = true

      // A través de una función: `stop()` lo cambia desde fuera mientras el bucle
      // espera, y leído directamente el compilador lo da por siempre cierto.
      const keepGoing = (): boolean => running

      loop = (async () => {
        while (keepGoing()) {
          try {
            const worked = await tick()
            // Sin trabajo se duerme lo que tarde en tocar el siguiente paso del
            // relleno, que es la tarea con la cadencia más corta.
            await sleep(
              worked ? 0 : Math.min(IDLE_SLEEP_MS, Math.max(250, config.backfillIntervalMs)),
            )
          } catch (error) {
            log(`sincronización: ${describe(error)}`)
            await sleep(ERROR_SLEEP_MS)
          }
        }
      })()
    },

    /** Para el bucle y espera a que termine el paso en curso. */
    async stop(): Promise<void> {
      running = false
      await loop
    },

    /**
     * Instante (ms) de lo último que se trajo de 42 para un campus seguido:
     * la foto de puestos o los cambios de proyectos, lo más reciente de los
     * dos. `null` si aún no ha habido ninguna. Lo lee `GET /health/db`, así
     * que no cuenta filas: solo mira el estado guardado.
     */
    async lastSyncAt(): Promise<number | null> {
      let latest: number | null = null

      for (const id of config.trackedCampusIds) {
        const locations = await replica.getState<LocationsState>(locationsKey(id))
        const delta = await replica.getState<DeltaState>(deltaKey(id))

        for (const at of [locations?.at ?? 0, delta?.at ?? 0]) {
          if (at > 0 && (latest === null || at > latest)) latest = at
        }
      }

      return latest
    },

    /** Estado de la réplica, para `GET /sync/status`. */
    async status(): Promise<SyncStatus> {
      const campuses: SyncStatus['campuses'] = []

      for (const id of config.trackedCampusIds) {
        const locations = await replica.getState<LocationsState>(locationsKey(id))
        const delta = await replica.getState<DeltaState>(deltaKey(id))
        const backfill = await replica.getState<BackfillState>(backfillKey(id))

        campuses.push({
          id,
          locationsAt: locations === undefined ? null : isoAt(locations.at),
          present: locations?.count ?? 0,
          deltaAt: delta === undefined || delta.at === 0 ? null : isoAt(delta.at),
          backfill: {
            phase: backfill?.phase ?? 'in_progress',
            rows: backfill?.rows ?? 0,
            total: backfill?.total ?? null,
          },
        })
      }

      return {
        running,
        hourlyRemaining: client.hourlyRemaining() ?? null,
        requests: client.requestCount(),
        replica: await replica.counts(),
        campuses,
      }
    },
  }
}

export type Syncer = ReturnType<typeof createSyncer>

// --- Claves de `sync_state` ---------------------------------------------------

const CATALOG_KEY = 'catalog'
const locationsKey = (campusId: number): string => `locations:${campusId}`
const deltaKey = (campusId: number): string => `delta:${campusId}`
const backfillKey = (campusId: number): string => `backfill:${campusId}`
const projectKey = (campusId: number, projectId: number): string =>
  `project:${campusId}:${projectId}`

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
