/**
 * Las cuentas de las estadísticas de exámenes, de la duración de los círculos
 * y de las kickoffs. Sin base de datos: se prueban solas.
 */

import type {
  BlackholePerson,
  CircleBlackhole,
  CircleDuration,
  CoreStatus,
  ExamFamily,
  ExamKickoff,
  ExamQuery,
  ExamStat,
  LiveExam,
  LiveExaminee,
} from '@sanatorio/contracts'

import { localMoment, monthOf } from '../../core/time.js'
import { kickoffMonths } from '../../core/kickoffs.js'
import { coreStatusOf } from '../stats/index.js'

/** Un intento guardado: quién, de qué examen, con qué nota y cuándo. */
export type AttemptRow = {
  userId: number
  projectId: number
  mark: number | null
  validated: boolean | null
  at: string | null
}

/** Para quien no tiene los intentos guardados: si aprobó y cuántas veces reintentó. */
export type OccurrenceRow = {
  userId: number
  projectId: number
  validated: boolean | null
  occurrence: number | null
}

const DAY_MS = 24 * 3_600_000

const average = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length

/**
 * La nota mediana de un intento. Las notas de examen van a saltos (cada
 * pregunta suma lo mismo), así que la media da notas que nadie saca.
 */
const median = (values: readonly number[]): number | null =>
  values.length === 0
    ? null
    : quantile(
        [...values].sort((a, b) => a - b),
        0.5,
      )

/** De un slug de examen: su plan y su número de rango (`42next-exam-rank-03` → Nexus, 3). */
export function examMeta(slug: string): { family: ExamFamily; rank: number | null } {
  const match = /exam-rank-(\d+)/.exec(slug)

  return {
    family: slug.startsWith('42next-') ? 'next' : 'classic',
    rank: match?.[1] === undefined ? null : Number(match[1]),
  }
}

/** Las estadísticas de un examen a partir de sus intentos (y, si faltan, de los reintentos). */
export function examStat(
  project: { id: number; name: string; slug: string },
  attempts: readonly AttemptRow[],
  occurrences: readonly OccurrenceRow[] = [],
): ExamStat {
  const byUser = new Map<number, AttemptRow[]>()

  for (const attempt of attempts) {
    // Solo los cerrados son intentos: 42 abre un equipo vacío para la siguiente
    // vez nada más cerrar uno, y contarlo corría la cuenta de intentos (#117:
    // en la réplica había 807 así, sin nota ni resultado).
    if (attempt.projectId !== project.id || attempt.validated === null) continue

    byUser.set(attempt.userId, [...(byUser.get(attempt.userId) ?? []), attempt])
  }

  /** Intentos hasta el primer aprobado, de cada persona que aprobó. */
  const toPass: number[] = []
  const perAttempt = new Map<number, { marks: number[]; people: number; passed: number }>()

  for (const list of byUser.values()) {
    const sorted = [...list].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
    const first = sorted.findIndex((attempt) => attempt.validated === true)

    if (first >= 0) toPass.push(first + 1)

    for (const [index, attempt] of sorted.entries()) {
      const entry = perAttempt.get(index + 1) ?? { marks: [], people: 0, passed: 0 }

      entry.people += 1
      entry.passed += attempt.validated === true ? 1 : 0
      if (attempt.mark !== null) entry.marks.push(attempt.mark)
      perAttempt.set(index + 1, entry)
    }
  }

  // Quien no tiene intentos guardados cuenta por sus reintentos, si aprobó.
  // Las filas copiadas antes de guardar los reintentos no los traen: esa gente
  // aprobó igual, aunque no se sepa al cuántos (antes no contaba como aprobada).
  let people = byUser.size
  let passedUnknown = 0

  for (const row of occurrences) {
    if (row.projectId !== project.id || byUser.has(row.userId)) continue

    people += 1
    if (row.validated !== true) continue
    if (row.occurrence === null) passedUnknown += 1
    else toPass.push(row.occurrence + 1)
  }

  // Sin tope: la última posición es el intento más alto en que alguien aprobó.
  const attemptsToPass: number[] = Array.from({ length: Math.max(0, ...toPass) }, () => 0)

  for (const times of toPass) {
    const slot = Math.max(0, times - 1)

    attemptsToPass[slot] = (attemptsToPass[slot] ?? 0) + 1
  }

  return {
    projectId: project.id,
    name: project.name,
    ...examMeta(project.slug),
    people,
    passed: toPass.length + passedUnknown,
    avgAttempts: average(toPass),
    attemptsToPass,
    byAttempt: [...perAttempt]
      .sort(([a], [b]) => a - b)
      .map(([attempt, entry]) => ({
        attempt,
        people: entry.people,
        medianMark: median(entry.marks),
        passRate: entry.people === 0 ? 0 : entry.passed / entry.people,
      })),
  }
}

