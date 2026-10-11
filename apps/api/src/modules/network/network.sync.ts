/**
 * Copia de las correcciones de 42, poco a poco.
 *
 * Primero todo el histórico, ordenado por id y con un cursor guardado: si el
 * servidor se reinicia a medias, sigue donde lo dejó. Después, cada rato, solo
 * lo que ha cambiado (`range[updated_at]`): las correcciones nuevas y las que
 * por fin tienen nota.
 *
 * Nunca gasta la reserva horaria de la API: las lecturas de la web van antes.
 */

import type { NetworkSync } from '@sanatorio/contracts'

import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { ApiScaleTeam } from '../../integrations/forty-two/types.js'
import type { ReplicaRepository } from '../replica/index.js'
import type { CorrectionRow, NetworkRepository } from './network.repository.js'

export type CorrectionSyncOptions = {
  client: FortyTwoClient
  corrections: NetworkRepository
  /** Para guardar por dónde va la copia, junto al resto de tareas. */
  replica: ReplicaRepository
  campusIds: readonly number[]
  /** Peticiones por hora que no se tocan. */
  hourlyReserve: number
  now?: () => number
  log?: (message: string) => void
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

/** Tope de páginas de novedades por vuelta. Un cinturón, no un límite real. */
const DELTA_MAX_PAGES = 20

const stateKey = (campusId: number): string => `corrections:${campusId}`

/**
 * Las filas que salen de una corrección: una por persona corregida.
 *
 * Se descartan las que aún no se han hecho (sin nota) y las que 42 oculta
 * (`"invisible"` en vez de personas, antes de la cita).
 */
export function rowsOf(item: ApiScaleTeam, campusId: number): CorrectionRow[] {
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
  let running = false

  const canSpend = (): boolean => {
    const remaining = client.hourlyRemaining()

    return remaining === undefined || remaining > hourlyReserve + BUDGET_MARGIN
  }

  const load = async (campusId: number): Promise<State> =>
    (await replica.getState<State>(stateKey(campusId))) ?? {
      cursor: 0,
      done: false,
      total: null,
      deltaAt: null,
    }

  /** Copia unas páginas del histórico. */
  const backfill = async (campusId: number, state: State): Promise<void> => {
    const deadline = Date.now() + STEP_BUDGET_MS

    // El reloj de verdad, no el inyectado: mide lo que tarda la red.
    for (let page = 0; (page === 0 || Date.now() < deadline) && canSpend(); page += 1) {
      const startedAt = new Date(now()).toISOString()
      const result = await client.getCampusScaleTeamsPage({ campusId, afterId: state.cursor })

      await corrections.save(result.items.flatMap((item) => rowsOf(item, campusId)))

      // El total de la primera petición es el de todo; el de las siguientes,
      // lo que queda por delante del cursor.
      state.total ??= result.total
      state.cursor = result.items.reduce((max, item) => Math.max(max, item.id), state.cursor)

      if (result.items.length < result.perPage) {
        state.done = true
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

  /** Trae lo que ha cambiado desde la última vez. */
  const delta = async (campusId: number, state: State): Promise<void> => {
    const since = Date.parse(state.deltaAt ?? '')

    if (!Number.isNaN(since) && now() - since < DELTA_EVERY_MS) {
      return
    }

    const to = new Date(now()).toISOString()
    const from = new Date((Number.isNaN(since) ? now() : since) - DELTA_OVERLAP_MS).toISOString()

    for (let page = 1; page <= DELTA_MAX_PAGES && canSpend(); page += 1) {
      const result = await client.getCampusScaleTeamsPage({
        campusId,
        updatedFrom: from,
        updatedTo: to,
        page,
      })

      await corrections.save(result.items.flatMap((item) => rowsOf(item, campusId)))

      if (result.items.length < result.perPage) {
        state.deltaAt = to
        await replica.setState(stateKey(campusId), state)

        return
      }
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

          if (state.done) {
            await delta(campusId, state)
          } else {
            await backfill(campusId, state)
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
        corrections.extent(campusId),
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
