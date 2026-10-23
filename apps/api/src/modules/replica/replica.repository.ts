/**
 * Repositorio de la réplica de 42.
 *
 * Aquí se escribe lo que llega de la API y se lee lo que pide la web. Las dos
 * mitades están en el mismo fichero a propósito: lo que se guarda existe solo
 * porque alguna consulta de abajo lo necesita.
 *
 * Todas las escrituras son `INSERT … ON CONFLICT DO UPDATE` y van en un `batch`,
 * que es atómico y, hablando con Turso, un único viaje de red. Recibir dos veces
 * la misma fila no hace daño: por eso la sincronización puede solapar ventanas
 * sin llevar la cuenta de qué ha visto ya.
 */

import type { InStatement } from '@libsql/client'

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { avatarUrlOf } from '../../integrations/forty-two/avatar.js'
import { PROJECT_STATUS } from './replica.domain.js'
import type {
  ApiCampus,
  ApiLocation,
  ApiProjectUser,
  ApiUser,
} from '../../integrations/forty-two/types.js'
import type { CampusSummary, ProjectStatus, ProjectSummary } from '@sanatorio/contracts'

/** Una persona del proyecto, tal y como sale del JOIN. */
type PeerRow = {
  login: string
  image: string | null
  location: string | null
  available: boolean
  status: ProjectStatus
  /** `true` si lo aprobó con la nota máxima. */
  perfect: boolean
  /** `true` si lo aprobó y se ofrece a preevaluar proyectos terminados. */
  preReview: boolean
}

/** Filas por `batch`. Muy por debajo del límite de sentencias de libSQL. */
const BATCH_SIZE = 400

/** La nota de quien lo hace todo, bonus incluidos. */
const PERFECT_MARK = 125

/** Id del 42cursus en 42: el common core y lo que viene después. */
const CORE_CURSUS_ID = 21

/**
 * `p` es del 42cursus. Si aún no se sabe (`core` nulo, filas copiadas antes de
 * guardarlo), vale el nombre: los de la piscina empiezan todos igual.
 */
const IS_CORE = `(p.core = 1 OR (p.core IS NULL
                  AND p.slug NOT LIKE 'c-piscine%' AND p.slug NOT LIKE 'piscine%'))`

/**
 * Condición SQL: el proyecto `p` cuenta como proyecto de la persona `u`.
 *
 * De quien ya es estudiante solo cuentan los del 42cursus: los de la piscina
 * que hizo para entrar no son "sus proyectos". De quien todavía está en la
 * piscina cuentan todos, que es lo único que tiene.
 */
/** `true` si el proyecto es un examen del common core (`exam-rank-03`, `42next-exam-rank-02`). */
function isExam(project: { name?: string | null; slug?: string | null }): boolean {
  return /^(42next-)?exam-rank-/.test(project.slug ?? '')
}

const STUDENT_PROJECT = `(${IS_CORE} OR NOT EXISTS (
    SELECT 1 FROM project_users other JOIN projects p ON p.id = other.project_id
    WHERE other.user_id = u.id AND ${IS_CORE}
  ))`

