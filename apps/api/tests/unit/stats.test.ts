/**
 * Estadísticas de Ayuda: las cifras de cada sección y su clasificación, solo
 * del campus que se mira, del mes o de siempre, con empates y tu puesto.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import type { HelpStats, StatsSectionId } from '@sanatorio/contracts'

import { paceOf } from '../../src/modules/stats/pace.rules.js'
import { ranked } from '../../src/modules/stats/stats.service.js'
import { actor, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const OTHER = 99
// El reloj de los tests está en octubre de 2026: «este mes» empieza el día 1.
const THIS_MONTH = '2026-10-03T10:00:00.000Z'
const LAST_YEAR = '2025-05-03T10:00:00.000Z'

const section = (stats: HelpStats, id: StatsSectionId) => {
  const found = stats.sections.find((s) => s.id === id)

  if (found === undefined) throw new Error(`falta ${id}`)

  return found
}
const totals = (stats: HelpStats, id: StatsSectionId) =>
  Object.fromEntries(section(stats, id).totals.map((t) => [t.key, t.value]))
const board = (stats: HelpStats, id: StatsSectionId) =>
  section(stats, id).ranking.map((e) => [e.rank, e.login, e.value, e.extra])

describe('estadísticas de Ayuda', () => {
  const community = useCommunity()
  let services: Community['services']
  let db: Community['db']

  const run = async (sql: string, args: (string | number | null)[]) => {
    await db.execute({ sql, args })
  }

  beforeEach(() => {
    ;({ services, db } = community)
  })

  it('sin nada aún: todo a cero y clasificaciones vacías', async () => {
    const stats = await services.stats.help(actor('ana'), 'all')

    expect(stats.sections.map((s) => s.id)).toEqual([
      'consulta',
      'tablon',
      'terapia',
      'pizarras',
      'notgames',
      'ritmo',
    ])
    for (const s of stats.sections) {
      expect(s.ranking).toEqual([])
      expect(s.me).toBeNull()
      expect(s.totals.every((t) => t.value === 0)).toBe(true)
    }
  })

  it('sala de espera: solo cuentan para la clasificación las sesiones validadas', async () => {
    const booking = (
      helper: string,
      requester: string,
      verified: number,
      day: string,
      campus = MADRID,
    ) =>
      run(
        `INSERT INTO help_bookings (campus_id, helper, requester, day, start_min, minutes, status, verified, created_at)
         VALUES (?, ?, ?, ?, 600, 30, 'confirmed', ?, ?)`,
        [campus, helper, requester, day, verified, THIS_MONTH],
      )

    await booking('ana', 'leo', 1, '2026-10-02')
    await booking('ana', 'eva', 1, '2026-10-03')
    await booking('leo', 'ana', 1, '2026-10-04')
    await booking('leo', 'eva', 0, '2026-10-04')
    // De hace un año y de otro campus: no cuentan en el mes; la de otro campus, nunca.
    await booking('eva', 'ana', 1, '2025-05-01')
    await booking('sol', 'uma', 1, '2026-10-02', OTHER)

    const month = await services.stats.help(actor('leo'), 'month')

    expect(totals(month, 'consulta')).toEqual({ sessions: 4, verified: 3, minutes: 90, helped: 3 })
    expect(board(month, 'consulta')).toEqual([
      [1, 'ana', 2, 60],
      [2, 'leo', 1, 30],
    ])
    expect(section(month, 'consulta').me).toMatchObject({ rank: 2, login: 'leo' })

    const all = await services.stats.help(actor('leo'), 'all')

    expect(board(all, 'consulta').map(([, login]) => login)).toEqual(['ana', 'eva', 'leo'])
    expect(board(all, 'consulta')[1]?.[0]).toBe(2)

    // Con más gente que puestos a la vista, la clasificación se queda en diez y
    // quien mira conserva su puesto aunque no salga: aquí `leo` cae al doce.
    for (let index = 0; index < 11; index++) {
      const helper = `h${String(index)}`

      await booking(helper, 'uma', 1, '2026-10-05')
      await booking(helper, 'uma', 1, '2026-10-06')
      await booking(helper, 'uma', 1, '2026-10-07')
    }

    const crowded = await services.stats.help(actor('leo'), 'month')

    expect(board(crowded, 'consulta')).toHaveLength(10)
    expect(board(crowded, 'consulta').map(([, login]) => login)).not.toContain('leo')
    expect(section(crowded, 'consulta').me).toMatchObject({ rank: 13, login: 'leo', value: 1 })
  })

  it('tablón: clasifica las respuestas que resuelven, sin contar las de la propia duda', async () => {
    await run(
      `INSERT INTO doubts (id, campus_id, project_id, author, body, created_at, solved_answer_id, solved_at)
       VALUES (1, ?, 20, 'eva', 'malloc', ?, 10, ?), (2, ?, 20, 'eva', 'free', ?, NULL, NULL)`,
      [MADRID, THIS_MONTH, THIS_MONTH, MADRID, THIS_MONTH],
    )
    await run(
      `INSERT INTO doubt_answers (id, doubt_id, author, body, created_at)
       VALUES (10, 1, 'ana', 'así', ?), (11, 1, 'leo', 'o así', ?), (12, 2, 'leo', 'mira', ?), (13, 2, 'eva', 'ya', ?)`,
      [THIS_MONTH, THIS_MONTH, THIS_MONTH, THIS_MONTH],
    )

    const stats = await services.stats.help(actor('ana'), 'month')

    expect(totals(stats, 'tablon')).toEqual({ doubts: 2, answers: 4, solved: 1 })
    // leo no ha resuelto ninguna: no sale (hace falta algo que clasificar).
    expect(board(stats, 'tablon')).toEqual([[1, 'ana', 1, 1]])
  })

  it('terapia y pizarras: quién va a más grupos y a quién va a escuchar más gente', async () => {
    await run(
      `INSERT INTO therapy_groups (id, campus_id, project_id, creator, place, start_time, end_time, capacity, created_at)
       VALUES (1, ?, 20, 'ana', 'c1', '10:00', '12:00', 4, ?), (2, ?, 20, 'leo', 'c2', '10:00', '12:00', 4, ?)`,
      [MADRID, THIS_MONTH, MADRID, THIS_MONTH],
    )
    await run(
      `INSERT INTO therapy_members (group_id, login, joined_at)
       VALUES (1, 'ana', ?), (1, 'eva', ?), (2, 'leo', ?), (2, 'eva', ?)`,
      [THIS_MONTH, THIS_MONTH, THIS_MONTH, THIS_MONTH],
    )
    // Una pizarra dada y otra del futuro, que aún no cuenta.
    await run(
      `INSERT INTO boards (id, campus_id, host, title, place, starts_at, ends_at, capacity, created_at)
       VALUES (1, ?, 'uma', 'Punteros', 'c1', ?, ?, 10, ?), (2, ?, 'uma', 'Make', 'c1', '2026-12-01T10:00:00.000Z', '2026-12-01T11:00:00.000Z', 10, ?)`,
      [MADRID, THIS_MONTH, THIS_MONTH, THIS_MONTH, MADRID, THIS_MONTH],
    )
    await run(
      `INSERT INTO board_attendees (board_id, login, joined_at) VALUES (1, 'ana', ?), (1, 'leo', ?), (2, 'eva', ?)`,
      [THIS_MONTH, THIS_MONTH, THIS_MONTH],
    )

    const stats = await services.stats.help(actor('eva'), 'month')

    expect(totals(stats, 'terapia')).toEqual({ groups: 2, seats: 4, people: 3 })
    expect(board(stats, 'terapia')).toEqual([
      [1, 'eva', 2, 0],
      // Empatan en grupos y en abiertos: mismo puesto.
      [2, 'ana', 1, 1],
      [2, 'leo', 1, 1],
    ])
    expect(totals(stats, 'pizarras')).toEqual({ boards: 1, seats: 2, people: 2 })
    expect(board(stats, 'pizarras')).toEqual([[1, 'uma', 2, 1]])
  })

  it('Not-games: partidas ganadas y, para desempatar, aciertos', async () => {
    const result = (room: number, login: string, won: number, correct: number, at = THIS_MONTH) =>
      run(
        `INSERT INTO game_results (game, mode, room_id, campus_id, login, won, correct, wrong, score, at)
         VALUES ('quiz', 'duel', ?, ?, ?, ?, ?, 1, ?, ?)`,
        [room, MADRID, login, won, correct, correct, at],
      )

    await result(1, 'ana', 1, 5)
    await result(1, 'leo', 0, 3)
    await result(2, 'leo', 1, 7)
    await result(2, 'eva', 0, 2)
    await result(3, 'eva', 1, 4, LAST_YEAR)

    const stats = await services.stats.help(actor('eva'), 'month')

    expect(totals(stats, 'notgames')).toEqual({ games: 2, people: 3, correct: 17, wrong: 4 })
    expect(board(stats, 'notgames')).toEqual([
      [1, 'leo', 1, 10],
      [2, 'ana', 1, 5],
    ])
    // eva no ha ganado este mes: no tiene puesto.
    expect(section(stats, 'notgames').me).toBeNull()
  })

  it('ritmo: de pace más rápido a más lento, con el % del curso según el pace', async () => {
    const started = '2026-01-01T09:00:00.000Z'
    const after = (days: number): string =>
      new Date(Date.parse(started) + days * 86_400_000).toISOString()
    const person = async (login: string, milestones: string[]) => {
      await run(
        `INSERT OR REPLACE INTO user_levels (login, level, updated_at, begin_at) VALUES (?, 3, ?, ?)`,
        [login, started, started],
      )
      await run(
        `INSERT OR REPLACE INTO user_tracks (login, track, rank, fetched_at, ranks) VALUES (?, 'classic', ?, ?, ?)`,
        [login, milestones.length - 1, started, JSON.stringify(milestones)],
      )
    }

    // ana completó el círculo 2 en 50 días (pace 8); leo, el 3 en 200 días
    // (pace 18); eva, el 2 en 300 días (más lento que 24).
    await person('ana', [after(5), after(20), after(50)])
    await person('leo', [after(10), after(40), after(100), after(200)])
    await person('eva', [after(40), after(100), after(300)])

    const stats = await services.stats.help(actor('leo'), 'month')

    expect(board(stats, 'ritmo')).toEqual([
      [1, 'ana', 24, 8],
      [2, 'leo', 42, 18],
      [3, 'eva', 24, 0],
    ])
    expect(totals(stats, 'ritmo')).toEqual({ people: 3, median: 18, fast: 1 })
    expect(section(stats, 'ritmo').me).toMatchObject({ rank: 2, login: 'leo' })
  })

  it('el ritmo de una persona: progreso por el plazo del curso y el pace más rápido que cumple', () => {
    expect(paceOf('2026-01-01', ['2026-01-05'])).toEqual({ progress: 6, pace: 8 })
    expect(paceOf('2026-01-01', ['2026-01-05', '2026-03-01'])).toEqual({ progress: 16, pace: 15 })
    // Sin círculos, o con fechas que no cuadran: sin ritmo.
    expect(paceOf('2026-01-01', [])).toBeNull()
    expect(paceOf('2026-03-01', ['2026-01-05'])).toBeNull()
    expect(paceOf('no', ['2026-01-05'])).toBeNull()
    // Los siete círculos: el curso entero.
    expect(
      paceOf(
        '2024-01-01',
        Array.from({ length: 7 }, () => '2025-12-01'),
      )?.progress,
    ).toBe(100)
  })

  it('los puestos: empate solo si coinciden las dos cifras', () => {
    const rows = [
      { login: 'a', image: null, value: 3, extra: 1 },
      { login: 'b', image: null, value: 3, extra: 1 },
      { login: 'c', image: null, value: 3, extra: 0 },
      { login: 'd', image: null, value: 1, extra: 9 },
    ]

    expect(ranked(rows).map((e) => e.rank)).toEqual([1, 1, 3, 4])
    expect(ranked([])).toEqual([])
  })
})
