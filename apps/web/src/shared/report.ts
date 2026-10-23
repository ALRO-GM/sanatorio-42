/**
 * Las denuncias de un mensaje (pizarras, dudas, chats): los motivos y cuándo
 * se puede mandar una. Lo usan el botón de denunciar, que sale en varias
 * secciones, y el buzón del panel, que las recibe; por eso vive aquí y no en
 * ninguna de las dos.
 */

import type { ReportReason } from '@sanatorio/contracts'

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'insults',
  'other',
] as const satisfies readonly ReportReason[]

/** Una denuncia se puede mandar con un motivo claro sin más; con «otro» hay que explicarlo. */
export function reportIsReady(reason: ReportReason, why: string): boolean {
  return reason !== 'other' || why.trim().length >= 5
}
