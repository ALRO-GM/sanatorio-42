/**
 * Plan de estudios: qué proyectos tiene (o tendrá) cada persona y en qué
 * círculo del common core va cada uno.
 *
 * Hay dos planes conviviendo: el **clásico**, todo en C, y el **nuevo**
 * (`42next`), que después de los primeros proyectos en C pasa a Python. 42 marca
 * a quien sigue el nuevo con el hito `42next`.
 *
 * ## De dónde sale el círculo de cada proyecto
 *
 * La API de 42 no lo dice: el grafo de la intra sale de un servicio interno y
 * los requisitos de cada proyecto dan 403. Pero se puede **deducir** de dos
 * cosas que sí da de cada persona:
 *
 * - cuándo validó cada rango (`common-core-rank-00`…`06`, uno por círculo);
 * - cuándo se apuntó a cada proyecto.
 *
 * Nadie puede apuntarse a un proyecto antes de tenerlo disponible, así que un
 * proyecto al que alguien se apuntó con dos rangos validados es, como mucho,
 * del círculo 2. Con cada persona que entra en la web se aprende un poco más
 * del plan: cada cual vota un círculo para cada proyecto suyo, y gana el más
 * bajo en el que coincide bastante gente (`curriculum.rules.ts`).
 *
 * Hay además una tabla de partida (`SEED`): el plan clásico entero y los cuatro
 * primeros círculos del nuevo, comprobados con datos reales. Lo que está en ella
 * manda sobre lo aprendido, y en los círculos que cubre no se aprende nada: lo
 * que alguien haga de más ahí (un proyecto del otro plan, una práctica de
 * empresa, un examen de recuperación) no es del plan.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { hourlyQuota } from './quota.js'
import type { QuotaGate } from './quota.js'
import { CHOICES, COMMON_CORE } from './common-core.js'
import { learnedCircle } from './curriculum.rules.js'

type Track = 'classic' | 'next'

type UserTrack = {
  track: Track
  /** Último círculo completado. `-1` si todavía no ha completado ninguno. */
  rank: number
  /** Cuándo validó cada rango (ISO-8601): `ranks[2]` es el del círculo 2. */
  ranks: string[]
}

type CurriculumOptions = {
  db: Db
  client: FortyTwoClient
  /** Peticiones de la hora que no se tocan: son para los logins. */
  hourlyReserve: number
  /** Quién puede gastar cuota de 42 y la cola de quien espera. Sin ella, solo cuenta la hora. */
  quota?: QuotaGate
  now?: () => number
  log?: (message: string) => void
}

/** El último círculo del common core. Lo de después no entra en el grafo. */
export const LAST_CIRCLE = 6

/** Cada cuánto se vuelven a pedir las horas estimadas de los proyectos de un campus. */
const HOURS_TTL_MS = 7 * 24 * 60 * 60_000

/** A cuántas horas equivale cada unidad en la que 42 da sus estimaciones. */
const HOURS_PER: Record<string, number> = { hour: 1, day: 8, week: 40, month: 160 }

/**
 * Horas de una estimación de 42 (`"55 hours"`, `"about 2 weeks"`), o `null` si
 * no se entiende. Un día cuenta como una jornada de 8 horas, y una semana, 40.
 */
export function parseHours(estimate: string | null | undefined): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*(hour|day|week|month)/i.exec(estimate ?? '')

  if (match === null) {
    return null
  }

  const amount = Number((match[1] ?? '').replace(',', '.'))
  const unit = HOURS_PER[(match[2] ?? '').toLowerCase()] ?? 1

  return amount > 0 ? amount * unit : null
}

/** Cada cuánto se vuelve a preguntar a 42 por los rangos de alguien. */
const TRACK_TTL_MS = 24 * 60 * 60_000

const RANK_QUEST = /^common-core-rank-0(\d)$/
const NEXT_QUEST = '42next'

const pythonModules = Array.from(
  { length: 11 },
  (_, index) => `python-module-${String(index).padStart(2, '0')}`,
)

