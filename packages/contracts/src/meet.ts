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

/** Cuándo empezó y terminó alguien, según los códigos que validó. */
export type MeetPresence = {
  login: string
  startedAt: string | null
  endedAt: string | null
  /**
   * Minutos validados: el rato entre un código y otro, recortado al horario del
   * evento y nunca más que su duración. `null` si falta algún código: sin los
   * dos no vale.
   */
  minutes: number | null
}

/** Cuándo se puede validar cada código de un evento (ISO-8601). */
export type MeetWindow = {
  /** Desde cuándo vale el código de inicio. */
  startFrom: string
  /** Hasta cuándo vale el código de inicio: después ya no se puede empezar. */
  startUntil: string
  /** Hasta cuándo vale el código de fin. */
  endUntil: string
  /** Minutos que tienen que pasar entre validar el de inicio y el de fin. */
  minStay: number
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
  window: MeetWindow
  /** Códigos equivocados que aún puede escribir quien pregunta antes de quedarse sin intentos. */
  attemptsLeft: number
}

/** `POST /events/checkin` → qué código era y cómo queda tu asistencia. */
export type MeetCheckin = {
  phase: 'start' | 'end'
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

/** `GET /events/report?from=&to=&login=`: las horas validadas con códigos. */
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