/** El valor en ese tanto por uno de una lista ordenada (interpolando). */
function quantile(sorted: readonly number[], q: number): number {
  const at = (sorted.length - 1) * q
  const low = Math.floor(at)
  const high = Math.ceil(at)
  const a = sorted[low] ?? 0
  const b = sorted[high] ?? a

  return a + (b - a) * (at - low)
}

/**
 * Cuánto se tarda en cada círculo: del inicio del cursus (o del rango
 * anterior) al rango de ese círculo. Se descartan los casos extremos (fuera de
 * 1,5 veces el rango intercuartílico) y lo imposible (cero días o menos).
 */
export function circleDurations(
  people: readonly { begin: string | null; ranks: readonly string[] }[],
): CircleDuration[] {
  const days = new Map<number, number[]>()

  for (const person of people) {
    let previous = person.begin === null ? NaN : Date.parse(person.begin)

    for (const [circle, date] of person.ranks.entries()) {
      const at = Date.parse(date)

      if (!Number.isNaN(previous) && !Number.isNaN(at) && at > previous) {
        days.set(circle, [...(days.get(circle) ?? []), (at - previous) / DAY_MS])
      }

      previous = at
    }
  }

  return [...days]
    .sort(([a], [b]) => a - b)
    .flatMap(([circle, values]) => {
      const sorted = [...values].sort((a, b) => a - b)
      const q1 = quantile(sorted, 0.25)
      const q3 = quantile(sorted, 0.75)
      const spread = q3 - q1
      const kept = sorted.filter(
        (value) => value >= q1 - 1.5 * spread && value <= q3 + 1.5 * spread,
      )

      return kept.length === 0
        ? []
        : [
            {
              circle,
              people: kept.length,
              median: Math.round(quantile(kept, 0.5)),
              p25: Math.round(quantile(kept, 0.25)),
              p75: Math.round(quantile(kept, 0.75)),
            },
          ]
    })
}

/* Kickoffs, planes y black hole (#81 del buzón). */

type Track = 'classic' | 'next'

/** Alguien del campus, como lo da la base de datos. */
export type MemberRow = {
  userId: number
  login: string
  image: string | null
  beginAt: string | null
  /** Su plan y las fechas de cada círculo validado, si se le han mirado; `null` si no. */
  track: Track | null
  ranks: string[] | null
  /** Su 42cursus (`core_cursus`), si está copiado: cuándo empezó y cómo acabó. */
  cursus: {
    beginAt: string | null
    endAt: string | null
    blackholedAt: string | null
    grade: string | null
    active: boolean | null
    alumni: boolean
  } | null
}

/** Un proyecto del common core (o de Python) de alguien. */
export type PlanRow = {
  userId: number
  projectId: number
  createdAt: string | null
  updatedAt: string | null
  slug: string
}

/** Alguien del campus, ya con su kickoff, su plan y su círculo. */
export type ExamPerson = {
  userId: number
  login: string
  image: string | null
  track: Track
  /** Mes en que empezó el common core (`AAAA-MM`); `null` si no se sabe. */
  kickoff: string | null
  /** Cuándo empezó (ms), para la duración del primer círculo. */
  start: number | null
  /** Fechas de cada círculo validado (de 42); `null` si no se le han mirado. */
  ranks: string[] | null
  /** El círculo más alto en el que tiene algún proyecto, para quien no tiene `ranks`. */
  projectCircle: number | null
  /**
   * Cómo va en el common core (`docs/blackhole.md`): `blackholed` es que se lo
   * tragó el black hole; `unknown`, que no se sabe seguro.
   */
  status: CoreStatus
  /** Cuándo se lo tragó (`end_at` del 42cursus), si se sabe. ISO. */
  endAt: string | null
  /** La fecha de black hole que da 42, si la hay. ISO. */
  blackholedAt: string | null
}

