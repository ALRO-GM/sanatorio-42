import type { RequesterTag } from './help.js'
import type { ReactionKind } from './profile.js'

/**
 * Qué tal entiende el problema quien fue corregido, tras la corrección. Lo
 * pregunta la web justo después, para que la respuesta sea realista.
 * - `perfect`: lo entiende perfectamente.
 * - `enough`: lo suficientemente bien para continuar por su cuenta.
 * - `better`: mejor que antes, pero necesitaría más ayuda.
 * - `same`: tiene más o menos los mismos problemas.
 */
export type CorrectionUnderstanding = 'perfect' | 'enough' | 'better' | 'same'

/** Una corrección reciente que la web te pide valorar. */
export type CorrectionPrompt = {
  /** Id de la corrección en 42. */
  id: number
  /** `corrected` si te corrigieron; `corrector` si corregiste tú. */
  role: 'corrector' | 'corrected'
  /**
   * La otra parte: quien te corrigió, o a quien corregiste (varias personas si
   * era un proyecto de grupo).
   */
  peers: { login: string; image: string | null }[]
  projectId: number | null
  projectName: string | null
  /** Cuándo empezó (ISO-8601). */
  beginAt: string
}

/**
 * `POST /corrections/:id/feedback`. Quien fue corregido contesta qué tal lo
 * entiende y, si quiere, deja una reacción para quien le corrigió (cuenta en sus
 * «Reacciones recibidas»). Quien corrigió dice cómo llegó la otra persona (cuenta
 * en su «Cómo llegas cuando pides ayuda»).
 */
export type CorrectionFeedbackInput =
  { understanding: CorrectionUnderstanding; reaction?: ReactionKind | null } | { tag: RequesterTag }

/**
 * `GET /corrections/understood`: qué tal entendieron el problema, en total,
 * las personas a las que corregiste. Nunca por persona ni con quién contestó.
 */
export type CorrectionUnderstood = {
  /** Respuestas que hay. */
  total: number
  /** Cuántas de cada; `null` mientras haya tan pocas que se adivinaría de quién son. */
  answers: Record<CorrectionUnderstanding, number> | null
}
