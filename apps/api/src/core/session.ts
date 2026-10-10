/**
 * La sesión, vista desde los módulos.
 *
 * Es una interfaz y no una implementación: la cookie y su firma son cosa del
 * módulo `auth`, y el resto de módulos solo necesita preguntar "¿quién es?".
 */

import type { FastifyRequest } from 'fastify'

import type { Actor } from './actor.js'

/** Lo que va dentro de la cookie de sesión. */
export type SessionUser = {
  /** Id de 42. `null` en cookies firmadas antes de que se guardara. */
  id: number | null
  login: string
  /** Nombre para la cabecera. Puede venir `null` si la persona no lo tiene. */
  name: string | null
  /** Avatar ya resuelto a URL, o `null`. */
  image: string | null
  /** Campus principal en 42, o `null` si no se pudo saber al entrar. */
  campusId: number | null
}

export type SessionReader = {
  /** La persona de la sesión, o `401`. No toca la base. */
  user: (request: FastifyRequest) => SessionUser
  /** Campus principal de la persona en 42, con el de por defecto como red. */
  homeCampus: (user: SessionUser) => number
  /** La persona y el campus que está mirando. Cuesta una lectura a la base. */
  actor: (request: FastifyRequest) => Promise<Actor>
}
