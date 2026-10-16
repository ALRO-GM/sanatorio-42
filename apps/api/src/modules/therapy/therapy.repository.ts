/**
 * Terapias de grupo: grupos, miembros y asistencia. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

export type GroupRow = {
  id: number
  campusId: number
  projectId: number
  projectName: string | null
  creator: string
  place: string
  /** Días concretos de quedada (`YYYY-MM-DD`), en orden. */
  dates: string[]
  start: string
  end: string
  capacity: number
  note: string | null
  /** Puestos reservados para el grupo. */
  seats: string[]
  closed: boolean
  members: string[]
  /** Cómo llevaba el proyecto cada persona al apuntarse (0-100), si lo dijo. */
  progress: Record<string, number | null>
  kind: 'study' | 'review'
  /** A cuántas personas se avisó del grupo, o `null` si aún no. */
  invited: number | null
}

/**
 * Condición SQL de "grupo abierto": sin cerrar y con alguien dentro.
 *
 * Un grupo se cierra al salir su última persona, pero la condición lo exige
 * además aquí: un grupo vacío no tiene que salir en ninguna lista, ni en el
 * calendario, ni reservar puestos en el mapa, pase lo que pase.
 */
const OPEN = `g.closed = 0 AND EXISTS (SELECT 1 FROM therapy_members m WHERE m.group_id = g.id)`

