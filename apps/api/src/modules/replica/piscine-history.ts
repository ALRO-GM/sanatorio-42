/**
 * El historial de las piscinas de Madrid (`docs/abandono.md`), pedido por
 * Alberto el 2026-11-06: para ver y comparar el abandono de las últimas 10
 * piscinas hace falta, de cada una, quién la hizo, cuándo se sentó en los
 * puestos, sus correcciones, sus exámenes y lo que aprobó. Nada de eso estaba:
 * `pool_members` guarda 60 días, el historial de puestos es solo de alumnos y
 * las correcciones de la piscina, de 90 días.
 *
 * De fondo y con la cuota que sobra (`piscines` en `BULK_ORDER`), por tramos
 * que se guardan en `sync_state` (`piscine-history:<campus>`):
 *
 * 1. Quién empezó la C Piscine en los últimos tres años (`cursus/9/cursus_users`),
 *    y luego, cada día, los de los últimos 60. Las piscinas son los días en que
 *    empezaron 20 personas o más; se miran las 10 últimas.
 * 2. De cada piscina, de la más nueva a la más vieja: sus sesiones en los
 *    puestos (`campus/:id/locations` del mes) y sus correcciones
 *    (`scale_teams` de la C Piscine). La que está en curso se completa cada
 *    día hasta 6 h antes de ahora.
 * 3. Lo aprobado y los intentos de examen de cada proyecto de la piscina
 *    (`projects_users`), y luego cada día lo que ha cambiado.
 *
 * Unas 2 000 peticiones la primera vez; después, unas pocas al día.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { isoAt } from '../../core/time.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { avatarUrlOf } from '../../integrations/forty-two/avatar.js'
import type {
  ApiCursusMember,
  ApiLocation,
  ApiProjectUser,
  ApiScaleTeam,
} from '../../integrations/forty-two/types.js'
import { PISCINE } from './piscine.js'
import type { QuotaGate } from './quota.js'

const DAY = 24 * 60 * 60_000
/** Las piscinas que se miran: las últimas. */
const POOLS = 10
/** Un día con esta gente empezando o más es una piscina (no alguien que repite). */
const MIN_POOL = 20
/** Cuánto hacia atrás se buscan piscineros la primera vez: de sobra para 10 piscinas. */
const FIRST_LOOKBACK = 3 * 365 * DAY
/** Después, cada día, los que empezaron en estos últimos días. */
const DAILY_LOOKBACK = 60 * DAY
/** Lo que dura una piscina, con la semana de después del examen final. */
const POOL_SPAN = 33 * DAY
/** Las correcciones de una piscina se cierran un poco después. */
const CORRECTIONS_SPAN = 45 * DAY
/** Lo de las últimas horas aún puede estar abierto: se deja para mañana. */
const SETTLE = 6 * 60 * 60_000
/**
 * La que está en curso se completa una vez al día: si no, su final (`ahora − 6 h`)
 * se mueve cada minuto, siempre queda un tramo por pedir y las demás no llegan
 * nunca (pasó el 2026-11-07: 7 300 peticiones en un día, todas a la de octubre).
 */
const REFRESH = DAY

/** `true` si toca pedir de `from` a `end`: lo cerrado, entero; lo que sigue abierto, una vez al día. */
const due = (from: number, end: number, closes: number): boolean =>
  from < end && (end >= closes || end - from >= REFRESH)
const STEP_BUDGET_MS = 16_000
const MARGIN = 60
/** Quien empezó a menos de esto del primer día es de esa piscina. */
const SAME_POOL = 7 * DAY

type PoolProgress = {
  /** Su primer día (ISO, el inicio del primero que empezó). */
  start: string
  /** Hasta dónde están copiadas sus sesiones y correcciones (ISO), y la página que toca. */
  sessionsTo: string | null
  sessionsPage: number
  correctionsTo: string | null
  correctionsPage: number
}

type HistoryState = {
  /** Cuándo se repasaron por última vez los piscineros; `null`, nunca entero. */
  membersAt: string | null
  membersPage: number
  pools: PoolProgress[]
  /** El proyecto de la piscina (índice en `PISCINE`) y la página que tocan, y desde cuándo. */
  resultsIndex: number
  resultsPage: number
  resultsFrom: string | null
  resultsAt: string | null
}

