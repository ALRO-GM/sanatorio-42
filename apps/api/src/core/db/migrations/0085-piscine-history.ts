/**
 * El historial de las piscinas (`docs/abandono.md`), pedido por Alberto el
 * 2026-11-06 para comparar el abandono de las últimas 10 piscinas de Madrid.
 * De las piscinas pasadas la réplica no tenía nada: `pool_members` solo guarda
 * los últimos 60 días (y decide quién ve a quién), el historial de puestos es
 * solo de alumnos del 42cursus y las correcciones de la piscina, de 90 días.
 *
 * Lo llena `replica/piscine-history.ts`, de fondo y con la cuota que sobra.
 * Va en tablas propias para no cambiar nada de lo que ya las usa (la red de
 * asientos, quién ve a quién).
 */

import type { Migration } from './types.js'

export const piscineHistorySchema: Migration = {
  version: 85,
  name: 'piscine-history',
  statements: [
    // Quién hizo la C Piscine en el campus y cuándo empezó.
    `CREATE TABLE piscine_members (
      campus_id INTEGER NOT NULL,
      user_id   INTEGER NOT NULL,
      login     TEXT NOT NULL,
      image     TEXT,
      begin_at  TEXT NOT NULL,
      PRIMARY KEY (campus_id, user_id)
    ) WITHOUT ROWID`,
    'CREATE INDEX piscine_members_begin ON piscine_members (campus_id, begin_at)',
    // Sus sesiones en los puestos durante la piscina (cerradas, de la historia de 42).
    `CREATE TABLE piscine_sessions (
      location_id INTEGER PRIMARY KEY,
      campus_id   INTEGER NOT NULL,
      user_id     INTEGER NOT NULL,
      login       TEXT NOT NULL,
      host        TEXT NOT NULL,
      begin_at    TEXT NOT NULL,
      end_at      TEXT NOT NULL
    )`,
    'CREATE INDEX piscine_sessions_campus ON piscine_sessions (campus_id, begin_at)',
    // Lo que hizo: exámenes, correcciones hechas y recibidas, y proyectos aprobados.
    `CREATE TABLE piscine_activity (
      campus_id INTEGER NOT NULL,
      user_id   INTEGER NOT NULL,
      login     TEXT NOT NULL,
      kind      TEXT NOT NULL CHECK (kind IN ('exam', 'given', 'received', 'passed')),
      ref       INTEGER NOT NULL,
      at        TEXT NOT NULL,
      PRIMARY KEY (campus_id, user_id, kind, ref)
    ) WITHOUT ROWID`,
    'CREATE INDEX piscine_activity_at ON piscine_activity (campus_id, at)',
  ],
}
