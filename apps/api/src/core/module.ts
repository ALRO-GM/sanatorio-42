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

import type { DataStore } from './db/data-store.js'
import type { PersonalTable } from './db/personal-data.js'
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
  /**
   * Los datos del módulo que quien administra puede borrar a mano desde el
   * panel. Nada se borra solo por viejo.
   */
  readonly stores?: readonly DataStore[]
  /**
   * Las tablas del módulo con datos de una persona: es lo que se le da al
   * descargar sus datos (`GET /me/export`). Toda tabla con un login va aquí,
   * también la columna de «quién hizo algo» (`*_by`, `validator`, `host`…); en
   * las tablas «entre dos», `give` recorta la fila a lo de cada parte. Un test
   * recorre el esquema y avisa de la columna que falte.
   */
  readonly personal?: readonly PersonalTable[]
  /** Arranca el trabajo de fondo, si lo tiene. Solo lo llama `main.ts`. */
  readonly start?: () => void
  /** Para el trabajo de fondo y espera a que termine lo que esté a medias. */
  readonly stop?: () => Promise<void>
}