const stateKey = (campusId: number): string => `piscine-history:${campusId}`

type PiscineHistoryOptions = {
  db: Db
  client: Pick<
    FortyTwoClient,
    | 'getPiscinePage'
    | 'getLocationsHistoryPage'
    | 'getCampusScaleTeamsPage'
    | 'getCampusProjectUsersPage'
  >
  campusIds: readonly number[]
  quota: QuotaGate
  hourlyReserve: number
  log?: (message: string) => void
  now?: () => number
}

/** Las piscinas de una lista de inicios: los días con `MIN_POOL` personas o más, las `POOLS` últimas. */
export function poolStartsOf(begins: readonly number[], now: number): number[] {
  const byDay = new Map<number, number[]>()

  for (const begin of begins) {
    if (begin > now) continue
    const day = Math.floor(begin / DAY)

    byDay.set(day, [...(byDay.get(day) ?? []), begin])
  }

  return [...byDay.values()]
    .filter((list) => list.length >= MIN_POOL)
    .map((list) => Math.min(...list))
    .sort((a, b) => b - a)
    .slice(0, POOLS)
}

export function createPiscineHistory(options: PiscineHistoryOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  let running = false

  const load = async (campusId: number): Promise<HistoryState> => {
    const stored = (
      await db.execute({
        sql: 'SELECT value FROM sync_state WHERE key = ?',
        args: [stateKey(campusId)],
      })
    ).rows[0]?.value

    try {
      if (typeof stored === 'string') return JSON.parse(stored) as HistoryState
    } catch {
      // Ilegible: se empieza otra vez; lo copiado no se pierde (las claves son de 42).
    }

    return {
      membersAt: null,
      membersPage: 1,
      pools: [],
      resultsIndex: 0,
      resultsPage: 1,
      resultsFrom: null,
      resultsAt: null,
    }
  }

  const store = async (campusId: number, state: HistoryState): Promise<void> => {
    await db.execute({
      sql: `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [stateKey(campusId), JSON.stringify(state), isoAt(now())],
    })
  }

  /** Los piscineros del campus: user id → login, y el inicio de cada uno. */
  const membersOf = async (
    campusId: number,
  ): Promise<Map<number, { login: string; begin: number }>> => {
    const rows = (
      await db.execute({
        sql: 'SELECT user_id, login, begin_at FROM piscine_members WHERE campus_id = ?',
        args: [campusId],
      })
    ).rows

    return new Map(
      rows.map((row) => [
        toNumber(row.user_id),
        { login: toText(row.login), begin: Date.parse(toText(row.begin_at)) },
      ]),
    )
  }

  const saveMembers = async (campusId: number, items: readonly ApiCursusMember[]) => {
    const rows = items.flatMap((item) =>
      item.user === null || item.user === undefined || !item.begin_at
        ? []
        : [{ item, user: item.user }],
    )

    if (rows.length === 0) return
    await db.batch(
      rows.map(({ item, user }) => ({
        sql: `INSERT INTO piscine_members (campus_id, user_id, login, image, begin_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (campus_id, user_id) DO UPDATE SET
                login = excluded.login, image = excluded.image, begin_at = excluded.begin_at`,
        args: [
          campusId,
          user.id,
          user.login.toLowerCase(),
          avatarUrlOf(user.image),
          item.begin_at ?? '',
        ],
      })),
      'write',
    )
  }

  const saveSessions = async (
    campusId: number,
    items: readonly ApiLocation[],
    pool: ReadonlySet<number>,
  ) => {
    const rows = items.filter(
      (item) =>
        item.user !== null &&
        item.user !== undefined &&
        pool.has(item.user.id) &&
        typeof item.end_at === 'string' &&
        typeof item.begin_at === 'string',
    )

    if (rows.length === 0) return
    await db.batch(
      rows.map((item) => ({
        sql: `INSERT INTO piscine_sessions (location_id, campus_id, user_id, login, host, begin_at, end_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (location_id) DO UPDATE SET end_at = excluded.end_at`,
        args: [
          item.id,
          campusId,
          item.user?.id ?? 0,
          item.user?.login.toLowerCase() ?? '',
          item.host,
          item.begin_at ?? '',
          item.end_at ?? '',
        ],
      })),
      'write',
    )
  }

  const activity = (
    campusId: number,
    userId: number,
    login: string,
    kind: 'exam' | 'given' | 'received' | 'passed',
    ref: number,
    at: string,
  ) => ({
    sql: `INSERT INTO piscine_activity (campus_id, user_id, login, kind, ref, at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (campus_id, user_id, kind, ref) DO UPDATE SET at = excluded.at`,
    args: [campusId, userId, login, kind, ref, at],
  })

  const saveCorrections = async (
    campusId: number,
    items: readonly ApiScaleTeam[],
    members: ReadonlyMap<number, { login: string }>,
  ) => {
    const byLogin = new Map([...members].map(([id, member]) => [member.login, id]))
    const loginOf = (who: { login: string } | string | null | undefined): string | null =>
      who === null || who === undefined
        ? null
        : (typeof who === 'string' ? who : who.login).toLowerCase()
    const statements = items.flatMap((team) => {
      const corrector = loginOf(team.corrector)
      const correcteds = Array.isArray(team.correcteds) ? team.correcteds : []
      const rows = []
      const correctorId = corrector === null ? undefined : byLogin.get(corrector)

      if (corrector !== null && correctorId !== undefined) {
        rows.push(activity(campusId, correctorId, corrector, 'given', team.id, team.begin_at))
      }
      for (const corrected of correcteds) {
        const login = corrected.login.toLowerCase()
        const id = byLogin.get(login)

        if (id !== undefined)
          rows.push(activity(campusId, id, login, 'received', team.id, team.begin_at))
      }

      return rows
    })

    if (statements.length > 0) await db.batch(statements, 'write')
  }

  const saveResults = async (
    campusId: number,
    items: readonly ApiProjectUser[],
    exam: boolean,
    members: ReadonlyMap<number, { login: string }>,
  ) => {
    const statements = items.flatMap((row) => {
      const user = row.user
      const member = user === null || user === undefined ? undefined : members.get(user.id)

      if (user === null || user === undefined || member === undefined) return []

      const teams = row.teams ?? []
      const rows = []

      // Cada intento de examen bloqueado es un día que vino.
      if (exam) {
        for (const team of teams) {
          const at = team.updated_at ?? team.locked_at ?? team.created_at

          if (team['locked?'] !== false && typeof at === 'string' && typeof team.id === 'number') {
            rows.push(activity(campusId, user.id, member.login, 'exam', team.id, at))
          }
        }
      }
      // Aprobado: cuando se cerró el intento bueno.
      if (row['validated?'] === true && row.project !== null && row.project !== undefined) {
        const good = teams.find((team) => team['validated?'] === true)
        const at = good?.closed_at ?? good?.updated_at ?? row.updated_at

        if (typeof at === 'string') {
          rows.push(activity(campusId, user.id, member.login, 'passed', row.project.id, at))
        }
      }

      return rows
    })

    if (statements.length > 0) await db.batch(statements, 'write')
  }

  /** Los ids de los proyectos de la piscina en la réplica, en el orden de `PISCINE`. */
  const projectIds = async (): Promise<{ id: number; exam: boolean }[]> => {
    const rows = (
      await db.execute({
        sql: `SELECT id, slug FROM projects WHERE slug IN (SELECT value FROM json_each(?))`,
        args: [JSON.stringify(PISCINE.map((project) => project.slug))],
      })
    ).rows
    const bySlug = new Map(rows.map((row) => [toText(row.slug), toNumber(row.id)]))

    return PISCINE.flatMap((project) => {
      const id = bySlug.get(project.slug)

      return id === undefined ? [] : [{ id, exam: project.group === 'exam' }]
    })
  }

  const may = (): boolean => options.quota.allowsBulk('piscines', options.hourlyReserve + MARGIN)

  /** Un tramo de trabajo de un campus; `false` si ya no queda nada por hacer hoy. */
  async function work(campusId: number, state: HistoryState): Promise<boolean> {
    const t = now()

    // 1. Los piscineros: todo la primera vez, luego cada día los recientes.
    const membersStale = state.membersAt === null || t - Date.parse(state.membersAt) > DAY

    if (membersStale) {
      const from = isoAt(t - (state.membersAt === null ? FIRST_LOOKBACK : DAILY_LOOKBACK))
      const page = await client.getPiscinePage({
        campusId,
        beginFrom: from,
        beginTo: isoAt(t + 30 * DAY),
        page: state.membersPage,
      })

      await saveMembers(campusId, page.items)
      if (page.items.length < page.perPage) {
        state.membersAt = isoAt(t)
        state.membersPage = 1
        // Las piscinas, con lo que se sabe ahora; lo copiado de cada una se conserva.
        const members = await membersOf(campusId)
        const starts = poolStartsOf(
          [...members.values()].map((member) => member.begin),
          t,
        )

        state.pools = starts.map((start) => {
          const iso = isoAt(start)

          return (
            state.pools.find((pool) => pool.start === iso) ?? {
              start: iso,
              sessionsTo: null,
              sessionsPage: 1,
              correctionsTo: null,
              correctionsPage: 1,
            }
          )
        })
      } else {
        state.membersPage += 1
      }

      return true
    }

    const members = await membersOf(campusId)

    // 2. Cada piscina, de la más nueva a la más vieja: sesiones y correcciones.
    for (const pool of state.pools) {
      const start = Date.parse(pool.start)
      const inPool = new Set(
        [...members]
          .filter(([, member]) => Math.abs(member.begin - start) < SAME_POOL)
          .map(([id]) => id),
      )
      const sessionsEnd = Math.min(start + POOL_SPAN, t - SETTLE)
      const sessionsFrom = pool.sessionsTo === null ? start - DAY : Date.parse(pool.sessionsTo)

      if (due(sessionsFrom, sessionsEnd, start + POOL_SPAN)) {
        const page = await client.getLocationsHistoryPage({
          campusId,
          from: isoAt(sessionsFrom),
          to: isoAt(sessionsEnd),
          page: pool.sessionsPage,
        })

        await saveSessions(campusId, page.items, inPool)
        if (page.items.length < page.perPage) {
          pool.sessionsTo = isoAt(sessionsEnd)
          pool.sessionsPage = 1
        } else {
          pool.sessionsPage += 1
        }

        return true
      }

      const correctionsEnd = Math.min(start + CORRECTIONS_SPAN, t - SETTLE)
      const correctionsFrom = pool.correctionsTo === null ? start : Date.parse(pool.correctionsTo)

      if (due(correctionsFrom, correctionsEnd, start + CORRECTIONS_SPAN)) {
        const page = await client.getCampusScaleTeamsPage({
          campusId,
          cursusId: 9,
          updatedFrom: isoAt(correctionsFrom),
          updatedTo: isoAt(correctionsEnd),
          page: pool.correctionsPage,
        })

        await saveCorrections(campusId, page.items, members)
        if (page.items.length < page.perPage) {
          pool.correctionsTo = isoAt(correctionsEnd)
          pool.correctionsPage = 1
        } else {
          pool.correctionsPage += 1
        }

        return true
      }
    }

    // 3. Lo aprobado y los exámenes, proyecto a proyecto; luego, cada día, lo cambiado.
    const resultsStale = state.resultsAt === null || t - Date.parse(state.resultsAt) > DAY
    const oldest = state.pools.at(-1)

    if (!resultsStale || oldest === undefined) return false

    const projects = await projectIds()
    const project = projects[state.resultsIndex]

    if (project === undefined) {
      state.resultsAt = state.resultsFrom ?? isoAt(t)
      state.resultsIndex = 0
      state.resultsPage = 1
      state.resultsFrom = null

      return true
    }

    state.resultsFrom ??= isoAt(t)

    const page = await client.getCampusProjectUsersPage({
      campusId,
      projectId: project.id,
      updatedFrom: state.resultsAt ?? oldest.start,
      updatedTo: state.resultsFrom,
      page: state.resultsPage,
    })

    await saveResults(campusId, page.items, project.exam, members)
    if (page.items.length < page.perPage) {
      state.resultsIndex += 1
      state.resultsPage = 1
    } else {
      state.resultsPage += 1
    }

    return true
  }

  return {
    /** Una vuelta: unos tramos, mientras sobre cuota. */
    async step(): Promise<void> {
      if (running) return
      running = true

      try {
        for (const campusId of options.campusIds) {
          const state = await load(campusId)
          const deadline = Date.now() + STEP_BUDGET_MS
          let busy = true

          while (busy && Date.now() < deadline && may()) {
            busy = await work(campusId, state)
            await store(campusId, state)
          }
        }
      } catch (error) {
        log(`historial de piscinas: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
      }
    },
  }
}
