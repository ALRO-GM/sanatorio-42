/**
 * Las sesiones del historial de puestos (`seat_sessions`) tal como se miden en
 * la red de asientos y en el mapa de calor (`docs/asientos.md`). Va aparte para
 * que los dos cuenten las mismas horas: si cambia cómo se mide, cambia en los dos.
 */

import { breathe } from '../../core/breathe.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { SeatSession } from './seating.rules.js'
import { isoAt } from '../../core/time.js'

/**
 * Lo más que cuenta una sesión seguida. En los puestos de examen que no se
 * reinician bien no se echa a nadie por inactividad y la sesión puede seguir
 * abierta un día entero: eso no es estar sentado.
 */
const MAX_SESSION_MS = 12 * 3_600_000

/**
 * Margen entre la entrada que da 42 y la primera vez que se ve la sesión aquí:
 * la foto de los puestos va cada 2 o 5 minutos. Con más diferencia, no se
 * estaba mirando (antes del historial, o un puesto que no echa a nadie) y las
 * horas cuentan desde que se vio.
 */
const SEEN_SLACK_MS = 15 * 60_000

/** Una fila de `seat_sessions` (`begin_at`, `first_seen_at`, `seen_at`), como llega de la base. */
type SessionRow = Readonly<Record<string, unknown>>

/**
 * El tramo que cuenta de una sesión dentro de `[since, until]`, o `null` si no
 * cuenta nada: desde que se vio (con el margen de la foto), no desde la
 * entrada que da 42, que puede ser de días antes, y como mucho 12 h.
 */
function countedSpan(
  row: SessionRow,
  since: number,
  until: number,
): { begin: number; end: number } | null {
  const seen = typeof row.first_seen_at === 'string' ? Date.parse(row.first_seen_at) : 0
  const begin = Math.max(since, Date.parse(toText(row.begin_at)), seen - SEEN_SLACK_MS)
  const end = Math.min(until, Date.parse(toText(row.seen_at)), begin + MAX_SESSION_MS)

  return end > begin ? { begin, end } : null
}

/** Filas que se leen de una vez: con «todo» son cientos de miles, y leerlas juntas para la web entera. */
const PAGE = 10_000

/**
 * Las sesiones de un campus vistas en `[since, until]`, ya recortadas, de la
 * gente que `sees` deja ver. Con la foto de cada una, para el grafo.
 *
 * Se leen por tandas, en el orden del índice (`campus_id, seen_at`): con todo
 * el historial (850 000 sesiones en Madrid) leerlas de golpe paraba la web
 * entera unos segundos.
 */
export async function seatSessionsIn(
  db: Db,
  campusId: number,
  since: number,
  until: number,
  sees: (login: string) => boolean,
): Promise<{ sessions: SeatSession[]; images: Map<string, string | null> }> {
  const images = new Map<string, string | null>()
  const sessions: SeatSession[] = []
  // Por dónde va la lectura: la última `seen_at` y su `rowid`.
  let after = { seen: isoAt(since), id: -1 }

  for (;;) {
    const result = await db.execute({
      sql: `SELECT s.rowid AS id, s.login, s.host, s.begin_at, s.first_seen_at, s.seen_at, u.image
            FROM seat_sessions s LEFT JOIN users u ON u.id = s.user_id
            WHERE s.campus_id = ? AND (s.seen_at > ? OR (s.seen_at = ? AND s.rowid > ?))
              AND s.begin_at < ?
            ORDER BY s.seen_at, s.rowid LIMIT ?`,
      // Con las dos puntas: un periodo antiguo no lee toda la historia del campus.
      args: [campusId, after.seen, after.seen, after.id, isoAt(until), PAGE],
    })

    for (const row of result.rows) {
      const login = toText(row.login)

      if (!sees(login)) continue

      images.set(login, typeof row.image === 'string' ? row.image : null)

      const span = countedSpan(row, since, until)

      if (span !== null) sessions.push({ login, host: toText(row.host), ...span })
    }

    const last = result.rows.at(-1)

    if (last === undefined || result.rows.length < PAGE) break
    after = { seen: toText(last.seen_at), id: toNumber(last.id) }
    await breathe()
  }

  return { sessions, images }
}
