/**
 * Estado de la réplica de 42, sin levantar el servidor.
 *
 * Responde a "¿cuánto llevamos copiado?", "¿de cuándo son los puestos?" y "¿a
 * qué ritmo va la copia ahora?", que es lo primero que hay que mirar cuando
 * alguien dice que no le sale gente o que falta un campus.
 *
 * No hace ninguna petición a 42: solo lee la base. El modo de la cuota (día,
 * noche o gastar lo que sobra) lo guarda el servidor en `sync_state` al
 * cambiar, porque depende de si hay gente en la web y eso solo lo sabe él.
 *
 * Uso:
 *
 *   npm run sync:status
 */

import { createApiClient } from '../integrations/forty-two/create-client.js'
import { loadEnv } from '../config/env.js'
import { closeDatabase, openDatabase } from '../core/db/database.js'
import { compose } from '../app/composition.js'
import { BUDGET_STATE_KEY, cursusStateKey, syncConfigFrom } from '../modules/replica/index.js'
import type { BudgetState, CursusState } from '../modules/replica/index.js'

/** Filas por petición: las páginas de 42 son de 100. */
const PER_PAGE = 100

/**
 * Lo que la copia de volumen gasta en una hora, para la estimación: de día
 * ~750 (la reserva y la pausa), de noche y al final de la hora casi todo.
 */
const BULK_PER_HOUR = 900

const MODES: Record<BudgetState['mode'], string> = {
  day: 'día (la copia respeta la reserva)',
  night: 'noche (la copia gasta casi toda la cuota)',
  spend: 'gastar lo que sobra antes de que se renueve la cuota',
}

const env = loadEnv()
const db = await openDatabase({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN })

try {
  const { services } = compose(db, createApiClient(env), { sync: syncConfigFrom(env) })
  const { sync, corrections } = services
  const replica = services.repositories.replica
  const status = await sync.status()
  const minutes = (iso: string): number => Math.round((Date.now() - Date.parse(iso)) / 60_000)
  const ago = (iso: string | null): string => (iso === null ? 'nunca' : `hace ${minutes(iso)} min`)
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`)
  }
  const number = (value: number): string => value.toLocaleString('es-ES')
  let pending = 0

  out(
    `Réplica: ${status.replica.users} personas, ${status.replica.projectUsers} filas de ` +
      `proyectos, ${status.replica.projects} proyectos, ${status.replica.present} en un puesto.`,
  )

  const budget = await replica.getState<BudgetState>(BUDGET_STATE_KEY)

  if (budget === undefined) {
    out('Cuota de 42: el servidor aún no ha guardado su modo.')
  } else {
    out(
      `Cuota de 42: modo ${MODES[budget.mode]}, ${ago(budget.since)}; la copia baja hasta ` +
        `${budget.bulkReserve}. Noche: ${budget.nightWindow ?? 'sin franja'} (${budget.timeZone}).`,
    )
    if (budget.lastReset !== null) {
      out(
        `  Última renovación vista: ${budget.lastReset.at} (quedaban ${budget.lastReset.from}, ` +
          `pasó a ${budget.lastReset.to}).`,
      )
    }
  }

  out('Trabajo de volumen, por orden de prioridad:')

  for (const campus of status.campuses) {
    const { phase, rows, total } = campus.backfill
    const left = phase === 'done' || total === null ? 0 : Math.ceil((total - rows) / PER_PAGE)
    const progress =
      phase === 'done'
        ? 'completa'
        : total === null
          ? `copiando lo que está en curso (${number(rows)} filas)`
          : `${Math.min(99, Math.round((rows / total) * 100))} % (${number(rows)} de ` +
            `${number(total)} filas, quedan unas ${number(left)} peticiones)`

    pending += left
    out(
      `  1. Copia inicial del campus ${campus.id}: ${progress}; puestos ` +
        `${ago(campus.locationsAt)}; cambios ${ago(campus.deltaAt)}.`,
    )
  }

  for (const campus of status.campuses) {
    const state = await replica.getState<CursusState>(cursusStateKey(campus.id))
    const where =
      state === undefined
        ? 'sin empezar'
        : state.page > 1
          ? `a medias, página ${state.page} (${number(state.rows)} de ${state.total === null ? '?' : number(state.total)} filas)`
          : `al día (${number(state.rows)} filas${state.doneAt === null ? '' : `, ${ago(new Date(state.doneAt).toISOString())}`})`

    if (state !== undefined && state.page > 1 && state.total !== null) {
      pending += Math.ceil((state.total - state.rows) / PER_PAGE)
    }
    out(`  2. 42cursus del campus ${campus.id}: ${where}.`)
  }

  for (const campus of status.campuses) {
    const copy = await corrections.status(campus.id)
    const left =
      copy.phase === 'done' || copy.total === null
        ? 0
        : Math.max(0, Math.ceil((copy.total - copy.rows) / PER_PAGE))

    pending += left
    out(
      `  3. Correcciones del campus ${campus.id}: ` +
        (copy.phase === 'done'
          ? `histórico completo (${number(copy.rows)})`
          : `${number(copy.rows)} de ${copy.total === null ? '?' : number(copy.total)}, ` +
            `quedan unas ${number(left)} peticiones`) +
        '.',
    )
  }

  for (const campus of status.campuses) {
    const state = await replica.getState<{ sweepCursor?: number | null; sweptAt?: string | null }>(
      `corrections:${campus.id}`,
    )
    const cursor = state?.sweepCursor

    out(
      `  4. Repaso diario de correcciones del campus ${campus.id}: ` +
        (cursor !== null && cursor !== undefined
          ? `a medias (id ${number(cursor)})`
          : `último ${ago(state?.sweptAt ?? null)}`) +
        '.',
    )
  }

  out(
    `Quedan unas ${number(pending)} peticiones de copia: a unas ${BULK_PER_HOUR} por hora, ` +
      `unas ${Math.ceil(pending / BULK_PER_HOUR)} h de cuota.`,
  )
} finally {
  closeDatabase(db)
}
