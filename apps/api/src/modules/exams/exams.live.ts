/**
 * El examen en vivo: quién está apuntado al examen que hay ahora en el campus,
 * qué examen hace cada cual y la nota de su último intento.
 *
 * Las notas salen de los intentos guardados (`exam_attempts`). Mientras haya
 * alguien mirando, cada `REFRESH_MS` se piden a 42 las filas de los exámenes
 * que han cambiado desde que empezó, y quién está apuntado.
 */

import type { LiveExam, LiveExamGroup, LiveExaminee } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { Agenda, Curriculum, QuotaGate, ReplicaRepository } from '../replica/index.js'
import type { ExamsRepository } from './exams.repository.js'

/** Cada cuánto se vuelven a pedir las notas y la lista. */
const REFRESH_MS = 5 * 60_000
/** Hasta cuánto antes se enseña el siguiente examen. */
const AHEAD_MS = 24 * 3_600_000

type ExamsLiveOptions = {
  db: Db
  client: Pick<FortyTwoClient, 'getExamUsers' | 'getCampusProjectUsersPage'>
  replica: Pick<ReplicaRepository, 'ingestProjectUsers' | 'imagesOf'>
  agenda: Pick<Agenda, 'campusEvents'>
  curriculum: Pick<Curriculum, 'placesOf'>
  exams: Pick<ExamsRepository, 'exams'>
  quota: QuotaGate
  now?: () => number
  log?: (message: string) => void
}

export function createExamsLive(options: ExamsLiveOptions) {
  const { db, client, replica, agenda, curriculum, exams, quota } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Por examen: quién está apuntado y cuándo se miró por última vez. */
  const seen = new Map<number, { logins: Map<string, string | null>; at: number }>()

  /** Pide a 42 lo nuevo del examen, si toca y hay cuota. */
  async function refresh(campusId: number, exam: { id: number; beginAt: string }): Promise<void> {
    const known = seen.get(exam.id)

    if (known !== undefined && now() - known.at < REFRESH_MS) return
    if (!quota.allows('deferrable')) return

    try {
      const users = await client.getExamUsers(exam.id)
      const logins = new Map<string, string | null>()

      for (const entry of users) {
        if (entry.user?.login === undefined) continue

        logins.set(
          entry.user.login,
          entry.user.image?.versions?.small ?? entry.user.image?.link ?? null,
        )
      }

      // Lo que ha cambiado en los exámenes desde que empezó: trae los intentos.
      for (const project of await exams.exams()) {
        const page = await client.getCampusProjectUsersPage({
          campusId,
          projectId: project.id,
          updatedFrom: exam.beginAt,
        })

        await replica.ingestProjectUsers(page.items, campusId)
      }

      seen.set(exam.id, { logins, at: now() })
    } catch (error) {
      log(`examen ${exam.id}: ${error instanceof Error ? error.message : String(error)}`)
      // Para no insistir en cada visita si 42 falla.
      seen.set(exam.id, { logins: known?.logins ?? new Map<string, string | null>(), at: now() })
    }
  }

  return {
    /** `true` si ahora hay un examen en el campus. Solo mira la agenda: para el pulso. */
    async running(actor: Actor): Promise<boolean> {
      const at = now()
      const events = await agenda.campusEvents(
        actor.campusId,
        new Date(at - 12 * 3_600_000).toISOString(),
        new Date(at + 60_000).toISOString(),
      )

      return events.some(
        (event) =>
          event.source === 'exam' &&
          Date.parse(event.beginAt) <= at &&
          Date.parse(event.endAt) > at,
      )
    },

    /** El examen de ahora en el campus de quien pregunta, o el siguiente de hoy. */
    async live(actor: Actor): Promise<LiveExam> {
      const at = now()
      const events = await agenda.campusEvents(
        actor.campusId,
        new Date(at - 12 * 3_600_000).toISOString(),
        new Date(at + AHEAD_MS).toISOString(),
      )
      const examEvents = events.filter((event) => event.source === 'exam')
      const running = examEvents.find(
        (event) => Date.parse(event.beginAt) <= at && Date.parse(event.endAt) > at,
      )
      const next = examEvents.find((event) => Date.parse(event.beginAt) > at)
      const exam = running ?? next

      if (exam === undefined) return { exam: null, running: false, groups: [], updatedAt: null }

      if (running !== undefined) await refresh(actor.campusId, exam)

      const people = seen.get(exam.id)?.logins ?? new Map<string, string | null>()
      const logins = [...people.keys()]
      const [places, images, attempts] = await Promise.all([
        curriculum.placesOf(logins),
        replica.imagesOf(logins),
        latestAttempts(logins, exam.beginAt),
      ])
      const groups = new Map<number | null, LiveExamGroup>()

      for (const login of logins) {
        const place = places.get(login)
        const last = attempts.get(login)
        const person: LiveExaminee = {
          login,
          image: images.get(login) ?? people.get(login) ?? null,
          track: place?.track ?? 'classic',
          circle: place?.circle ?? null,
          mark: last?.mark ?? null,
          passed: last?.passed ?? false,
        }
        const key = last?.projectId ?? null
        const group = groups.get(key) ?? { projectId: key, name: last?.name ?? null, people: [] }

        group.people.push(person)
        groups.set(key, group)
      }

      return {
        exam: {
          id: exam.id,
          name: exam.name,
          location: exam.location,
          beginAt: exam.beginAt,
          endAt: exam.endAt,
        },
        running: running !== undefined,
        // Primero los que ya tienen examen, por nombre; al final, los que aún no.
        groups: [...groups.values()]
          .map((group) => ({
            ...group,
            people: group.people.sort(
              (a, b) => (b.mark ?? -1) - (a.mark ?? -1) || a.login.localeCompare(b.login),
            ),
          }))
          .sort((a, b) =>
            a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name),
          ),
        updatedAt:
          seen.get(exam.id)?.at === undefined
            ? null
            : new Date(seen.get(exam.id)?.at ?? 0).toISOString(),
      }
    },
  }

  /** El último intento de cada una de esas personas desde que empezó el examen. */
  async function latestAttempts(
    logins: readonly string[],
    since: string,
  ): Promise<
    Map<string, { projectId: number; name: string; mark: number | null; passed: boolean }>
  > {
    const found = new Map<
      string,
      { projectId: number; name: string; mark: number | null; passed: boolean }
    >()

    if (logins.length === 0) return found

    const result = await db.execute({
      sql: `SELECT u.login, a.project_id, p.name, p.slug, a.mark, a.validated, a.at
            FROM exam_attempts a
            JOIN users u ON u.id = a.user_id
            JOIN projects p ON p.id = a.project_id
            WHERE u.login IN (${logins.map(() => '?').join(', ')}) AND a.at >= ?
            ORDER BY a.at`,
      args: [...logins, since],
    })

    // Por orden de fecha: el último pisa a los anteriores.
    for (const row of result.rows) {
      found.set(toText(row.login), {
        projectId: toNumber(row.project_id),
        // Los dos planes los llaman igual: el del nuevo lleva su marca.
        name: toText(row.slug).startsWith('42next-')
          ? `${toText(row.name)} · 42next`
          : toText(row.name),
        mark: row.mark === null ? null : toNumber(row.mark),
        passed: row.validated !== null && toNumber(row.validated) === 1,
      })
    }

    return found
  }
}

export type ExamsLive = ReturnType<typeof createExamsLive>
