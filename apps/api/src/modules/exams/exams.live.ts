/**
 * El examen en vivo: quién está apuntado al examen que hay ahora en el campus,
 * qué examen le toca a cada cual y cómo va.
 *
 * La lista de gente junta tres fuentes, porque cualquiera puede fallar: la de
 * apuntados de 42 (`/exams/:id/exams_users`), la agenda de 42 que se copia al
 * abrir el calendario y quien ya tiene tocada una fila de examen desde que
 * empezó. Antes solo valía la primera, y se tiraba si cualquier otra petición
 * del refresco fallaba: con el examen en marcha no salía nadie.
 *
 * Con el examen en marcha se pide lo nuevo a 42 cada `LIVE_AUTO_MS` (lo hace
 * un trabajo de fondo aunque nadie mire, y cualquier visita si toca) o a mano,
 * como mucho una vez por `LIVE_MANUAL_MS`. Ese reloj es uno por examen y
 * campus para todo el mundo, y se guarda en la base: ni cien pestañas ni un
 * reinicio hacen que se pida más.
 */

import type { LiveExam, LiveExamGroup, LiveExaminee } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { Agenda, Curriculum, QuotaGate, ReplicaRepository } from '../replica/index.js'
import type { ExamsRepository } from './exams.repository.js'
import { examDay, examineeStatus, expectedExamSlug, liveRefreshPlan } from './exams.rules.js'

/** Hasta cuánto antes se enseña el siguiente examen. */
const AHEAD_MS = 24 * 3_600_000
/** Lo más que dura un examen: para buscar el que sigue en marcha. */
const BEHIND_MS = 12 * 3_600_000

type ExamsLiveOptions = {
  db: Db
  client: Pick<FortyTwoClient, 'getExamUsers' | 'getCampusProjectUsersPage'>
  replica: Pick<
    ReplicaRepository,
    'ingestProjectUsers' | 'imagesOf' | 'getState' | 'setState' | 'timeZoneOf'
  >
  agenda: Pick<Agenda, 'campusEvents'>
  curriculum: Pick<Curriculum, 'placesOf'>
  exams: Pick<ExamsRepository, 'exams' | 'agendaRegistered' | 'sessionRows'>
  quota: QuotaGate
  now?: () => number
  log?: (message: string) => void
}

type ExamEvent = {
  id: number
  name: string
  location: string | null
  beginAt: string
  endAt: string
}

/** Lo que se guarda de cada examen en vivo: cuándo se refrescó y quién estaba apuntado en 42. */
type LiveState = { at: number; logins: [string, string | null][] }

/** De dónde sale el refresco: el reloj de cinco minutos o el botón. */
type RefreshMode = 'auto' | 'manual'

const liveKey = (campusId: number, examId: number): string => `exams:live:${campusId}:${examId}`

type Attempt = { projectId: number; mark: number | null; passed: boolean }