/**
 * Círculo de partida de cada proyecto, por slug.
 *
 * El plan nuevo, entero desde el 2026-10-26: los círculos 0 a 3 comprobados al
 * principio y los 4 a 6 sacados de los datos (en qué rango validaba la gente
 * cada proyecto). RAG against the machine es del 4, junto al examen 4,
 * NetPractice y Pac-Man: ahí se hace (lo confirmó Alberto el 2026-10-26),
 * aunque mucha gente lo valide después de aprobar el examen 4.
 * ft_transcendence cierra el último círculo, como en el clásico: sin ella,
 * quien aprobaba el examen 6 salía con el 100 % en Avance. Lo sembrado manda
 * sobre lo aprendido; más allá del 3 se siguen aprendiendo los proyectos que
 * no estén aquí, por si 42 añade alguno.
 */
const SEED: Record<Track, readonly (readonly string[])[]> = {
  classic: COMMON_CORE.map((circle) =>
    circle.flatMap((project) => project.slugs.filter((slug) => !slug.startsWith('42next-'))),
  ),
  next: [
    ['42cursus-libft'],
    ['42cursus-ft_printf', '42cursus-get_next_line', '42next-push_swap'],
    [
      '42next-born2beroot',
      'a-maze-ing',
      ...pythonModules,
      // Las segundas oportunidades de dos módulos: van con el resto.
      'python-module-05-bis',
      'python-module-06-bis',
      '42next-exam-rank-02',
    ],
    ['codexion', 'fly-in', 'call-me-maybe', '42next-exam-rank-03'],
    ['42next-exam-rank-04', 'netpractice', 'pac-man', 'rag-against-the-machine'],
    ['42next-exam-rank-05', 'inception', 'the-answer-protocol', 'agent-smith'],
    ['42next-exam-rank-06', 'ft_transcendence'],
  ],
}

/** Todos los slugs de la tabla de partida, de los dos planes. */
export const SEEDED_SLUGS: ReadonlySet<string> = new Set(
  Object.values(SEED).flatMap((circles) => circles.flat()),
)

/**
 * Hasta qué círculo está comprobada la tabla de partida de cada plan. Hasta ahí
 * no se aprende nada: lo que no está en la tabla no es del plan.
 */
export const SEEDED_UP_TO: Record<Track, number> = { classic: LAST_CIRCLE, next: 3 }

/** El 42cursus en la API de 42. */
const CORE_CURSUS_ID = 21

/** Lo que se sabe del paso de alguien por el 42cursus. */
type CursusInfo = {
  level: number | null
  startedAt: string | null
  blackholedAt: string | null
}

/** Lista de fechas guardada como JSON. Vacía si no se puede leer. */
function parseDates(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(toText(value))

    return Array.isArray(parsed) ? parsed.filter((date) => typeof date === 'string') : []
  } catch {
    return []
  }
}

