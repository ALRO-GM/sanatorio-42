/**
 * Composición: qué módulos hay y qué recibe cada uno.
 *
 * Es el único sitio que conoce a todos los módulos. Lo usan el servidor, los
 * comandos de `cli/` y los tests, así que no hay dos formas distintas de montar
 * la aplicación.
 *
 * Para añadir una funcionalidad: crear su carpeta en `modules/`, construirla
 * aquí con lo que necesite y añadirla a `modules`.
 */

import type { Db } from '../core/db/database.js'
import { createEventBus } from '../core/events.js'
import type { LimitLevel } from '@sanatorio/contracts'

import type { EventBus, Notify } from '../core/events.js'
import type { AppModule } from '../core/module.js'
import type { FortyTwoClient } from '../integrations/forty-two/client.js'
import { createAdminModule } from '../modules/admin/index.js'
import { createAgendaModule } from '../modules/agenda/index.js'
import type { AgendaModule } from '../modules/agenda/index.js'
import type { AdminModule } from '../modules/admin/index.js'
import { createAttendanceModule } from '../modules/attendance/index.js'
import type { AttendanceModule } from '../modules/attendance/index.js'
import { createBoardsModule } from '../modules/boards/index.js'
import type { BoardsModule } from '../modules/boards/index.js'
import { createBroadcastsModule } from '../modules/broadcasts/index.js'
import type { BroadcastsModule } from '../modules/broadcasts/index.js'
import { createCalendarModule } from '../modules/calendar/index.js'
import type { CalendarModule } from '../modules/calendar/index.js'
import { createClickerModule, hackerTitle } from '../modules/clicker/index.js'
import { createClientErrorsModule } from '../modules/client-errors/index.js'
import { createCountdownsModule } from '../modules/countdowns/index.js'
import type { CountdownsModule } from '../modules/countdowns/index.js'
import type { ClickerModule } from '../modules/clicker/index.js'
import { createDoubtsModule } from '../modules/doubts/index.js'
import type { DoubtsModule } from '../modules/doubts/index.js'
import { createHelpModule } from '../modules/help/index.js'
import type { HelpModule } from '../modules/help/index.js'
import { createLegalModule } from '../modules/legal/index.js'
import type { LegalModule } from '../modules/legal/index.js'
import { createBrokenSeats, createMapModule } from '../modules/map/index.js'
import { createExamsModule } from '../modules/exams/index.js'
import type { ExamsModule } from '../modules/exams/index.js'
import type { MapModule } from '../modules/map/index.js'
import { createMeetModule } from '../modules/meet/index.js'
import type { MeetModule } from '../modules/meet/index.js'
import { createNetworkModule } from '../modules/network/index.js'
import { createQuizModule } from '../modules/quiz/index.js'
import type { QuizModule } from '../modules/quiz/index.js'
import { createNoticesModule } from '../modules/notices/index.js'
import type { NoticesModule } from '../modules/notices/index.js'
import type { NetworkModule } from '../modules/network/index.js'
import { createPeersModule } from '../modules/peers/index.js'
import type { PeersModule } from '../modules/peers/index.js'
import { createProfileModule, MASTER_AT } from '../modules/profile/index.js'
import type { ProfileModule } from '../modules/profile/index.js'
import { createReplicaModule } from '../modules/replica/index.js'
import { createAudience } from '../core/audience.js'
import type { Audience } from '../core/audience.js'
import type { PhotoStore, ReplicaModule, SyncerConfig } from '../modules/replica/index.js'
import { createFacilityModule } from '../modules/facility/index.js'
import { createPoolModule, hiddenLogins } from '../modules/pool/index.js'
import type { PoolModule } from '../modules/pool/index.js'
import { createFocusModule } from '../modules/focus/index.js'
import type { FocusModule } from '../modules/focus/index.js'
import { createGitCourseModule } from '../modules/gitcourse/index.js'
import type { GitCourseModule } from '../modules/gitcourse/index.js'
import { createShellCourseModule } from '../modules/shellcourse/index.js'
import type { ShellCourseModule } from '../modules/shellcourse/index.js'
import type { FacilityModule } from '../modules/facility/index.js'
import { createStatsModule } from '../modules/stats/index.js'
import type { StatsModule } from '../modules/stats/index.js'
import type { SlackPoster } from '../integrations/slack.js'
import { createToursModule } from '../modules/tours/index.js'
import type { ToursModule } from '../modules/tours/index.js'
import { createStaffModule } from '../modules/staff/index.js'
import type { StaffModule } from '../modules/staff/index.js'
import { createUsageModule } from '../modules/usage/index.js'
import type { UsageModule } from '../modules/usage/index.js'
import { createTherapyModule } from '../modules/therapy/index.js'
import type { TherapyModule } from '../modules/therapy/index.js'
import { given } from '../core/options.js'
import { createLate } from '../core/late.js'
import { createPresence } from '../modules/presence/index.js'

