import type { Segment } from './usage.js'

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

export type TitleId =
  | 'paciente'
  | 'interno'
  | 'residente'
  | 'especialista'
  | 'jefe'
  // Los de Code Clicker: se ganan haciendo trampas, uno cada vez.
  | 'hacker_etico'
  | 'hacker_poco_etico'
  | 'hacker_cazado'
  // Quien ha corregido diez veces un mismo proyecto. Lleva al lado en cuántos.
  | 'maestro'

export type Lang = 'es' | 'en' | 'ca' | 'eu' | 'fr'

/** `GET /me/profile` (la API añade además `homeCampusId`, ver `Profile`). */
export type Expediente = {
  login: string
  /** Campus que está mirando: el elegido, o el suyo si no ha elegido. */
  campusId: number
  lang: string | null
  admin: boolean
  /** `true` si te ofreces a preevaluar proyectos terminados de los que ya aprobaste. */
  preReview: boolean
  /**
   * Con qué estilo ven tu expediente quienes lo visitan (el id de un estilo de
   * `apps/web/src/themes`), o `null` si cada cual lo ve con el suyo.
   */
  recordStyle: string | null
  xp: {
    total: number
    level: number
    /** XP con la que empezó este nivel. */
    floor: number
    /** XP con la que empieza el siguiente, o `null` en el último. */
    next: number | null
  }
  /** Título que luce: el elegido si aún le vale, o el más alto. Decide su banner. */
  title: TitleId
  /** Veces que le han pillado haciendo trampas en Code Clicker: sale junto al último título. */
  hacks: number
  /** Proyectos que ha corregido diez veces o más: el título de maestro lleva esa cuenta. */
  master: number
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
  'login' | 'xp' | 'title' | 'hacks' | 'master' | 'achievements' | 'reactions' | 'recordStyle'
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
  /**
   * Con qué estilo ven tu expediente los demás: el id de un estilo que puedas
   * usar, `none` (cada cual con el suyo) o `default` (lo de fábrica: tu estilo
   * exclusivo si tienes uno).
   */
  recordStyle?: string
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
 * Lo que cada persona copia de su perfil de la intra para que las fechas salgan
 * exactas: a qué pace va y cuándo le vence el milestone en el que está.
 *
 * 42 no publica esas dos cosas en su API, y la fecha de black hole que sí da
 * (`blackholedAt`) no incluye los días de bonus. Con un plazo real y la tabla
 * de plazos se deduce el día cero de esa persona, y de ahí todo lo demás.
 */
export type PaceRef = {
  /** Pace al que iba al anotarlo: 8, 12, 15, 18, 22 o 24. */
  pace: number
  /** Círculo en el que estaba entonces: el plazo es el de ese círculo. */
  circle: number
  /** El *Milestone Deadline* de su perfil, `YYYY-MM-DD`. */
  deadline: string
  /** Cuándo lo anotó (ISO-8601): si 42 da más días de bonus, hay que repetirlo. */
  updatedAt: string
}

/** Cuerpo de `PUT /me/health/pace`. */
export type PaceRefInput = Pick<PaceRef, 'pace' | 'deadline'>

/**
 * `GET /me/health`: lo que hace falta para saber cómo vas de tiempo en el common
 * core. Los cálculos (cuándo caerías al siguiente pace, cuándo te alcanzaría el
 * black hole) los hace la web con la tabla de plazos y `declared`.
 */
export type Health = {
  /** Cuándo empezaste el 42cursus (ISO-8601), o `null` si no se sabe. */
  startedAt: string | null
  /**
   * La fecha de black hole que da la API de 42, si la da. Es la que se puso al
   * crear el cursus: no cuenta los días de bonus ni el avance, así que la web
   * no calcula con ella.
   */
  blackholedAt: string | null
  /** Pace y plazo que ha anotado la persona, o `null` si aún no lo ha hecho. */
  declared: PaceRef | null
  /** Círculo en el que estás: el siguiente al último que completaste. */
  currentCircle: number
  /**
   * Cuándo completaste cada círculo: `milestones[2]` es la fecha en que
   * validaste el rango 2. Solo los que llevas.
   */
  milestones: string[]
}

/** Lo que se puede seguir viendo en modo Pomodoro (lo demás se silencia). */
export type FocusShow = 'corrections' | 'events' | 'messages' | 'guard' | 'notices'

/** Ajustes del Pomodoro: minutos de concentración y de descanso, y qué ver. */
export type FocusSettings = {
  focusMinutes: number
  breakMinutes: number
  /** Secciones que siguen en las pestañas (las demás se esconden mientras dura). */
  sections: string[]
  show: FocusShow[]
}

/** `GET /me/focus`, `PUT /me/focus` (empieza) y `DELETE /me/focus` (acaba). */
export type Focus = {
  /** Cuándo acaba la concentración, o `null` si no estás concentrado. */
  until: string | null
  startedAt: string | null
  /** Los últimos ajustes que usaste (o los de fábrica). */
  settings: FocusSettings
}

/**
 * Por qué se quiere acabar un Pomodoro antes de tiempo (#80 del buzón). Se
 * marca al pulsar «Acabar», tanto si al final se para como si se sigue.
 */
export type FocusReason = 'tired' | 'break' | 'distracted' | 'someone' | 'urgent' | 'done' | 'other'

/**
 * `DELETE /me/focus` (acabar) y `POST /me/focus/stay` (quería acabar y sigue):
 * los motivos marcados.
 */
export type FocusExit = { reasons: FocusReason[] }

/** Las cifras de un montón de sesiones de Pomodoro. */
export type FocusFigures = {
  /** Sesiones empezadas. */
  sessions: number
  /** Las que llegaron a su hora. */
  completed: number
  /** Las que se acabaron antes con «Acabar». */
  cancelled: number
  /** Veces que se pulsó «Acabar» y se eligió seguir. */
  stayed: number
  /** Segundos concentrados de verdad (hasta que acabó o se paró). */
  focusedSeconds: number
}

/**
 * Estadísticas del Pomodoro de un periodo: de todo el mundo (panel de gestión)
 * o de una persona. Los días y las horas van en la hora de quien mira
 * (`offset`, en minutos sobre UTC).
 */
export type FocusStats = {
  /** Primer día (incluido), o `null` si es el total desde siempre. */
  from: string | null
  to: string
  totals: FocusFigures & { people: number }
  /** Solo los días con alguna sesión, en orden. */
  days: (FocusFigures & { day: string })[]
  /** Las 24 horas del día: sesiones empezadas a esa hora y tiempo concentrado en ella. */
  hours: { hour: number; sessions: number; focusedSeconds: number }[]
  /** Cuántas veces salió cada motivo al acabar y al decidir seguir. */
  reasons: { reason: FocusReason; cancelled: number; stayed: number }[]
  /** Quién entra, en el panel: el tramo elegido de gente que lo usa. */
  segment: Segment
}

/**
 * `GET /me/focus/stats`: lo tuyo, y al lado la media por persona de un tramo
 * de quienes lo usan (del `low` % al `high` %, de menos a más tiempo).
 */
export type MyFocusStats = FocusStats & {
  band: FocusFigures
  /** Qué parte de quienes lo usan se concentra menos que tú (0–100), o `null` sin sesiones. */
  position: number | null
}
