/**
 * Lo que gasta de la cuota de 42 cada función y cada persona, hora a hora
 * (`replica/api-usage.ts`, `docs/consumo-api.md`). `login` vacío es trabajo de
 * fondo, que no es de nadie.
 */

import type { Migration } from './types.js'

export const apiUsageSchema: Migration = {
  version: 81,
  name: 'api-usage',
  statements: [
    `CREATE TABLE api_usage (
      hour     TEXT NOT NULL,
      feature  TEXT NOT NULL,
      login    TEXT NOT NULL,
      requests INTEGER NOT NULL,
      PRIMARY KEY (hour, feature, login)
    ) WITHOUT ROWID`,
    `CREATE INDEX idx_api_usage_login ON api_usage (login, hour)`,
  ],
}
