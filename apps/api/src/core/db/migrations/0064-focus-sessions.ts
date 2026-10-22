/**
 * Pomodoro (#80 del buzón): el registro de cada sesión, para las estadísticas
 * de cada cual y del panel. Una fila por sesión empezada: cuánto se quería,
 * cuándo acabó y cómo (a su hora, parada con sus motivos o sustituida por otra
 * al volver a empezar), y las veces que se pulsó «Acabar» y se siguió.
 *
 * `ended_at` y `outcome` van vacíos mientras dura: una sesión que llega a su
 * hora no avisa (la web puede estar cerrada), así que se da por completada al
 * leerla si ya pasó su hora.
 */

import type { Migration } from './types.js'

export const focusSessionsSchema: Migration = {
  version: 64,
  name: 'focus-sessions',
  statements: [
    `CREATE TABLE focus_sessions (
      id           INTEGER PRIMARY KEY,
      login        TEXT NOT NULL,
      started_at   TEXT NOT NULL,
      planned_s    INTEGER NOT NULL,
      ended_at     TEXT,
      outcome      TEXT,
      reasons      TEXT NOT NULL DEFAULT '[]',
      stays        INTEGER NOT NULL DEFAULT 0,
      stay_reasons TEXT NOT NULL DEFAULT '[]'
    )`,
    'CREATE INDEX focus_sessions_login ON focus_sessions (login, started_at)',
    'CREATE INDEX focus_sessions_started ON focus_sessions (started_at)',
  ],
}
