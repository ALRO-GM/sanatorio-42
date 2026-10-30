/**
 * El avance en el common core a lo largo del tiempo (#87 del buzón): la línea
 * de quien mira, la de hasta cinco personas con quien se compara, las medias
 * de cada campus que se pida (por defecto, el tuyo) y de todos juntos (plan ×
 * población: quien terminó, quien sigue más quien terminó, o quien se tragó el
 * black hole: `docs/blackhole.md`) y las líneas de cada pace. Una media con menos de `MIN_PEOPLE` personas no dice nada: en su
 * lugar va la línea de cada una. También quién va más rápido
 * (`ranking.rules.ts`) y quién terminó antes, para sugerir con quién
 * compararse. Las reglas del avance están en `progress.rules.ts`.
 *
 * El inicio de cada cual es su fecha de entrada al 42cursus (la copia del
 * cursus o, si no, la de quien ha entrado en la web) o, si no se sabe, cuándo
 * se apuntó a su primer proyecto del plan: Libft se empieza el primer día.
 *
 * «Tu campus» es el de tu 42cursus (`home`), no el que estés mirando en la web
 * (`Actor.campusId`, el de tus preferencias): con ese, quien había elegido París
 * para mirar veía París en su Avance.
 *
 * Mirar a todo el mundo es caro (cientos de miles de proyectos), así que el
 * cálculo se hace una vez para todos los campus a la vez (cada persona suma en
 * los suyos y en el de todos) y se guarda un rato: pedir más campus no cuesta
 * más. Pasado ese rato, se sirve el cálculo anterior mientras se rehace detrás,
 * y un trabajo de fondo lo rehace antes de que caduque (`refresh`): así nadie
 * espera al cálculo entero, salvo la primera visita tras arrancar si llega
 * antes que el trabajo (pedido por Alberto, 2026-10-30: el Avance tardaba).
 */

import type {
  CoreStatus,
  CoreTrack,
  FastestEntry,
  ProgressArea,
  ProgressCampus,
  ProgressIndividual,
  ProgressLine,
  ProgressMeasure,
  ProgressPopulation,
  ProgressScope,
  ProgressTrace,
  StatsFastest,
  StatsProgress,
  StatsRanking,
} from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { CHOICES, VERSIONS } from '../replica/index.js'
import { coreStatusOf } from './blackhole.rules.js'
import type { CoreFacts } from './blackhole.rules.js'
import { COURSE_DAYS } from './pace.rules.js'
import {
  FINISHED_CIRCLE,
  circleMarks,
  curveOf,
  finishedDay,
  finishedOn,
  milestonesOf,
  ownUnits,
  paceLines,
  settled,
  standingOf,
  totalHours,
  unitsOf,
} from './progress.rules.js'
import type { PlanProject, Unit } from './progress.rules.js'
import { kickoffsOf, rankRunners } from './ranking.rules.js'
import type { RankingFilters, Runner } from './ranking.rules.js'
import type { ProgressRepository } from './stats.repository.js'

/**
 * Lo que hay que tener aprobado para haber terminado el common core, además del
 * grado (`docs/blackhole.md`): ft_transcendence y el examen 6, el clásico o el nuevo.
 */
const CLOSERS = {
  transcendence: ['ft_transcendence'],
  exam: ['exam-rank-06', '42next-exam-rank-06'],
} as const

/** Cada cuántos días va un punto de las líneas. */
const STEP_DAYS = 15
/** Pasados los dos años, cada cuántos días: a ese plazo un mes más o menos no se nota. */
const LONG_STEP_DAYS = 30
/** Hasta dónde se dibuja como mucho: nadie lleva más de diez años en el common core. */
const MAX_DAYS = 3650

/**
 * Los días de cada punto de las líneas: cada 15 hasta los dos años (el plazo
 * del pace más lento) y, después, cada 30 hasta lo que lleva quien más tiempo
 * lleva (`last`), para que «Todo» llegue al último dato. Unos 50 puntos para
 * dos años, unos 150 para diez.
 */