export function createTherapyRepository(db: Db) {
  async function membersOf(
    groupIds: readonly number[],
  ): Promise<Map<number, { login: string; progress: number | null }[]>> {
    const members = new Map<number, { login: string; progress: number | null }[]>()

    if (groupIds.length === 0) {
      return members
    }

    const result = await db.execute({
      sql: `SELECT group_id, login, progress FROM therapy_members
            WHERE group_id IN (${groupIds.map(() => '?').join(', ')})
            ORDER BY joined_at`,
      args: [...groupIds],
    })

    for (const row of result.rows) {
      const id = toNumber(row.group_id)

      members.set(id, [
        ...(members.get(id) ?? []),
        {
          login: toText(row.login),
          progress: row.progress === null ? null : toNumber(row.progress),
        },
      ])
    }

    return members
  }

  async function select(where: string, args: (string | number)[]): Promise<GroupRow[]> {
    const result = await db.execute({
      sql: `SELECT g.*, p.name AS project_name
            FROM therapy_groups g LEFT JOIN projects p ON p.id = g.project_id
            WHERE ${where}
            ORDER BY g.created_at DESC`,
      args,
    })
    const members = await membersOf(result.rows.map((row) => toNumber(row.id)))

    return result.rows.map((row) => ({
      id: toNumber(row.id),
      campusId: toNumber(row.campus_id),
      projectId: toNumber(row.project_id),
      projectName: typeof row.project_name === 'string' ? row.project_name : null,
      creator: toText(row.creator),
      place: toText(row.place),
      dates: toText(row.dates)
        .split(',')
        .filter((date) => date !== ''),
      start: toText(row.start_time),
      end: toText(row.end_time),
      capacity: toNumber(row.capacity),
      note: typeof row.note === 'string' ? row.note : null,
      seats: toText(row.seats)
        .split(',')
        .filter((host) => host !== ''),
      closed: toNumber(row.closed) === 1,
      members: (members.get(toNumber(row.id)) ?? []).map((member) => member.login),
      progress: Object.fromEntries(
        (members.get(toNumber(row.id)) ?? []).map((member) => [member.login, member.progress]),
      ),
      kind: toText(row.kind) === 'review' ? 'review' : 'study',
      invited: row.invited === null || row.invited === undefined ? null : toNumber(row.invited),
    }))
  }

  return {
    /** Grupos abiertos de un campus; con `projectId`, solo los de ese proyecto. */
    async listOpen(campusId: number, projectId?: number): Promise<GroupRow[]> {
      return projectId === undefined
        ? select(`g.campus_id = ? AND ${OPEN}`, [campusId])
        : select(`g.campus_id = ? AND ${OPEN} AND g.project_id = ?`, [campusId, projectId])
    },

    /** Grupos abiertos de todos los campus, para la comprobación de asistencia. */
    async listAllOpen(): Promise<GroupRow[]> {
      return select(OPEN, [])
    },

    /**
     * Apunta la comprobación de asistencia de una media hora.
     *
     * @returns `false` si esa media hora ya se había comprobado.
     */
    async recordCheck(check: {
      groupId: number
      day: string
      slot: number
      present: readonly string[]
      at: string
    }): Promise<boolean> {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO therapy_checks (group_id, day, slot, present, checked_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [check.groupId, check.day, check.slot, check.present.join(','), check.at],
      })

      return result.rowsAffected > 0
    },

    async get(id: number): Promise<GroupRow | undefined> {
      return (await select('g.id = ?', [id]))[0]
    },

    /** Crea el grupo con quien lo abre ya dentro. */
    async create(group: {
      campusId: number
      projectId: number
      creator: string
      place: string
      dates: readonly string[]
      start: string
      end: string
      capacity: number
      note: string | null
      seats: readonly string[]
      kind: 'study' | 'review'
      /** Cómo lleva el proyecto quien lo abre. */
      progress: number | null
    }): Promise<number> {
      const now = nowIso()
      const result = await db.execute({
        sql: `INSERT INTO therapy_groups
                (campus_id, project_id, creator, place, dates, last_date, start_time, end_time,
                 capacity, note, seats, kind, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          group.campusId,
          group.projectId,
          group.creator,
          group.place,
          group.dates.join(','),
          group.dates.at(-1) ?? null,
          group.start,
          group.end,
          group.capacity,
          group.note,
          group.seats.join(','),
          group.kind,
          now,
        ],
      })
      const id = toNumber(result.lastInsertRowid)

      await db.execute({
        sql: `INSERT INTO therapy_members (group_id, login, joined_at, progress)
              VALUES (?, ?, ?, ?)`,
        args: [id, group.creator, now, group.progress],
      })

      return id
    },

    /** Cambia los datos de un grupo. Quién puede y qué vale lo decide el servicio. */
    async update(
      id: number,
      group: {
        projectId: number
        place: string
        dates: readonly string[]
        start: string
        end: string
        capacity: number
        note: string | null
        seats: readonly string[]
      },
    ): Promise<void> {
      await db.execute({
        sql: `UPDATE therapy_groups SET
                project_id = ?, place = ?, dates = ?, last_date = ?, start_time = ?,
                end_time = ?, capacity = ?, note = ?, seats = ?
              WHERE id = ?`,
        args: [
          group.projectId,
          group.place,
          group.dates.join(','),
          group.dates.at(-1) ?? null,
          group.start,
          group.end,
          group.capacity,
          group.note,
          group.seats.join(','),
          id,
        ],
      })
    },

    /**
     * Cierra los grupos cuyo último día ya ha pasado.
     *
     * @param today El día de hoy en el campus, `YYYY-MM-DD`.
     */
    async closeFinished(campusId: number, today: string): Promise<void> {
      await db.execute({
        sql: `UPDATE therapy_groups SET closed = 1
              WHERE campus_id = ? AND closed = 0 AND last_date IS NOT NULL AND last_date < ?`,
        args: [campusId, today],
      })
    },

    /**
     * Apunta a alguien **solo si queda plaza**.
     *
     * La comprobación va en la misma sentencia que el `INSERT`: con dos
     * peticiones a la vez por la última plaza, solo una la consigue.
     */
    async join(id: number, login: string, progress: number | null = null): Promise<boolean> {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO therapy_members (group_id, login, joined_at, progress)
              SELECT g.id, ?, ?, ? FROM therapy_groups g
              WHERE g.id = ? AND g.closed = 0
                AND (SELECT COUNT(*) FROM therapy_members m WHERE m.group_id = g.id) < g.capacity`,
        args: [login, nowIso(), progress, id],
      })

      return result.rowsAffected > 0
    },

    async leave(id: number, login: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM therapy_members WHERE group_id = ? AND login = ?',
        args: [id, login],
      })
    },

    /**
     * Apunta a cuántas personas se avisó. `false` si ya se había avisado: dos
     * pulsaciones a la vez no avisan dos veces.
     */
    async markInvited(id: number, people: number): Promise<boolean> {
      const result = await db.execute({
        sql: 'UPDATE therapy_groups SET invited = ? WHERE id = ? AND invited IS NULL',
        args: [people, id],
      })

      return result.rowsAffected > 0
    },

    async close(id: number): Promise<void> {
      await db.execute({ sql: 'UPDATE therapy_groups SET closed = 1 WHERE id = ?', args: [id] })
    },

    /** Grupos abiertos que ha creado alguien. Para el tope por persona. */
    async countOpenBy(creator: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM therapy_groups WHERE creator = ? AND closed = 0',
        args: [creator],
      })

      return toNumber(result.rows[0]?.total)
    },
  }
}

export type TherapyRepository = ReturnType<typeof createTherapyRepository>
