/**
 * Cada persona puede elegir con qué estilo ven su expediente quienes lo visitan
 * (`styles.rules.ts` del módulo `profile`). `NULL`: lo de fábrica (su estilo
 * exclusivo si tiene uno; si no, el de quien mira); `none`: el de quien mira.
 *
 * Tabla del módulo `profile`.
 */

import type { Migration } from './types.js'

export const recordStyleSchema: Migration = {
  version: 44,
  name: 'estilo-del-expediente',
  statements: ['ALTER TABLE profiles ADD COLUMN record_style TEXT'],
}
