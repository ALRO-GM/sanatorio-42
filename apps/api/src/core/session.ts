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
  /**
   * `staff` en las sesiones abiertas con una clave de staff: no son de nadie
   * de 42 y solo sirven para validar documentos. `id` es entonces el de la
   * cuenta de staff y `login`, su nombre. `pool`: un piscinero, que solo llega
   * a lo que permite el panel (`docs/piscineros.md`).
   */
  role: 'student' | 'pool' | 'staff'
  /**
   * `true` en una sesión `pool` que es de alguien que administra viendo la web
   * como un piscinero (`POST /admin/pool/preview`). Va firmado; solo con esto
   * se puede volver a estudiante (`POST /pool/preview/exit`).
   */
  preview?: true
}

export type SessionReader = {
  /**
   * La persona de la sesión, o `401`. No toca la base. Una sesión de staff no
   * es una persona: da `403`, así que ninguna ruta de la web le sirve.
   */
  user: (request: FastifyRequest) => SessionUser
  /** La cuenta de staff de la sesión, o `401`; `403` si la sesión es de una persona. */
  staff: (request: FastifyRequest) => { id: number; name: string }
  /** Campus principal de la persona en 42, con el de por defecto como red. */
  homeCampus: (user: SessionUser) => number
  /** La persona y el campus que está mirando. Cuesta una lectura a la base. */
  actor: (request: FastifyRequest) => Promise<Actor>
}
