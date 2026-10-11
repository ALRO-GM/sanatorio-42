/**
 * Tiempo validado con los códigos de asistencia y registro de cada intento.
 *
 * Hasta aquí `event_attendance` solo guardaba a qué hora se validó cada código.
 * Ahora guarda también el tiempo que cuenta (recortado al horario del evento) y
 * los datos del evento tal como eran al validar, para que un informe de horas
 * siga saliendo igual aunque la pizarra se borre o se cambie después.
 *
 * Tablas del módulo `attendance`.
 */

import type { Migration } from './types.js'

export const attendanceSchema: Migration = {
  version: 18,
  name: 'tiempo-validado',
  statements: [
    `ALTER TABLE event_attendance ADD COLUMN campus_id INTEGER`,
    // Quien organizaba (imparte la pizarra o ayuda) y cómo se llamaba el evento.
    `ALTER TABLE event_attendance ADD COLUMN host TEXT`,
    `ALTER TABLE event_attendance ADD COLUMN title TEXT`,
    // Horario previsto del evento cuando se validó.
    `ALTER TABLE event_attendance ADD COLUMN starts_at TEXT`,
    `ALTER TABLE event_attendance ADD COLUMN ends_at TEXT`,
    // El rato que cuenta, ya recortado, y sus minutos. NULL hasta validar el de fin.
    `ALTER TABLE event_attendance ADD COLUMN valid_from TEXT`,
    `ALTER TABLE event_attendance ADD COLUMN valid_to TEXT`,
    `ALTER TABLE event_attendance ADD COLUMN valid_minutes INTEGER`,
    `CREATE INDEX idx_event_attendance_valid ON event_attendance (valid_from)`,

    // Cada intento de validar un código, saliera bien o mal: es lo que permite
    // defender las horas ante un tercero y lo que cuenta los fallos por persona.
    // `phase` es NULL cuando el código no era ninguno de los dos.
    `CREATE TABLE event_checkins (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id   TEXT NOT NULL,
        login      TEXT NOT NULL,
        code       TEXT NOT NULL,
        phase      TEXT CHECK (phase IN ('start', 'end')),
        outcome    TEXT NOT NULL CHECK (outcome IN
                     ('ok', 'repeat', 'wrong_code', 'locked', 'too_early', 'too_late', 'no_start')),
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_event_checkins_event ON event_checkins (event_id, login, id)`,
  ],
}