export function daysUpTo(last: number): number[] {
  const days = Array.from({ length: Math.ceil(COURSE_DAYS / STEP_DAYS) + 1 }, (_, index) =>
    Math.min(COURSE_DAYS, index * STEP_DAYS),
  )
  const end = Math.min(MAX_DAYS, last)

  for (let day = COURSE_DAYS + 20; day - LONG_STEP_DAYS < end; day += LONG_STEP_DAYS) {
    days.push(day)
  }

  return days
}
const CACHE_MS = 30 * 60_000
/**
 * Con menos gente que esto en un punto, la media no dice nada: no se enseña. Y
 * si la media entera tiene menos, va la línea de cada persona.
 */
const MIN_PEOPLE = 10
/** Con cuánta gente se compara uno como mucho: más líneas no se leen. */
export const MAX_OTHERS = 5
/** Cuántas sugerencias de quien terminó antes, del campus de quien mira. */
const FASTEST_HERE = 5
/**
 * Lo que tiene que tener aprobado del plan (en %, por círculos) quien terminó
 * para sugerirlo: quien viene trasladado tiene sus proyectos en otro cursus y
 * parecería terminar en días.
 */
const FASTEST_MIN_SHARE = 50
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
const POPULATIONS: readonly ProgressPopulation[] = ['finished', 'current', 'blackholed']
const SCOPES: readonly ProgressScope[] = ['campus', 'all']
const TRACKS: readonly CoreTrack[] = ['classic', 'next']
const STATUSES: readonly CoreStatus[] = ['finished', 'active', 'blackholed', 'unknown']
/** La clave de las medias de todos los campus juntos (las de cada campus van por su id). */
const ALL = 'all'
/** En qué medias entra cada estado. `unknown`, en ninguna. */
const POPULATIONS_OF: Record<CoreStatus, readonly ProgressPopulation[]> = {
  finished: ['finished', 'current'],
  active: ['current'],
  blackholed: ['blackholed'],
  unknown: [],
}

/** Lo que se sabe de cada persona para su avance. */
type Person = {
  login: string
  image: string | null
  track: CoreTrack
  start: number
  done: Map<number, number>
  status: CoreStatus
  /** Cuándo salió del cursus, si salió. */
  endAt: number | null
  /** El campus de su 42cursus, si está copiado. */
  campus: number | null
  /** Sus campus: el de su 42cursus y los copiados en los que está. */
  campuses: number[]
}

type Cells = { sum: number; n: number }[]

/** Quien terminó, con cuánto tardó: para sugerir con quién compararse. */
type Finisher = Omit<FastestEntry, 'campus'> & {
  track: CoreTrack
  campus: number
  campuses: number[]
}

/** Una línea de una media con poca gente, aún con su login para saber si se ve. */
type Member = ProgressTrace & { login: string }

/** Lo que se va sumando de un sitio (un campus o todos) mientras se mira a cada persona. */
type Tally = {
  sums: Record<ProgressMeasure, Record<ProgressPopulation, Record<CoreTrack, Cells>>>
  /** Las primeras `MIN_PEOPLE` personas de cada media: si no hay más, van ellas. */
  members: Record<ProgressPopulation, Record<CoreTrack, Member[]>>
  counts: ProgressArea['people']
  census: ProgressArea['census']
}

/** Las medias ya hechas de un sitio, con sus personas por si son pocas. */
type Area = Omit<Tally, 'sums'> & { averages: ProgressArea['averages'] }

type Snapshot = {
  units: Record<CoreTrack, Unit[]>
  /** Los días de cada punto, hasta lo que lleva quien más tiempo lleva. */
  days: number[]
  people: Map<string, Person>
  /** Las medias de cada campus (por su id) y de todos (`ALL`). */
  areas: Map<string, Area>
  planHours: Record<CoreTrack, number>
  /** El nombre de cada proyecto del plan (id → nombre), para los hitos. */
  names: Map<number, string>
  /** Quien puede salir en la clasificación, con sus campus. */
  runners: { runner: Runner; campuses: number[] }[]
  finishers: Finisher[]
  campusNames: Map<number, string>
}

const filled = <K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>

const monthOf = (ms: number): string => new Date(ms).toISOString().slice(0, 7)
const DAY_MS = 86_400_000

/**
 * La línea de una persona con sus hitos. Quien terminó se mide contra lo que
 * hizo hasta terminar (`ownUnits`): acaba en el 100 % el día que terminó, de
 * las dos maneras. Quien sigue o se fue, contra su plan. Quien se fue, solo
 * hasta el día en que salió.
 */
