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
  Leaderboard,
  LeaderboardPeriod,
  Peer,
  Profile,
  ProjectSummary,
  RequesterTag,
  SettingsInput,
  SyncStatus,
} from '@sanatorio/contracts'

/** `GET /projects/:id/peers`, con lo que viaja en cabeceras ya leído. */
export type PeersResult = {
  peers: Peer[]
  /** Personas del campus con ese proyecto, o `null` si no se sabe. */
  total: number | null
  /** `true` si aún faltan participantes por copiar de 42. */
  partial: boolean
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
  updateSettings: (settings: SettingsInput) => Promise<void>
  getSyncStatus: () => Promise<SyncStatus>

  getLeaderboard: (period: LeaderboardPeriod) => Promise<Leaderboard>
  /** Fechas para el estado de salud: inicio, círculos completados y black hole. */
  getHealth: () => Promise<Health>

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
  joinGroup: (id: number) => Promise<void>
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
