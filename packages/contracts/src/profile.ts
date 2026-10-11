/** Motivos por los que se gana XP. */
export type XpKind =
  | 'therapy_session'
  | 'specialist_help'
  | 'peer_help'
  | 'board_host'
  | 'doubt_solved'
  | 'guide_proposal'
  | 'guide_review'
  | 'first_duty'

/** Tipos de reacción de "¿Cómo te ayudó?". */
export type ReactionKind = 'bug' | 'code' | 'concept' | 'patient'

export type AchievementId =
  'first_duty' | 'group_therapy' | 'selfless_help' | 'board_teacher' | 'campus_guardian'

export type TitleId = 'paciente' | 'interno' | 'residente' | 'especialista' | 'jefe'

export type Lang = 'es' | 'en'

/** `GET /me/profile` (la API añade además `homeCampusId`, ver `Profile`). */
export type Expediente = {
  login: string
  /** Campus que está mirando: el elegido, o el suyo si no ha elegido. */
  campusId: number
  lang: string | null
  admin: boolean
  /** `true` si te ofreces a preevaluar proyectos terminados de los que ya aprobaste. */
  preReview: boolean
  xp: {
    total: number
    level: number
    /** XP con la que empezó este nivel. */
    floor: number
    /** XP con la que empieza el siguiente, o `null` en el último. */
    next: number | null
  }
  /** Título que luce en el banner. */
  title: string
  titles: { id: TitleId; level: number; unlocked: boolean }[]
  achievements: { id: AchievementId; progress: number; goal: number; unlocked: boolean }[]
  /** Reacciones recibidas, por tipo. */
  reactions: Record<ReactionKind, number>
  /** Cuánto vale cada cosa, para que la web no lo tenga escrito a mano. */
  rules: Record<XpKind, number>
  /** Lo ganado con cada cosa: cuánta XP en total y cuántas veces. */
  earned: Record<XpKind, { xp: number; times: number }>
}

/**
 * `GET /users/:login/profile`: el expediente de otra persona, tal como lo ve
 * cualquiera: nivel, título, logros, reacciones y estado de salud (a qué pace va
 * y cuándo le alcanzaría el black hole). Sin preferencias ni desglose de XP.
 */
export type PublicProfile = Pick<
  Expediente,
  'login' | 'xp' | 'title' | 'achievements' | 'reactions'
> & {
  image: string | null
  health: Health
}

/** `GET /me/profile`. */
export type Profile = Expediente & {
  /** Campus principal en 42, para poder volver a él desde el selector. */
  homeCampusId: number
}

/** Cuerpo de `PUT /me/settings`. Solo se cambia lo que venga. */
export type SettingsInput = {
  campusId?: number
  lang?: Lang
  title?: string
  /** Ofrecerte (o dejar de hacerlo) a preevaluar proyectos terminados. */
  preReview?: boolean
}

/** De cuándo es el ranking. */
export type LeaderboardPeriod = 'month' | 'all'

export type LeaderboardEntry = {
  /** Puesto, empezando en 1. Quien empata comparte puesto. */
  rank: number
  login: string
  image: string | null
  /** XP ganada ayudando en ese periodo. La de asistir a terapias no cuenta. */
  xp: number
}

/** `GET /leaderboard?period=month|all`: quién ayuda más en el campus que se mira. */
export type Leaderboard = {
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  /** Dónde está quien pregunta, aunque no entre en la lista. `null` si aún no ha ayudado. */
  me: LeaderboardEntry | null
}

/**
 * `GET /me/health`: lo que hace falta para saber cómo vas de tiempo en el common
 * core. Los cálculos (a qué pace vas, cuándo caerías al siguiente, cuándo te
 * alcanzaría el black hole) los hace la web con la tabla de plazos.
 */
export type Health = {
  /** Cuándo empezaste el 42cursus (ISO-8601), o `null` si no se sabe. */
  startedAt: string | null
  /** La fecha de black hole que da 42 en tu perfil, si la da. */
  blackholedAt: string | null
  /** Círculo en el que estás: el siguiente al último que completaste. */
  currentCircle: number
  /**
   * Cuándo completaste cada círculo: `milestones[2]` es la fecha en que
   * validaste el rango 2. Solo los que llevas.
   */
  milestones: string[]
}
