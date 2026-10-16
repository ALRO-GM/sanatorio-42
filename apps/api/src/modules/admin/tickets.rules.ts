/**
 * Reglas del buzón de incidencias y sugerencias, sin base: qué tipos hay y
 * cómo se titula un mensaje que llega sin título.
 */

import type { ReportReason, TicketCategory } from '@sanatorio/contracts'

export const TICKET_CATEGORIES = [
  'bug',
  'improvement',
  'idea',
  'translation',
  'other',
] as const satisfies readonly TicketCategory[]

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'insults',
  'other',
] as const satisfies readonly ReportReason[]

/**
 * `true` si el texto basta: hacen falta cinco letras, salvo en una denuncia con
 * un motivo claro (spam, acoso, insultos), donde el motivo ya lo dice todo.
 */
export function bodyIsEnough(body: string, reason: ReportReason | undefined): boolean {
  return body.trim().length >= 5 || (reason !== undefined && reason !== 'other')
}

/** Largo máximo de un título. */
export const SUBJECT_MAX = 120

/** Lo que se toma del mensaje para titularlo cuando no trae título. */
const DERIVED_MAX = 80

/**
 * Un título sacado del mensaje: su primera línea, cortada por una palabra si es
 * muy larga. Quien escribe ya no tiene que inventarse un título: el tipo y la
 * sección dicen de qué va.
 */
export function subjectFrom(body: string): string {
  const first = body.trim().split(/\r?\n/)[0]?.trim().replace(/\s+/g, ' ') ?? ''

  if (first.length <= DERIVED_MAX) return first

  const cut = first.slice(0, DERIVED_MAX)
  const space = cut.lastIndexOf(' ')

  return `${(space > DERIVED_MAX / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** Cuánto tiene quien escribe para retirar su mensaje, si nadie lo ha respondido. */
export const WITHDRAW_MS = 15 * 60_000

/**
 * Hasta cuándo se puede retirar un mensaje, o `null` si ya no: pasado el rato,
 * o en cuanto alguien lo responde o lo cierra.
 */
export function withdrawUntil(
  ticket: { createdAt: string; status: string; answer: string | null },
  now: number,
): string | null {
  const until = Date.parse(ticket.createdAt) + WITHDRAW_MS

  return ticket.status === 'open' && ticket.answer === null && Number.isFinite(until) && until > now
    ? new Date(until).toISOString()
    : null
}