const LAST_CIRCLE = 6

const msOf = (value: string | null): number | null => {
  const ms = value === null ? NaN : Date.parse(value)

  return Number.isNaN(ms) ? null : ms
}

/** De quien no se sabe el plan: el nuevo si tiene algo de Python o de `42next`. */
const nextSlug = (slug: string): boolean =>
  slug.startsWith('python-module') || slug.startsWith('42next-')

/**
 * La gente del campus con su kickoff, plan y círculo.
 *
 * Se empieza en la fecha de entrada al cursus (solo de quien ha entrado en la
 * web) o, si no, en la de su primer proyecto del common core, como en el avance
 * de Estadísticas (`stats/progress.service.ts`): las filas antiguas no traen
 * cuándo se apuntó y vale la última vez que cambiaron. La kickoff es la real
 * del campus que le toca (`core/kickoffs.ts`): quien entró a destiempo
 * (de otro campus, solo) va con la anterior más cercana a su entrada en 42.
 *
 * Sale quien tiene kickoff o algún examen (`examUsers`).
 */
export function examPeople(input: {
  members: readonly MemberRow[]
  rows: readonly PlanRow[]
  circles: Record<Track, ReadonlyMap<number, number>>
  examUsers: ReadonlySet<number>
  /** Ahora (ms), para saber si el black hole ya se lo tragó. */
  now: number
}): ExamPerson[] {
  const byUser = new Map<
    number,
    { first: number; last: number; python: boolean; reached: Record<Track, number> }
  >()

  for (const row of input.rows) {
    const entry = byUser.get(row.userId) ?? {
      first: Infinity,
      last: -Infinity,
      python: false,
      reached: { classic: -1, next: -1 },
    }
    const classic = input.circles.classic.get(row.projectId)
    const next = input.circles.next.get(row.projectId)
    const created = msOf(row.createdAt) ?? msOf(row.updatedAt)

    if ((classic !== undefined || next !== undefined) && created !== null) {
      entry.first = Math.min(entry.first, created)
    }
    // Lo último que hizo: apuntarse a algo (como `stats`, `docs/blackhole.md`).
    entry.last = Math.max(entry.last, msOf(row.createdAt) ?? -Infinity)
    if (classic !== undefined) entry.reached.classic = Math.max(entry.reached.classic, classic)
    if (next !== undefined) entry.reached.next = Math.max(entry.reached.next, next)
    entry.python ||= nextSlug(row.slug)
    byUser.set(row.userId, entry)
  }

  const people = input.members.flatMap((member) => {
    const entry = byUser.get(member.userId)
    const track: Track = member.track ?? (entry?.python === true ? 'next' : 'classic')
    const first = entry !== undefined && Number.isFinite(entry.first) ? entry.first : null
    // Sin entrar en la web, la fecha de su 42cursus: antes se deducía del primer
    // proyecto, y quien no tenía ninguno copiado no salía (#81).
    const start = msOf(member.beginAt) ?? msOf(member.cursus?.beginAt ?? null) ?? first

    if (start === null && !input.examUsers.has(member.userId)) return []

    const reached = entry?.reached[track] ?? -1
    const cursus = member.cursus
    // Si cerró el common core no importa aquí: solo se cuenta el black hole.
    const status =
      cursus === null
        ? 'unknown'
        : coreStatusOf(
            {
              grade: cursus.grade,
              endAt: msOf(cursus.endAt),
              blackholedAt: msOf(cursus.blackholedAt),
              active: cursus.active,
              alumni: cursus.alumni,
              lastActivity: entry !== undefined && Number.isFinite(entry.last) ? entry.last : null,
              closedCore: false,
            },
            input.now,
          )

    return [
      {
        userId: member.userId,
        login: member.login,
        image: member.image,
        track,
        kickoff: start === null ? null : monthOf(start),
        general: first === null || start === null ? start : Math.min(start, first),
        start,
        ranks: member.ranks,
        projectCircle: reached < 0 ? null : Math.min(LAST_CIRCLE, reached),
        status,
        endAt: cursus?.endAt ?? null,
        blackholedAt: cursus?.blackholedAt ?? null,
      },
    ]
  })
  // Todos son del mismo campus: el que se mira.
  const kickoffs = kickoffMonths(
    people.flatMap(({ userId, start, general }) =>
      start === null ? [] : [{ key: userId, campus: 0, start, general: general ?? start }],
    ),
  )

  return people.map(({ general: _general, ...person }) => ({
    ...person,
    kickoff: kickoffs.get(person.userId) ?? person.kickoff,
  }))
}

