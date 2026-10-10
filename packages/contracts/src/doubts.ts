/** Estado que enseña cada post-it. */
export type DoubtStatus = 'open' | 'specialist' | 'resolved'

export type DoubtView = {
  id: number
  author: string
  body: string
  /** Índice de color del post-it. La paleta la pone la web. */
  color: number
  status: DoubtStatus
  /** Cuántas respuestas tiene. */
  answers: number
  createdAt: string
  /** `true` si es de quien pregunta (o modera): puede resolverla o borrarla. */
  mine: boolean
}

export type DoubtAnswer = {
  id: number
  author: string
  body: string
  /** `true` si quien responde aprobó el proyecto. */
  specialist: boolean
  createdAt: string
}

/** `GET /doubts/:id`. */
export type DoubtDetail = DoubtView & {
  replies: DoubtAnswer[]
  /** La respuesta que la resolvió, o `null` si sigue abierta. */
  solvedAnswerId: number | null
}

export type GuideSection = 'start' | 'problems' | 'concepts'

/** Guía corta de un proyecto. */
export type Guide = {
  /** Por dónde empezar. */
  start: string[]
  /** Problemas recurrentes. */
  problems: string[]
  /** Conceptos clave. */
  concepts: string[]
  updatedBy: string | null
  updatedAt: string | null
}

/** Cuerpo de `PUT /projects/:id/guide`. */
export type GuideInput = Pick<Guide, GuideSection>

export type GuideProposal = {
  id: number
  author: string
  section: GuideSection
  body: string
}

/**
 * Un cambio a la guía que alguien propuso y otra persona validó.
 *
 * Durante un mes, quien aprobó el proyecto puede señalarlo como desacertado. Con
 * dos señales el cambio se retira, y quien lo propuso y quien lo validó pierden
 * la XP que ganaron con él.
 */
export type GuideChange = {
  id: number
  section: GuideSection
  body: string
  proposer: string
  validator: string
  acceptedAt: string
  /** Cuántas personas lo han señalado. */
  flags: number
  flaggedByMe: boolean
  /** `false` si quien pregunta lo propuso, lo validó o ya lo señaló. */
  canFlag: boolean
}

/** Fechas ISO hasta las que dura cada bloqueo, o `null` si no hay. */
export type GuideSanctions = {
  proposeBlockedUntil: string | null
  reviewBlockedUntil: string | null
}

/** `GET /projects/:id/doubts`: el tablón entero de un proyecto. */
export type DoubtBoard = {
  project: { id: number; name: string }
  guide: Guide
  /** `true` si quien pregunta aprobó el proyecto y puede editar la guía. */
  canEditGuide: boolean
  /** Cambios propuestos a la guía. Solo llegan a quien puede aceptarlos. */
  proposals: GuideProposal[]
  /** Cambios aceptados en el último mes. Solo llegan a quien aprobó el proyecto. */
  recentChanges: GuideChange[]
  /** Hasta cuándo no puede proponer o validar quien pregunta, si está sancionado. */
  sanctions: GuideSanctions
  doubts: DoubtView[]
}
