/**
 * Lo que comparten los tests de comunidad (XP, ayuda, terapias, tablón,
 * pizarras, administración): los servicios de verdad sobre SQLite en memoria,
 * con la réplica sembrada a mano y un reloj manual.
 *
 * No hay API de 42 de por medio: nada de esto la llama, y eso también es parte
 * de lo que se comprueba al terminar cada test.
 */

import { afterEach, beforeEach, expect } from 'vitest'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { DomainError } from '../../src/core/errors.js'
import { compose } from '../../src/app/composition.js'
import type { Services } from '../../src/app/composition.js'
import type { Actor } from '../../src/core/actor.js'
import type { MeetCheckin } from '@sanatorio/contracts'
import { createFakeClock } from './fake-api.js'
import { createFake42 } from './fake-42.js'
import { activeLocation, projectUser } from './fixtures.js'

export const MADRID = 22

/** Peticiones de la agenda de 42: eventos y exámenes del campus, y lo de cada persona. */
export const AGENDA_CALL =
  /^\/(users\/\d+\/(events_users|exams|scale_teams)|campus\/\d+\/(events|exams))/
/** Lo donado a la bolsa de 42, para Code Clicker. */
export const DONATIONS_CALL = /^\/users\/\d+\/correction_point_historics/
export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

/** Martes 6 de octubre de 2026, 16:30 en Madrid (14:30 UTC). */
export const TUESDAY_AFTERNOON = Date.parse('2026-10-06T14:30:00.000Z')

export const actor = (login: string, extra: Partial<Actor> = {}): Actor => ({
  login,
  campusId: MADRID,
  admin: false,
  ...extra,
})

/** Comprueba que una promesa falla con ese código de dominio. */
export async function expectCode(
  promise: Promise<unknown>,
  code: DomainError['code'],
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (cause: unknown) => cause,
  )

  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

export type Community = {
  db: Db
  services: Services
  clock: ReturnType<typeof createFakeClock>
  api: ReturnType<typeof createFake42>
  /** Sienta a esa gente y deja la foto de puestos recién hecha, para que no se pida a 42. */
  seat: (seats: Record<string, string>) => Promise<void>
  /** Valida un código de un evento: el que enseña `host`, lo escribe `guest`. */
  validate: (
    id: string,
    host: string,
    guest: string,
    phase: 'start' | 'end',
  ) => Promise<MeetCheckin>
  /**
   * Una sesión de ayuda entera: `eva` se ofrece, `requester` reserva media hora
   * a las 17:00, valida el código de inicio y el de fin, y se valoran.
   */
  helpSession: (requester: string, helper?: string) => Promise<number | null>
}

/**
 * Monta la comunidad antes de cada test de la `describe` que lo llama y la
 * cierra después. Lo que devuelve se rellena en cada `beforeEach`: hay que
 * leerlo dentro de los tests, no al definir la `describe`.
 */
export function useCommunity(): Community {
  // Se rellena en el `beforeEach`; hasta entonces no hay nada que leer.
  const community = {} as Community

  beforeEach(async () => {
    community.db = await openDatabase({ url: 'file::memory:' })
    community.clock = createFakeClock(TUESDAY_AFTERNOON)
    community.api = createFake42()
    community.services = compose(community.db, community.api.client, {
      now: community.clock.now,
      sync: {
        trackedCampusIds: [MADRID],
        defaultCampusId: MADRID,
        hourlyReserve: 300,
        backfillIntervalMs: 0,
        locationsTtlMs: 2 * MINUTE,
        locationsIdleMs: 15 * MINUTE,
        deltaTtlMs: 5 * MINUTE,
        deltaIdleMs: 30 * MINUTE,
        requestPageBudget: 2,
      },
    }).services

    // Madrid: `ana` y `leo` hacen ft_printf (10); `eva` ya lo aprobó.
    const { replica } = community.services.repositories
    await replica.upsertCampuses([
      { id: MADRID, name: 'Madrid', time_zone: 'Europe/Madrid' },
      { id: 58, name: 'Barcelona', time_zone: 'Europe/Madrid' },
    ])
    await replica.ingestProjectUsers(
      [projectUser('ana'), projectUser('leo'), projectUser('eva', { status: 'finished' })],
      MADRID,
    )
  })

  afterEach(() => {
    closeDatabase(community.db)
    // La comunidad no le pregunta nada a 42, con dos excepciones: la guardia mira
    // la agenda de quien ayuda (sus correcciones), que se guarda un cuarto de
    // hora, y Code Clicker mira una vez al día lo donado a la bolsa.
    expect(
      community.api.calls.filter((call) => !AGENDA_CALL.test(call) && !DONATIONS_CALL.test(call)),
    ).toHaveLength(0)
  })

  /** Sienta a esa gente y deja la foto de puestos recién hecha, para que no se pida a 42. */
  const seat = async (seats: Record<string, string>): Promise<void> => {
    const { replica } = community.services.repositories

    await replica.replacePresence(
      MADRID,
      Object.entries(seats).map(([login, host]) => activeLocation(login, host)),
    )
    await replica.setState(`locations:${MADRID}`, { at: community.clock.now(), count: 1 })
  }

  /** Valida un código de un evento: el que enseña `host`, lo escribe `guest`. */
  const validate = async (
    id: string,
    host: string,
    guest: string,
    phase: 'start' | 'end',
  ): Promise<MeetCheckin> => {
    const { meet } = community.services
    const codes = (await meet.attendance(actor(host), id)).codes ?? { start: '', end: '' }

    return meet.checkin(actor(guest), { id, code: codes[phase] })
  }

  /**
   * Una sesión de ayuda entera: `eva` se ofrece, `requester` reserva media hora
   * a las 17:00, valida el código de inicio y el de fin, y se valoran.
   */
  const helpSession = async (requester: string, helper = 'eva'): Promise<number | null> => {
    const { help } = community.services

    await help.setToday(actor(helper), {
      windows: [{ start: '17:00', end: '19:00' }],
      maxMinutes: 120,
    })
    const booking = await help.book(actor(requester), {
      helper,
      projectId: 10,
      start: '17:00',
      minutes: 30,
    })
    await help.respond(actor(helper), booking.id, true)

    const id = `help:booking:${booking.id}`

    community.clock.advance(30 * MINUTE) // 17:00
    await validate(id, helper, requester, 'start')

    community.clock.advance(35 * MINUTE) // 17:35
    await validate(id, helper, requester, 'end')
    await help.rate(actor(requester), booking.id, { tag: 'concept' })

    return (await help.rate(actor(helper), booking.id, { tag: 'prepared' })).xp
  }

  return Object.assign(community, { seat, validate, helpSession })
}
