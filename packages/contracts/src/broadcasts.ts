/**
 * Comunicados: mensajes que quien administra manda a una persona, a un grupo o
 * a todo el mundo, y que salen en pantalla al entrar.
 */

/** A quién va un comunicado. */
export type BroadcastAudience =
  | { kind: 'all' }
  /** A quien esté mirando ese campus. */
  | { kind: 'campus'; campusId: number }
  /** A esas personas, por su login. */
  | { kind: 'logins'; logins: string[] }

/** Un comunicado tal como le llega a quien tiene que leerlo. */
export type Broadcast = {
  id: number
  from: string
  title: string
  body: string
  /** Respuestas entre las que elegir. Vacío: basta con darse por enterado. */
  options: string[]
  /** `true` si la ventana no se puede cerrar sin contestar. */
  required: boolean
  at: string
}

/** Cuerpo de `POST /admin/broadcasts`. */
export type BroadcastInput = Pick<Broadcast, 'title' | 'body'> & {
  options?: string[]
  required?: boolean
  audience: BroadcastAudience
}

/** Cuerpo de `POST /broadcasts/:id/answer`. `null`: cerrado sin elegir. */
export type BroadcastAnswer = { option: number | null }

/** Un comunicado con lo que se ha contestado, para quien administra. */
export type BroadcastReport = Broadcast & {
  audience: BroadcastAudience
  /** Cuánta gente ha elegido cada opción, en el orden de `options`. */
  counts: number[]
  /** Cuánta gente lo ha visto sin elegir nada (o no había nada que elegir). */
  seen: number
  /** Quién ha contestado qué; `option` es `null` si solo lo ha visto. */
  answers: { login: string; option: number | null; at: string }[]
}
