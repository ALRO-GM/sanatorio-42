/**
 * Avisos al staff de problemas del edificio o de los ordenadores (#77 del
 * buzón): opciones claras (ordenador, periféricos, red, baños, temperatura,
 * luz, limpieza u otro), dónde (por defecto, tu puesto) y una nota. Los ve el
 * staff en su página y quien administra en el panel; si hay Slack configurado,
 * llegan también a su canal.
 */

import type { FacilityCategory, FacilityReport } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { assertAdmin } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'

const FACILITY_CATEGORIES = [
  'computer',
  'peripheral',
  'network',
  'toilets',
  'temperature',
  'light',
  'cleaning',
  'other',
] as const satisfies readonly FacilityCategory[]

/** Cómo se dice cada uno en Slack (el staff de 42 Madrid lee en español). */
const LABEL: Record<FacilityCategory, string> = {
  computer: 'Ordenador',
  peripheral: 'Pantalla, teclado o ratón',
  network: 'Red o wifi',
  toilets: 'Baños',
  temperature: 'Temperatura',
  light: 'Luz',
  cleaning: 'Limpieza',
  other: 'Otro',
}

/** Avisos por persona y día, como mucho: es para avisar, no para charlar. */
const PER_DAY = 10
const DAY_MS = 86_400_000
/** Lo resuelto se enseña una semana; después, solo lo abierto. */
const RESOLVED_SHOWN_MS = 7 * DAY_MS

const reportSchema = z
  .object({
    category: z.enum(FACILITY_CATEGORIES),
    place: z.string().trim().max(60).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((input) => input.category !== 'other' || (input.note ?? '').length >= 3, {
    message: 'Cuenta qué pasa: con «otro» hace falta una nota',
    path: ['note'],
  })

type FacilityOptions = {
  db: Db
  /** Dónde está sentada ahora esa persona, para cuando no dice dónde. */
  seatOf: (campusId: number, login: string) => Promise<string | null>
  /**
   * Marca el puesto como roto en el mapa (si `place` es un puesto): un aviso
   * del ordenador o de sus periféricos lo pide. Si no es un puesto, no hace nada.
   */
  markBroken?: (actor: Actor, host: string) => Promise<void>
  /** Manda el aviso al canal de Slack del staff, si lo hay. */
  slack?: ((text: string) => Promise<void>) | null
  now?: () => number
}

export function createFacilityService(options: FacilityOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const iso = (ms: number): string => new Date(ms).toISOString()

  const rowOf = (row: Record<string, unknown>): FacilityReport => ({
    id: toNumber(row.id),
    campusId: toNumber(row.campus_id),
    campusName: typeof row.campus_name === 'string' ? row.campus_name : '',
    login: toText(row.login),
    category: toText(row.category) as FacilityCategory,
    place: toText(row.place),
    note: typeof row.note === 'string' ? row.note : null,
    createdAt: toText(row.created_at),
    resolvedAt: typeof row.resolved_at === 'string' ? row.resolved_at : null,
    resolvedBy: typeof row.resolved_by === 'string' ? row.resolved_by : null,
  })

  async function list(campusId: number | null): Promise<FacilityReport[]> {
    const result = await db.execute({
      sql: `SELECT f.*, c.name AS campus_name FROM facility_reports f
            LEFT JOIN campuses c ON c.id = f.campus_id
            WHERE (f.resolved_at IS NULL OR f.resolved_at >= ?)
              AND (? IS NULL OR f.campus_id = ?)
            ORDER BY f.resolved_at IS NOT NULL, f.id DESC LIMIT 200`,
      args: [iso(now() - RESOLVED_SHOWN_MS), campusId, campusId],
    })

    return result.rows.map(rowOf)
  }

  async function resolve(id: number, by: string): Promise<void> {
    const result = await db.execute({
      sql: 'UPDATE facility_reports SET resolved_at = ?, resolved_by = ? WHERE id = ? AND resolved_at IS NULL',
      args: [iso(now()), by, id],
    })

    if (result.rowsAffected === 0)
      throw domainError('not_found', 'Ese aviso no existe o ya está resuelto')
  }

  return {
    /** Avisa de un problema. Devuelve el aviso guardado. */
    async report(actor: Actor, input: unknown): Promise<FacilityReport> {
      const { category, place, note } = parse(reportSchema, input)
      const today = await db.execute({
        sql: 'SELECT COUNT(*) AS n FROM facility_reports WHERE login = ? AND created_at >= ?',
        args: [actor.login, iso(now() - DAY_MS)],
      })

      if (toNumber(today.rows[0]?.n) >= PER_DAY) {
        throw domainError(
          'rate_limited',
          'Ya has mandado muchos avisos hoy: el staff los está viendo',
        )
      }

      const where =
        place !== undefined && place !== ''
          ? place
          : ((await options.seatOf(actor.campusId, actor.login)) ?? '')

      if (where === '') {
        throw domainError('invalid_input', 'Di dónde es: no estás sentado en ningún puesto')
      }

      const inserted = await db.execute({
        sql: `INSERT INTO facility_reports (campus_id, login, category, place, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        args: [actor.campusId, actor.login, category, where, note ?? null, iso(now())],
      })
      const id = toNumber(inserted.rows[0]?.id)

      // Un ordenador o sus periféricos que fallan: el puesto sale tachado en el
      // mapa (#82), para que nadie se siente en él ni se proponga para una terapia.
      if (category === 'computer' || category === 'peripheral') {
        await options.markBroken?.(actor, where).catch(() => undefined)
      }

      // Al canal del staff, si lo hay. No se espera: Slack no retrasa a nadie.
      void options.slack?.(
        `*${LABEL[category]}* en ${where}${note === undefined || note === '' ? '' : `: ${note}`} (avisa ${actor.login})`,
      )

      return (
        (await list(null)).find((report) => report.id === id) ?? rowOf({ id, login: actor.login })
      )
    },

    /** Los avisos de su campus, para quien administra. */
    async forAdmin(actor: Actor): Promise<FacilityReport[]> {
      assertAdmin(actor)

      return list(actor.campusId)
    },

    /** Todos los avisos, para el staff (sus cuentas no van por campus). */
    async forStaff(): Promise<FacilityReport[]> {
      return list(null)
    },

    async resolveAsAdmin(actor: Actor, id: number): Promise<void> {
      assertAdmin(actor)
      await resolve(id, actor.login)
    },

    async resolveAsStaff(name: string, id: number): Promise<void> {
      await resolve(id, `staff:${name}`)
    },
  }
}

export type FacilityService = ReturnType<typeof createFacilityService>
