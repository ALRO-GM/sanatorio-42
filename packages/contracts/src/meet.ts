/**
 * Lo que pasa alrededor de un evento con otras personas: avisos ("lo he visto",
 * "llego tarde"), el chat del evento y la asistencia validada con códigos.
 *
 * Un evento se nombra con el mismo id que en el calendario (`board:12`,
 * `help:booking:7`, `therapy:3:2026-10-12`, `evaluation:9690094`).
 */

/** Por qué alguien se retrasa o no va. */
import type { CalendarEvent } from './calendar.js'

/**
 * Por qué alguien se retrasa o no va. `missed` no lo elige nadie: lo pone la web
 * cuando pasa media hora desde el inicio sin que esa persona haya dicho nada.
 */
export type MeetReason =
  'evaluation' | 'other_event' | 'on_my_way' | 'transport' | 'other' | 'missed'

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

/** Cuándo llegó alguien, según el código que validó, y el rato que le cuenta. */
export type MeetPresence = {
  login: string
  /** Cuándo escribió el código. */
  startedAt: string | null
  /** Hasta cuándo cuenta: la hora de fin del evento. */
  endedAt: string | null
  /**
   * Minutos validados: de la llegada a la hora de fin, recortado al horario
   * del evento. `null` si no ha escrito el código.
   */
  minutes: number | null
}

/** Cuándo se puede validar el código de un evento (ISO-8601). */
export type MeetWindow = {
  /** Desde cuándo vale: un poco antes de la hora de inicio. */
  from: string
  /** Hasta cuándo vale: la hora de fin. */
  until: string
}

/**
 * `GET /events/attendance?id=`: la asistencia de un evento que se valida con
 * código (pizarras y sesiones de ayuda).
 */
export type MeetAttendance = {
  /** `host`: quien imparte o ayuda, enseña el código · `guest`: quien asiste, lo escribe. */
  role: 'host' | 'guest'
  /** El código. Solo lo recibe quien organiza. */
  code: string | null
  /** Lo que ha validado quien pregunta. Solo para quien asiste. */
  mine: MeetPresence | null
  /** Lo que ha validado cada persona. Solo para quien organiza. */
  people: MeetPresence[]
  window: MeetWindow
  /** Códigos equivocados que aún puede escribir quien pregunta antes de quedarse sin intentos. */
  attemptsLeft: number
}

/** `POST /events/checkin` → cómo queda tu asistencia. */
export type MeetCheckin = {
  presence: MeetPresence
}

/** Una fila del informe de horas: una persona en un evento. */
export type AttendanceReportRow = {
  login: string
  /** `host`: impartió o ayudó · `guest`: asistió o recibió la ayuda. */
  role: 'host' | 'guest'
  eventId: string
  kind: 'board' | 'help'
  title: string
  /** Día del evento en la hora del campus (`YYYY-MM-DD`). */
  day: string
  /** Principio y fin del rato validado (ISO-8601). */
  from: string
  to: string
  /** Minutos validados. Para quien organiza, el rato en que tuvo a alguien validado. */
  minutes: number
  /** Duración prevista del evento, en minutos. */
  scheduledMinutes: number
  /** Con quién: quien organizaba, o quienes asistieron. */
  with: string[]
}

/** `GET /events/report?from=&to=&login=`: las horas validadas con códigos (y su CSV, `POST /events/report/csv`). */
export type AttendanceReport = {
  /** Periodo pedido, en días (`YYYY-MM-DD`), los dos incluidos. */
  from: string
  to: string
  rows: AttendanceReportRow[]
  totalMinutes: number
}

/** `GET /admin/checkins?id=`: un intento de validar un código. */
export type CheckinLogEntry = {
  id: number
  eventId: string
  login: string
  /** Lo que se escribió. */
  code: string
  phase: 'start' | 'end' | null
  outcome: 'ok' | 'repeat' | 'wrong_code' | 'locked' | 'too_early' | 'too_late' | 'no_start'
  at: string
}

/**
 * Un aviso de evento.
 *
 * - `pending`: es con más gente y aún no has dicho si vas, si te retrasas o si
 *   no vas. La web no deja cerrar el aviso hasta que lo digas.
 * - `missed`: no dijiste nada y pasó media hora desde el inicio: se te dio por
 *   no asistido. Se enseña una vez, y se puede cerrar.
 * - `info`: un evento tuyo que no necesita respuesta (un examen, un evento de
 *   42). Avisa y se cierra sin más.
 */
export type EventAlert = {
  event: CalendarEvent
  state: 'pending' | 'missed' | 'info'
}

/**
 * `GET /events/alerts`: tus avisos, por orden de inicio (el primero que llega
 * es el primero que se enseña). Trae también los de las próximas horas, para
 * que la web sepa cuándo le toca saltar a cada uno sin volver a preguntar.
 */
export type EventAlerts = {
  alerts: EventAlert[]
}

/**
 * De qué es una conversación.
 *
 * - `direct`: entre dos personas.
 * - `group`: la de un grupo de terapia.
 * - `board`: la de una pizarra.
 * - `help`: la de una sesión de ayuda reservada.
 * - `event`: la de un evento de 42 (una corrección, un evento del campus).
 */
export type ConversationKind = 'direct' | 'group' | 'board' | 'help' | 'event'

/** `GET /conversations`: una conversación tuya, con lo que has apuntado de ella. */
export type Conversation = {
  /** Id del chat, para leerlo y escribir con `/events/thread` y `/events/messages`. */
  id: string
  kind: ConversationKind
  /**
   * Cómo se llama: el título de la pizarra, el proyecto del grupo o de la
   * sesión. `null` si no se sabe (ya no existe, o es de 42): la web pone el tipo.
   */
  title: string | null
  /** Con quién, en una directa. `null` en las demás. */
  peer: string | null
  image: string | null
  /** `true` si esa persona tiene Sanatorio abierto ahora. Solo en las directas. */
  online: boolean
  /** El último mensaje, recortado. `null` si aún no se ha escrito nada. */
  last: { from: string; body: string | null; kind: MeetMessageKind; at: string } | null
  /** Mensajes de otras personas que no has visto. */
  unread: number
  /** La has marcado como pendiente de responder. */
  pending: boolean
  /** Cuándo te la recordará el buzón (ISO-8601), o `null`. */
  remindAt: string | null
  /** El proyecto del que va, si lo has dicho. */
  project: { id: number; name: string } | null
}

export type Conversations = { items: Conversation[] }

/**
 * `PUT /conversations/mark`: lo que cambias de una conversación. Lo que no
 * viene, se queda como estaba.
 */
export type ConversationMark = {
  id: string
  /** `true` la da por leída entera; `false` deja el último mensaje ajeno sin leer. */
  read?: boolean
  pending?: boolean
  /** Cuándo recordártela (ISO-8601, en el futuro y a no más de 30 días), o `null` para quitarlo. */
  remindAt?: string | null
  projectId?: number | null
}
