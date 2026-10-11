/**
 * Tablón de dudas: post-its, respuestas, guía y propuestas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

export type DoubtRow = {
  id: number
  campusId: number
  projectId: number
  author: string
  body: string
  color: number
  resolved: boolean
  /** La respuesta que la resolvió, o `null`. */
  solvedAnswerId: number | null
  createdAt: string
  answers: number
  /** `true` si alguna respuesta es de alguien que aprobó el proyecto. */
  specialistAnswered: boolean
}

export type AnswerRow = {
  id: number
  author: string
  body: string
  specialist: boolean
  createdAt: string
}

export type GuideRow = {
  start: string[]
  problems: string[]
  concepts: string[]
  updatedBy: string | null
  updatedAt: string | null
}

export type ProposalRow = {
  id: number
  campusId: number
  projectId: number
  author: string
  section: GuideSection
  body: string
  createdAt: string
}

/** Lo que hay pendiente en el tablón de un proyecto. */
export type ProjectActivity = {
  /** Dudas sin resolver y sin ninguna respuesta. */
  unanswered: number
  /** Propuestas de cambio a la guía pendientes de revisar. */
  proposals: number
  hasGuide: boolean
}

export type GuideSection = 'start' | 'problems' | 'concepts'

export function createDoubtsRepository(db: Db) {
  const DOUBT_COLUMNS = `d.*,
    (SELECT COUNT(*) FROM doubt_answers a WHERE a.doubt_id = d.id) AS answers,
    (SELECT COUNT(*) FROM doubt_answers a WHERE a.doubt_id = d.id AND a.specialist = 1) AS by_specialist`

  function toDoubt(row: Record<string, unknown>): DoubtRow {
    return {
      id: toNumber(row.id),
      campusId: toNumber(row.campus_id),
      projectId: toNumber(row.project_id),
      author: toText(row.author),
      body: toText(row.body),
      color: toNumber(row.color),
      resolved: toNumber(row.resolved) === 1,
      solvedAnswerId:
        row.solved_answer_id === null || row.solved_answer_id === undefined
          ? null
          : toNumber(row.solved_answer_id),
      createdAt: toText(row.created_at),
      answers: toNumber(row.answers),
      specialistAnswered: toNumber(row.by_specialist) > 0,
    }
  }

  return {
    /** Lo pendiente en cada tablón de un campus, sin contar lo de `exceptAuthor`. */
    async activity(campusId: number, exceptAuthor: string): Promise<Map<number, ProjectActivity>> {
      const activity = new Map<number, ProjectActivity>()
      const of = (projectId: number): ProjectActivity => {
        const entry = activity.get(projectId) ?? { unanswered: 0, proposals: 0, hasGuide: false }

        activity.set(projectId, entry)

        return entry
      }

      const [unanswered, proposals, guides] = await db.batch(
        [
          {
            sql: `SELECT d.project_id, COUNT(*) AS total
                  FROM doubts d
                  WHERE d.campus_id = ? AND d.resolved = 0 AND d.author != ?
                    AND NOT EXISTS (SELECT 1 FROM doubt_answers a WHERE a.doubt_id = d.id)
                  GROUP BY d.project_id`,
            args: [campusId, exceptAuthor],
          },
          {
            sql: `SELECT project_id, COUNT(*) AS total FROM guide_proposals
                  WHERE campus_id = ? AND author != ? GROUP BY project_id`,
            args: [campusId, exceptAuthor],
          },
          {
            // Una guía con las tres secciones vacías es como si no existiera.
            sql: `SELECT project_id FROM guides
                  WHERE campus_id = ? AND (start != '[]' OR problems != '[]' OR concepts != '[]')`,
            args: [campusId],
          },
        ],
        'read',
      )

      for (const row of unanswered?.rows ?? []) {
        of(toNumber(row.project_id)).unanswered = toNumber(row.total)
      }
      for (const row of proposals?.rows ?? []) {
        of(toNumber(row.project_id)).proposals = toNumber(row.total)
      }
      for (const row of guides?.rows ?? []) {
        of(toNumber(row.project_id)).hasGuide = true
      }

      return activity
    },

    /** Dudas de un proyecto: primero las abiertas, y dentro, las más nuevas. */
    async list(campusId: number, projectId: number): Promise<DoubtRow[]> {
      const result = await db.execute({
        sql: `SELECT ${DOUBT_COLUMNS} FROM doubts d
              WHERE d.campus_id = ? AND d.project_id = ?
              ORDER BY d.resolved, d.created_at DESC
              LIMIT 200`,
        args: [campusId, projectId],
      })

      return result.rows.map(toDoubt)
    },

    async get(id: number): Promise<DoubtRow | undefined> {
      const result = await db.execute({
        sql: `SELECT ${DOUBT_COLUMNS} FROM doubts d WHERE d.id = ?`,
        args: [id],
      })
      const row = result.rows[0]

      return row === undefined ? undefined : toDoubt(row)
    },

    async create(doubt: {
      campusId: number
      projectId: number
      author: string
      body: string
      color: number
    }): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO doubts (campus_id, project_id, author, body, color, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [doubt.campusId, doubt.projectId, doubt.author, doubt.body, doubt.color, nowIso()],
      })

      return toNumber(result.lastInsertRowid)
    },

    async updateBody(id: number, body: string): Promise<void> {
      await db.execute({ sql: 'UPDATE doubts SET body = ? WHERE id = ?', args: [body, id] })
    },

    /**
     * Da la duda por resuelta con esa respuesta, o la reabre (`answerId: null`).
     */
    async setSolved(id: number, answerId: number | null, at: string): Promise<void> {
      await db.execute({
        sql: 'UPDATE doubts SET resolved = ?, solved_answer_id = ?, solved_at = ? WHERE id = ?',
        args: [answerId === null ? 0 : 1, answerId, answerId === null ? null : at, id],
      })
    },

    /** Dudas de `asker` que resolvió una respuesta de `answerer` desde `since`. */
    async solvedBetweenSince(asker: string, answerer: string, since: string): Promise<number> {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS total
              FROM doubts d JOIN doubt_answers a ON a.id = d.solved_answer_id
              WHERE d.author = ? AND a.author = ? AND d.solved_at >= ?`,
        args: [asker, answerer, since],
      })

      return toNumber(result.rows[0]?.total)
    },

    /** Borra la duda con sus respuestas. */
    async remove(id: number): Promise<void> {
      await db.batch(
        [
          { sql: 'DELETE FROM doubt_answers WHERE doubt_id = ?', args: [id] },
          { sql: 'DELETE FROM doubts WHERE id = ?', args: [id] },
        ],
        'write',
      )
    },

    /** Dudas que ha puesto alguien desde un instante. Para el tope diario. */
    async countBySince(author: string, since: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM doubts WHERE author = ? AND created_at >= ?',
        args: [author, since],
      })

      return toNumber(result.rows[0]?.total)
    },

    async answers(doubtId: number): Promise<AnswerRow[]> {
      const result = await db.execute({
        sql: 'SELECT * FROM doubt_answers WHERE doubt_id = ? ORDER BY created_at',
        args: [doubtId],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        author: toText(row.author),
        body: toText(row.body),
        specialist: toNumber(row.specialist) === 1,
        createdAt: toText(row.created_at),
      }))
    },

    async addAnswer(answer: {
      doubtId: number
      author: string
      body: string
      specialist: boolean
    }): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO doubt_answers (doubt_id, author, body, specialist, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [answer.doubtId, answer.author, answer.body, answer.specialist ? 1 : 0, nowIso()],
      })

      return toNumber(result.lastInsertRowid)
    },

    /** Guía de un proyecto. Vacía si nadie la ha escrito todavía. */
    async guide(campusId: number, projectId: number): Promise<GuideRow> {
      const result = await db.execute({
        sql: 'SELECT * FROM guides WHERE campus_id = ? AND project_id = ?',
        args: [campusId, projectId],
      })
      const row = result.rows[0]

      if (row === undefined) {
        return { start: [], problems: [], concepts: [], updatedBy: null, updatedAt: null }
      }

      return {
        start: parseList(row.start),
        problems: parseList(row.problems),
        concepts: parseList(row.concepts),
        updatedBy: toText(row.updated_by),
        updatedAt: toText(row.updated_at),
      }
    },

    async saveGuide(
      campusId: number,
      projectId: number,
      guide: Pick<GuideRow, GuideSection>,
      updatedBy: string,
    ): Promise<void> {
      await db.execute({
        sql: `INSERT INTO guides (campus_id, project_id, start, problems, concepts, updated_by, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (campus_id, project_id) DO UPDATE SET
                start      = excluded.start,
                problems   = excluded.problems,
                concepts   = excluded.concepts,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at`,
        args: [
          campusId,
          projectId,
          JSON.stringify(guide.start),
          JSON.stringify(guide.problems),
          JSON.stringify(guide.concepts),
          updatedBy,
          nowIso(),
        ],
      })
    },

    async proposals(campusId: number, projectId: number): Promise<ProposalRow[]> {
      const result = await db.execute({
        sql: `SELECT * FROM guide_proposals WHERE campus_id = ? AND project_id = ?
              ORDER BY created_at`,
        args: [campusId, projectId],
      })

      return result.rows.map(toProposal)
    },

    async proposal(id: number): Promise<ProposalRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT * FROM guide_proposals WHERE id = ?',
        args: [id],
      })
      const row = result.rows[0]

      return row === undefined ? undefined : toProposal(row)
    },

    async addProposal(proposal: Omit<ProposalRow, 'id' | 'createdAt'>): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO guide_proposals (campus_id, project_id, author, section, body, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          proposal.campusId,
          proposal.projectId,
          proposal.author,
          proposal.section,
          proposal.body,
          nowIso(),
        ],
      })

      return toNumber(result.lastInsertRowid)
    },

    async removeProposal(id: number): Promise<void> {
      await db.execute({ sql: 'DELETE FROM guide_proposals WHERE id = ?', args: [id] })
    },
  }
}

export type DoubtsRepository = ReturnType<typeof createDoubtsRepository>

function toProposal(row: Record<string, unknown>): ProposalRow {
  return {
    id: toNumber(row.id),
    campusId: toNumber(row.campus_id),
    projectId: toNumber(row.project_id),
    author: toText(row.author),
    section: toText(row.section) as GuideSection,
    body: toText(row.body),
    createdAt: toText(row.created_at),
  }
}

/** Lista de textos guardada como JSON. Vacía si el valor no se puede leer. */
function parseList(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(toText(value))

    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}
