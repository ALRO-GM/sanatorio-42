/**
 * Copia de las correcciones de 42, poco a poco.
 *
 * Primero todo el histórico, ordenado por id y con un cursor guardado: si el
 * servidor se reinicia a medias, sigue donde lo dejó. Después, cada rato, solo
 * lo que ha cambiado (`range[updated_at]`): las correcciones nuevas y las que
 * por fin tienen nota.
 *
 * Nunca gasta la reserva horaria de la API: las lecturas de la web van antes.
 *
 * Hay dos copias: la del 42cursus (`21`), con todo el histórico, y la de la
 * C Piscine (`9`, `docs/piscineros.md`), que solo trae lo reciente
 * (`recentMs`): de la piscina solo importa la que está en curso, así que no
 * hay histórico ni repaso, solo novedades desde hace `recentMs`.
 */

import type { NetworkSync } from '@sanatorio/contracts'

import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { ApiScaleTeam } from '../../integrations/forty-two/types.js'
import { hourlyQuota } from '../replica/index.js'
import type { QuotaGate, ReplicaRepository } from '../replica/index.js'
import { DEFAULT_PASS_MARK, passMarkOf } from './network.analysis.js'
import type { CorrectionRow, NetworkRepository } from './network.repository.js'

type CorrectionSyncOptions = {
  client: FortyTwoClient
  corrections: NetworkRepository
  /** Para guardar por dónde va la copia, junto al resto de tareas. */
  replica: ReplicaRepository
  campusIds: readonly number[]
  /** Peticiones por hora que no se tocan. */
  hourlyReserve: number
  /** Quién puede gastar cuota de 42. Sin ella, solo cuenta lo que queda en la hora. */
  quota?: QuotaGate
  /**
   * `true` si alguien está usando la web. El repaso completo solo corre cuando
   * no: así gasta la cuota que de otro modo se perdería sin quitársela a nadie.
   */
  isActive?: () => boolean
  now?: () => number
  log?: (message: string) => void
  /** De qué cursus se copia. Sin él, el 42cursus. */
  cursus?: number
  /**
   * Solo lo que ha cambiado en este rato hacia atrás, sin histórico ni repaso.
   * Es la copia de la piscina: lo anterior es de piscinas ya terminadas.
   */
  recentMs?: number
}

/** Lo que se guarda entre una vuelta y la siguiente. */
type State = {
  /** Id de la última corrección copiada. */
  cursor: number
  /** `true` cuando el histórico está entero. */
  done: boolean
  /** Las que dice 42 que hay. */
  total: number | null
  /** Hasta cuándo está al día (ISO-8601). */
  deltaAt: string | null
  /** Cuándo se calcularon por última vez las notas mínimas y los veredictos. */
  judgedAt?: string | null
  /** Repaso completo en curso: hasta qué id ha llegado. `null` si no hay ninguno. */
  sweepCursor?: number | null
  /** Cuándo terminó el último repaso completo. */
  sweptAt?: string | null
}

/**
 * Cuánto dura una vuelta del histórico. Cada página pesa (unos 700 kB) y tarda
 * varios segundos: se encadenan hasta casi llenar el hueco entre dos vueltas.
 */
const STEP_BUDGET_MS = 16_000

/** Margen sobre la reserva: el sincronizador principal también gasta. */
const BUDGET_MARGIN = 60

/** Cada cuánto se pide lo nuevo, con el histórico ya copiado. */
const DELTA_EVERY_MS = 10 * 60_000

/** Solape de la ventana de novedades, por si los relojes no coinciden. */
const DELTA_OVERLAP_MS = 2 * 60_000

/** Cada cuánto se vuelven a deducir las notas mínimas y a recalcular los veredictos. */
const JUDGE_EVERY_MS = 6 * 60 * 60_000

