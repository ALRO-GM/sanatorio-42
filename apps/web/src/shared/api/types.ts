/**
 * Lo que la web sabe hacer contra la API.
 *
 * Es una interfaz para que haya dos implementaciones intercambiables: la real
 * (`client.ts`) y la de mentira en memoria (`mock.ts`), con la que se puede
 * trabajar en la web sin levantar nada más.
 */

import type {
  Countdown,
  CountdownNoticeInput,
  CountdownNoticeReport,
  CountdownPinInput,
  Maintenance,
  MaintenanceInput,
  MaintenanceStatus,
  Focus,
  PoolAccess,
  PoolNotice,
  PoolSettings,
  HiddenCandidate,
  HiddenPerson,
  HiddenPersonInput,
  GitAttemptInput,
  ShellAttemptInput,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
  GitAttemptResult,
  GitCourse,
  GitGateAnswerInput,
  GitGateQuiz,
  GitGateResult,
  GitRoom,
  GitRoomLobby,
  GitRunResult,
  FocusSettings,
  FocusReason,
  FocusStats,
  MyFocusStats,
  ClickBatch,
  ClickHeatmap,
  ClickLayout,
  FacilityReport,
  FacilityReportInput,
  AdminGrowth,
  QuizLobby,
  QuizRoom,
  QuizSettings,
  QuizReviewItem,
  QuizTeam,
  TurnLobby,
  TurnMoveInput,
  TurnRoom,
  TurnSettings,
  AdminData,
  AdminPeople,
  AvailabilityResponse,
  BoardInput,
  BoardView,
  Booking,
  BookingInput,
  Broadcast,
  BroadcastAnswer,
  BroadcastInput,
  BroadcastReport,
  BudgetSettings,
  BudgetStatus,
  Calendar,
  CampusSummary,
  ClickerBoard,
  ClickerCapital,
  ClickerCheats,
  ClickerGameView,
  ClickerSanction,
  ClickerReview,
  ClickerSaved,
  ClickerSaveInput,
  ClickerState,
  ClickerUsage,
  ClickerVerdict,
  ClusterMap,
  ExamQuery,
  ExamStats,
  LiveExam,
  Consumption,
  CurrentUser,
  DataPreview,
  DataWipe,
  ConversationMark,
  Conversations,
  DoubtAnswer,
  DoubtBoard,
  DoubtDetail,
  DoubtView,
  EventAlerts,
  FortyTwoQuota,
  FortyTwoQuotaSettings,
  FoundPerson,
  GroupInput,
  GroupView,
  Guide,
  GuideInput,
  GuideSection,
  Health,
  HelpDay,
  HelpInbox,
  HelpDayInput,
  HelperTag,
  HelpOffer,
  HelpReputation,
  HolyGraph,
  HelpStats,
  StatsProgress,
  Leaderboard,
  LeaderboardPeriod,
  LoggedMessage,
  MeetAttendance,
  MeetCheckin,
  MeetMessageInput,
  MeetThread,
  NetworkGraph,
  NetworkMine,
  NetworkPairDetail,
  NetworkPerson,
  NetworkStrictest,
  SeatGraph,
  Notices,
  OnlineUsers,
  PaceRefInput,
  Peer,
  Pill,
  Profile,
  ProjectSummary,
  PersonCard,
  PublicProfile,
  Pulse,
  RequesterTag,
  SettingsInput,
  StaffAccountCreated,
  StaffAccounts,
  StaffComparison,
  StaffDocument,
  StaffMe,
  SyncStatus,
  Ticket,
  TicketInput,
  TourName,
  TourSpeeds,
  TourSpeedStats,
  UsageCounts,
  UsageFlows,
  UsageHeatmap,
  UsageSend,
  UsageStats,
  SecondFactorStatus,
  LegalStatus,
} from '@sanatorio/contracts'

/** `GET /projects/:id/peers`, con lo que viaja en cabeceras ya leído. */
export type PeersResult = {
  peers: Peer[]
  /** Personas del campus con ese proyecto, o `null` si no se sabe. */
  total: number | null
  /** `true` si aún faltan participantes por copiar de 42. */
  partial: boolean
}

