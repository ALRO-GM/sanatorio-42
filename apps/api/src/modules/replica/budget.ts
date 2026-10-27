/**
 * Cómo se reparte la cuota horaria de 42 según la hora: el ritmo de la copia.
 *
 * 42 da 1 200 peticiones por hora a toda la aplicación y **no guarda lo que no
 * se gasta**: a cada hora en punto (UTC) el contador vuelve a 1 200, lo
 * comprobado el 2026-10-26 mirando `x-hourly-ratelimit-remaining` a ambos lados
 * de las 00:00 (ver `docs/architecture.md`, «Réplica de 42»). Así que lo que
 * quede al final de la hora se pierde, y de noche casi todo se pierde porque
 * nadie usa la web.
 *
 * Tres modos, funciones puras del reloj y de si alguien usa la web:
 *
 * - **Día** (`day`): lo de siempre. El trabajo de fondo no baja de la reserva
 *   (`SYNC_HOURLY_RESERVE`, 300) y la copia inicial va a una petición cada 5 s.
 * - **Gastar lo que sobra** (`spend`): en los últimos minutos de la hora
 *   (`SYNC_SPEND_REMAINING_MINUTES`) el trabajo de volumen puede bajar hasta el
 *   suelo de lo crítico más un margen (`SYNC_SPEND_MARGIN`, 30) para logins y
 *   para quien esté mirando. Va de corrido, sin la pausa de 5 s.
 * - **Noche** (`night`): dentro de la franja (`SYNC_NIGHT_WINDOW`, de 02:00 a
 *   06:00 en `SYNC_TIMEZONE`) y sin nadie en la web, la reserva baja a
 *   `SYNC_NIGHT_RESERVE` (50) y la copia va de corrido.
 *
 * Fuera del día, lo que puede bajar el trabajo de volumen no es el suelo de
 * golpe sino una rampa: deja `UPKEEP_PER_MINUTE` peticiones por cada minuto
 * que falta para que se renueve la cuota. Es lo que gasta el mantenimiento
 * (puestos de cinco campus cada 5 min, cambios, novedades de correcciones): si
 * la copia se comiera todo en los diez primeros minutos, el historial de
 * asientos tendría un hueco de cincuenta.
 *
 * Quien use la web gana siempre: con alguien dentro no hay modo noche (vuelve
 * la reserva de día al instante), y lo crítico y lo aplazable de las personas
 * nunca pasan por aquí.
 */

import type { BudgetMode } from '@sanatorio/contracts'

import { inWindow } from '../../core/night-window.js'
import type { NightWindow } from '../../core/night-window.js'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * Por debajo de esto no se hace desde una visita ninguna llamada a 42: lo poco
 * que queda es para que la gente pueda seguir entrando (el login son dos).
 */
export const CRITICAL_FLOOR = 40

/**
 * Peticiones por minuto que el trabajo de volumen deja para el mantenimiento
 * hasta que se renueva la cuota. Medido: con cinco campus seguidos, los puestos,
 * los cambios y las novedades de correcciones son unas 150 por hora.
 */
export const UPKEEP_PER_MINUTE = 3

/** Lo que dura el turno de una tarea de volumen desde la última vez que pidió. */
export const BULK_LEASE_MS = 30_000

/**
 * Las tareas de volumen, de más a menos prioridad. Fuera del día, la primera
 * que tenga trabajo se lleva toda la cuota que sobra, y las de detrás esperan:
 *
 * 1. `initial`: la copia inicial de los proyectos de cada campus seguido (la de
 *    París son 1,19 millones de filas, unas 12 000 peticiones). Es también la
 *    copia de los proyectos de todo París.
 * 2. `cursus`: las páginas del 42cursus (grado, fin, black hole).
 * 3. `corrections`: el histórico de correcciones.
 * 4. `seats`: el historial de asientos de 42 (`seat-history.ts`).
 * 5. `sweep`: los repasos diarios de las correcciones.
 */
export const BULK_ORDER = ['initial', 'cursus', 'corrections', 'seats', 'sweep'] as const
export type BulkJob = (typeof BULK_ORDER)[number]

export type BudgetConfig = {
  /** La reserva de día: lo que el trabajo de fondo no toca (`SYNC_HOURLY_RESERVE`). */
  dayReserve: number
  /** Suelo de la noche (`SYNC_NIGHT_RESERVE`). Nunca por debajo de `CRITICAL_FLOOR`. */
  nightReserve: number
  /** `null` si no hay modo noche. */
  nightWindow: NightWindow | null
  /** Zona horaria de la franja (IANA). */
  timeZone: string
  /** Minutos finales de la hora en los que se gasta lo que sobra. `0`: nunca. */
  spendMinutes: number
  /** De día, lo que se deja por encima del suelo crítico al gastar lo que sobra. */
  spendMargin: number
}

/** Lo que manda ahora mismo. */
export type Budget = {
  mode: BudgetMode
  /** Por debajo de esto no gasta el trabajo de volumen. */
  bulkReserve: number
  /** Por debajo de esto no gasta nada de fondo, tampoco el mantenimiento. */
  floor: number
  /** `true` si la copia inicial va con su pausa entre peticiones. */
  paced: boolean
  /** Cuándo se renueva la cuota horaria (ms). */
  resetAt: number
}

/** Sin franja ni gasto final: el comportamiento de antes, que es el de los tests. */
export function dayOnly(dayReserve: number): BudgetConfig {
  return {
    dayReserve,
    nightReserve: dayReserve,
    nightWindow: null,
    timeZone: 'UTC',
    spendMinutes: 0,
    spendMargin: 0,
  }
}

/** Cuándo empieza la hora de cuota en la que cae `now`: en punto, en UTC. */
export function windowStart(now: number): number {
  return Math.floor(now / HOUR) * HOUR
}

/**
 * El reparto de ahora.
 *
 * @param active Si alguien ha usado la web hace poco: entonces no hay noche.
 */
export function budgetAt(config: BudgetConfig, now: number, active: boolean): Budget {
  const resetAt = windowStart(now) + HOUR
  const minutesLeft = (resetAt - now) / MINUTE
  const night =
    !active && config.nightWindow !== null && inWindow(now, config.nightWindow, config.timeZone)
  const mode: BudgetMode = night
    ? 'night'
    : config.spendMinutes > 0 && minutesLeft <= config.spendMinutes
      ? 'spend'
      : 'day'

  if (mode === 'day') {
    return { mode, bulkReserve: config.dayReserve, floor: config.dayReserve, paced: true, resetAt }
  }

  const floor = Math.min(
    config.dayReserve,
    night
      ? Math.max(CRITICAL_FLOOR, config.nightReserve)
      : CRITICAL_FLOOR + Math.max(0, config.spendMargin),
  )
  const bulkReserve = Math.min(
    config.dayReserve,
    Math.ceil(floor + UPKEEP_PER_MINUTE * minutesLeft),
  )

  return { mode, bulkReserve, floor, paced: false, resetAt }
}
