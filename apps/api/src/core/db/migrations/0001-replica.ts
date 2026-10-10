/**
 * Réplica de 42: lo que se copia de la API, poco a poco, para no depender de ella.
 *
 * Tres cosas comprobadas contra la API real hacen que salga a cuenta:
 *
 *   /campus/22/locations?filter[active]=true        27-300 filas, 1-3 peticiones
 *   /projects_users?filter[campus]=22               156 671 filas, una vez
 *   …&range[updated_at]=<última vez>,<ahora>        7 filas en una hora
 *
 * El campus se copia una vez y después mantenerlo al día es una petición cada
 * pocos minutos. Las lecturas de la web salen de aquí con un JOIN.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const replicaSchema: Migration = {
  version: 1,
  name: 'replica',
  statements: [
    // Catálogo de campus. `tracked` no se guarda aquí: lo decide el entorno
    // (`SYNC_CAMPUS_IDS`), para poder cambiarlo sin tocar la base.
    `CREATE TABLE campuses (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        city        TEXT,
        country     TEXT,
        time_zone   TEXT,
        users_count INTEGER,
        synced_at   TEXT NOT NULL
      )`,

    // Personas. Solo lo que la web enseña: nada de email, teléfono, wallet ni
    // puntos de corrección, aunque la API los mande en cada fila.
    `CREATE TABLE users (
        id         INTEGER PRIMARY KEY,
        login      TEXT NOT NULL UNIQUE,
        name       TEXT,
        image      TEXT,
        active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        synced_at  TEXT NOT NULL
      )`,

    // Una persona puede estar en más de un campus (traslados, intercambios).
    `CREATE TABLE campus_members (
        campus_id INTEGER NOT NULL,
        user_id   INTEGER NOT NULL,
        PRIMARY KEY (campus_id, user_id)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_campus_members_user ON campus_members (user_id)`,

    // Los proyectos salen del `project` anidado de cada fila de
    // `projects_users`; el catálogo global (1 702) no se pide nunca.
    `CREATE TABLE projects (
        id   INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT
      )`,

    // El corazón de la réplica: quién hace o ha hecho qué. La clave es el id
    // de la fila en 42, así que volver a recibirla la actualiza sin duplicar.
    `CREATE TABLE project_users (
        id            INTEGER PRIMARY KEY,
        user_id       INTEGER NOT NULL,
        project_id    INTEGER NOT NULL,
        status        TEXT NOT NULL,
        validated     INTEGER,
        final_mark    INTEGER,
        updated_at_42 TEXT,
        synced_at     TEXT NOT NULL
      )`,
    `CREATE INDEX idx_project_users_project ON project_users (project_id, status)`,
    `CREATE INDEX idx_project_users_user ON project_users (user_id)`,

    // Foto de los puestos ocupados. Se reemplaza entera por campus en cada
    // sondeo: quien no viene en la respuesta ya no está sentado.
    `CREATE TABLE presence (
        user_id   INTEGER PRIMARY KEY,
        campus_id INTEGER NOT NULL,
        host      TEXT NOT NULL,
        begin_at  TEXT,
        seen_at   TEXT NOT NULL
      )`,
    `CREATE INDEX idx_presence_campus ON presence (campus_id)`,

    // Por dónde va cada tarea de sincronización. El valor es JSON porque cada
    // tarea guarda cosas distintas (un cursor, una página, un total).
    `CREATE TABLE sync_state (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
  ],
}