/** Un texto en minúsculas y sin tildes ni diéresis, como se compara al buscar. */
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function createReplicaRepository(db: Db) {
  /** Ver `searchUsers`: la lista de gente activa, por campus, durante un minuto. */
  const searchable = createTtlCache<
    { login: string; name: string | null; image: string | null; here: boolean }[]
  >({ ttlMs: 60_000, maxEntries: 20 })

  /** Ejecuta las sentencias en lotes atómicos. */
  async function run(statements: InStatement[]): Promise<void> {
    for (let index = 0; index < statements.length; index += BATCH_SIZE) {
      await db.batch(statements.slice(index, index + BATCH_SIZE), 'write')
    }
  }

  return {
    // --- Escritura ---------------------------------------------------------

    /**
     * Guarda una página de `projects_users`.
     *
     * De cada fila salen cuatro cosas: la persona, su pertenencia al campus, el
     * proyecto y el estado. Las filas sin id o sin persona se saltan: sin eso no
     * hay clave con la que guardarlas.
     *
     * @param campusId Campus por el que se filtró la petición, o `undefined` si
     *   las filas vienen del perfil de alguien y no dicen nada del campus.
     * @returns Cuántas filas se han guardado.
     */
    async ingestProjectUsers(
      rows: readonly ApiProjectUser[],
      campusId?: number,
      owner?: ApiUser,
    ): Promise<number> {
      const now = nowIso()
      const statements: InStatement[] = []
      let saved = 0

      for (const row of rows) {
        const user = row.user ?? owner
        const project = row.project

        // Los tipos dicen que los ids son números, pero esto viene de fuera: una
        // fila sin ellos no tiene clave con la que guardarse.
        if (
          !isId(row.id) ||
          user === undefined ||
          !isId(user.id) ||
          project === undefined ||
          project === null ||
          !isId(project.id)
        ) {
          continue
        }

        // Si la persona viene anidada se actualiza; si es la dueña del perfil,
        // ya la guardó quien llamó.
        if (row.user !== undefined && row.user !== null) {
          statements.push(upsertUser(user, now))
        }
        if (campusId !== undefined) {
          statements.push(upsertMember(campusId, user.id))
        }
        if (typeof project.name === 'string' && project.name !== '') {
          // `core` solo se pisa si esta fila dice a qué cursus pertenece.
          statements.push({
            sql: `INSERT INTO projects (id, name, slug, core) VALUES (?, ?, ?, ?)
                  ON CONFLICT (id) DO UPDATE SET
                    name = excluded.name,
                    slug = excluded.slug,
                    core = COALESCE(excluded.core, projects.core)`,
            args: [project.id, project.name, project.slug ?? null, coreOf(row)],
          })
        }

        statements.push({
          sql: `INSERT INTO project_users
                  (id, user_id, project_id, status, validated, final_mark, updated_at_42,
                   created_at_42, occurrence, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                  created_at_42 = COALESCE(excluded.created_at_42, project_users.created_at_42),
                  status        = excluded.status,
                  validated     = excluded.validated,
                  final_mark    = excluded.final_mark,
                  updated_at_42 = excluded.updated_at_42,
                  occurrence    = COALESCE(excluded.occurrence, project_users.occurrence),
                  synced_at     = excluded.synced_at`,
          args: [
            row.id,
            user.id,
            project.id,
            row.status,
            triState(row['validated?']),
            typeof row.final_mark === 'number' ? Math.round(row.final_mark) : null,
            row.updated_at ?? null,
            row.created_at ?? null,
            typeof row.occurrence === 'number' ? row.occurrence : null,
            now,
          ],
        })

        // Los intentos de un examen, con su nota: para sus estadísticas.
        if (isExam(project) && Array.isArray(row.teams)) {
          for (const team of row.teams) {
            if (!isId(team.id)) continue

            statements.push({
              sql: `INSERT OR REPLACE INTO exam_attempts
                      (team_id, project_user_id, user_id, project_id, mark, validated, at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [
                team.id,
                row.id,
                user.id,
                project.id,
                typeof team.final_mark === 'number' ? Math.round(team.final_mark) : null,
                triState(team['validated?']),
                team.closed_at ?? team.created_at ?? null,
              ],
            })
          }
        }
        saved += 1
      }

      await run(statements)

      return saved
    },

    /** Guarda a una persona suelta (la que acaba de entrar) y su campus. */
    async ingestUser(user: ApiUser, campusIds: readonly number[]): Promise<void> {
      const now = nowIso()

      const core = user.cursus_users?.find((entry) => entry.cursus_id === CORE_CURSUS_ID)
      const level = core?.level

      await run([
        upsertUser(user, now),
        ...campusIds.map((campusId) => upsertMember(campusId, user.id)),
        // El nivel solo viene en el perfil completo (el del login).
        ...(typeof level === 'number'
          ? [
              {
                sql: `INSERT OR REPLACE INTO user_levels
                        (login, level, begin_at, blackholed_at, updated_at)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [user.login, level, core?.begin_at ?? null, core?.blackholed_at ?? null, now],
              },
            ]
          : []),
      ])
    },

    /**
     * Sustituye la foto de puestos de un campus.
     *
     * Borrar y volver a insertar dentro del mismo `batch` es lo que hace que
     * quien se ha levantado desaparezca: la API solo manda a los que siguen
     * sentados, así que no hay "fila de salida" que procesar.
     */
    async replacePresence(campusId: number, locations: readonly ApiLocation[]): Promise<number> {
      const now = nowIso()
      const statements: InStatement[] = [
        { sql: 'DELETE FROM presence WHERE campus_id = ?', args: [campusId] },
      ]
      let saved = 0

      for (const location of locations) {
        const user = location.user

        if (user === undefined || user === null || !isId(user.id) || !isText(location.host)) {
          continue
        }

        statements.push(upsertUser(user, now), {
          // `ON CONFLICT` por si alguien tiene dos sesiones abiertas: gana la
          // última que venga, que es tan buena como la otra para ir a buscarle.
          sql: `INSERT INTO presence (user_id, campus_id, host, begin_at, seen_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (user_id) DO UPDATE SET
                  campus_id = excluded.campus_id,
                  host      = excluded.host,
                  begin_at  = excluded.begin_at,
                  seen_at   = excluded.seen_at`,
          args: [user.id, campusId, location.host, location.begin_at ?? null, now],
        })
        // El plano del campus no lo da la API: se aprende de dónde se sienta la gente.
        statements.push({
          sql: `INSERT INTO seats (campus_id, host, seen_at) VALUES (?, ?, ?)
                ON CONFLICT (campus_id, host) DO UPDATE SET seen_at = excluded.seen_at`,
          args: [campusId, location.host, now],
        })
        saved += 1
      }

      await run(statements)

      return saved
    },

    /** Id en 42 de una persona, o `null` si no está en la réplica. */
    async userIdOf(login: string): Promise<number | null> {
      const result = await db.execute({
        sql: 'SELECT id FROM users WHERE login = ?',
        args: [login],
      })
      const row = result.rows[0]

      return row === undefined ? null : toNumber(row.id)
    },

    /** Nombre y horas estimadas de cada uno de esos proyectos. Los que no se conocen no salen. */
    async projectInfo(
      ids: readonly number[],
    ): Promise<Map<number, { name: string; hours: number | null }>> {
      if (ids.length === 0) {
        return new Map()
      }

      const result = await db.execute({
        sql: `SELECT id, name, hours FROM projects WHERE ${inList('id')}`,
        args: [listArg(ids)],
      })

      return new Map(
        result.rows.map((row) => [
          toNumber(row.id),
          { name: toText(row.name), hours: row.hours === null ? null : toNumber(row.hours) },
        ]),
      )
    },

    /** Ids de los proyectos que alguien aprobó con la nota máxima. */
    async perfectProjectsOf(login: string): Promise<Set<number>> {
      const result = await db.execute({
        sql: `SELECT DISTINCT pu.project_id FROM project_users pu
              JOIN users u ON u.id = pu.user_id
              WHERE u.login = ? AND pu.status = 'finished' AND pu.validated = 1
                AND pu.final_mark >= ?`,
        args: [login, PERFECT_MARK],
      })

      return new Set(result.rows.map((row) => toNumber(row.project_id)))
    },

    /**
     * Nivel de alguien en el 42cursus y cuándo lo empezó. Los dos a `null` si no
     * ha entrado desde que se guardan.
     */
    async cursusOf(login: string): Promise<{
      level: number | null
      startedAt: string | null
      blackholedAt: string | null
    }> {
      const result = await db.execute({
        sql: 'SELECT level, begin_at, blackholed_at FROM user_levels WHERE login = ?',
        args: [login],
      })
      const row = result.rows[0]

      return row === undefined
        ? { level: null, startedAt: null, blackholedAt: null }
        : {
            level: toNumber(row.level),
            startedAt: typeof row.begin_at === 'string' ? row.begin_at : null,
            blackholedAt: typeof row.blackholed_at === 'string' ? row.blackholed_at : null,
          }
    },

    /**
     * La mejor nota con la que cada una de esas personas aprobó alguno de esos
     * proyectos. Quien no aprobó ninguno no sale.
     */
    async bestMarksIn(
      logins: readonly string[],
      projectIds: readonly number[],
    ): Promise<Map<string, number>> {
      const marks = new Map<string, number>()

      if (projectIds.length === 0) return marks

      const result = await db.execute({
        sql: `SELECT u.login, MAX(pu.final_mark) AS mark
              FROM users u
              JOIN project_users pu ON pu.user_id = u.id
              WHERE ${inList('u.login')}
                AND ${inList('pu.project_id')}
                AND pu.status = 'finished' AND pu.validated = 1 AND pu.final_mark IS NOT NULL
              GROUP BY u.login`,
        args: [listArg(logins), listArg(projectIds)],
      })

      for (const row of result.rows) marks.set(toText(row.login), toNumber(row.mark))

      return marks
    },

    /** Nombres de los proyectos que tiene en curso cada una de esas personas. */
    async activeProjectsOf(logins: readonly string[]): Promise<Map<string, string[]>> {
      const projects = new Map<string, string[]>()

      const result = await db.execute({
        sql: `SELECT u.login, p.name
              FROM users u
              JOIN project_users pu ON pu.user_id = u.id AND pu.status = 'in_progress'
              JOIN projects p ON p.id = pu.project_id
              WHERE ${inList('u.login')}
                AND ${STUDENT_PROJECT}
              ORDER BY pu.updated_at_42 DESC`,
        args: [listArg(logins)],
      })

      for (const row of result.rows) {
        const login = toText(row.login)

        projects.set(login, [...(projects.get(login) ?? []), toText(row.name)])
      }

      return projects
    },

    /** Puestos del campus que se han visto ocupados alguna vez. */
    async knownSeats(campusId: number): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT host FROM seats WHERE campus_id = ?',
        args: [campusId],
      })

      return result.rows.map((row) => toText(row.host))
    },

    /**
     * Quién está sentado dónde en un campus, según la última foto de puestos.
     *
     * @param since Las filas más viejas que esto no se creen. Ver `LOCATION_MAX_AGE_MS`.
     */
    async presenceIn(
      campusId: number,
      since: string,
    ): Promise<{ login: string; image: string | null; host: string; beginAt: string | null }[]> {
      const result = await db.execute({
        sql: `SELECT u.login, u.image, p.host, p.begin_at
              FROM presence p JOIN users u ON u.id = p.user_id
              WHERE p.campus_id = ? AND p.seen_at >= ?`,
        args: [campusId, since],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        image: typeof row.image === 'string' ? row.image : null,
        host: toText(row.host),
        // Cuándo inició sesión en ese puesto, si 42 lo dice.
        beginAt: typeof row.begin_at === 'string' ? row.begin_at : null,
      }))
    },

    /** Guarda el catálogo de campus. */
    async upsertCampuses(campuses: readonly ApiCampus[]): Promise<void> {
      const now = nowIso()

      await run(
        campuses
          .filter((campus) => isId(campus.id) && isText(campus.name))
          .map((campus) => ({
            sql: `INSERT INTO campuses (id, name, city, country, time_zone, users_count, synced_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT (id) DO UPDATE SET
                    name        = excluded.name,
                    city        = excluded.city,
                    country     = excluded.country,
                    time_zone   = excluded.time_zone,
                    users_count = excluded.users_count,
                    synced_at   = excluded.synced_at`,
            args: [
              campus.id,
              campus.name,
              campus.city ?? null,
              campus.country ?? null,
              campus.time_zone ?? null,
              campus.users_count ?? null,
              now,
            ],
          })),
      )
    },

    // --- Lectura -----------------------------------------------------------

    /**
     * Quién puede atender en un proyecto, ya filtrado y ordenado.
     *
     * Todo lo que antes eran 21 peticiones a la API es este JOIN. Se devuelven
     * solo los accionables:
     *
     * - quien lo está haciendo (`in_progress`) y sigue activo en 42, y
     * - quien lo aprobó (`finished` y validado) **y** está de guardia: disponible
     *   y con puesto. Un especialista fuera de turno no aporta a la lista, y en
     *   proyectos comunes son cientos.
     *
     * El puesto solo se cree si la foto del campus es posterior a
     * `presenceSince`; si no, sale `null` antes que afirmar algo viejo.
     */
    async findPeers(params: {
      projectId: number
      campusId: number
      excludeLogin?: string | undefined
      presenceSince: string
      limit?: number
    }): Promise<PeerRow[]> {
      const result = await db.execute({
        sql: `SELECT u.login                    AS login,
                     u.image                    AS image,
                     pr.host                    AS location,
                     COALESCE(a.available, 0)   AS available,
                     pu.status                  AS status,
                     pu.final_mark              AS mark,
                     COALESCE(pf.pre_review, 0) AS pre_review
              FROM project_users pu
              JOIN users u            ON u.id = pu.user_id
              JOIN campus_members cm  ON cm.user_id = u.id AND cm.campus_id = ?
              LEFT JOIN presence pr   ON pr.user_id = u.id AND pr.seen_at >= ?
              LEFT JOIN availability a ON a.login = u.login
              LEFT JOIN profiles pf    ON pf.login = u.login
              WHERE pu.project_id = ?
                AND u.login <> ?
                AND (
                  (pu.status = 'in_progress' AND u.active = 1)
                  OR (pu.status = 'finished' AND pu.validated = 1
                      AND a.available = 1 AND pr.host IS NOT NULL)
                )
              ORDER BY (pr.host IS NOT NULL AND COALESCE(a.available, 0) = 1) DESC,
                       (pr.host IS NOT NULL) DESC,
                       pu.updated_at_42 DESC
              LIMIT ?`,
        args: [
          params.campusId,
          params.presenceSince,
          params.projectId,
          params.excludeLogin ?? '',
          params.limit ?? 300,
        ],
      })

      // Una persona puede tener más de una fila en el mismo proyecto (un
      // reintento). Se queda la primera, que por el orden es la más útil.
      const seen = new Set<string>()
      const peers: PeerRow[] = []

      for (const row of result.rows) {
        const login = toText(row.login)

        if (seen.has(login)) {
          continue
        }
        seen.add(login)

        peers.push({
          login,
          image: typeof row.image === 'string' ? row.image : null,
          location: typeof row.location === 'string' ? row.location : null,
          available: Number(row.available) === 1,
          status:
            row.status === PROJECT_STATUS.FINISHED
              ? PROJECT_STATUS.FINISHED
              : PROJECT_STATUS.IN_PROGRESS,
          perfect: row.status === PROJECT_STATUS.FINISHED && toNumber(row.mark) >= PERFECT_MARK,
          // Preevaluar solo tiene sentido en lo que ya se aprobó.
          preReview: row.status === PROJECT_STATUS.FINISHED && Number(row.pre_review) === 1,
        })
      }

      return peers
    },

    /** Personas del campus con alguna fila en el proyecto, hagan lo que hagan. */
    /** Logins de quienes tienen ese proyecto en curso en ese campus. */
    async doingProject(projectId: number, campusId: number): Promise<string[]> {
      const result = await db.execute({
        sql: `SELECT DISTINCT u.login
              FROM project_users pu
              JOIN users u ON u.id = pu.user_id
              JOIN campus_members cm ON cm.user_id = pu.user_id AND cm.campus_id = ?
              WHERE pu.project_id = ? AND pu.status = 'in_progress'
              ORDER BY u.login`,
        args: [campusId, projectId],
      })

      return result.rows.map((row) => toText(row.login))
    },

    async countParticipants(projectId: number, campusId: number): Promise<number> {
      const result = await db.execute({
        sql: `SELECT COUNT(DISTINCT pu.user_id) AS total
              FROM project_users pu
              JOIN campus_members cm ON cm.user_id = pu.user_id AND cm.campus_id = ?
              WHERE pu.project_id = ?`,
        args: [campusId, projectId],
      })

      return toNumber(result.rows[0]?.total)
    },

    /**
     * Proyectos de una persona.
     *
     * `in_progress` siempre; con `includeFinished`, también los aprobados, que
     * son en los que puede responder como especialista.
     */
    async projectsOf(login: string, includeFinished = false): Promise<ProjectSummary[]> {
      const result = await db.execute({
        sql: `SELECT p.id AS id, p.name AS name,
                     MAX(CASE WHEN pu.status = 'in_progress' THEN 1 ELSE 0 END) AS doing
              FROM project_users pu
              JOIN users u    ON u.id = pu.user_id
              JOIN projects p ON p.id = pu.project_id
              WHERE u.login = ?
                AND (pu.status = 'in_progress'
                     OR (? = 1 AND pu.status = 'finished' AND pu.validated = 1))
                AND ${STUDENT_PROJECT}
              GROUP BY p.id, p.name
              ORDER BY doing DESC, p.name COLLATE NOCASE`,
        args: [login, includeFinished ? 1 : 0],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        name: toText(row.name),
        ...(includeFinished
          ? {
              status:
                toNumber(row.doing) === 1 ? PROJECT_STATUS.IN_PROGRESS : PROJECT_STATUS.FINISHED,
            }
          : {}),
      }))
    },

    /** `true` si ya hay alguna fila de proyectos de esta persona. */
    async hasProjectsOf(login: string): Promise<boolean> {
      const result = await db.execute({
        sql: `SELECT 1 FROM project_users pu JOIN users u ON u.id = pu.user_id
              WHERE u.login = ? LIMIT 1`,
        args: [login],
      })

      return result.rows.length > 0
    },

    /** `true` si la persona aprobó el proyecto: es "especialista" en él. */
    async isSpecialist(login: string, projectId: number): Promise<boolean> {
      const result = await db.execute({
        sql: `SELECT 1 FROM project_users pu JOIN users u ON u.id = pu.user_id
              WHERE u.login = ? AND pu.project_id = ?
                AND pu.status = 'finished' AND pu.validated = 1
              LIMIT 1`,
        args: [login, projectId],
      })

      return result.rows.length > 0
    },

    /** Nombre de un proyecto, o `null` si aún no se ha visto ninguna fila suya. */
    async projectName(projectId: number): Promise<string | null> {
      const result = await db.execute({
        sql: 'SELECT name FROM projects WHERE id = ?',
        args: [projectId],
      })
      const name = result.rows[0]?.name

      return typeof name === 'string' ? name : null
    },

    /** Nombres de varios proyectos de una vez. Los que no se conocen no salen. */
    async projectNames(projectIds: readonly number[]): Promise<Map<number, string>> {
      const names = new Map<number, string>()

      if (projectIds.length === 0) {
        return names
      }

      const result = await db.execute({
        sql: `SELECT id, name FROM projects WHERE ${inList('id')}`,
        args: [listArg(projectIds)],
      })

      for (const row of result.rows) {
        names.set(toNumber(row.id), toText(row.name))
      }

      return names
    },

    /**
     * Con qué notas ha acabado la gente cada proyecto, separando los que se
     * dieron por buenos de los que no. De aquí se deduce la nota mínima de cada
     * proyecto, que la API no publica.
     */
    async finalMarks(): Promise<
      { projectId: number; validated: boolean; mark: number; people: number }[]
    > {
      const result = await db.execute(
        `SELECT project_id, validated, final_mark, COUNT(*) AS people FROM project_users
         WHERE status = 'finished' AND final_mark IS NOT NULL AND validated IS NOT NULL
         GROUP BY project_id, validated, final_mark`,
      )

      return result.rows.map((row) => ({
        projectId: toNumber(row.project_id),
        validated: toNumber(row.validated) === 1,
        mark: toNumber(row.final_mark),
        people: toNumber(row.people),
      }))
    },

    /**
     * Año en que empezó el 42cursus y plan de estudios de cada persona de la que
     * se sabe. Para agrupar a la gente en las estadísticas de uso.
     */
    async cohorts(): Promise<Map<string, { year: number | null; track: string | null }>> {
      const result = await db.execute(
        `SELECT login, MAX(begin_at) AS begin_at, MAX(track) AS track FROM (
           SELECT login, begin_at, NULL AS track FROM user_levels
           UNION ALL
           SELECT login, NULL AS begin_at, track FROM user_tracks
         ) GROUP BY login`,
      )

      return new Map(
        result.rows.map((row) => [
          toText(row.login),
          {
            year: typeof row.begin_at === 'string' ? Number(row.begin_at.slice(0, 4)) : null,
            track: typeof row.track === 'string' ? row.track : null,
          },
        ]),
      )
    },

    /** Logins de toda la gente de un campus, con su avatar. */
    async membersOf(campusId: number): Promise<Map<string, string | null>> {
      const result = await db.execute({
        sql: `SELECT u.login, u.image FROM campus_members m
              JOIN users u ON u.id = m.user_id WHERE m.campus_id = ?`,
        args: [campusId],
      })

      return new Map(
        result.rows.map((row) => [
          toText(row.login),
          typeof row.image === 'string' ? row.image : null,
        ]),
      )
    },

    /** `true` si conocemos a alguien con ese login. */
    async userExists(login: string): Promise<boolean> {
      const result = await db.execute({
        sql: 'SELECT 1 FROM users WHERE login = ? LIMIT 1',
        args: [login],
      })

      return result.rows.length > 0
    },

    /**
     * Personas cuyo login o nombre lleva lo escrito, sin distinguir mayúsculas
     * ni tildes: «garcia» encuentra a «García» y «munoz», a «Muñoz». Primero
     * las de `campusId`, y dentro, las que empiezan por lo escrito.
     *
     * Se compara aquí y no en la consulta: SQLite no sabe quitar tildes ni
     * pasar a minúsculas una letra que las lleve. Son unos miles de filas.
     */
    async searchUsers(
      text: string,
      campusId: number,
      limit: number,
    ): Promise<{ login: string; name: string | null; image: string | null }[]> {
      const wanted = plain(text)
      // La gente activa, ya normalizada, se recuerda un minuto por campus: cada
      // tecla del buscador no vuelve a leer y ordenar miles de filas.
      const people = await searchable.get(String(campusId), async () => {
        const result = await db.execute({
          sql: `SELECT u.login, u.name, u.image,
                       EXISTS (SELECT 1 FROM campus_members m
                               WHERE m.user_id = u.id AND m.campus_id = ?) AS here
                FROM users u WHERE u.active = 1`,
          args: [campusId],
        })

        return result.rows.map((row) => ({
          login: toText(row.login),
          name: typeof row.name === 'string' && row.name !== '' ? row.name : null,
          image: typeof row.image === 'string' ? row.image : null,
          here: toNumber(row.here) === 1,
        }))
      })

      return people
        .filter(
          (person) =>
            plain(person.login).includes(wanted) || plain(person.name ?? '').includes(wanted),
        )
        .sort(
          (a, b) =>
            Number(b.here) - Number(a.here) ||
            Number(plain(b.login).startsWith(wanted)) - Number(plain(a.login).startsWith(wanted)) ||
            (a.login < b.login ? -1 : 1),
        )
        .slice(0, limit)
        .map(({ here: _, ...person }) => person)
    },

    /** Avatares de una lista de logins, para pintar grupos y dudas. */
    async imagesOf(logins: readonly string[]): Promise<Map<string, string | null>> {
      const images = new Map<string, string | null>()
      const unique = [...new Set(logins)]

      if (unique.length === 0) {
        return images
      }

      const result = await db.execute({
        sql: `SELECT login, image FROM users WHERE ${inList('login')}`,
        args: [listArg(unique)],
      })

      for (const row of result.rows) {
        images.set(toText(row.login), typeof row.image === 'string' ? row.image : null)
      }

      return images
    },

    /**
     * Puesto actual de una persona, o `null`.
     *
     * Con la misma regla de frescura que la lista de compañeros.
     */
    async locationOf(login: string, presenceSince: string): Promise<string | null> {
      const result = await db.execute({
        sql: `SELECT pr.host AS host FROM presence pr JOIN users u ON u.id = pr.user_id
              WHERE u.login = ? AND pr.seen_at >= ?`,
        args: [login, presenceSince],
      })
      const host = result.rows[0]?.host

      return typeof host === 'string' ? host : null
    },

    /** Campus conocidos, con los replicados primero. */
    async listCampuses(tracked: readonly number[]): Promise<CampusSummary[]> {
      const result = await db.execute('SELECT id, name, city, country FROM campuses ORDER BY name')
      const campuses = result.rows.map((row) => ({
        id: toNumber(row.id),
        name: toText(row.name),
        city: typeof row.city === 'string' ? row.city : null,
        country: typeof row.country === 'string' ? row.country : null,
        tracked: tracked.includes(toNumber(row.id)),
      }))

      return campuses.sort((a, b) => Number(b.tracked) - Number(a.tracked))
    },

    /** Zona horaria de un campus, o `undefined` si no se conoce. */
    async timeZoneOf(campusId: number): Promise<string | undefined> {
      const result = await db.execute({
        sql: 'SELECT time_zone FROM campuses WHERE id = ?',
        args: [campusId],
      })
      const zone = result.rows[0]?.time_zone

      return typeof zone === 'string' && zone !== '' ? zone : undefined
    },

    /** Tamaño de la réplica, para el panel de estado. */
    async counts(): Promise<{
      users: number
      projectUsers: number
      projects: number
      present: number
    }> {
      const result = await db.execute(
        `SELECT (SELECT COUNT(*) FROM users)         AS users,
                (SELECT COUNT(*) FROM project_users) AS project_users,
                (SELECT COUNT(*) FROM projects)      AS projects,
                (SELECT COUNT(*) FROM presence)      AS present`,
      )
      const row = result.rows[0]

      return {
        users: toNumber(row?.users),
        projectUsers: toNumber(row?.project_users),
        projects: toNumber(row?.projects),
        present: toNumber(row?.present),
      }
    },

    // --- Estado de la sincronización ----------------------------------------

    /** Lee el estado de una tarea, o `undefined` si nunca ha corrido. */
    async getState<T>(key: string): Promise<T | undefined> {
      const result = await db.execute({
        sql: 'SELECT value FROM sync_state WHERE key = ?',
        args: [key],
      })
      const value = result.rows[0]?.value

      if (typeof value !== 'string') {
        return undefined
      }

      try {
        return JSON.parse(value) as T
      } catch {
        // Un estado ilegible se trata como si no existiera: la tarea vuelve a
        // empezar, que es más lento pero nunca incorrecto.
        return undefined
      }
    },

    /** Guarda el estado de una tarea. */
    async setState(key: string, value: unknown): Promise<void> {
      await db.execute({
        sql: `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT (key) DO UPDATE SET
                value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, JSON.stringify(value), nowIso()],
      })
    },
  }
}

export type ReplicaRepository = ReturnType<typeof createReplicaRepository>

/**
 * `INSERT` de una persona.
 *
 * Solo se guardan login, nombre, avatar y si sigue activa. El resto de lo que
 * manda la API (email, teléfono, wallet…) no llega a tocar la base.
 */
/** `1` si la fila es del 42cursus, `0` si es de otro cursus, `null` si no lo dice. */
function coreOf(row: ApiProjectUser): number | null {
  if (!Array.isArray(row.cursus_ids)) {
    return null
  }

  return row.cursus_ids.includes(CORE_CURSUS_ID) ? 1 : 0
}

function upsertUser(user: ApiUser, now: string): InStatement {
  return {
    // `OR REPLACE` y no `ON CONFLICT (id)`: el login también es único, y 42
    // recicla logins al anonimizar cuentas. Si llega un id nuevo con un login
    // que ya teníamos, la fila vieja se va en vez de tumbar el lote entero.
    sql: `INSERT OR REPLACE INTO users (id, login, name, image, active, synced_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      user.id,
      user.login,
      typeof user.usual_full_name === 'string' ? user.usual_full_name : null,
      avatarUrlOf(user.image),
      // Solo `false` explícito cuenta como inactiva: si el campo no viene, no se
      // puede afirmar que lo sea.
      user['active?'] === false ? 0 : 1,
      now,
    ],
  }
}

function upsertMember(campusId: number, userId: number): InStatement {
  return {
    sql: 'INSERT INTO campus_members (campus_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
    args: [campusId, userId],
  }
}

/** `true`/`false`/`null` de la API a `1`/`0`/`NULL` de SQLite. */
function triState(value: boolean | null | undefined): number | null {
  if (value === true) {
    return 1
  }

  return value === false ? 0 : null
}

/** `true` si el valor sirve como id: un entero positivo. */
function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/** `true` si el valor es un texto con algo dentro. */
function isText(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}