type CompositionConfig = {
  sync: SyncerConfig
  /** `false` para que `start()` no arranque el bucle de sincronización. */
  backgroundSync?: boolean
  /** Rastro de la sincronización y de los fallos de la 42. */
  log?: (message: string) => void
  /** Logins que administran por configuración (`ADMIN_LOGINS`). */
  admins?: readonly string[]
  /** Lo que dice la guardia de la máquina sobre los límites del plan, si la hay. */
  guardLevel?: () => Promise<LimitLevel>
  /** Dónde se guardan las fotos de perfil bajadas de 42. Sin él, en memoria. */
  photos?: PhotoStore
  /** Secreto del servidor (`SESSION_SECRET`): firma la cookie del panel y cifra el segundo factor. */
  secret?: string
  /** Webhook de Slack del staff (`SLACK_WEBHOOK_URL`) para los avisos del edificio. */
  slack?: SlackPoster | null
  /** Commit desplegado (`GIT_SHA`), o vacío en local. */
  version?: string
  /** Reloj inyectable, para los tests. */
  now?: () => number
}

/** Los servicios de todos los módulos, a mano para los tests y los comandos. */
export type Services = {
  repositories: {
    availability: PeersModule['availabilityRepository']
    replica: ReplicaModule['repository']
    profiles: ProfileModule['profiles']
  }
  sync: ReplicaModule['sync']
  campuses: ReplicaModule['campuses']
  quota: ReplicaModule['quota']
  peers: PeersModule['peers']
  availability: PeersModule['availability']
  xp: ProfileModule['xp']
  therapy: TherapyModule['service']
  agenda: AgendaModule['service']
  doubts: DoubtsModule['service']
  boards: BoardsModule['service']
  map: MapModule['service']
  help: HelpModule['service']
  calendar: CalendarModule['service']
  network: NetworkModule['service']
  corrections: NetworkModule['sync']
  /** La copia de las correcciones de la piscina (cursus 9). */
  poolCorrections: NetworkModule['poolSync']
  exams: ExamsModule['service']
  examsSync: ExamsModule['sync']
  examsLive: ExamsModule['live']
  usage: UsageModule['service']
  meet: MeetModule['service']
  attendance: AttendanceModule['service']
  staff: StaffModule['service']
  admin: AdminModule['service']
  notices: NoticesModule['service']
  broadcasts: BroadcastsModule['service']
  countdowns: CountdownsModule['service']
  /** El modo mantenimiento (`docs/mantenimiento.md`): lo guarda `admin`. */
  maintenance: AdminModule['maintenance']
  clicker: ClickerModule['service']
  tours: ToursModule['service']
  legal: LegalModule['service']
  quiz: QuizModule['service']
  chess: QuizModule['chess']
  stats: StatsModule['service']
  facility: FacilityModule['service']
  focus: FocusModule['service']
  gitCourse: GitCourseModule['service']
  shellCourse: ShellCourseModule['service']
  pool: PoolModule['service']
  poolMembers: ReplicaModule['poolMembers']
  /** Quién ve a quién: estudiantes y piscineros separados. */
  audience: Audience
}

type Composition = {
  events: EventBus
  /** En el orden en que se registran sus rutas. */
  modules: AppModule[]
  services: Services
}