export function createExamsLive(options: ExamsLiveOptions) {
  const { db, client, replica, agenda, curriculum, exams, quota } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Lo último de cada examen, para no leer la base en cada visita. */
  const states = new Map<string, LiveState>()
  /** El refresco en curso de cada examen: quien llega a la vez espera a ese, no pide otro. */
  const inFlight = new Map<string, Promise<void>>()

  const describe = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

  async function stateOf(key: string): Promise<LiveState | null> {
    const cached = states.get(key)

    if (cached !== undefined) return cached

    const stored = await replica.getState<LiveState>(key)

    if (stored === undefined || typeof stored.at !== 'number' || !Array.isArray(stored.logins)) {
      return null
    }

    states.set(key, stored)

    return stored
  }

  /** El examen en marcha en el campus o, si no hay, el siguiente de las próximas 24 h. */
  async function examOf(
    campusId: number,
    at: number,
  ): Promise<{ exam: ExamEvent; running: boolean } | null> {
    const events = await agenda.campusEvents(
      campusId,
      new Date(at - BEHIND_MS).toISOString(),
      new Date(at + AHEAD_MS).toISOString(),
    )
    const examEvents = events.filter((event) => event.source === 'exam')
    const running = examEvents.find(
      (event) => Date.parse(event.beginAt) <= at && Date.parse(event.endAt) > at,
    )
    const exam = running ?? examEvents.find((event) => Date.parse(event.beginAt) > at)

    return exam === undefined ? null : { exam, running: running !== undefined }
  }

  /**
   * Pide a 42 lo nuevo del examen si toca, si hay cuota y si nadie lo está
   * pidiendo ya. Cada parte va por su lado: si falla una, lo demás sirve.
   */
  async function refresh(
    campusId: number,
    exam: ExamEvent,
    mode: RefreshMode,
    tier: 'background' | 'deferrable',
  ): Promise<void> {
    const key = liveKey(campusId, exam.id)
    const pending = inFlight.get(key)

    if (pending !== undefined) return pending

    const task = (async () => {
      const state = await stateOf(key)
      const plan = liveRefreshPlan(state?.at ?? null, now())

      if (!(mode === 'manual' ? plan.manual : plan.auto) || !quota.allows(tier)) return

      // Se apunta antes de pedir: si 42 falla, tampoco se insiste hasta la siguiente vuelta.
      const next: LiveState = { at: now(), logins: state?.logins ?? [] }

      states.set(key, next)

      try {
        next.logins = (await client.getExamUsers(exam.id)).flatMap((entry) =>
          entry.user?.login === undefined
            ? []
            : [
                [
                  entry.user.login,
                  entry.user.image?.versions?.small ?? entry.user.image?.link ?? null,
                ] as [string, string | null],
              ],
        )
      } catch (error) {
        log(`apuntados al examen ${exam.id}: ${describe(error)}`)
      }

      await replica.setState(key, next)

      // Las notas: solo de los exámenes que toca a la gente apuntada, uno por
      // petición. Si de alguien no se sabe cuál le toca, de todos.
      const logins = await registered(campusId, exam, next)
      const places = await curriculum.placesOf(logins)
      const wanted = new Set(
        logins.map((login) => {
          const place = places.get(login)

          return place === undefined ? null : expectedExamSlug(place.track, place.circle)
        }),
      )

      for (const project of await exams.exams()) {
        if (!(wanted.has(null) || wanted.has(project.slug)) || !quota.allows(tier)) continue

        try {
          const page = await client.getCampusProjectUsersPage({
            campusId,
            projectId: project.id,
            updatedFrom: exam.beginAt,
          })

          await replica.ingestProjectUsers(page.items, campusId)
        } catch (error) {
          log(`notas de ${project.name} en el examen ${exam.id}: ${describe(error)}`)
        }
      }
    })().finally(() => {
      inFlight.delete(key)
    })

    inFlight.set(key, task)

    return task
  }

  /** Todos los que se sabe que están en el examen, de las tres fuentes. */
  async function registered(
    campusId: number,
    exam: ExamEvent,
    state: LiveState | null,
  ): Promise<string[]> {
    const [fromAgenda, rows] = await Promise.all([
      exams.agendaRegistered(exam.id),
      Date.parse(exam.beginAt) <= now()
        ? exams.sessionRows(campusId, exam.beginAt, [])
        : Promise.resolve([]),
    ])

    return [
      ...new Set([
        ...(state?.logins ?? []).map(([login]) => login),
        ...fromAgenda,
        ...rows.map((row) => row.login),
      ]),
    ]
  }

  /** Lo que ve quien pregunta, con lo que haya guardado. */
  async function view(
    campusId: number,
    found: { exam: ExamEvent; running: boolean } | null,
    at: number,
  ): Promise<LiveExam> {
    if (found === null) {
      return { exam: null, running: false, groups: [], updatedAt: null, ...noRefresh }
    }

    const { exam, running } = found
    const state = await stateOf(liveKey(campusId, exam.id))
    const logins = await registered(campusId, exam, state)
    const fromFortyTwo = new Map(state?.logins ?? [])
    const [places, images, attempts, rows, projects, timeZone] = await Promise.all([
      curriculum.placesOf(logins),
      replica.imagesOf(logins),
      latestAttempts(logins, exam.beginAt),
      running ? exams.sessionRows(campusId, exam.beginAt, logins) : Promise.resolve([]),
      exams.exams(),
      replica.timeZoneOf(campusId),
    ])
    const bySlug = new Map(projects.map((project) => [project.slug, project]))
    const byId = new Map(projects.map((project) => [project.id, project]))
    // Ordenadas por fecha: la última de cada cual pisa a las anteriores.
    const lastRow = new Map(rows.map((row) => [row.login, row]))
    const groups = new Map<number | null, LiveExamGroup>()

    for (const login of logins) {
      const place = places.get(login)
      const track = place?.track ?? 'classic'
      const circle = place?.circle ?? null
      const expected = bySlug.get(expectedExamSlug(track, circle) ?? '')
      const row = lastRow.get(login)
      const attempt = attempts.get(login)
      // El examen que ya ha empezado manda sobre el que le tocaría por el círculo.
      const projectId = row?.projectId ?? attempt?.projectId ?? expected?.id ?? null
      const person: LiveExaminee = {
        login,
        image: images.get(login) ?? fromFortyTwo.get(login) ?? null,
        track,
        circle,
        // La nota del intento si lo hay; si no, la de la fila (que es de esta sesión).
        mark: attempt?.mark ?? row?.finalMark ?? null,
        status: examineeStatus(row, attempt, exam.beginAt),
      }
      const group = groups.get(projectId) ?? {
        projectId,
        name: projectId === null ? null : (byId.get(projectId)?.name ?? null),
        people: [],
      }

      group.people.push(person)
      groups.set(projectId, group)
    }

    const plan = liveRefreshPlan(state?.at ?? null, at)

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        location: exam.location,
        beginAt: exam.beginAt,
        endAt: exam.endAt,
        when: examDay(exam.beginAt, at, timeZone),
      },
      running,
      // Por examen, por nombre; al final, quien no se sabe qué examen hace.
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
      updatedAt: state === null ? null : new Date(state.at).toISOString(),
      ...(running
        ? {
            nextRefreshAt: new Date(plan.nextAt).toISOString(),
            refreshableAt: new Date(plan.manualAt).toISOString(),
          }
        : noRefresh),
    }
  }

  return {
    /** `true` si ahora hay un examen en el campus. Solo mira la agenda: para el pulso. */
    async running(actor: Actor): Promise<boolean> {
      const at = now()
      const events = await agenda.campusEvents(
        actor.campusId,
        new Date(at - BEHIND_MS).toISOString(),
        new Date(at + 60_000).toISOString(),
      )

      return events.some(
        (event) =>
          event.source === 'exam' &&
          Date.parse(event.beginAt) <= at &&
          Date.parse(event.endAt) > at,
      )
    },

    /** El examen de ahora en el campus de quien pregunta, o el siguiente. Refresca si toca. */
    async live(actor: Actor): Promise<LiveExam> {
      const found = await examOf(actor.campusId, now())

      if (found?.running === true) {
        await refresh(actor.campusId, found.exam, 'auto', 'deferrable')
      }

      return view(actor.campusId, found, now())
    },

    /**
     * El botón de refrescar: pide lo nuevo si hace al menos un minuto del
     * último refresco de quien sea. Si no, devuelve lo que hay.
     */
    async refreshNow(actor: Actor): Promise<LiveExam> {
      const found = await examOf(actor.campusId, now())

      if (found?.running === true) {
        await refresh(actor.campusId, found.exam, 'manual', 'deferrable')
      }

      return view(actor.campusId, found, now())
    },

    /** El reloj de cinco minutos: refresca los exámenes en marcha aunque nadie mire. */
    async tick(campusIds: readonly number[]): Promise<void> {
      for (const campusId of campusIds) {
        if (!quota.allows('background')) return

        const found = await examOf(campusId, now())

        if (found?.running === true) await refresh(campusId, found.exam, 'auto', 'background')
      }
    },
  }

  /** El último intento de cada una de esas personas desde que empezó el examen. */
  async function latestAttempts(
    logins: readonly string[],
    since: string,
  ): Promise<Map<string, Attempt>> {
    const found = new Map<string, Attempt>()

    if (logins.length === 0) return found

    const result = await db.execute({
      sql: `SELECT u.login, a.project_id, a.mark, a.validated, a.at
            FROM exam_attempts a
            JOIN users u ON u.id = a.user_id
            WHERE u.login IN (SELECT value FROM json_each(?)) AND a.at >= ?
            ORDER BY a.at`,
      args: [JSON.stringify(logins), since],
    })

    // Por orden de fecha: el último pisa a los anteriores.
    for (const row of result.rows) {
      found.set(toText(row.login), {
        projectId: toNumber(row.project_id),
        mark: row.mark === null ? null : toNumber(row.mark),
        passed: row.validated !== null && toNumber(row.validated) === 1,
      })
    }

    return found
  }
}

/** Sin examen en marcha no hay refrescos que contar. */
const noRefresh = { nextRefreshAt: null, refreshableAt: null }

export type ExamsLive = ReturnType<typeof createExamsLive>