/**
 * Cada cuánto se repasa el histórico entero. Las novedades ya llegan cada diez
 * minutos; el repaso es la red de seguridad: recoge lo que `updated_at` no
 * avise y borra lo que 42 haya quitado. Cuesta unas 820 peticiones.
 */
const SWEEP_EVERY_MS = 24 * 60 * 60_000

/**
 * Cuota que el repaso deja siempre libre, además de la reserva: si alguien
 * entra a mitad, la web tiene de sobra.
 */
const SWEEP_MARGIN = 150

/** Tope de páginas de novedades por vuelta. Un cinturón, no un límite real. */
const DELTA_MAX_PAGES = 20

/**
 * Lo más largo que pide de novedades de una vez la copia de la piscina. Empieza
 * `recentMs` atrás, con la piscina entera por delante: avanza por tramos, cada
 * uno cabe en `DELTA_MAX_PAGES` y lo hecho no se vuelve a pedir. La del
 * 42cursus no lo necesita: su histórico deja las novedades al día.
 */
const DELTA_SPAN_MS = 24 * 60 * 60_000

/** El 42cursus. */
export const CORE_CURSUS = 21

/** La C Piscine: las correcciones de los piscineros. */
export const PISCINE_CURSUS = 9

/** La del 42cursus conserva la clave de siempre: así no se vuelve a copiar todo. */
const stateKeyOf =
  (cursus: number) =>
  (campusId: number): string =>
    cursus === CORE_CURSUS ? `corrections:${campusId}` : `corrections:${cursus}:${campusId}`

/**
 * Las filas que salen de una corrección: una por persona corregida.
 *
 * Se descartan las que aún no se han hecho (sin nota) y las que 42 oculta
 * (`"invisible"` en vez de personas, antes de la cita).
 */
export function rowsOf(
  item: ApiScaleTeam,
  campusId: number,
  cursus = CORE_CURSUS,
): CorrectionRow[] {
  const { corrector, correcteds } = item

  if (
    typeof corrector !== 'object' ||
    corrector === null ||
    !Array.isArray(correcteds) ||
    item.final_mark === null ||
    item.final_mark === undefined
  ) {
    return []
  }

  return correcteds
    .filter((person) => person.login !== corrector.login)
    .map((person) => ({
      id: item.id,
      campusId,
      cursus,
      corrector: corrector.login,
      corrected: person.login,
      projectId: item.team?.project_id ?? null,
      beginAt: item.begin_at,
      finalMark: item.final_mark ?? null,
      positive: item.flag?.positive ?? null,
    }))
}