export function createCurriculum(options: CurriculumOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)

  /** Cuándo se preguntó por última vez a 42 por el cursus de cada persona. */
  const cursusAsked = new Map<string, number>()

  const quota = options.quota ?? hourlyQuota(client, options.hourlyReserve)

  /** `true` si queda cuota para algo que puede esperar y no es de nadie en concreto. */
  const canSpend = (): boolean => quota.allows('deferrable')

  async function stored(login: string): Promise<(UserTrack & { fetchedAt: number }) | null> {
    const result = await db.execute({
      sql: 'SELECT track, rank, ranks, fetched_at FROM user_tracks WHERE login = ?',
      args: [login],
    })
    const row = result.rows[0]

    return row === undefined
      ? null
      : {
          track: toText(row.track) === 'next' ? 'next' : 'classic',
          rank: toNumber(row.rank),
          ranks: parseDates(row.ranks),
          fetchedAt: Date.parse(toText(row.fetched_at)),
        }
  }

  /**
   * Plan de alguien cuando 42 no lo ha dicho: quien tiene algún proyecto que
   * solo existe en el plan nuevo, lo sigue.
   */
  async function guess(login: string): Promise<Track> {
    const result = await db.execute({
      sql: `SELECT 1 FROM project_users pu
            JOIN users u ON u.id = pu.user_id
            JOIN projects p ON p.id = pu.project_id
            WHERE u.login = ? AND (p.slug LIKE '42next-%' OR p.slug LIKE 'python-module-%')
            LIMIT 1`,
      args: [login],
    })

    return result.rows.length > 0 ? 'next' : 'classic'
  }

  /**
   * Pregunta a 42 por los hitos de alguien: guarda su plan y su rango, y
   * aprende de sus fechas en qué círculo va cada proyecto que tiene.
   *
   * Cuesta una petición.
   */
  async function learn(login: string, userId: number): Promise<UserTrack> {
    const quests = await client.getUserQuests(userId)
    const validated = quests.filter((quest) => typeof quest.validated_at === 'string')
    const track: Track = validated.some((quest) => quest.quest?.slug === NEXT_QUEST)
      ? 'next'
      : 'classic'
    /** Cuándo validó cada rango: `ranks[2]` es la fecha del `common-core-rank-02`. */
    const ranks: string[] = []

    for (const quest of validated) {
      const match = RANK_QUEST.exec(quest.quest?.slug ?? '')

      if (match !== null) {
        ranks[Number(match[1])] = quest.validated_at ?? ''
      }
    }

    // Los rangos se validan en orden: se cuentan hasta el primero que falte.
    const reached = ranks.findIndex((date) => typeof date !== 'string' || date === '')
    const rank = (reached === -1 ? ranks.length : reached) - 1
    const dates = ranks.slice(0, rank + 1)

    const projects = await db.execute({
      sql: `SELECT pu.project_id, pu.created_at_42
            FROM project_users pu
            JOIN users u ON u.id = pu.user_id
            JOIN projects p ON p.id = pu.project_id
            WHERE u.login = ? AND p.core = 1 AND pu.created_at_42 IS NOT NULL`,
      args: [login],
    })

    await db.batch([
      {
        sql: `INSERT OR REPLACE INTO user_tracks (login, track, rank, ranks, fetched_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [login, track, rank, JSON.stringify(dates), new Date(now()).toISOString()],
      },
      // Lo que votaba antes esta persona (si cambió de plan, en el otro) se rehace.
      { sql: 'DELETE FROM curriculum_votes WHERE login = ?', args: [login] },
      ...projects.rows.map((row) => {
        const created = toText(row.created_at_42)

        return {
          // Su voto: cuántos rangos tenía cuando se apuntó.
          sql: `INSERT OR REPLACE INTO curriculum_votes (track, project_id, login, circle)
                VALUES (?, ?, ?, ?)`,
          args: [
            track,
            toNumber(row.project_id),
            login,
            dates.filter((date) => date <= created).length,
          ],
        }
      }),
    ])

    return { track, rank, ranks: dates }
  }

  const curriculum = {
    learn,

    /** De cada proyecto que va en un grupo de «elige uno», el grupo (`CHOICES`). */
    async choices(): Promise<Map<number, string>> {
      const bySlug = new Map(
        Object.entries(CHOICES).flatMap(([group, slugs]) => slugs.map((slug) => [slug, group])),
      )
      const slugs = [...bySlug.keys()]
      const known = await db.execute({
        sql: `SELECT id, slug FROM projects WHERE ${inList('slug')}`,
        args: [listArg(slugs)],
      })

      return new Map(
        known.rows.flatMap((row) => {
          const group = bySlug.get(toText(row.slug))

          return group === undefined ? [] : [[toNumber(row.id), group] as const]
        }),
      )
    },

    /**
     * Deja al día las horas estimadas de los proyectos de un campus.
     *
     * Vienen todas en un par de peticiones y cambian muy de tarde en tarde, así
     * que se piden como mucho una vez por semana. Si 42 falla, se queda con las
     * que hubiera.
     */
    async ensureHours(campusId: number): Promise<void> {
      const key = `hours:${campusId}`
      const last = await db.execute({
        sql: 'SELECT updated_at FROM sync_state WHERE key = ?',
        args: [key],
      })
      const fetchedAt = last.rows[0] === undefined ? 0 : Date.parse(toText(last.rows[0].updated_at))

      if (now() - fetchedAt < HOURS_TTL_MS || !canSpend()) {
        return
      }

      try {
        const sessions = await client.getProjectSessions(campusId)
        const stamp = new Date(now()).toISOString()

        await db.batch([
          ...sessions.flatMap((session) => {
            const hours = parseHours(session.estimate_time)

            return hours === null
              ? []
              : [
                  {
                    sql: 'UPDATE projects SET hours = ? WHERE id = ?',
                    args: [hours, session.project_id],
                  },
                ]
          }),
          {
            sql: `INSERT OR REPLACE INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)`,
            args: [key, JSON.stringify({ sessions: sessions.length }), stamp],
          },
        ])
      } catch (error) {
        log(
          `horas de los proyectos del campus ${campusId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    },

    /**
     * Nivel, inicio y black hole de alguien en el 42cursus.
     *
     * El login ya lo guarda, pero no basta: quien entró antes de que se
     * guardasen las fechas no las tiene, y la de black hole cambia cuando 42 da
     * días extra. Por eso se vuelve a pedir si falta o tiene más de un día.
     * Si no se puede preguntar, vale lo último que se supo.
     */
    async cursusOf(login: string, userId: number | null): Promise<CursusInfo> {
      const result = await db.execute({
        sql: `SELECT level, begin_at, blackholed_at, updated_at
              FROM user_levels WHERE login = ?`,
        args: [login],
      })
      const row = result.rows[0]
      const known: CursusInfo = {
        level: row === undefined ? null : toNumber(row.level),
        startedAt: typeof row?.begin_at === 'string' ? row.begin_at : null,
        blackholedAt: typeof row?.blackholed_at === 'string' ? row.blackholed_at : null,
      }
      const age = row === undefined ? Infinity : now() - Date.parse(toText(row.updated_at))
      const fresh = known.startedAt !== null && age < TRACK_TTL_MS

      // Un intento al día por persona, salga bien o no: quien no está en el
      // 42cursus no tiene nada que guardar y no debe costar una petición cada vez.
      const tried = now() - (cursusAsked.get(login) ?? -Infinity) < TRACK_TTL_MS

      // Si la cuota va justa, se queda con lo guardado y coge turno en la cola.
      if (fresh || tried || userId === null || !(await quota.defer(login, 'cursus'))) {
        return known
      }

      cursusAsked.set(login, now())

      try {
        const core = (await client.getUserCursus(userId)).find(
          (entry) => entry.cursus_id === CORE_CURSUS_ID,
        )

        if (core === undefined) {
          return known
        }

        const learned: CursusInfo = {
          level: core.level ?? known.level,
          startedAt: core.begin_at ?? known.startedAt,
          blackholedAt: core.blackholed_at ?? null,
        }

        await db.execute({
          sql: `INSERT OR REPLACE INTO user_levels
                  (login, level, begin_at, blackholed_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            login,
            learned.level ?? 0,
            learned.startedAt,
            learned.blackholedAt,
            new Date(now()).toISOString(),
          ],
        })

        return learned
      } catch (error) {
        log(`cursus de ${login}: ${error instanceof Error ? error.message : String(error)}`)

        return known
      }
    },

    /**
     * El plan y el rango de alguien.
     *
     * Se pregunta a 42 como mucho una vez al día por persona. Si no se puede
     * (sin su id, sin cuota, 42 caído), vale lo último que se supo, y si nunca
     * se supo nada, el plan se deduce de sus proyectos y el rango queda sin saber.
     *
     * @returns `rank: null` cuando no se sabe.
     */
    async trackOf(
      login: string,
      userId: number | null,
    ): Promise<{ track: Track; rank: number | null; ranks: string[] }> {
      const known = await stored(login)

      if (known !== null && now() - known.fetchedAt < TRACK_TTL_MS) {
        return known
      }

      if (userId !== null && (await quota.defer(login, 'track'))) {
        try {
          return await learn(login, userId)
        } catch (error) {
          log(`plan de ${login}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      return known ?? { track: await guess(login), rank: null, ranks: [] }
    },

    /**
     * El círculo en que va cada una de esas personas, sin preguntar a 42: el
     * rango que se guardó la última vez que se supo y, si nunca se supo, el
     * círculo más alto en el que tiene algún proyecto (como en el holy graph).
     * Quien no tiene nada de lo que tirar no sale.
     */
    async circlesOf(logins: readonly string[]): Promise<Map<string, number>> {
      const found = new Map<string, number>()

      for (const [login, place] of await curriculum.placesOf(logins)) {
        if (place.circle !== null) found.set(login, place.circle)
      }

      return found
    },

    /**
     * El círculo (si se sabe) y el plan de estudios de cada una de esas
     * personas, sin preguntar a 42. Quien no tiene nada de lo que tirar no sale.
     */
    async placesOf(
      logins: readonly string[],
    ): Promise<Map<string, { circle: number | null; track: Track }>> {
      const found = new Map<string, { circle: number | null; track: Track }>()

      if (logins.length === 0) return found

      const [tracks, projects, classic, next] = await Promise.all([
        db.execute({
          sql: `SELECT login, track, rank FROM user_tracks WHERE ${inList('login')}`,
          args: [listArg(logins)],
        }),
        db.execute({
          sql: `SELECT u.login, pu.project_id, p.slug FROM project_users pu
                JOIN users u ON u.id = pu.user_id
                JOIN projects p ON p.id = pu.project_id
                WHERE ${inList('u.login')}`,
          args: [listArg(logins)],
        }),
        curriculum.circles('classic'),
        curriculum.circles('next'),
      ])
      const known = new Map(
        tracks.rows.map((row) => [
          toText(row.login),
          { track: toText(row.track) === 'next' ? 'next' : 'classic', rank: row.rank },
        ]),
      )
      const byLogin = new Map<string, { ids: number[]; next: boolean }>()

      for (const row of projects.rows) {
        const login = toText(row.login)
        const entry = byLogin.get(login) ?? { ids: [], next: false }
        const slug = toText(row.slug)

        entry.ids.push(toNumber(row.project_id))
        entry.next ||= slug.startsWith('42next-') || slug.startsWith('python-module-')
        byLogin.set(login, entry)
      }

      for (const login of logins) {
        const stored = known.get(login)

        const mine = byLogin.get(login)
        const track: Track = (stored?.track ?? (mine?.next === true ? 'next' : 'classic')) as Track

        if (stored !== undefined && typeof stored.rank === 'number') {
          found.set(login, { circle: Math.min(LAST_CIRCLE, stored.rank + 1), track })
          continue
        }

        if (mine === undefined) {
          if (stored !== undefined) found.set(login, { circle: null, track })
          continue
        }

        const plan = track === 'next' ? next : classic
        const reached = Math.max(-1, ...mine.ids.map((id) => plan.get(id) ?? -1))

        found.set(login, { circle: reached >= 0 ? Math.min(LAST_CIRCLE, reached) : null, track })
      }

      return found
    },

    /**
     * El círculo de cada proyecto de un plan: lo de partida y, en los círculos
     * que la tabla no cubre, lo aprendido por votos. Solo hasta el final del
     * common core.
     */
    async circles(track: Track): Promise<Map<number, number>> {
      const circles = new Map<number, number>()
      const seed = SEED[track]
      const slugs = seed.flat()
      const known = await db.execute({
        sql: `SELECT id, slug FROM projects WHERE ${inList('slug')}`,
        args: [listArg(slugs)],
      })
      const idOf = new Map(known.rows.map((row) => [toText(row.slug), toNumber(row.id)]))

      for (const [circle, entries] of seed.entries()) {
        for (const slug of entries) {
          const projectId = idOf.get(slug)

          // Un slug que saliera en dos círculos se queda en el primero.
          if (projectId !== undefined && !circles.has(projectId)) circles.set(projectId, circle)
        }
      }

      const tally = await db.execute({
        sql: `SELECT project_id, circle, COUNT(*) AS votes FROM curriculum_votes
              WHERE track = ? GROUP BY project_id, circle`,
        args: [track],
      })
      const votes = new Map<number, Map<number, number>>()

      for (const row of tally.rows) {
        const projectId = toNumber(row.project_id)
        const byCircle = votes.get(projectId) ?? new Map<number, number>()

        byCircle.set(toNumber(row.circle), toNumber(row.votes))
        votes.set(projectId, byCircle)
      }

      for (const [projectId, byCircle] of votes) {
        const circle = learnedCircle(byCircle)

        if (
          !circles.has(projectId) &&
          circle !== null &&
          circle > SEEDED_UP_TO[track] &&
          circle <= LAST_CIRCLE
        ) {
          circles.set(projectId, circle)
        }
      }

      return circles
    },
  }

  return curriculum
}

export type Curriculum = ReturnType<typeof createCurriculum>
