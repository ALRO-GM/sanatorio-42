/**
 * Lo que la web sabe hacer contra la API.
 *
 * Es una interfaz para que haya dos implementaciones intercambiables: la real
 * (`client.ts`) y la de mentira en memoria (`mock.ts`), con la que se puede
 * trabajar en la web sin levantar nada más.
 */

import type {
  AvailabilityResponse,
  BoardInput,
  BoardView,
  Booking,
  BookingInput,
  Calendar,
  CampusSummary,
  ClusterMap,
  CurrentUser,
  DoubtAnswer,
  DoubtBoard,
  DoubtDetail,
  DoubtView,
  GroupInput,
  GroupView,
  Guide,
  GuideInput,
  GuideSection,
  HelpDay,
  HelpDayInput,
  HelpOffer,
  HelpReputation,
  HelperTag,
  HolyGraph,
  Health,
  PaceRefInput,
  Leaderboard,
  NetworkGraph,
  NetworkMine,
  NetworkPairDetail,
  NetworkPerson,
  NetworkStrictest,
  LeaderboardPeriod,
  Peer,
  Profile,
  PublicProfile,
  ProjectSummary,
  RequesterTag,
  SettingsInput,
  SyncStatus,
  UsageCounts,
  UsageHeatmap,
  MeetAttendance,
  MeetCheckin,
  MeetMessageInput,
  MeetThread,
  AdminPeople,
  BudgetSettings,
  EventAlerts,
  FortyTwoQuota,
  FortyTwoQuotaSettings,
  Notices,
  Pulse,
  BudgetStatus,
  Consumption,
  LoggedMessage,
  Ticket,
  TicketInput,
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
}

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
   * Dirección del CSV con las horas validadas con códigos en un periodo (días
   * `YYYY-MM-DD`). Sin `login`, las tuyas; `all` es para quien administra.
   */
  attendanceReportUrl: (query: { from?: string; to?: string; login?: string }) => string

  // --- Buzón y administración
  /** Manda una incidencia, una sugerencia o una denuncia. */
  openTicket: (ticket: TicketInput) => Promise<Ticket>
  getMyTickets: () => Promise<Ticket[]>
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
  getAdminMessages: () => Promise<LoggedMessage[]>

  // --- Uso de la web
  /** Cuánto usa la comunidad cada elemento, para el orden automático. */
  getUsage: () => Promise<UsageCounts>
  /** Suma lo que has usado desde el último envío. */
  sendUsage: (counts: Record<string, number>) => Promise<void>
  /** Mapa de calor del uso por grupos de personas. Solo admins. */
  getUsageHeatmap: (by: UsageHeatmap['by']) => Promise<UsageHeatmap>

  /** El expediente público de otra persona. */
  getPublicProfile: (login: string) => Promise<PublicProfile>
  updateSettings: (settings: SettingsInput) => Promise<void>
  getSyncStatus: () => Promise<SyncStatus>
  /** Avisos sin leer y estado de la cuota de 42: lo que se pregunta de fondo. */
  getPulse: () => Promise<Pulse>
  /** Tu buzón de avisos, lo que no has leído primero. */
  getNotices: () => Promise<Notices>
  /** Da por leídos esos avisos, o todos si no se dice cuáles. Devuelve el buzón. */
  readNotices: (ids?: number[]) => Promise<Notices>
  getAdminQuota: () => Promise<FortyTwoQuota>
  /** Cambia los ajustes de la cuota de 42; solo hace falta mandar lo que cambia. */
  setAdminQuota: (changes: Partial<FortyTwoQuotaSettings>) => Promise<FortyTwoQuota>

  getLeaderboard: (period: LeaderboardPeriod) => Promise<Leaderboard>
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
  /** Con quién te has corregido tú, en todo el histórico. */
  getNetworkMine: () => Promise<NetworkMine>
  /** Logins que empiezan por lo escrito, para el buscador de la red. */
  searchNetworkPeople: (q: string) => Promise<NetworkPerson[]>

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
}
