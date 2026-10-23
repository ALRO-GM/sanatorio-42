/**
 * Presencia: quién tiene la web abierta y desde qué puesto.
 *
 * Abierta es haber pedido el pulso (`GET /pulse`) hace poco; se anota en el
 * perfil como mucho una vez por minuto y persona, que es de sobra para un «está
 * conectado». El puesto sale de la réplica de 42 (las ubicaciones del campus).
 * No tiene rutas: lo usan el plano, los chats, el buzón y el edificio.
 */

import { isoAt } from '../../core/time.js'
import type { ProfilesRepository } from '../profile/index.js'
import type { ReplicaRepository } from '../replica/index.js'

/** Cada cuánto se anota, como mucho, que alguien sigue con la web abierta. */
const BEAT_MS = 60_000
/** La web pregunta el pulso cada pocos minutos: pasado esto sin señales, se fue. */
export const PRESENCE_WINDOW_MS = 6 * 60_000

export function createPresence(deps: {
  profiles: Pick<ProfilesRepository, 'touch' | 'seenSince' | 'online'>
  replica: Pick<ReplicaRepository, 'presenceIn'>
  now?: () => number
}) {
  const now = deps.now ?? Date.now
  const beats = new Map<string, number>()
  const since = (): string => isoAt(now() - PRESENCE_WINDOW_MS)

  return {
    /** Alguien sigue ahí. Se anota como mucho una vez por minuto. */
    beat: (login: string): void => {
      if (now() - (beats.get(login) ?? 0) < BEAT_MS) return

      beats.set(login, now())
      void deps.profiles.touch(login, isoAt(now())).catch(() => undefined)
    },

    /** Quién tiene la web abierta ahora. */
    online: (): Promise<Set<string>> => deps.profiles.seenSince(since()),

    /** Lo mismo, con desde cuándo y la última señal (para el panel). */
    onlineList: () => deps.profiles.online(since()),

    /** El puesto en el que está sentada esa persona en su campus, o `null`. */
    seatOf: async (campusId: number, login: string): Promise<string | null> => {
      const present = await deps.replica.presenceIn(campusId, since())

      return present.find((person) => person.login === login)?.host ?? null
    },
  }
}