/** Todas las kickoffs, de la más reciente a la más antigua, con su gente de cada plan. */
export function kickoffsOf(people: readonly ExamPerson[]): ExamKickoff[] {
  const months = new Map<string, ExamKickoff>()

  for (const person of people) {
    if (person.kickoff === null) continue

    const entry = months.get(person.kickoff) ?? { month: person.kickoff, classic: 0, next: 0 }

    entry[person.track] += 1
    months.set(person.kickoff, entry)
  }

  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month))
}

/** La gente que entra en lo elegido: su plan y, si se eligen, sus kickoffs. */
export function selectPeople(people: readonly ExamPerson[], query: ExamQuery): ExamPerson[] {
  const kickoffs = new Set(query.kickoffs)

  return people.filter(
    (person) =>
      (query.track === 'all' || person.track === query.track) &&
      (kickoffs.size === 0 || (person.kickoff !== null && kickoffs.has(person.kickoff))),
  )
}

/**
 * El círculo en que va alguien (o en que se quedó): el siguiente al último
 * rango validado o, sin los rangos mirados, el más alto con algún proyecto.
 * Sin ningún proyecto del common core (la réplica los copia todos), el 0.
 */
function circleOf(person: Pick<ExamPerson, 'ranks' | 'projectCircle'>): number {
  return person.ranks === null
    ? (person.projectCircle ?? 0)
    : Math.min(LAST_CIRCLE, person.ranks.length)
}

/**
 * El black hole por círculos (#81): de la gente de la que se sabe cómo acabó,
 * cuántas personas llegaron a cada círculo y a cuántas se tragó en él. Quien
 * terminó llegó a todos; quien sigue o se fue, hasta el suyo. Quien está en
 * duda (`unknown`) no cuenta: inflaría o vaciaría el porcentaje.
 */
export function blackholeByCircle(people: readonly ExamPerson[]): CircleBlackhole[] {
  const rows = Array.from({ length: LAST_CIRCLE + 1 }, (_, circle) => ({
    circle,
    reached: 0,
    absorbed: 0,
  }))

  for (const person of people) {
    if (person.status === 'unknown') continue

    const circle = person.status === 'finished' ? LAST_CIRCLE : circleOf(person)

    for (const row of rows.slice(0, circle + 1)) row.reached += 1

    const at = rows[circle]

    if (person.status === 'blackholed' && at !== undefined) at.absorbed += 1
  }

  return rows.filter((row) => row.reached > 0)
}

/** Lo más largo que sale cada lista del historial del black hole. */
export const BLACKHOLE_LIST_MAX = 300

/**
 * El historial del black hole (#81; solo para quien administra): a quién se
 * tragó, lo más reciente primero, y quién lo tiene más cerca (la fecha de 42,
 * aún por llegar, de quien sigue), lo más cercano primero. Cada lista, como
 * mucho `BLACKHOLE_LIST_MAX`.
 */
