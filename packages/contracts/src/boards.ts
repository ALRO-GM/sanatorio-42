/** Una pizarra tal y como la ve quien pregunta (`GET /boards`). */
export type BoardView = {
  id: number
  host: string
  hostImage: string | null
  title: string
  topic: string | null
  description: string | null
  place: string
  /** ISO-8601 en UTC. */
  startsAt: string
  endsAt: string
  capacity: number
  /** Plazas ocupadas. */
  attendees: number
  /** `true` si quien pregunta tiene plaza. */
  joined: boolean
  /** `true` si la imparte quien pregunta: solo esa persona la cambia. */
  mine: boolean
  /** `true` si puede cancelarla: quien la imparte, o quien modera (para retirarla). */
  canCancel: boolean
}

/** Cuerpo de `POST /boards`. */
export type BoardInput = {
  title: string
  topic?: string | null
  description?: string | null
  place: string
  /** ISO-8601 con zona. */
  startsAt: string
  endsAt: string
  capacity?: number
}