/** Monta todos los módulos de negocio sobre una conexión abierta. */
export function compose(db: Db, client: FortyTwoClient, config: CompositionConfig): Composition {
  const events = createEventBus()
  const clock = config.now === undefined ? {} : { now: config.now }
  const now = config.now ?? Date.now
  // Lo que se monta después y otros preguntan antes: se conecta con
  // `late.wire()` al final. Nadie lo usa mientras se construye.
  const late = createLate<{
    admin: AdminModule
    calendar: CalendarModule
    clicker: ClickerModule
    countdowns: CountdownsModule
    exams: ExamsModule
    help: HelpModule
    modules: AppModule[]
    network: NetworkModule
    usage: UsageModule
  }>()

  // Quién pasa sin turno en la cola de 42: quien administra por configuración y
  // quien tiene el permiso desde el panel. Esto último vive en la base y la
  // cola pregunta sin esperar, así que se guarda una copia que se pone al día
  // (como mucho, una vez por minuto) cuando se mira.
  let panelAdmins: ReadonlySet<string> = new Set()
  let adminsAt = Number.NEGATIVE_INFINITY
  const refreshPanelAdmins = (): void => {
    if (!late.ready() || now() - adminsAt < 60_000) return
    adminsAt = now()
    late
      .get('admin')
      .service.adminLogins()
      .then(
        (logins) => {
          panelAdmins = new Set(logins)
        },
        () => undefined,
      )
  }

  const replica = createReplicaModule({
    db,
    client,
    config: config.sync,
    ...given({ backgroundSync: config.backgroundSync }),
    priority: (login) => {
      refreshPanelAdmins()

      return (config.admins ?? []).includes(login) || panelAdmins.has(login)
    },
    // Con un corte por el límite del plan no se pide nada a 42. Lo sabe `admin`.
    halted: () => late.ready() && late.get('admin').service.halted(),
    ...given({ photos: config.photos, log: config.log }),
    ...clock,
  })
  // Quién ve a quién (`docs/piscineros.md`): lo usan los módulos que enseñan gente.
  const audience = createAudience(
    (campusId) => replica.poolMembers.loginsIn(campusId),
    now,
    (pool) => hiddenLogins(db, pool),
  )
  // El Pomodoro va pronto: la sala de espera y el plano preguntan quién está concentrado.
  const focus = createFocusModule({ db, ...clock })
  const focusOf = (logins: readonly string[]) =>
    focus.repository.untilOf(logins, new Date(now()).toISOString())
  // Los módulos avisan sin saber que hay un buzón: `notices` es quien escucha.
  const notify: Notify = (notice) => events.emit('notice', notice)
  // `audience`: quién ve a quién, para los módulos que enseñan gente (`docs/piscineros.md`).
  const common = { db, replica: replica.repository, audience, ...clock }
  const profile = createProfileModule({
    ...common,
    curriculum: replica.curriculum,
    poolPeople: (campusId) => replica.poolMembers.peopleIn(campusId),
    events,
    hacker: async (login) => {
      const caught = await late.get('clicker').service.caughtOf(login)

      return { title: hackerTitle(caught), caught }
    },
    master: async (login) =>
      [...(await late.get('network').correctedByProject(login)).values()].filter(
        (times) => times >= MASTER_AT,
      ).length,
  })
  const presence = createPresence({
    profiles: profile.profiles,
    replica: replica.repository,
    ...clock,
  })
  const online = presence.online

  const broadcasts = createBroadcastsModule({ db, ...clock })
  const notices = createNoticesModule({
    db,
    events,
    quota: replica.quota,
    onPulse: presence.beat,
    broadcasts: (actor) => broadcasts.service.count(actor),
    clickerReviews: async (actor) => (await late.get('clicker').service.reviews(actor)).length,
    help: (actor) => late.get('help').service.inboxCount(actor),
    examLive: (actor) => late.get('exams').live.running(actor),
    countdowns: (actor) => late.get('countdowns').service.stamp(actor),
    maintenance: async () => (await late.get('admin').maintenance.current()).on,
    ...clock,
  })

  const peers = createPeersModule({ ...common, sync: replica.sync, events, focusOf })
  const therapy = createTherapyModule({ ...common, sync: replica.sync, xp: profile.xp, notify })
  const doubts = createDoubtsModule({
    ...common,
    curriculum: replica.curriculum,
    xp: profile.xp,
    notify,
    corrections: {
      byProject: (login) => late.get('network').correctedByProject(login),
      since: (campusId, since) => late.get('network').correctedSince(campusId, since),
    },
  })
  const attendance = createAttendanceModule({
    db,
    timeZoneOf: (campusId) => replica.repository.timeZoneOf(campusId),
    ...clock,
  })
  const boards = createBoardsModule({
    ...common,
    xp: profile.xp,
    attendance: attendance.service,
    events,
    notify,
  })
  const map = createMapModule({
    replica: replica.repository,
    audience,
    sync: replica.sync,
    peers: peers.peers,
    therapy: therapy.service,
    online,
    circlesOf: (logins) => replica.curriculum.circlesOf(logins),
    availableOf: (login) => peers.availabilityRepository.get(login),
    focusOf,
    titleOf: (login) => profile.xp.titleOf(login),
    broken: createBrokenSeats(db),
    ...clock,
  })

  const help = createHelpModule({
    ...common,
    agenda: replica.agenda,
    xp: profile.xp,
    attendance: attendance.service,
    notify,
    presenceOf: async (login) => ({
      available: (await peers.availability.get(login)).available,
      seat: await peers.peers.locationOf(login),
    }),
    // `calendar` se monta después: necesita la guardia.
    commitments: async (who, refresh, from, to) =>
      late
        .get('calendar')
        .service.commitments(
          who,
          refresh ? await replica.repository.userIdOf(who.login) : null,
          from,
          to,
        ),
  })
  const calendar = createCalendarModule({
    replica: replica.repository,
    agenda: replica.agenda,
    help: help.service,
    therapy: therapy.service,
    boards: boards.service,
    audience,
  })
  // Avisos con cuenta atrás: lo que se fija sale del calendario (con lo de 42
  // ya guardado, sin pedir nada nuevo).
  const countdowns = createCountdownsModule({
    db,
    events: async (actor, from, to) =>
      (
        await calendar.service.between(
          actor,
          null,
          new Date(from).toISOString(),
          new Date(to).toISOString(),
        )
      ).events,
    ...clock,
  })

  // La agenda (`docs/agenda.md`): sus proyectos y su plan salen de la réplica,
  // lo de 42 del calendario ya copiado y el tablero de los sprints de terapia.
  // Nada de esto pide a 42.
  const agenda = createAgendaModule({
    db,
    audience,
    projectsOf: (login) => replica.repository.projectsOf(login, true),
    projectNames: (ids) => replica.repository.projectNames(ids),
    imagesOf: (logins) => replica.repository.imagesOf(logins),
    timeZoneOf: (campusId) => replica.repository.timeZoneOf(campusId),
    plan: async (login) => {
      const place = (await replica.curriculum.placesOf([login])).get(login)

      return replica.curriculum.circles(place?.track ?? 'classic')
    },
    events: async (actor, from, to) =>
      (
        await calendar.service.between(
          actor,
          null,
          new Date(from).toISOString(),
          new Date(to).toISOString(),
        )
      ).events,
    sprints: {
      roster: (groupId, campusId) => therapy.service.roster(groupId, campusId),
      joinedBy: (login, campusId) => therapy.service.joinedBy(login, campusId),
    },
    ...clock,
  })

  const network = createNetworkModule({
    db,
    client,
    replica: replica.repository,
    campusIds: config.sync.trackedCampusIds,
    hourlyReserve: config.sync.hourlyReserve,
    quota: replica.quota,
    isActive: () => replica.sync.isActive(),
    audience,
    poolMembersOf: (campusId) => replica.poolMembers.membersIn(campusId),
    ...given({ log: config.log }),
    ...clock,
  })

  const exams = createExamsModule({
    db,
    audience,
    client,
    replica: replica.repository,
    agenda: replica.agenda,
    curriculum: replica.curriculum,
    campusIds: config.sync.trackedCampusIds,
    hourlyReserve: config.sync.hourlyReserve,
    quota: replica.quota,
    ...given({ log: config.log }),
    ...clock,
  })

  const staff = createStaffModule({ db, ...clock })
  const facility = createFacilityModule({
    db,
    seatOf: presence.seatOf,
    slack: config.slack ?? null,
    markBroken: (actor, host) => map.service.reportBroken(actor, host),
    staffActive: (id) => staff.service.active(id),
    ...clock,
  })

  const pool = createPoolModule({
    db,
    isAdmin: async (login) => (await admin.service.accessOf(login)).admin,
    hiddenChanged: () => {
      audience.forget()
    },
    ...clock,
  })

  const meet = createMeetModule({
    db,
    documents: staff.service,
    calendar: calendar.service,
    boards: boards.service,
    help: help.service,
    attendance: attendance.service,
    therapy: therapy.service,
    replica: replica.repository,
    audience,
    notify,
    onRead: (login, eventId) => notices.service.readAbout(login, 'chat', eventId),
    online,
    ...clock,
  })
  const admin = createAdminModule({
    db,
    fixedAdmins: config.admins ?? [],
    fortyTwoRemaining: () => client.hourlyRemaining(),
    ...given({ guardLevel: config.guardLevel }),
    notify,
    settle: (about) => events.emit('notice.settled', about),
    ...given({ secret: config.secret, version: config.version }),
    stores: () => late.get('modules').flatMap((module) => module.stores ?? []),
    ...clock,
  })

  const clicker = createClickerModule({
    db,
    replica: replica.repository,
    audience,
    topCorrectors: (campusId, limit) => network.topCorrectors(campusId, limit),
    partnersOf: (campusId, login, limit) => network.partnersOf(campusId, login, limit),
    timeOn: (key, from, to) => late.get('usage').service.timeOn(key, from, to),
    brand: async (login, title) => {
      const before = (await profile.profiles.get(login))?.title ?? null

      await profile.profiles.update(login, { title })

      return before
    },
    notify,
    admins: () => admin.service.adminLogins(),
    // Lo donado a la bolsa: una petición a 42 al día por persona, si hay cuota.
    pointMoves: (login) => replica.points.movesOf(login),
    ...clock,
  })

  const tours = createToursModule({ db, ...clock })
  const stats = createStatsModule({
    db,
    audience,
    circles: (track) => replica.curriculum.circles(track),
    ...clock,
  })
  const legal = createLegalModule({
    db,
    personal: () => late.get('modules').flatMap((module) => module.personal ?? []),
    ...clock,
  })

  const usage = createUsageModule({
    db,
    replica: replica.repository,
    traffic: (from, to, login) => admin.service.traffic(from, to, login),
    online: presence.onlineList,
    ...clock,
  })

  const quiz = createQuizModule({
    db,
    audience,
    circlesOf: (logins) => replica.curriculum.circlesOf(logins),
    imagesOf: (logins) => replica.repository.imagesOf(logins),
    ...clock,
  })
  const gitCourse = createGitCourseModule({
    db,
    audience,
    seatOf: (login) => peers.peers.locationOf(login),
    imagesOf: (logins) => replica.repository.imagesOf(logins),
    questions: quiz.questions,
    ...clock,
  })

  const shellCourse = createShellCourseModule({ db, ...clock })

  // `admin` va el primero: sus ganchos de consumo solo ven las rutas que se
  // registran después.
  const modules: AppModule[] = [
    admin,
    replica,
    peers,
    profile,
    therapy,
    doubts,
    attendance,
    boards,
    map,
    help,
    calendar,
    network,
    exams,
    usage,
    meet,
    notices,
    broadcasts,
    countdowns,
    agenda,
    clicker,
    tours,
    staff,
    legal,
    quiz,
    stats,
    facility,
    focus,
    gitCourse,
    shellCourse,
    pool,
    createClientErrorsModule(),
  ]

  late.wire({ admin, calendar, clicker, countdowns, exams, help, modules, network, usage })

  return {
    events,
    modules,
    services: {
      repositories: {
        availability: peers.availabilityRepository,
        replica: replica.repository,
        profiles: profile.profiles,
      },
      sync: replica.sync,
      campuses: replica.campuses,
      quota: replica.quota,
      peers: peers.peers,
      availability: peers.availability,
      xp: profile.xp,
      therapy: therapy.service,
      agenda: agenda.service,
      doubts: doubts.service,
      boards: boards.service,
      map: map.service,
      help: help.service,
      calendar: calendar.service,
      network: network.service,
      corrections: network.sync,
      poolCorrections: network.poolSync,
      exams: exams.service,
      examsSync: exams.sync,
      examsLive: exams.live,
      usage: usage.service,
      meet: meet.service,
      attendance: attendance.service,
      staff: staff.service,
      admin: admin.service,
      notices: notices.service,
      broadcasts: broadcasts.service,
      countdowns: countdowns.service,
      maintenance: admin.maintenance,
      clicker: clicker.service,
      tours: tours.service,
      legal: legal.service,
      quiz: quiz.service,
      chess: quiz.chess,
      stats: stats.service,
      facility: facility.service,
      focus: focus.service,
      gitCourse: gitCourse.service,
      shellCourse: shellCourse.service,
      pool: pool.service,
      poolMembers: replica.poolMembers,
      audience,
    },
  }
}