export function blackholeLists(
  people: readonly ExamPerson[],
  now: number,
): { absorbed: BlackholePerson[]; closest: BlackholePerson[] } {
  const entry = (person: ExamPerson, at: string): BlackholePerson => ({
    login: person.login,
    image: person.image,
    track: person.track,
    kickoff: person.kickoff,
    circle: circleOf(person),
    at,
  })
  const absorbed = people.flatMap((person) =>
    person.status === 'blackholed' && person.endAt !== null ? [entry(person, person.endAt)] : [],
  )
  const closest = people.flatMap((person) => {
    const at = msOf(person.blackholedAt)

    return person.status === 'active' && person.blackholedAt !== null && at !== null && at > now
      ? [entry(person, person.blackholedAt)]
      : []
  })

  return {
    absorbed: absorbed
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, BLACKHOLE_LIST_MAX),
    closest: closest
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .slice(0, BLACKHOLE_LIST_MAX),
  }
}

/** Con el examen en marcha, cada cuánto se vuelven a pedir solas la lista y las notas. */
export const LIVE_AUTO_MS = 5 * 60_000

/**
 * Lo menos que tiene que pasar entre dos refrescos pedidos a mano. Cuenta para
 * todo el campus a la vez: si cada persona pudiera pedir uno por minuto, un
 * aula llena gastaría la cuota de 42 en un rato.
 */
export const LIVE_MANUAL_MS = 60_000

/**
 * Qué se puede pedir a 42 de un examen en vivo, según cuándo fue el último
 * refresco (de quien fuera). Sin refresco previo, todo vale ya.
 */
export function liveRefreshPlan(
  lastAt: number | null,
  now: number,
  checkpoints: readonly number[] = [],
): { auto: boolean; manual: boolean; nextAt: number; manualAt: number } {
  if (lastAt === null) return { auto: true, manual: true, nextAt: now, manualAt: now }

  // Un momento fijo (`examCheckpoints`) ya pasado y sin mirar desde entonces: toca ya.
  const due = checkpoints.some((at) => now >= at && lastAt < at)
  const upcoming = checkpoints.filter((at) => at > lastAt)

  return {
    auto: due || now - lastAt >= LIVE_AUTO_MS,
    manual: now - lastAt >= LIVE_MANUAL_MS,
    nextAt: Math.min(lastAt + LIVE_AUTO_MS, ...upcoming),
    manualAt: lastAt + LIVE_MANUAL_MS,
  }
}

/**
 * El día de un examen visto desde el campus: hoy, mañana o más adelante.
 *
 * Se cuenta en la hora del campus, no en UTC ni en la del servidor: un examen
 * a las 00:30 de Madrid es «mañana» a las 23:30 de la víspera, aunque en UTC
 * aún sea el mismo día. Lo que ya empezó (un examen de noche que sigue en
 * marcha) cuenta como de hoy.
 */
export function examDay(
  beginAt: string,
  now: number,
  timeZone: string | undefined,
): NonNullable<LiveExam['exam']>['when'] {
  const days =
    (Date.parse(localMoment(Date.parse(beginAt), timeZone).day) -
      Date.parse(localMoment(now, timeZone).day)) /
    DAY_MS

  return days <= 0 ? 'today' : days === 1 ? 'tomorrow' : 'later'
}

/** El primer y el último círculo con examen en el common core (`exam('02')`…`exam('06')`). */
const FIRST_EXAM_CIRCLE = 2
const LAST_EXAM_CIRCLE = 6

/**
 * El examen que le toca a alguien por el círculo en que va: el del círculo N
 * es el Exam Rank 0N, como en `COMMON_CORE` y en la tabla de partida del plan
 * nuevo. El plan clásico hace `exam-rank-0N`; el nuevo, `42next-exam-rank-0N`.
 * Antes del círculo 2 no hay examen.
 */
export function expectedExamSlug(
  track: LiveExaminee['track'],
  circle: number | null,
): string | null {
  if (circle === null || circle < FIRST_EXAM_CIRCLE) return null

  const rank = `exam-rank-0${String(Math.min(LAST_EXAM_CIRCLE, circle))}`

  return track === 'next' ? `42next-${rank}` : rank
}

/** Un intento de alguien en una sesión de examen, en orden de fecha. */
export type SessionAttempt = { projectId: number; mark: number | null; validated: boolean | null }

