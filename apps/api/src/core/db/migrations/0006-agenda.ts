/**
 * Agenda de 42: eventos y exámenes de cada campus, y lo que cada persona tiene
 * apuntado (inscripciones y correcciones). Es copia de 42, como el resto de la
 * réplica, pero bajo demanda: solo se pide cuando alguien abre su calendario.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const agendaSchema: Migration = {
  version: 6,
  name: 'agenda',
  statements: [
    // Eventos y exámenes comparten forma; `source` los distingue porque sus ids
    // se solapan (son tablas distintas en 42).
    `CREATE TABLE agenda_events (
        source      TEXT NOT NULL CHECK (source IN ('event', 'exam')),
        id          INTEGER NOT NULL,
        campus_id   INTEGER NOT NULL,
        name        TEXT NOT NULL,
        description TEXT,
        location    TEXT,
        kind        TEXT,
        begin_at    TEXT NOT NULL,
        end_at      TEXT NOT NULL,
        max_people  INTEGER,
        subscribers INTEGER,
        PRIMARY KEY (source, id)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_agenda_events_campus ON agenda_events (campus_id, begin_at)`,

    // Lo de cada persona, en JSON: son listas cortas que siempre se leen enteras.
    `CREATE TABLE agenda_users (
        login       TEXT PRIMARY KEY,
        events      TEXT NOT NULL DEFAULT '[]',
        exams       TEXT NOT NULL DEFAULT '[]',
        evaluations TEXT NOT NULL DEFAULT '[]',
        fetched_at  TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
