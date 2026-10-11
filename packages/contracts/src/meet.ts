/**
 * Lo que pasa alrededor de un evento con otras personas: avisos ("lo he visto",
 * "llego tarde"), el chat del evento y la asistencia validada con códigos.
 *
 * Un evento se nombra con el mismo id que en el calendario (`board:12`,
 * `help:booking:7`, `therapy:3:2026-10-12`, `evaluation:9690094`).
 */

/** Por qué alguien se retrasa o no va. */
export type MeetReason = 'evaluation' | 'other_event' | 'on_my_way' | 'transport' | 'other'

/**
 * Qué dice un mensaje: `seen` (he visto el aviso), `late` (me retraso),
 * `absent` (no voy a poder ir) o `text` (un mensaje libre del chat).
 */
export type MeetMessageKind = 'seen' | 'late' | 'absent' | 'text'

export type MeetMessage = {
  id: number
  login: string
  image: string | null
  kind: MeetMessageKind
  /** Minutos de retraso. Solo en `late`. */
  minutes: number | null
  /** Motivo. Solo en `late` y `absent`. */
  reason: MeetReason | null
  /** Texto libre. Obligatorio en `text`, opcional en el resto. */
  body: string | null
  /** Cuándo se mandó (ISO-8601). */
  at: string
}

/** `GET /events/thread?id=`: el chat de un evento. */
export type MeetThread = {
  messages: MeetMessage[]
}

/** `POST /events/messages`. */
export type MeetMessageInput = {
  id: string
  kind: MeetMessageKind
  minutes?: number
  reason?: MeetReason
  body?: string
}

/** Cuándo empezó y terminó alguien, según los códigos que validó. */
export type MeetPresence = {
  login: string
  startedAt: string | null
  endedAt: string | null
  /** Minutos entre un código y otro, o `null` si falta alguno: sin los dos no vale. */
  minutes: number | null
}

/**
 * `GET /events/attendance?id=`: la asistencia de un evento que se valida con
 * códigos (pizarras y sesiones de ayuda).
 */
export type MeetAttendance = {
  /** `host`: quien imparte o ayuda, enseña los códigos · `guest`: quien asiste, los escribe. */
  role: 'host' | 'guest'
  /** Los dos códigos. Solo los recibe quien organiza. */
  codes: { start: string; end: string } | null
  /** Lo que ha validado quien pregunta. Solo para quien asiste. */
  mine: MeetPresence | null
  /** Lo que ha validado cada persona. Solo para quien organiza. */
  people: MeetPresence[]
}

/** `POST /events/checkin` → qué código era y cómo queda tu asistencia. */
export type MeetCheckin = {
  phase: 'start' | 'end'
  presence: MeetPresence
}