/**
 * Lo que sacó alguien en una sesión de examen, de sus intentos en ella.
 *
 * Al cerrar un intento, 42 abre enseguida otro equipo vacío (sin nota) para la
 * vez siguiente. Antes mandaba el último de la sesión, y ese vacío tapaba la
 * nota de verdad: quien sacó un 75 salía sin nota (#117). Ahora, si hay algún
 * intento cerrado, cuentan solo los cerrados; si no, el que esté abierto. La
 * nota es la mejor de los que cuentan.
 */
export function sessionResult(
  attempts: readonly SessionAttempt[],
): { projectId: number; mark: number | null; passed: boolean; closed: boolean } | undefined {
  const closed = attempts.filter((attempt) => attempt.validated !== null)
  const counted = closed.length > 0 ? closed : attempts
  const last = counted.at(-1)

  if (last === undefined) return undefined

  const marks = counted.flatMap((attempt) => (attempt.mark === null ? [] : [attempt.mark]))

  return {
    projectId: last.projectId,
    mark: marks.length === 0 ? null : Math.max(...marks),
    passed: counted.some((attempt) => attempt.validated === true),
    closed: last.validated !== null,
  }
}

/** La fila de alguien en un examen (`project_users`), tal como está en la réplica. */
export type ExamRow = {
  status: string
  finalMark: number | null
  validated: boolean | null
  updatedAt: string | null
}

/**
 * Cómo va alguien en la sesión de examen que empezó en `since`.
 *
 * Solo cuenta la fila tocada desde que empezó: la de un intento de otro día
 * dice `finished` aunque hoy aún no haya entrado. Cerrada (`finished`) con
 * 100 o más y validada, aprueba; cerrada sin llegar a 100 (o sin validar),
 * suspende, aunque la sesión no haya acabado: en 42 ya no puede subir.
 *
 * El intento (el equipo de 42) manda también: cerrado y sin aprobar es un
 * suspenso aunque el proyecto siga «en curso» en 42, que con los exámenes pasa
 * a menudo. Y con el examen ya cerrado (`ended`), quien siguiera dentro ha
 * suspendido: el examen dura lo que dura y a la hora de fin se cierra.
 */
export function examineeStatus(
  row: ExamRow | undefined,
  attempt: { mark: number | null; passed: boolean; closed: boolean } | undefined,
  since: string,
  ended = false,
): LiveExaminee['status'] {
  const recent = row !== undefined && row.updatedAt !== null && row.updatedAt >= since

  if (recent && row.status === 'finished') {
    return (row.finalMark ?? 0) >= 100 && row.validated !== false ? 'passed' : 'failed'
  }
  if (attempt?.passed === true) return 'passed'
  if (attempt?.closed === true) return 'failed'

  const entered = recent || attempt !== undefined

  return entered ? (ended ? 'failed' : 'inProgress') : 'pending'
}

/**
 * Lo que se tiene para entrar en un examen: pasado, quien no ha entrado ya no
 * entra. Con un minuto de margen, se mira entonces quién está.
 */
const ENTRY_CHECK_MS = 11 * 60_000
/**
 * Tras la hora de fin, el margen para que 42 cierre todo: entonces se mira por
 * última vez y quien siga abierto cuenta como suspendido.
 */
export const CLOSE_CHECK_MS = 5 * 60_000

/** Los momentos de un examen en que se mira sí o sí: tras la entrada y tras el cierre. */
export function examCheckpoints(exam: { beginAt: string; endAt: string }): number[] {
  return [Date.parse(exam.beginAt) + ENTRY_CHECK_MS, Date.parse(exam.endAt) + CLOSE_CHECK_MS]
}

/** Entre quienes tienen la misma nota, el orden: aprobado, dentro, suspenso, sin entrar. */
const STATUS_ORDER: LiveExaminee['status'][] = ['passed', 'inProgress', 'failed', 'pending']

/**
 * El orden del examen en vivo: por la barra de progreso (la nota de hoy, sobre
 * 100; sin nota aún, 0), de más a menos; luego por estado y por login.
 */
export function byProgress(a: LiveExaminee, b: LiveExaminee): number {
  return (
    (b.mark ?? 0) - (a.mark ?? 0) ||
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    a.login.localeCompare(b.login)
  )
}