function traceOf(
  plan: readonly Unit[],
  person: Person,
  days: readonly number[],
  now: number,
  names: ReadonlyMap<number, string>,
): ProgressTrace {
  const finished = person.status === 'finished'
  const units = finished ? ownUnits(plan, person.done) : plan
  const until = person.status === 'blackholed' ? (person.endAt ?? Infinity) : Infinity

  return {
    line: curveOf(units, person.done, person.start, days, now, until),
    hours: Math.round(totalHours(units, person.done)),
    finished: finished ? finishedDay(units, person.done, person.start) : null,
    milestones: milestonesOf(units, person.done, person.start, now, until).map((each) => ({
      day: each.day,
      projects: each.ids.map((id) => names.get(id) ?? String(id)),
      value: each.value,
    })),
  }
}

/** Un sitio sin nadie todavía, con `days` puntos. */
const emptyTally = (days: number): Tally => ({
  sums: filled(MEASURES, () =>
    filled(POPULATIONS, () =>
      filled(TRACKS, (): Cells => Array.from({ length: days }, () => ({ sum: 0, n: 0 }))),
    ),
  ),
  members: filled(POPULATIONS, () => filled(TRACKS, (): Member[] => [])),
  counts: filled(POPULATIONS, () => filled(TRACKS, () => 0)),
  census: filled(TRACKS, () => filled(STATUSES, () => 0)),
})

/** La media de cada punto; con menos de `MIN_PEOPLE` personas, `null`. */
const mean = (cells: Cells): ProgressLine =>
  cells.map((cell) => (cell.n < MIN_PEOPLE ? null : Math.round((cell.sum / cell.n) * 10) / 10))

const areaOf = ({ sums, ...rest }: Tally): Area => ({
  ...rest,
  averages: filled(MEASURES, (measure) =>
    filled(POPULATIONS, (population) =>
      filled(TRACKS, (track) => mean(sums[measure][population][track])),
    ),
  ),
})

/** Dónde se mira: tu campus y los campus que se piden (`'all'`: todos los que se pueden). */
type ProgressWhere = { home?: number; campuses?: readonly number[] | 'all' }