/** Filtros de la red de correcciones. Lo que no se pasa, no filtra. */
export type NetworkParams = {
  /** `YYYY-MM-DD`. */
  from?: string
  to?: string
  /** Persona en la que se centra el grafo. */
  login?: string
  projectId?: number
  /** Solo las que aprobaron o las que suspendieron. */
  verdict?: 'pass' | 'fail'
  /** Solo las uniones en las que las dos personas se han corregido mutuamente. */
  mutual?: boolean
  /** Correcciones mínimas entre dos personas para pintar su unión. */
  min?: number
  /** Tope de personas. */
  limit?: number
  /** Los campus que se miran juntos: ids separados por comas, o `all`. Sin él, el propio. */
  campuses?: string
}

/** El tramo de gente que se pide, por lo activa que es: del `low` % al `high` %. */
export type SegmentQuery = { low?: number; high?: number }

/** Lo que se pide a las estadísticas y a los recorridos: periodo, persona y tramo de gente. */
export type UsageQuery = SegmentQuery & { from?: string; to?: string; login?: string }

/** Estadísticas del Pomodoro: días locales (sin `from`, el total) y minutos sobre UTC. */
export type FocusStatsQuery = SegmentQuery & { from?: string; to: string; offset: number }

export type Api = {
  // --- Sesión
  getMe: () => Promise<CurrentUser>
  /** Navega al login de 42. La promesa no se resuelve: la página se va. */
  login: () => Promise<void>
  logout: () => Promise<void>

  // --- Consulta
  /** Con `all`, también los aprobados, cada uno con su `status`. */
  getMyProjects: (all?: boolean) => Promise<ProjectSummary[]>
  getPeers: (projectId: number) => Promise<PeersResult>
  getAvailability: () => Promise<boolean>
  setAvailability: (available: boolean) => Promise<AvailabilityResponse>

  // --- Calendario personal
  /** Tus eventos entre dos instantes (ISO-8601): los de Sanatorio y los de 42. */
  getCalendar: (from: string, to: string) => Promise<Calendar>

  // --- Mapa de clusters
  /** El campus con la gente de guardia de ese proyecto resaltada. */
  getProjectMap: (projectId: number) => Promise<ClusterMap>
  /** El plano a secas: ocupación y reservas, para elegir puestos. */
  getCampusMap: () => Promise<ClusterMap>
  /** Estadísticas de los exámenes, los círculos y el black hole del campus, por plan y kickoff. */
  getExamStats: (query: ExamQuery) => Promise<ExamStats>
  /** El examen que hay ahora en el campus (o el siguiente, en las próximas 24 h). */
  getLiveExam: () => Promise<LiveExam>
  /** Lo mismo, pidiendo antes lo nuevo a 42 (uno por minuto para todo el campus). */
  refreshLiveExam: () => Promise<LiveExam>
  /** Ese puesto no funciona (vale una semana), o ya funciona. */
  reportBrokenSeat: (host: string) => Promise<void>
  clearBrokenSeat: (host: string) => Promise<void>
  /** Todas tus conversaciones, con lo que has apuntado de cada una. */
  getConversations: () => Promise<Conversations>
  /** Cambia lo apuntado de una conversación; devuelve la lista al día. */
  markConversation: (change: ConversationMark) => Promise<Conversations>

  // --- Campus, preferencias y estado de la réplica
  getCampuses: () => Promise<CampusSummary[]>
  getProfile: () => Promise<Profile>

  // --- Avisos, chat y asistencia de un evento
  /** Tus avisos de evento, por orden de inicio: los que piden respuesta, los que se te pasaron y los demás. */
  getEventAlerts: () => Promise<EventAlerts>
  /** Cierra el aviso de un evento que se te pasó. */
  ackEventAlert: (eventId: string) => Promise<void>
  /** El chat de un evento. Con `after`, solo los mensajes posteriores a ese `id`. */
  getEventThread: (eventId: string, after?: number) => Promise<MeetThread>
  /** Manda un aviso o un mensaje; devuelve el chat ya con él. */
  sendEventMessage: (message: MeetMessageInput) => Promise<MeetThread>
  getEventAttendance: (eventId: string) => Promise<MeetAttendance>
  /** Valida el código de inicio o el de fin de un evento. */
  checkinEvent: (eventId: string, code: string) => Promise<MeetCheckin>
  /**
   * El CSV con las horas validadas con códigos en un periodo (días
   * `YYYY-MM-DD`), con el nombre de fichero que trae el código de verificación.
   * Sin `login`, las tuyas; `all` es para quien administra.
   */
  attendanceReport: (query: {
    from?: string
    to?: string
    login?: string
  }) => Promise<{ fileName: string; data: Blob }>

  // --- Documentos verificables y cuentas de staff
  /** Abre una sesión de staff con su clave. Falla con 401 si no vale. */
  staffLogin: (key: string) => Promise<void>
  /** Quién eres con la sesión de staff. Falla con 401 o 403 si no la hay. */
  getStaffMe: () => Promise<StaffMe>
  getStaffFacility: () => Promise<FacilityReport[]>
  resolveStaffFacility: (id: number) => Promise<void>
  // --- Avisos del edificio
  reportFacility: (input: FacilityReportInput) => Promise<FacilityReport>
  getAdminFacility: () => Promise<FacilityReport[]>
  resolveAdminFacility: (id: number) => Promise<void>
  /** El documento emitido con ese código, o 404. */
  getStaffDocument: (code: string) => Promise<StaffDocument>
  /** ¿El fichero recibido es el que se emitió con ese código? */
  compareStaffDocument: (code: string, content: string) => Promise<StaffComparison>
  /** Las cuentas de staff. Solo para quien administra. */
  getStaffAccounts: () => Promise<StaffAccounts>
  /** Crea una cuenta de staff. La clave solo viene en esta respuesta. */
  createStaffAccount: (name: string) => Promise<StaffAccountCreated>
  revokeStaffAccount: (id: number) => Promise<void>

  // --- Buzón y administración
  /** Manda una incidencia, una sugerencia o una denuncia. */
  openTicket: (ticket: TicketInput) => Promise<Ticket>
  getMyTickets: () => Promise<Ticket[]>
  /** Retira un mensaje propio, si aún se puede (`withdrawUntil`). */
  withdrawTicket: (id: number) => Promise<void>
  getAdminConsumption: () => Promise<Consumption>
  /** Cambia los ajustes del presupuesto de peticiones; solo hace falta mandar lo que cambia. */
  setAdminBudget: (changes: Partial<BudgetSettings>) => Promise<BudgetStatus>
  getAdminPeople: () => Promise<AdminPeople>
  setAdminRole: (login: string, admin: boolean) => Promise<void>
  /** `days: null` bloquea sin fecha de fin. */
  blockUser: (login: string, reason: string, days: number | null) => Promise<void>
  unblockUser: (login: string) => Promise<void>
  /** `perHour: null` devuelve a esa persona al tope automático. */
  setUserLimit: (login: string, perHour: number | null) => Promise<void>
  getAdminTickets: () => Promise<Ticket[]>
  answerTicket: (id: number, answer: string, status: 'answered' | 'closed') => Promise<Ticket>
  // Privacidad y condiciones.
  getLegal: () => Promise<LegalStatus>
  acceptLegal: (version: string) => Promise<LegalStatus>
  /** Dirección de la descarga de todos tus datos (JSON). */
  exportUrl: () => string
  /** Un fallo de la web en el navegador, para el registro del servidor. */
  reportClientError: (report: { message: string; where: string; stack?: string }) => Promise<void>
  /** Anonimiza tu cuenta escribiendo tu login (`confirm`) y cierra la sesión. */
  anonymizeMe: (confirm: string) => Promise<{ changed: number }>
  // Segundo factor del panel.
  getSecondFactor: () => Promise<SecondFactorStatus>
  setupSecondFactor: () => Promise<{ uri: string }>
  confirmSecondFactor: (code: string) => Promise<void>
  verifySecondFactor: (code: string) => Promise<void>
  lockPanel: () => Promise<void>
  /** Borra un mensaje del buzón (spam). Solo admins. */
  removeTicket: (id: number) => Promise<void>
  getAdminMessages: () => Promise<LoggedMessage[]>

  // --- Uso de la web
  /** Cuánto usa la comunidad cada elemento, para el orden automático. */
  getUsage: () => Promise<UsageCounts>
  /** Suma lo que has usado desde el último envío. */
  sendUsage: (
    counts: Record<string, number>,
    time?: UsageSend['time'],
    flows?: UsageSend['flows'],
  ) => Promise<void>
  /** El Pomodoro: si estás concentrado y tus ajustes. */
  getFocus: () => Promise<Focus>
  getGitCourse: () => Promise<GitCourse>
  submitGitAttempt: (level: string, input: GitAttemptInput) => Promise<GitAttemptResult>
  startGitGate: (gate: string) => Promise<GitGateQuiz>
  answerGitGate: (gate: string, input: GitGateAnswerInput) => Promise<GitGateResult>
  /** Las pruebas de grupo del curso de git: salas, empezar y la terminal común. */
  getGitRooms: (gate: string) => Promise<GitRoomLobby[]>
  createGitRoom: (gate: string) => Promise<GitRoom>
  getGitRoom: (id: number) => Promise<GitRoom>
  joinGitRoom: (id: number) => Promise<GitRoom>
  leaveGitRoom: (id: number) => Promise<void>
  startGitRoom: (id: number) => Promise<GitRoom>
  runGitRoom: (id: number, line: string) => Promise<GitRunResult>
  /** El curso de shell: lo que llevas, corregir una prueba y empezar un contrarreloj. */
  getShellCourse: () => Promise<ShellCourse>
  submitShellAttempt: (unit: string, input: ShellAttemptInput) => Promise<ShellAttemptResult>
  startShellBoss: (unit: string) => Promise<ShellBossStart>
  startFocus: (settings: FocusSettings) => Promise<Focus>
  stopFocus: (reasons?: FocusReason[]) => Promise<Focus>
  /** Querías acabar el Pomodoro y sigues: se apunta con los motivos marcados. */
  stayFocus: (reasons: FocusReason[]) => Promise<Focus>
  /** Tus estadísticas del Pomodoro y la media del tramo elegido de quienes lo usan. */
  getMyFocusStats: (query: FocusStatsQuery) => Promise<MyFocusStats>
  /** Las del Pomodoro de todo el mundo (o de un tramo). Solo admins. */
  getAdminFocusStats: (query: FocusStatsQuery) => Promise<FocusStats>
  /** El aviso de la piscina cerrada, sin sesión (`docs/piscineros.md`). */
  getPoolNotice: () => Promise<PoolNotice>
  /** Los ajustes de la piscina. Solo admins. */
  getPoolSettings: () => Promise<PoolSettings>
  updatePoolSettings: (changes: Partial<PoolSettings>) => Promise<PoolSettings>
  /** Las personas ocultas a un grupo (`docs/personas-ocultas.md`). Solo admins. */
  getHiddenPeople: () => Promise<HiddenPerson[]>
  /** Gente de cualquier grupo y campus, para elegir a quién ocultar. Solo admins. */
  searchHiddenCandidates: (q: string) => Promise<HiddenCandidate[]>
  /** Oculta a alguien a los grupos marcados (o cambia cómo). Devuelve la lista. */
  hidePerson: (login: string, input: HiddenPersonInput) => Promise<HiddenPerson[]>
  /** La vuelve a enseñar a todo el mundo. Devuelve la lista. */
  revealPerson: (login: string) => Promise<HiddenPerson[]>
  /** Si eres piscinero y qué puedes ver. */
  getPoolAccess: () => Promise<PoolAccess>
  /** Quien administra pasa a ver la web como un piscinero (cambia la cookie). */
  startPoolPreview: () => Promise<void>
  /** Vuelve de la vista de piscinero a la de siempre. */
  stopPoolPreview: () => Promise<void>
  /** Manda los clics de una sección para el mapa de calor. */
  sendClicks: (batch: ClickBatch) => Promise<void>
  /** El mapa de calor de clics de una sección. Solo admins. */
  getClickHeatmap: (
    section: string | null,
    layout: ClickLayout,
    days: number,
  ) => Promise<ClickHeatmap>
  /** A cuánto va cada demostración de fábrica. */
  getTourSpeeds: () => Promise<TourSpeeds>
  /** Dice a cuánto has visto una demostración, respecto a la de fábrica. */
  sendTourSpeed: (name: TourName, rate: number) => Promise<{ speed: number }>
  /** Velocidad y recuento de cada demostración. Solo admins. */
  getTourStats: () => Promise<TourSpeedStats>
  /** Personas cuyo login o nombre lleva lo escrito. */
  searchPeople: (q: string) => Promise<FoundPerson[]>
  /** Cómo se navega entre secciones en un periodo. Solo admins. */
  getFlows: (query: UsageQuery) => Promise<UsageFlows>
  /** Quién tiene la web abierta ahora y cuánto lleva. Solo admins. */
  getOnline: () => Promise<OnlineUsers>
  /** Estadísticas de uso de un periodo, de toda la web o de una persona. Solo admins. */
  getStats: (query: UsageQuery) => Promise<UsageStats>
  /** Uso por campus y crecimiento (usuarios nuevos y totales por día). Solo admins. */
  getAdminGrowth: (from: string, to: string, campuses: readonly number[]) => Promise<AdminGrowth>
  /** Mapa de calor del uso por grupos de personas. Solo admins. */
  getUsageHeatmap: (by: UsageHeatmap['by'], segment?: SegmentQuery) => Promise<UsageHeatmap>

  /** El expediente público de otra persona. */
  getPublicProfile: (login: string) => Promise<PublicProfile>
  /** La ficha que sale al pasar el ratón por un login. */
  getPersonCard: (login: string) => Promise<PersonCard>
  updateSettings: (settings: SettingsInput) => Promise<void>
  getSyncStatus: () => Promise<SyncStatus>
  /** Avisos sin leer y estado de la cuota de 42: lo que se pregunta de fondo. */
  getPulse: () => Promise<Pulse>
  /** El secreto de la cruz: pulsaciones, pastilla y partida guardada. */
  getClicker: () => Promise<ClickerState>
  pressPlus: (count: number) => Promise<{ plus: number; pill: Pill | null }>
  choosePill: (pill: Pill) => Promise<ClickerState>
  saveClicker: (save: ClickerSaveInput) => Promise<ClickerSaved>
  getClickerBoard: () => Promise<ClickerBoard>
  /** El uso del juego, general y por persona. Solo admins. */
  getClickerUsage: (days: number) => Promise<ClickerUsage>
  /**
   * Tu historial de capital, o el de otra persona si administras. `from` y `to`
   * (segundos desde 1970) piden solo un tramo, con más detalle.
   */
  getClickerCapital: (query?: {
    login?: string
    from?: number
    to?: number
  }) => Promise<ClickerCapital>
  /** Los tipos de dato que se pueden borrar a mano y cuántas filas tienen. Solo admins. */
  getAdminData: () => Promise<AdminData>
  /** Cuántas son y una muestra, para ver qué se va a borrar. Solo admins. */
  previewAdminData: (scope: DataWipe) => Promise<DataPreview>
  /** Las borra, y dice cuántas eran. Solo admins. */
  deleteAdminData: (scope: DataWipe) => Promise<{ rows: number }>
  /** Indulta una trampa: la partida rechazada pasa a estar en curso. Solo admins. */
  /** El registro de trampas de Code Clicker. Solo admins. */
  getClickerCheats: () => Promise<ClickerCheats>
  pardonClickerCheat: (id: number) => Promise<void>
  /** Descarta un aviso de salto de capital. Solo admins. */
  dismissClickerAlert: (id: number) => Promise<void>
  /** Decide sobre un salto sospechoso: trampa, probable o nada. Solo admins. */
  reviewClickerAlert: (id: number, verdict: ClickerVerdict) => Promise<void>
  /** Las revisiones que tienes que contestar. */
  getClickerReviews: () => Promise<ClickerReview[]>
  defendClickerReview: (id: number, answer: string) => Promise<void>
  /** La partida de alguien, para verla. Solo admins. */
  getClickerGameOf: (login: string) => Promise<ClickerGameView>
  /** Sanción a mano: le deja ese código y, si se pide, sin edificios ni mejoras. */
  sanctionClicker: (sanction: ClickerSanction) => Promise<void>
  /** Ya has visto el aviso de la policía del código. */
  ackClickerSeizure: () => Promise<void>
  /** Los comunicados que tienes por leer, el más antiguo primero. */
  getBroadcasts: () => Promise<Broadcast[]>
  /** Contesta a uno (o lo cierra sin elegir) y devuelve los que quedan. */
  answerBroadcast: (id: number, answer: BroadcastAnswer) => Promise<Broadcast[]>
  getAdminBroadcasts: () => Promise<BroadcastReport[]>
  sendBroadcast: (message: BroadcastInput) => Promise<BroadcastReport>
  removeBroadcast: (id: number) => Promise<void>
  /** Si la web está en mantenimiento y si quien mira puede seguir (`docs/mantenimiento.md`). */
  getMaintenance: () => Promise<MaintenanceStatus>
  /** Lo pone o lo quita. Solo admins. */
  setMaintenance: (input: MaintenanceInput) => Promise<Maintenance>
  /** Tus cuentas atrás: avisos de quien administra y lo fijado (`docs/avisos-cuenta-atras.md`). */
  getCountdowns: () => Promise<Countdown[]>
  /** Fija una cuenta atrás (un evento, el próximo compromiso o una propia); devuelve todas. */
  pinCountdown: (input: CountdownPinInput) => Promise<Countdown[]>
  unpinCountdown: (id: number) => Promise<Countdown[]>
  /** Cierra un aviso de quien administra: ya no te sale en ningún navegador. */
  dismissCountdown: (id: number) => Promise<Countdown[]>
  getAdminCountdowns: () => Promise<CountdownNoticeReport[]>
  sendCountdown: (input: CountdownNoticeInput) => Promise<CountdownNoticeReport>
  removeCountdown: (id: number) => Promise<void>
  /** Tu buzón de avisos, lo que no has leído primero. */
  getNotices: () => Promise<Notices>
  /** Da por leídos esos avisos, o todos si no se dice cuáles. Devuelve el buzón. */
  readNotices: (ids?: number[]) => Promise<Notices>
  /** Borra esos avisos, o todos los leídos que no estén guardados. */
  removeNotices: (which: { ids: number[] } | { read: true }) => Promise<Notices>
  saveNotice: (id: number, saved: boolean) => Promise<Notices>
  getAdminQuota: () => Promise<FortyTwoQuota>
  /** Cambia los ajustes de la cuota de 42; solo hace falta mandar lo que cambia. */
  setAdminQuota: (changes: Partial<FortyTwoQuotaSettings>) => Promise<FortyTwoQuota>

  getLeaderboard: (period: LeaderboardPeriod) => Promise<Leaderboard>
  /** Estadísticas de Ayuda: cifras y clasificación de cada sección. */
  getHelpStats: (period: LeaderboardPeriod) => Promise<HelpStats>
  /** El avance en el common core a lo largo del tiempo; con `other`, también el de esa persona. */
  getStatsProgress: (other: string | null) => Promise<StatsProgress>
  // --- Red de correcciones
  /** Quién ha corregido a quién en el campus, con los filtros que se pasen. */
  getNetwork: (params: NetworkParams) => Promise<NetworkGraph>
  /** Las correcciones que se han hecho dos personas, con los filtros de fecha y proyecto. */
  getNetworkPair: (a: string, b: string, params: NetworkParams) => Promise<NetworkPairDetail>
  /** Quién suspende más al corregir, entre quienes han evaluado al menos `min` proyectos. */
  getNetworkStrictest: (
    min: number,
    order: 'asc' | 'desc',
    params: NetworkParams,
  ) => Promise<NetworkStrictest>
  /** La red de asientos: quién se sienta cerca de quién, en los últimos `days` días. */
  getSeatGraph: (days: number) => Promise<SeatGraph>
  /** Con quién te has corregido tú, en todo el histórico. */
  getNetworkMine: () => Promise<NetworkMine>
  /** Logins que empiezan por lo escrito, para el buscador de la red. */
  searchNetworkPeople: (q: string, campuses?: string) => Promise<NetworkPerson[]>

  /** Fechas para el estado de salud: inicio, círculos completados y black hole. */
  getHealth: () => Promise<Health>
  /** Anota el pace y el plazo que ves en tu perfil de la intra. */
  declarePace: (ref: PaceRefInput) => Promise<Health>

  // --- Ayuda reservada (guardia)
  getHelpDay: () => Promise<HelpDay>
  setHelpDay: (day: HelpDayInput) => Promise<HelpDay>
  /** Quién se ofrece hoy y aún tiene hueco. */
  getHelpOffers: () => Promise<HelpOffer[]>
  bookHelp: (booking: BookingInput) => Promise<Booking>
  respondBooking: (id: number, accept: boolean) => Promise<void>
  cancelBooking: (id: number) => Promise<void>
  /** Peticiones de ayuda por contestar y rechazos o anulaciones sin ver. */
  getHelpInbox: () => Promise<HelpInbox>
  /** Ya has visto que se rechazó o anuló esa reserva. */
  seenBooking: (id: number) => Promise<void>
  /** Devuelve la XP repartida, o `null` si falta la valoración de la otra persona. */
  rateBooking: (id: number, tag: HelperTag | RequesterTag) => Promise<{ xp: number | null }>
  blockHelp: (login: string) => Promise<void>
  unblockHelp: (login: string) => Promise<void>
  getHelpReputation: () => Promise<HelpReputation>

  // --- Terapias de grupo
  getGroups: (projectId?: number | null) => Promise<GroupView[]>
  createGroup: (group: GroupInput) => Promise<GroupView>
  /** Solo quien lo abrió. */
  updateGroup: (id: number, group: GroupInput) => Promise<GroupView>
  /** `progress`: cómo llevas el proyecto, de 0 a 100. */
  joinGroup: (id: number, progress?: number) => Promise<void>
  leaveGroup: (id: number) => Promise<void>
  closeGroup: (id: number) => Promise<void>
  /** Avisa del grupo a quien hace el proyecto en el campus (una vez, quien lo abrió). */
  inviteGroup: (id: number) => Promise<{ invited: number }>

  // --- Tablón de dudas
  /** El common core por círculos, con tu estado y dónde hace falta una mano. */
  getDoubtGraph: () => Promise<HolyGraph>
  getDoubtBoard: (projectId: number) => Promise<DoubtBoard>
  createDoubt: (projectId: number, body: string) => Promise<DoubtView>
  /** Solo quien la puso, y mientras no esté resuelta. */
  updateDoubt: (id: number, body: string) => Promise<DoubtView>
  getDoubt: (id: number) => Promise<DoubtDetail>
  answerDoubt: (id: number, body: string) => Promise<DoubtAnswer[]>
  /** Para resolverla hay que decir qué respuesta lo consiguió; sin `answerId`, la reabre. */
  setDoubtResolved: (id: number, answerId: number | null) => Promise<void>
  removeDoubt: (id: number) => Promise<void>
  saveGuide: (projectId: number, guide: GuideInput) => Promise<Guide>
  proposeGuideChange: (projectId: number, section: GuideSection, body: string) => Promise<void>
  reviewProposal: (id: number, accept: boolean) => Promise<void>
  /** Señala un cambio ya validado. `revoked` es `true` si con esta señal se retira. */
  flagGuideChange: (id: number) => Promise<{ revoked: boolean }>

  // --- Pizarras
  /** `from` y `to` en ISO-8601. */
  getBoards: (from: string, to: string) => Promise<BoardView[]>
  createBoard: (board: BoardInput) => Promise<BoardView>
  /** Solo quien la imparte, y mientras no haya terminado. */
  updateBoard: (id: number, board: BoardInput) => Promise<BoardView>
  joinBoard: (id: number) => Promise<void>
  leaveBoard: (id: number) => Promise<void>
  cancelBoard: (id: number) => Promise<void>

  // --- Not-games
  getQuizRooms: () => Promise<QuizLobby[]>
  createQuizRoom: (settings: QuizSettings) => Promise<QuizRoom>
  /** La sala ahora mismo: se pide cada segundo mientras se juega. */
  getQuizRoom: (id: number) => Promise<QuizRoom>
  joinQuizRoom: (id: number, team?: QuizTeam | null) => Promise<QuizRoom>
  leaveQuizRoom: (id: number) => Promise<void>
  startQuizRoom: (id: number) => Promise<QuizRoom>
  /** `option` es el id de la respuesta, no su posición en pantalla. */
  answerQuiz: (id: number, question: number, option: number) => Promise<QuizRoom>
  /** El Repaso: lo que has fallado, con definición y ejemplo. */
  getQuizReview: () => Promise<QuizReviewItem[]>
  // Juegos por turnos con pregunta (ajedrez).
  getTurnRooms: () => Promise<TurnLobby[]>
  createTurnRoom: (settings: TurnSettings) => Promise<TurnRoom>
  /** La partida ahora mismo: se pide cada segundo mientras se juega. */
  getTurnRoom: (id: number) => Promise<TurnRoom>
  joinTurnRoom: (id: number) => Promise<TurnRoom>
  leaveTurnRoom: (id: number) => Promise<void>
  startTurnRoom: (id: number) => Promise<TurnRoom>
  moveTurn: (id: number, move: TurnMoveInput) => Promise<TurnRoom>
  /** `option` es el id de la respuesta, no su posición en pantalla. */
  answerTurn: (id: number, question: number, option: number) => Promise<TurnRoom>
  resignTurn: (id: number) => Promise<TurnRoom>
}
