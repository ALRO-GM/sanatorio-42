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
import { donatedPoints } from '../modules/clicker/donations.rules.js'
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
import type { PhotoStore, ReplicaModule, SyncerConfig } from '../modules/replica/index.js'
import { createFacilityModule } from '../modules/facility/index.js'
import { createFocusModule } from '../modules/focus/index.js'
import type { FocusModule } from '../modules/focus/index.js'
import { createGitCourseModule } from '../modules/gitcourse/index.js'
import type { GitCourseModule } from '../modules/gitcourse/index.js'
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

/** Cada cuánto se anota, como mucho, que alguien sigue con la web abierta. */
const PRESENCE_BEAT_MS = 60_000
/** La web pregunta el pulso cada pocos minutos: pasado esto sin señales, se fue. */
const PRESENCE_WINDOW_MS = 6 * 60_000

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
  doubts: DoubtsModule['service']
  boards: BoardsModule['service']
  map: MapModule['service']
  help: HelpModule['service']
  calendar: CalendarModule['service']
  network: NetworkModule['service']
  corrections: NetworkModule['sync']
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
  clicker: ClickerModule['service']
  tours: ToursModule['service']
  legal: LegalModule['service']
  quiz: QuizModule['service']
  chess: QuizModule['chess']
  stats: StatsModule['service']
  facility: FacilityModule['service']
  focus: FocusModule['service']
  gitCourse: GitCourseModule['service']
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

  // Con un corte por el límite del plan no se pide nada a 42. Quien lo sabe es
  // `admin`, que se monta después: de momento, nadie está cortado.
  let halted = (): boolean => false
  // Quién pasa sin turno en la cola de 42: quien administra por configuración y
  // quien tiene el permiso desde el panel. Esto último vive en la base y la
  // cola pregunta sin esperar, así que se guarda una copia que se pone al día
  // (como mucho, una vez por minuto) cuando se mira.
  let panelAdmins: ReadonlySet<string> = new Set()
  let refreshPanelAdmins = (): void => undefined

  const replica = createReplicaModule({
    db,
    client,
    config: config.sync,
    ...(config.backgroundSync === undefined ? {} : { backgroundSync: config.backgroundSync }),
    priority: (login) => {
      refreshPanelAdmins()

      return (config.admins ?? []).includes(login) || panelAdmins.has(login)
    },
    halted: () => halted(),
    ...(config.photos === undefined ? {} : { photos: config.photos }),
    ...(config.log === undefined ? {} : { log: config.log }),
    ...clock,
  })
  // El Pomodoro va pronto: la sala de espera y el plano preguntan quién está concentrado.
  const focus = createFocusModule({ db, ...clock })
  const focusOf = (logins: readonly string[]) =>
    focus.repository.untilOf(logins, new Date(now()).toISOString())
  // Los módulos avisan sin saber que hay un buzón: `notices` es quien escucha.
  const notify: Notify = (notice) => events.emit('notice', notice)
  const common = { db, replica: replica.repository, ...clock }
  const profile = createProfileModule({
    ...common,
    curriculum: replica.curriculum,
    events,
    // `clicker` se monta después: para cuando alguien pregunte ya estará.
    hacker: async (login) => {
      const caught = await clicker.service.caughtOf(login)

      return { title: hackerTitle(caught), caught }
    },
    // `network` también se monta después.
    master: async (login) =>
      [...(await network.correctedByProject(login)).values()].filter((times) => times >= MASTER_AT)
        .length,
  })

  // Presencia: quién tiene la web abierta. Se anota como mucho una vez por
  // minuto y persona, que es de sobra para un "está conectado".
  const beats = new Map<string, number>()
  const now = config.now ?? Date.now
  const beat = (login: string): void => {
    if (now() - (beats.get(login) ?? 0) < PRESENCE_BEAT_MS) return

    beats.set(login, now())
    void profile.profiles.touch(login, new Date(now()).toISOString()).catch(() => undefined)
  }
  const online = (): Promise<Set<string>> =>
    profile.profiles.seenSince(new Date(now() - PRESENCE_WINDOW_MS).toISOString())

  const broadcasts = createBroadcastsModule({ db, ...clock })
  const notices = createNoticesModule({
    db,
    events,
    quota: replica.quota,
    onPulse: beat,
    broadcasts: (actor) => broadcasts.service.count(actor),
    // `clicker` se monta después: para cuando alguien pregunte ya estará.
    clickerReviews: async (actor) => (await clicker.service.reviews(actor)).length,
    // `help` también se monta después.
    help: (actor) => help.service.inboxCount(actor),
    // `exams`, también.
    examLive: (actor) => exams.live.running(actor),
    ...clock,
  })

  const peers = createPeersModule({ ...common, sync: replica.sync, events, focusOf })
  const therapy = createTherapyModule({ ...common, sync: replica.sync, xp: profile.xp, notify })
  const doubts = createDoubtsModule({
    ...common,
    curriculum: replica.curriculum,
    xp: profile.xp,
    notify,
    // `network` se monta después: para cuando alguien pregunte ya estará.
    corrections: {
      byProject: (login) => network.correctedByProject(login),
      since: (campusId, since) => network.correctedSince(campusId, since),
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
    sync: replica.sync,
    peers: peers.peers,
    therapy: therapy.service,
    online,
    circlesOf: (logins) => replica.curriculum.circlesOf(logins),
    availableOf: (login) => peers.availabilityRepository.get(login),
    focusOf,
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
    // `calendar` se monta después (necesita la guardia): para cuando alguien pregunte ya estará.
    commitments: async (who, refresh, from, to) =>
      calendar.service.commitments(
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
  })

  const network = createNetworkModule({
    db,
    client,
    replica: replica.repository,
    campusIds: config.sync.trackedCampusIds,
    hourlyReserve: config.sync.hourlyReserve,
    quota: replica.quota,
    isActive: () => replica.sync.isActive(),
    ...(config.log === undefined ? {} : { log: config.log }),
    ...clock,
  })

  const exams = createExamsModule({
    db,
    client,
    replica: replica.repository,
    agenda: replica.agenda,
    curriculum: replica.curriculum,
    campusIds: config.sync.trackedCampusIds,
    hourlyReserve: config.sync.hourlyReserve,
    quota: replica.quota,
    ...(config.log === undefined ? {} : { log: config.log }),
    ...clock,
  })

  const staff = createStaffModule({ db, ...clock })
  const facility = createFacilityModule({
    db,
    seatOf: async (campusId, login) => {
      const since = new Date(now() - PRESENCE_WINDOW_MS).toISOString()
      const present = await replica.repository.presenceIn(campusId, since)

      return present.find((person) => person.login === login)?.host ?? null
    },
    slack: config.slack ?? null,
    markBroken: (actor, host) => map.service.reportBroken(actor, host),
    staffActive: (id) => staff.service.active(id),
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
    notify,
    onRead: (login, eventId) => notices.service.readAbout(login, 'chat', eventId),
    online,
    ...clock,
  })
  const admin = createAdminModule({
    db,
    fixedAdmins: config.admins ?? [],
    fortyTwoRemaining: () => client.hourlyRemaining(),
    ...(config.guardLevel === undefined ? {} : { guardLevel: config.guardLevel }),
    notify,
    settle: (about) => events.emit('notice.settled', about),
    ...(config.secret === undefined ? {} : { secret: config.secret }),
    // Los demás módulos se montan después: para cuando alguien pregunte ya estarán.
    stores: () => modules.flatMap((module) => module.stores ?? []),
    ...clock,
  })

  const clicker = createClickerModule({
    db,
    replica: replica.repository,
    topCorrectors: (campusId, limit) => network.topCorrectors(campusId, limit),
    partnersOf: (campusId, login, limit) => network.partnersOf(campusId, login, limit),
    // `usage` se monta después: para cuando alguien pregunte ya estará.
    timeOn: (key, from, to) => usage.service.timeOn(key, from, to),
    brand: async (login, title) => {
      const before = (await profile.profiles.get(login))?.title ?? null

      await profile.profiles.update(login, { title })

      return before
    },
    notify,
    admins: () => admin.service.adminLogins(),
    // Lo donado a la bolsa: una petición a 42 al día por persona, si hay cuota.
    donated: async (login) => {
      const userId = await replica.repository.userIdOf(login)

      if (userId === null || !replica.quota.allows('deferrable')) return null

      return donatedPoints(await client.getCorrectionPoints(userId))
    },
    ...clock,
  })

  const tours = createToursModule({ db, ...clock })
  const stats = createStatsModule({ db, ...clock })
  // `modules` se monta justo después: para cuando alguien descargue sus datos ya estará.
  const legal = createLegalModule({
    db,
    personal: () => modules.flatMap((module) => module.personal ?? []),
    ...clock,
  })

  halted = () => admin.service.halted()
  let adminsAt = Number.NEGATIVE_INFINITY

  refreshPanelAdmins = () => {
    const at = (config.now ?? Date.now)()

    if (at - adminsAt < 60_000) return
    adminsAt = at
    admin.service.adminLogins().then(
      (logins) => {
        panelAdmins = new Set(logins)
      },
      () => undefined,
    )
  }
  const usage = createUsageModule({
    db,
    replica: replica.repository,
    traffic: (from, to, login) => admin.service.traffic(from, to, login),
    online: () => profile.profiles.online(new Date(now() - PRESENCE_WINDOW_MS).toISOString()),
    ...clock,
  })

  const quiz = createQuizModule({
    db,
    circlesOf: (logins) => replica.curriculum.circlesOf(logins),
    imagesOf: (logins) => replica.repository.imagesOf(logins),
    ...clock,
  })
  const gitCourse = createGitCourseModule({
    db,
    seatOf: (login) => peers.peers.locationOf(login),
    imagesOf: (logins) => replica.repository.imagesOf(logins),
    questions: quiz.questions,
    ...clock,
  })

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
    clicker,
    tours,
    staff,
    legal,
    quiz,
    stats,
    facility,
    focus,
    gitCourse,
  ]

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
      doubts: doubts.service,
      boards: boards.service,
      map: map.service,
      help: help.service,
      calendar: calendar.service,
      network: network.service,
      corrections: network.sync,
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
      clicker: clicker.service,
      tours: tours.service,
      legal: legal.service,
      quiz: quiz.service,
      chess: quiz.chess,
      stats: stats.service,
      facility: facility.service,
      focus: focus.service,
      gitCourse: gitCourse.service,
    },
  }
}