export function createCorrectionSync(options: CorrectionSyncOptions) {
  const { client, corrections, replica, campusIds, hourlyReserve } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  const isActive = options.isActive ?? (() => false)
  const cursus = options.cursus ?? CORE_CURSUS
  const { recentMs } = options
  const stateKey = stateKeyOf(cursus)
  let running = false

  const quota = options.quota ?? hourlyQuota(client, hourlyReserve)

  const canSpend = (): boolean => quota.allows('background', hourlyReserve + BUDGET_MARGIN)

  const load = async (campusId: number): Promise<State> =>
    (await replica.getState<State>(stateKey(campusId))) ??
    (recentMs === undefined
      ? { cursor: 0, done: false, total: null, deltaAt: null }
      : // Sin histórico: se da por hecho y las novedades empiezan `recentMs` atrás.
        { cursor: 0, done: true, total: null, deltaAt: new Date(now() - recentMs).toISOString() })

  /** Guarda una página y le pone veredicto a lo guardado. */
  const store = async (items: readonly ApiScaleTeam[], campusId: number): Promise<void> => {
    const rows = items.flatMap((item) => rowsOf(item, campusId, cursus))

    if (rows.length === 0) {
      return
    }

    await corrections.save(rows)
    await corrections.judge(
      DEFAULT_PASS_MARK,
      Math.min(...rows.map((row) => row.id)),
      Math.max(...rows.map((row) => row.id)),
    )
  }

  /**
   * Deduce la nota mínima de cada proyecto y recalcula todos los veredictos.
   * No pregunta nada a 42: sale de la réplica.
   */
  const judgeAll = async (): Promise<void> => {
    const evidence = new Map<
      number,
      { validated: { mark: number; people: number }[]; failed: { mark: number; people: number }[] }
    >()

    for (const row of await replica.finalMarks()) {
      const entry = evidence.get(row.projectId) ?? { validated: [], failed: [] }

      ;(row.validated ? entry.validated : entry.failed).push({ mark: row.mark, people: row.people })
      evidence.set(row.projectId, entry)
    }

    const marks = new Map<number, number>()

    for (const [projectId, entry] of evidence) {
      const mark = passMarkOf(entry.validated, entry.failed)

      if (mark !== null) {
        marks.set(projectId, mark)
      }
    }

    await corrections.savePassMarks(marks)
    await corrections.judge(DEFAULT_PASS_MARK)
  }

  /**
   * Repasa el histórico entero, unas páginas por vuelta, solo si nadie usa la
   * web y sobra cuota. Vuelve a guardar cada corrección (por si cambió) y borra
   * las que 42 ya no tiene.
   */
  const sweep = async (campusId: number, state: State): Promise<void> => {
    const last = Date.parse(state.sweptAt ?? '')

    if (state.sweepCursor === null || state.sweepCursor === undefined) {
      // Sin fecha del último (bases de antes de que existiera el repaso), toca ya.
      if (!Number.isNaN(last) && now() - last < SWEEP_EVERY_MS) {
        return
      }

      state.sweepCursor = 0
    }

    let cursor = state.sweepCursor
    const deadline = Date.now() + STEP_BUDGET_MS
    const roomy = (): boolean => quota.allows('background', hourlyReserve + SWEEP_MARGIN)

    for (let page = 0; (page === 0 || Date.now() < deadline) && roomy() && !isActive(); page += 1) {
      const from = cursor
      const result = await client.getCampusScaleTeamsPage({
        campusId,
        cursusId: cursus,
        afterId: from,
      })
      const ids = result.items.map((item) => item.id)
      const finished = result.items.length < result.perPage
      const upTo = ids.reduce((max, id) => Math.max(max, id), from)

      await store(result.items, campusId)

      // Lo que la base tiene en este tramo y 42 no: ya no existe. Se borra
      // también lo guardado de citas que han vuelto a quedar sin nota.
      const kept = result.items.filter((item) => rowsOf(item, campusId, cursus).length > 0)

      await corrections.prune(
        campusId,
        cursus,
        from,
        upTo,
        kept.map((item) => item.id),
      )

      if (finished) {
        state.sweepCursor = null
        state.sweptAt = new Date(now()).toISOString()
        log(`correcciones del campus ${campusId}: repaso completo`)
      } else {
        cursor = upTo
        state.sweepCursor = upTo
      }

      await replica.setState(stateKey(campusId), state)

      if (finished) {
        return
      }
    }
  }

  /** Copia unas páginas del histórico. */
  const backfill = async (campusId: number, state: State): Promise<void> => {
    const deadline = Date.now() + STEP_BUDGET_MS

    // El reloj de verdad, no el inyectado: mide lo que tarda la red.
    for (let page = 0; (page === 0 || Date.now() < deadline) && canSpend(); page += 1) {
      const startedAt = new Date(now()).toISOString()
      const result = await client.getCampusScaleTeamsPage({
        campusId,
        cursusId: cursus,
        afterId: state.cursor,
      })

      await store(result.items, campusId)

      // El total de la primera petición es el de todo; el de las siguientes,
      // lo que queda por delante del cursor.
      state.total ??= result.total
      state.cursor = result.items.reduce((max, item) => Math.max(max, item.id), state.cursor)

      if (result.items.length < result.perPage) {
        state.done = true
        // Copiar el histórico ya es un repaso completo: el siguiente, mañana.
        state.sweptAt = startedAt
        // Lo que cambie desde que empezó esta última página ya es cosa del delta.
        state.deltaAt = startedAt
        log(`correcciones del campus ${campusId}: histórico completo`)
      }

      await replica.setState(stateKey(campusId), state)

      if (state.done) {
        return
      }
    }
  }

  /**
   * Trae lo que ha cambiado desde la última vez; la piscina, por tramos de
   * como mucho `DELTA_SPAN_MS`. Cada tramo terminado mueve `deltaAt`: si la cuota o el
   * tiempo se acaban a mitad, la siguiente vuelta sigue desde ahí.
   */
  const delta = async (campusId: number, state: State): Promise<void> => {
    const since = Date.parse(state.deltaAt ?? '')

    if (!Number.isNaN(since) && now() - since < DELTA_EVERY_MS) {
      return
    }

    const deadline = Date.now() + STEP_BUDGET_MS
    // La copia de la piscina no mira más atrás de `recentMs`, aunque lleve
    // mucho parada: lo anterior ya no le importa a nadie.
    const floor = recentMs === undefined ? -Infinity : now() - recentMs
    const span = recentMs === undefined ? Infinity : DELTA_SPAN_MS
    let start = Math.max(Number.isNaN(since) ? now() : since, floor)

    for (let slice = 0; slice === 0 || (Date.now() < deadline && canSpend()); slice += 1) {
      const end = Math.min(now(), start + span)
      const to = new Date(end).toISOString()
      const from = new Date(start - DELTA_OVERLAP_MS).toISOString()
      let finished = false

      for (let page = 1; page <= DELTA_MAX_PAGES && canSpend(); page += 1) {
        const result = await client.getCampusScaleTeamsPage({
          campusId,
          cursusId: cursus,
          updatedFrom: from,
          updatedTo: to,
          page,
        })

        await store(result.items, campusId)

        if (result.items.length < result.perPage) {
          finished = true
          break
        }
      }

      if (!finished) {
        return
      }

      state.deltaAt = to
      await replica.setState(stateKey(campusId), state)

      if (end >= now()) {
        return
      }

      start = end
    }
  }

  return {
    /**
     * Una vuelta: avanza el histórico o pide las novedades de cada campus.
     * Si la anterior no ha terminado, no hace nada.
     */
    async step(): Promise<void> {
      if (running) {
        return
      }

      running = true

      try {
        for (const campusId of campusIds) {
          if (!canSpend()) {
            return
          }

          const state = await load(campusId)

          if (!state.done) {
            await backfill(campusId, state)
          }

          // Los veredictos dependen de las notas mínimas, que se aprenden de la
          // réplica y cambian despacio: al terminar el histórico y cada pocas horas.
          const judged = Date.parse(state.judgedAt ?? '')

          // Lo hace la copia del 42cursus, que vuelve a juzgar todas las filas.
          if (
            recentMs === undefined &&
            state.done &&
            (Number.isNaN(judged) || now() - judged >= JUDGE_EVERY_MS)
          ) {
            await judgeAll()
            state.judgedAt = new Date(now()).toISOString()
            await replica.setState(stateKey(campusId), state)
          }

          if (state.done) {
            await delta(campusId, state)

            if (recentMs === undefined && !isActive()) {
              await sweep(campusId, state)
            }
          }
        }
      } finally {
        running = false
      }
    },

    /** Por dónde va la copia de un campus. */
    async status(campusId: number): Promise<NetworkSync> {
      const [state, extent] = await Promise.all([
        replica.getState<State>(stateKey(campusId)),
        corrections.extent(campusId, cursus),
      ])

      return {
        phase: state === undefined ? 'pending' : state.done ? 'done' : 'copying',
        rows: extent.rows,
        total: state?.total ?? null,
        first: extent.first,
        last: extent.last,
      }
    },
  }
}

export type CorrectionSync = ReturnType<typeof createCorrectionSync>