export function createProgressService(options: {
  progress: ProgressRepository
  /** El círculo de cada proyecto (por id) de cada plan: lo da el plan de estudios. */
  circles: (track: CoreTrack) => Promise<Map<number, number>>
  /** Los campus que sigue la web: los que se pueden pedir, además del tuyo. */
  campusIds?: readonly number[]
  now?: () => number
}) {
  const now = options.now ?? Date.now
  // Un agregado de todos los campus que cambia despacio: dos visitas a la vez
  // comparten la misma carga en vez de lanzar dos, y caducado se sirve el
  // anterior mientras se rehace (lo nuevo es solo lo que se ha añadido).
  let current: { at: number; value: Snapshot } | null = null
  let building: Promise<Snapshot> | null = null
  const rebuild = (): Promise<Snapshot> => {
    building ??= build()
      .then((value) => {
        current = { at: now(), value }

        return value
      })
      .finally(() => {
        building = null
      })

    return building
  }
  const snapshot = (): Promise<Snapshot> => {
    if (current === null) return rebuild()
    if (now() - current.at >= CACHE_MS) {
      // Un fallo al rehacer no tira lo que había: se vuelve a probar en la siguiente.
      rebuild().catch(() => undefined)
    }

    return Promise.resolve(current.value)
  }

  /**
   * Los proyectos de cada plan, con las otras versiones de cada uno (la vieja y
   * la de `42next-`): quien hizo cualquiera tiene el hueco hecho.
   *
   * En el de Python, la versión vieja (de C) cuenta en el círculo que tiene en C
   * (`adopted`): quien empezó en C y pasó a Python hizo Born2beroot en el
   * círculo 1 y la push_swap vieja en el 2 (al revés que el plan de Python). En
   * producción, las 16 personas de Python con el rango 1 y Born2beroot de C lo
   * validaron con él y sin push_swap. En C no se hace al revés: nadie de C ha
   * hecho una versión `42next-` de esas.
   */
  async function plans(): Promise<
    Record<CoreTrack, PlanProject[]> & { names: Map<number, string> }
  > {
    const [classic, next] = await Promise.all([options.circles('classic'), options.circles('next')])
    const planIds = [...new Set([...classic.keys(), ...next.keys()])]
    const extra = await options.progress.idsOf(Object.values(VERSIONS).flat())
    const info = await options.progress.projects([...new Set([...planIds, ...extra.values()])])
    const listOf = (circles: Map<number, number>, adopt: Map<number, number>): PlanProject[] =>
      [...circles].flatMap(([id, circle]) => {
        const slug = info.get(id)?.slug ?? ''
        const versions = Object.values(VERSIONS).find((group) => group.includes(slug)) ?? [slug]

        return versions.flatMap((version): PlanProject[] => {
          const versionId = version === slug ? id : extra.get(version)

          if (versionId === undefined) return []
          const project = {
            id: versionId,
            circle,
            slug: version,
            hours: info.get(versionId)?.hours ?? null,
          }
          const there = version === slug ? undefined : adopt.get(versionId)

          return [there === undefined ? project : { ...project, circle: there, adopted: true }]
        })
      })
    const names = new Map([...info].map(([id, each]) => [id, each.name]))

    return { classic: listOf(classic, new Map()), next: listOf(next, classic), names }
  }

  /**
   * Las pistas del plan de quien no lo tiene dicho por 42. Del nuevo: un módulo
   * de Python, un proyecto que solo tiene el plan nuevo o una versión `42next-`
   * que no sea un examen. Del clásico: un proyecto que solo tiene el clásico.
   * Los exámenes `42next-` no cuentan: desde el cambio los hace todo el mundo,
   * también quien sigue en C (en producción salían en Python dos personas de C
   * por un examen; y quien terminó C y luego hizo un proyecto de Python sigue
   * siendo de C).
   */
  function signals(plan: Record<CoreTrack, PlanProject[]>) {
    const classic = new Set(plan.classic.map((project) => project.slug))
    const next = new Set(plan.next.map((project) => project.slug))

    return {
      next: (slug: string): boolean =>
        slug.startsWith('python-module') ||
        (slug.startsWith('42next-') && !slug.startsWith('42next-exam-')) ||
        (next.has(slug) && !classic.has(slug)),
      classic: (slug: string): boolean =>
        classic.has(slug) && !next.has(slug) && !slug.startsWith('42next-'),
    }
  }

  async function build(): Promise<Snapshot> {
    const t = now()

    const plan = await plans()
    const units = {
      classic: unitsOf(plan.classic, CHOICES, VERSIONS),
      next: unitsOf(plan.next, CHOICES, VERSIONS),
    }
    const slugOf = new Map([...plan.classic, ...plan.next].map((p) => [p.id, p.slug]))
    const hint = signals(plan)
    // Lo que cierra el common core, esté o no en el plan aprendido: ft_transcendence y
    // el examen 6 de cualquiera de los dos planes. Sin los dos, nadie ha terminado.
    const closers = await options.progress.idsOf([...CLOSERS.transcendence, ...CLOSERS.exam])
    const idsOf = (slugs: readonly string[]): number[] =>
      slugs.flatMap((slug) => {
        const id = closers.get(slug)

        return id === undefined ? [] : [id]
      })
    const transcendence = idsOf(CLOSERS.transcendence)
    const lastExam = idsOf(CLOSERS.exam)
    const [rows, activity, campusNames, memberships] = await Promise.all([
      options.progress.rows([...new Set([...slugOf.keys(), ...closers.values()])]),
      options.progress.activity(),
      options.progress.campusNames(),
      options.progress.memberships(),
    ])
    const people = new Map<
      string,
      Person & {
        first: number
        /** Cuándo se apuntó a cada proyecto (id → ms), para fechar Libft (`settled`). */
        opened: Map<number, number>
        begin: number | null
        votes: Record<CoreTrack, Set<number>>
        known: boolean
        facts: Omit<CoreFacts, 'closedCore'> | null
      }
    >()

    for (const row of rows) {
      let person = people.get(row.login)

      if (person === undefined) {
        const cursus = row.cursus
        const campus = cursus?.campusId ?? null

        person = {
          login: row.login,
          image: row.image,
          track: row.track ?? 'classic',
          known: row.track !== null,
          start: 0,
          first: Infinity,
          opened: new Map(),
          begin: cursus?.beginAt ?? row.beginAt,
          done: new Map(),
          votes: { classic: new Set(), next: new Set() },
          // Se decide con todas sus filas: terminar pide ft_transcendence y el examen 6.
          status: 'unknown',
          facts:
            cursus === null
              ? null
              : {
                  grade: cursus.grade,
                  endAt: cursus.endAt,
                  blackholedAt: cursus.blackholedAt,
                  active: cursus.active,
                  alumni: cursus.alumni,
                  lastActivity: activity.get(row.login) ?? null,
                },
          endAt: cursus?.endAt ?? null,
          campus,
          campuses: [
            ...new Set([
              ...(campus === null ? [] : [campus]),
              ...(memberships.get(row.login) ?? []),
            ]),
          ],
        }
        people.set(row.login, person)
      }
      if (row.createdAt !== null) person.first = Math.min(person.first, row.createdAt)
      if (row.openedAt !== null) person.opened.set(row.projectId, row.openedAt)
      if (row.doneAt !== null) person.done.set(row.projectId, row.doneAt)
      const slug = slugOf.get(row.projectId) ?? ''

      if (hint.next(slug)) person.votes.next.add(row.projectId)
      if (hint.classic(slug)) person.votes.classic.add(row.projectId)
    }

    // Cuánto lleva quien más tiempo lleva (hasta hoy o hasta que salió): ahí acaba «Todo».
    let longest = 0

    for (const person of people.values()) {
      const has = (ids: readonly number[]) => ids.some((id) => person.done.has(id))

      person.status = coreStatusOf(
        person.facts === null
          ? null
          : { ...person.facts, closedCore: has(transcendence) && has(lastExam) },
        t,
      )
      person.start = person.begin ?? person.first
      if (!Number.isFinite(person.start) || person.start > t) continue
      const end = person.status === 'blackholed' ? Math.min(t, person.endAt ?? t) : t

      longest = Math.max(longest, (end - person.start) / DAY_MS)
    }

    const days = daysUpTo(longest)
    // Lo de todos y lo de cada campus en el que haya alguien.
    const tallies = new Map<string, Tally>([[ALL, emptyTally(days.length)]])
    const tallyOf = (key: string): Tally => {
      const known = tallies.get(key)

      if (known !== undefined) return known
      const fresh = emptyTally(days.length)

      tallies.set(key, fresh)
      return fresh
    }
    const finishers: Finisher[] = []
    const kept = new Map<string, Person>()
    const runners: Snapshot['runners'] = []

    for (const person of people.values()) {
      // Sin plan dicho por 42, el de la mayoría de sus pistas; sin pistas, el clásico.
      if (!person.known) {
        person.track = person.votes.next.size > person.votes.classic.size ? 'next' : 'classic'
      }
      if (!Number.isFinite(person.start) || person.start > t) continue
      kept.set(person.login, person)
      // Libft, como tarde cuando se apuntó a lo siguiente: 42 reescribió en lote muchas de sus fechas.
      person.done = settled(units[person.track], person.done, person.opened)

      // Cada cual cuenta en todos y en cada uno de sus campus.
      const where = [ALL, ...person.campuses.map(String)].map(tallyOf)

      for (const tally of where) tally.census[person.track][person.status] += 1

      // Quien ya no está, solo hasta el día en que salió: después no avanza. Quien
      // terminó, contra lo que hizo: su línea (y la media) llega al 100 %.
      const trace = traceOf(units[person.track], person, days, t, plan.names)
      const curve = trace.line
      const track = person.track

      for (const population of POPULATIONS_OF[person.status]) {
        for (const tally of where) {
          tally.counts[population][track] += 1
          // Por si la media se queda corta: entonces van estas líneas.
          if (tally.members[population][track].length < MIN_PEOPLE) {
            tally.members[population][track].push({ login: person.login, ...trace })
          }
          // En la media de quien terminó, quien ya terminó sigue en el 100 % los días que
          // aún no ha vivido: sin eso, el final de la curva solo tenía a quien empezó hace
          // más tiempo (planes viejos, menos %) y bajaba (Barcelona, del 89 % al 56 %).
          const carry = population === 'finished'

          for (const measure of MEASURES) {
            curve[measure].forEach((each, index) => {
              const cell = tally.sums[measure][population][track][index]
              const value = each ?? (carry ? 100 : null)

              if (value !== null && cell !== undefined) {
                cell.sum += value
                cell.n += 1
              }
            })
          }
        }
      }

      if (person.status === 'finished' && person.campus !== null && person.begin !== null) {
        const finished = finishedOn(units[person.track], person.done)
        const share = standingOf(units[person.track], person.done).circles

        if (finished !== null && finished > person.start && share >= FASTEST_MIN_SHARE) {
          finishers.push({
            login: person.login,
            image: person.image,
            track: person.track,
            campus: person.campus,
            campuses: person.campuses,
            days: Math.round((finished - person.start) / DAY_MS),
          })
        }
      }

      // En la clasificación, gente que sigue o terminó (de un campus, al pedirla).
      if (person.status === 'active' || person.status === 'finished') {
        const standing =
          person.status === 'finished'
            ? { circle: FINISHED_CIRCLE, circles: 100, hours: 100 }
            : standingOf(units[person.track], person.done)

        runners.push({
          runner: {
            login: person.login,
            image: person.image,
            track: person.track,
            kickoff: monthOf(person.start),
            ...standing,
          },
          campuses: person.campuses,
        })
      }
    }

    return {
      units,
      days,
      people: kept,
      areas: new Map([...tallies].map(([key, tally]) => [key, areaOf(tally)])),
      planHours: filled(TRACKS, (track) => totalHours(units[track])),
      names: plan.names,
      runners,
      finishers: finishers.sort((a, b) => a.days - b.days || a.login.localeCompare(b.login)),
      campusNames,
    }
  }

  /**
   * Los campus que se pueden pedir: los que sigue la web y el tuyo, el tuyo
   * primero. Un piscinero, solo el suyo: solo ve la piscina de su campus.
   */
  const availableOf = (
    actor: Actor,
    home: number,
    names: ReadonlyMap<number, string>,
  ): ProgressCampus[] =>
    [home, ...(actor.pool === true ? [] : (options.campusIds ?? []))]
      .filter((id, index, list) => list.indexOf(id) === index)
      .map((id) => ({ id, name: names.get(id) ?? String(id) }))

  /**
   * Los campus pedidos, en el orden de `available` y sin repetir. Lo que no se
   * puede pedir se ignora; sin nada que valga, el tuyo.
   */
  const pickedOf = (
    available: readonly ProgressCampus[],
    asked: ProgressWhere['campuses'],
    home: number,
  ): number[] => {
    if (asked === undefined) return [home]
    const wanted = new Set(asked === 'all' ? available.map((campus) => campus.id) : asked)
    const picked = available.filter((campus) => wanted.has(campus.id)).map((campus) => campus.id)

    return picked.length === 0 ? [home] : picked
  }

  return {
    /** Rehace el cálculo de fondo (el trabajo del módulo), sin esperar a que alguien lo pida. */
    async refresh(): Promise<void> {
      await rebuild()
    },

    /**
     * Quién de esa gente ha terminado el common core (outer core), según el
     * último cálculo. Sin esperar: si aún no hay cálculo (recién arrancada),
     * nadie, y se pone a hacerlo. Es para el trofeo del mapa de clústeres, que
     * no puede esperar al cálculo entero.
     */
    finishedNow(logins: readonly string[]): Set<string> {
      if (current === null) {
        rebuild().catch(() => undefined)

        return new Set()
      }

      const { people } = current.value

      return new Set(logins.filter((login) => people.get(login)?.status === 'finished'))
    },

    /**
     * El avance de quien mira, con las medias de cada campus pedido y de todos
     * juntos, y los paces. Con `others`, además la línea de cada una de esas
     * personas (como mucho `MAX_OTHERS`), para compararse. `sees` quita a quien
     * no puede ver (mundos separados, personas ocultas) de las líneas con nombre.
     */
    async progress(
      actor: Actor,
      others: readonly string[],
      sees: (login: string) => boolean,
      where: ProgressWhere = {},
    ): Promise<StatsProgress> {
      const data = await snapshot()
      const t = now()
      const home = where.home ?? actor.campusId
      const available = availableOf(actor, home, data.campusNames)
      const lineOf = (login: string) => {
        const person = data.people.get(login)

        return person === undefined
          ? null
          : { person, trace: traceOf(data.units[person.track], person, data.days, t, data.names) }
      }
      const mine = lineOf(actor.login)
      const theirs = [...new Set(others)]
        .filter((login) => login !== actor.login && sees(login))
        .slice(0, MAX_OTHERS)
        .flatMap((login) => {
          const found = lineOf(login)

          return found === null ? [] : [{ login: found.person.login, ...found.trace }]
        })
      const track = mine?.person.track ?? data.people.get(theirs[0]?.login ?? '')?.track ?? null
      const units = data.units[track ?? 'classic']
      const empty = areaOf(emptyTally(data.days.length))
      // Una media corta enseña a cada cual; quien se tragó el black hole, sin nombre.
      const areaFor = (id: number | null): ProgressArea => {
        const area = data.areas.get(id === null ? ALL : String(id)) ?? empty

        return {
          id,
          name: id === null ? null : (data.campusNames.get(id) ?? null),
          averages: area.averages,
          individuals: filled(POPULATIONS, (population) =>
            filled(TRACKS, (each): ProgressIndividual[] =>
              area.counts[population][each] >= MIN_PEOPLE
                ? []
                : area.members[population][each]
                    .filter((member) => member.login === actor.login || sees(member.login))
                    .map((member) => ({
                      ...member,
                      login: population === 'blackholed' ? null : member.login,
                    })),
            ),
          ),
          people: area.counts,
          census: area.census,
        }
      }

      return {
        days: data.days,
        track,
        me: mine?.trace ?? null,
        home,
        available,
        campuses: pickedOf(available, where.campuses, home).map(areaFor),
        all: areaFor(null),
        others: theirs,
        minPeople: MIN_PEOPLE,
        axis: {
          circles: circleMarks(),
          // Las horas del eje son las de quien mira, con su versión de cada proyecto
          // (si terminó, las de lo que hizo: su 100 %).
          hours: mine?.trace.hours ?? Math.round(totalHours(units)),
          planHours: filled(TRACKS, (each) => Math.round(data.planHours[each])),
        },
        paces: paceLines(units),
      }
    },

    /**
     * Quien terminó el common core más deprisa, por plan: los primeros de tu
     * campus (`home`) y el primero de cada campus. Sin quien no se ve.
     */
    async fastest(
      actor: Actor,
      sees: (login: string) => boolean,
      home = actor.campusId,
    ): Promise<StatsFastest> {
      const data = await snapshot()
      const visible = data.finishers.filter(
        (each) => each.login === actor.login || sees(each.login),
      )
      const entry = (each: Finisher): FastestEntry => ({
        login: each.login,
        image: each.image,
        campus: data.campusNames.get(each.campus) ?? null,
        days: each.days,
      })
      // Ya van del más rápido al más lento: el primero de cada campus es el suyo.
      const firstOfEach = (list: Finisher[]): Finisher[] => {
        const seen = new Set<number>()

        return list.filter((each) => {
          if (seen.has(each.campus)) return false
          seen.add(each.campus)
          return true
        })
      }

      return filled(SCOPES, (scope) =>
        filled(TRACKS, (track) => {
          const ofTrack = visible.filter((each) => each.track === track)

          return (
            scope === 'campus'
              ? ofTrack.filter((each) => each.campuses.includes(home)).slice(0, FASTEST_HERE)
              : firstOfEach(ofTrack)
          ).map(entry)
        }),
      )
    },

    /**
     * Quién va más rápido en tu campus (`home`), con esos filtros: la página que
     * empieza en `offset` y, aparte, quien mira. `sees` quita a quien no puede
     * ver (mundos separados, personas ocultas).
     */
    async ranking(
      actor: Actor,
      filters: RankingFilters,
      page: { offset: number; limit: number },
      sees: (login: string) => boolean,
      home = actor.campusId,
    ): Promise<StatsRanking> {
      const data = await snapshot()
      const visible = data.runners
        .filter(
          (each) =>
            each.campuses.includes(home) &&
            (each.runner.login === actor.login || sees(each.runner.login)),
        )
        .map((each) => each.runner)
      const entries = rankRunners(visible, filters)
      const self = visible.find((runner) => runner.login === actor.login)

      return {
        kickoffs: kickoffsOf(
          visible.filter((runner) => filters.plan === 'all' || runner.track === filters.plan),
        ),
        total: entries.length,
        offset: page.offset,
        entries: entries.slice(page.offset, page.offset + page.limit),
        me: entries.find((entry) => entry.login === actor.login) ?? null,
        self: self === undefined ? null : { track: self.track, kickoff: self.kickoff },
      }
    },
  }
}
