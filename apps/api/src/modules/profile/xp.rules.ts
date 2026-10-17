/**
 * Reglas del sistema de experiencia.
 *
 * Son datos, no lógica: cuánto vale cada cosa, dónde empieza cada nivel y qué
 * desbloquea. Viven aquí para que cambiar el equilibrio del juego sea tocar una
 * tabla, y para que el front y los tests hablen de los mismos identificadores.
 *
 * Los textos no están aquí: el front los traduce a partir de cada `id`.
 */

/** Motivos por los que se gana XP. Es lo que se guarda en `xp_events.kind`. */
export const XP_KIND = {
  /** Cada media hora que se te ve en tu puesto de una terapia de grupo. */
  THERAPY_SESSION: 'therapy_session',
  /** Una sesión de ayuda reservada en un proyecto que ya aprobaste. */
  SPECIALIST_HELP: 'specialist_help',
  /** Una sesión de ayuda reservada en cualquier otro caso. */
  PEER_HELP: 'peer_help',
  /** Tu respuesta fue la que resolvió una duda del tablón. */
  DOUBT_SOLVED: 'doubt_solved',
  /** Te validaron un cambio que propusiste para una guía. */
  GUIDE_PROPOSAL: 'guide_proposal',
  /** Validaste un cambio que propuso otra persona. */
  GUIDE_REVIEW: 'guide_review',
  /** Haber impartido una pizarra a la que fue alguien. */
  BOARD_HOST: 'board_host',
  /** Marca sin puntos: se puso de guardia por primera vez. */
  FIRST_DUTY: 'first_duty',
} as const

export type XpKind = (typeof XP_KIND)[keyof typeof XP_KIND]

/** Cuánto vale cada cosa. */
export const XP_AMOUNT: Record<XpKind, number> = {
  therapy_session: 10,
  specialist_help: 40,
  peer_help: 15,
  board_host: 50,
  doubt_solved: 25,
  guide_proposal: 15,
  guide_review: 5,
  first_duty: 0,
}

/**
 * XP acumulada con la que empieza cada nivel. El índice 0 es el nivel 1.
 *
 * Los primeros niveles están cerca a propósito: quien ayuda una vez tiene que
 * notar que ha pasado algo.
 */
const LEVEL_FLOORS = [0, 50, 120, 250, 500, 800, 1200, 1700, 2300, 3000] as const

/** Títulos para el banner, por nivel mínimo. */
export const TITLES = [
  { id: 'paciente', level: 1 },
  { id: 'interno', level: 2 },
  { id: 'residente', level: 3 },
  { id: 'especialista', level: 5 },
  { id: 'jefe', level: 7 },
] as const

/**
 * Lo que cuenta como ayudar a los demás, para el ranking.
 *
 * Asistir a una terapia no está: es bueno para quien va, pero no es ayudar.
 */
export const HELP_KINDS: readonly XpKind[] = [
  XP_KIND.SPECIALIST_HELP,
  XP_KIND.PEER_HELP,
  XP_KIND.DOUBT_SOLVED,
  XP_KIND.GUIDE_PROPOSAL,
  XP_KIND.GUIDE_REVIEW,
  XP_KIND.BOARD_HOST,
]

/** Logros y lo que hay que juntar para cada uno. */
export const ACHIEVEMENTS = [
  { id: 'first_duty', goal: 1 },
  { id: 'group_therapy', goal: 10 },
  { id: 'selfless_help', goal: 10 },
  { id: 'board_teacher', goal: 1 },
  { id: 'campus_guardian', goal: 25 },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']

type LevelInfo = {
  level: number
  /** XP con la que empezó este nivel. */
  floor: number
  /** XP con la que empieza el siguiente, o `null` en el último. */
  next: number | null
}

/** Nivel que corresponde a una cantidad de XP. */
export function levelFor(xp: number): LevelInfo {
  let index = 0

  for (let candidate = 0; candidate < LEVEL_FLOORS.length; candidate += 1) {
    if (xp >= (LEVEL_FLOORS[candidate] ?? Infinity)) {
      index = candidate
    }
  }

  return {
    level: index + 1,
    floor: LEVEL_FLOORS[index] ?? 0,
    next: LEVEL_FLOORS[index + 1] ?? null,
  }
}

/** `true` si ese nivel ya puede llevar ese título. */
export function titleUnlocked(titleId: string, level: number): boolean {
  const title = TITLES.find((candidate) => candidate.id === titleId)

  return title !== undefined && level >= title.level
}
