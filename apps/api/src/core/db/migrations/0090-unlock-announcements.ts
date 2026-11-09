/**
 * Lo desbloqueado que ya se ha celebrado en pantalla (`docs/cursos-logros.md`):
 * un logro de los cursos, un título de nivel o el de maestro. Lo guarda la API,
 * y no el navegador, para que la ventana de celebración salga una sola vez,
 * mire desde donde mire. La fila con `unlock = ''` marca que ya se hizo la
 * primera cuenta de esa persona: lo que tenía antes de que existiera la
 * celebración se apunta entonces como ya celebrado, sin ventana.
 */

import type { Migration } from './types.js'

export const unlockAnnouncementsSchema: Migration = {
  version: 90,
  name: 'unlock-announcements',
  statements: [
    `CREATE TABLE unlock_announcements (
      login        TEXT NOT NULL,
      unlock       TEXT NOT NULL,
      announced_at TEXT NOT NULL,
      PRIMARY KEY (login, unlock)
    ) WITHOUT ROWID`,
  ],
}
