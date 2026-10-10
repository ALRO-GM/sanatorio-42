/**
 * Contrato de un módulo.
 *
 * Cada carpeta de `modules/` exporta un `createXModule(deps)` que devuelve esto
 * (más sus servicios, para quien los necesite). La app no sabe qué hay dentro:
 * registra las rutas de todos, los arranca y los para.
 *
 * Añadir una funcionalidad es crear una carpeta y apuntarla en
 * `app/composition.ts`; no hay que tocar ningún otro módulo.
 */

import type { FastifyInstance } from 'fastify'

import type { SessionReader } from './session.js'

/** Lo que recibe un módulo al registrar sus rutas. */
export type RouteContext = {
  session: SessionReader
}

/** Trabajo periódico de un módulo. */
export type Job = {
  /** Nombre corto, para los logs. */
  readonly name: string
  /** Cada cuánto se lanza. */
  readonly everyMs: number
  /** Si falla, se registra y se vuelve a intentar en la siguiente vuelta. */
  readonly run: () => Promise<void>
}

export type AppModule = {
  /** Nombre corto, para los logs. */
  readonly name: string
  /** Registra las rutas HTTP del módulo. */
  readonly routes?: (app: FastifyInstance, context: RouteContext) => void
  /**
   * Trabajos periódicos (comprobar asistencia, verificar sesiones…). Los lanza
   * la app al arrancar; en los tests se llama a `run` a mano.
   */
  readonly jobs?: readonly Job[]
  /** Arranca el trabajo de fondo, si lo tiene. Solo lo llama `main.ts`. */
  readonly start?: () => void
  /** Para el trabajo de fondo y espera a que termine lo que esté a medias. */
  readonly stop?: () => Promise<void>
}
