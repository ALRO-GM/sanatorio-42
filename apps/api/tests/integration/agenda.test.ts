/**
 * La agenda (`docs/agenda.md`) por HTTP, como la usaría la web: poner una
 * meta con sus checkpoints de fábrica, tocarlos, apuntar dailies y weeklies
 * con atascos de la lista y con «Otro», y el tablero del sprint, que solo ve
 * quien está en el grupo (y sin quien está oculto).
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { AgendaGoal, AgendaView, GroupView, SprintBoard } from '@sanatorio/contracts'
import { cookieAs, json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Cliente mínimo con la sesión de alguien. */
function as(built: TestApp, cookie: string) {
  const call = (method: Method, url: string, body?: unknown) =>
    built.app.inject({
      method,
      url,
      headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
    })

  return {
    call,
    agenda: async () => json(await call('GET', '/agenda')) as AgendaView,
  }
}

/** `day` más `days` días, como `YYYY-MM-DD`. */
const plus = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/** El lunes de la semana de `day`. */
const monday = (day: string): string =>
  plus(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7))

async function world() {
  const built = await makeApp({ ADMIN_LOGINS: 'albrodri' })

  apps.push(built)

  const admin = await built.adminLogin()
  const ana = admin.split('; ')[0] ?? ''

  return {
    built,
    admin,
    me: as(built, ana),
    mgomez: as(built, cookieAs(ana, 'mgomez', 'student')),
    lruiz: as(built, cookieAs(ana, 'lruiz', 'student')),
  }
}

describe('agenda', () => {
  it('una meta con sus checkpoints de fábrica, que se añaden, marcan y quitan', async () => {
    const { me } = await world()
    const start = await me.agenda()

    expect(start.goals).toEqual([])
    expect(start.projects).toContainEqual(
      expect.objectContaining({ id: 10, name: 'ft_printf', status: 'in_progress', kind: 'c' }),
    )
    expect(start.options.problems).toContain('other')
    expect(start.options.solutions).toContain('peer2peer')
    expect(start.options.defaults.exam).toEqual(['practice', 'mock', 'registered'])
    // Lo aprobado no se ofrece.
    expect(start.projects.map((project) => project.id)).not.toContain(11)

    const created = await me.call('POST', '/agenda/goals', {
      projectId: 10,
      targetDay: plus(start.today, 5),
      progress: 40,
      note: '  Me falta el %p y los flags  ',
    })

    expect(created.statusCode).toBe(201)

    const goal = json(created) as AgendaGoal

    expect(goal).toMatchObject({
      projectName: 'ft_printf',
      projectKind: 'c',
      progress: 40,
      note: 'Me falta el %p y los flags',
      status: 'active',
      entries: [],
      sprints: [],
    })
    expect(goal.checkpoints.map((checkpoint) => checkpoint.key)).toEqual([
      'works',
      'subject',
      'sheet',
      'norminette',
      'leaks',
      'breakers',
      'git',
      'slots',
    ])

    // Uno propio entra al final; uno de la lista que ya está no se repite.
    const own = await me.call('POST', `/agenda/goals/${goal.id}/checkpoints`, {
      text: 'Comparar con el printf de verdad',
    })

    expect(own.statusCode).toBe(201)
    expect((json(own) as AgendaGoal).checkpoints.at(-1)).toMatchObject({
      key: null,
      text: 'Comparar con el printf de verdad',
      done: false,
    })
    expect(
      (
        json(
          await me.call('POST', `/agenda/goals/${goal.id}/checkpoints`, { key: 'works' }),
        ) as AgendaGoal
      ).checkpoints,
    ).toHaveLength(9)

    const [works, , , norm] = goal.checkpoints
    const marked = json(
      await me.call('PUT', `/agenda/goals/${goal.id}/checkpoints/${works?.id ?? 0}`, {
        done: true,
      }),
    ) as AgendaGoal

    expect(marked.checkpoints[0]?.done).toBe(true)

    const removed = json(
      await me.call('DELETE', `/agenda/goals/${goal.id}/checkpoints/${norm?.id ?? 0}`),
    ) as AgendaGoal

    expect(removed.checkpoints.map((checkpoint) => checkpoint.key)).not.toContain('norminette')
    expect(
      (await me.call('PUT', `/agenda/goals/${goal.id}/checkpoints/999`, { done: true })).statusCode,
    ).toBe(404)

    // Lo que no vale: un día pasado, un avance que no va de 5 en 5, un proyecto que no existe.
    for (const [body, status] of [
      [{ projectId: 10, targetDay: plus(start.today, -1) }, 400],
      [{ projectId: 10, targetDay: plus(start.today, 400) }, 400],
      [{ projectId: 10, targetDay: plus(start.today, 3), progress: 33 }, 400],
      [{ projectId: 10, targetDay: '2026-02-31' }, 400],
      [{ projectId: 999_999, targetDay: plus(start.today, 3) }, 404],
      [{ projectId: 10, targetDay: plus(start.today, 3), checkpoints: ['magia'] }, 400],
    ] as const) {
      expect((await me.call('POST', '/agenda/goals', body)).statusCode).toBe(status)
    }

    // Se entrega: sale como cerrada y ya no admite dailies.
    const done = json(
      await me.call('PUT', `/agenda/goals/${goal.id}`, { status: 'done', progress: 100 }),
    ) as AgendaGoal

    expect(done).toMatchObject({ status: 'done', progress: 100 })
    expect(done.closedAt).not.toBeNull()
    expect(
      (
        await me.call('POST', `/agenda/goals/${goal.id}/entries`, {
          kind: 'daily',
          day: start.today,
        })
      ).statusCode,
    ).toBe(409)
  })

  it('dailies y weeklies con atascos de la lista y con «Otro»', async () => {
    const { me } = await world()
    const { today } = await me.agenda()
    const goal = json(
      await me.call('POST', '/agenda/goals', { projectId: 10, targetDay: plus(today, 7) }),
    ) as AgendaGoal
    const [first, second] = goal.checkpoints
    const plan = [first?.id ?? 0, second?.id ?? 0]
    const entries = `/agenda/goals/${goal.id}/entries`

    const daily = json(
      await me.call('POST', entries, {
        kind: 'daily',
        day: today,
        plan,
        outcome: 'partial',
        problem: 'memory',
        problemOther: 'esto no se guarda',
        solution: 'debugger',
        progress: 55,
      }),
    ) as AgendaGoal

    expect(daily.progress).toBe(55)
    expect(daily.entries[0]).toMatchObject({
      kind: 'daily',
      day: today,
      plan,
      outcome: 'partial',
      problem: 'memory',
      problemOther: null,
      solution: 'debugger',
      solutionOther: null,
      progress: 55,
    })

    // El mismo día se reescribe; «Otro» lleva su texto.
    const other = json(
      await me.call('POST', entries, {
        kind: 'daily',
        day: today,
        outcome: 'not_done',
        problem: 'other',
        problemOther: '  El Makefile relinkea  ',
        solution: 'other',
        solutionOther: 'Leer el manual de make',
      }),
    ) as AgendaGoal

    expect(other.entries).toHaveLength(1)
    expect(other.entries[0]).toMatchObject({
      problem: 'other',
      problemOther: 'El Makefile relinkea',
      solution: 'other',
      solutionOther: 'Leer el manual de make',
      plan: [],
    })

    // El weekly va al lunes de su semana.
    const weekly = json(
      await me.call('POST', entries, { kind: 'weekly', day: today, plan, outcome: 'done' }),
    ) as AgendaGoal

    expect(weekly.entries.find((entry) => entry.kind === 'weekly')?.day).toBe(monday(today))

    // Lo que no vale.
    for (const body of [
      { kind: 'daily', day: today, problem: 'other' },
      { kind: 'daily', day: today, problem: 'bug', solution: 'other' },
      { kind: 'daily', day: today, solution: 'pair' },
      { kind: 'daily', day: today, problem: 'aburrimiento' },
      { kind: 'daily', day: plus(today, -30) },
      { kind: 'daily', day: plus(today, 3) },
      { kind: 'daily', day: today, plan: [999_999] },
      { kind: 'monthly', day: today },
      { kind: 'daily', day: today, progress: 101 },
      { kind: 'daily', day: today, note: 'x'.repeat(281) },
    ]) {
      expect((await me.call('POST', entries, body)).statusCode, JSON.stringify(body)).toBe(400)
    }

    // Lo apuntado sigue en la agenda.
    const [mine] = (await me.agenda()).goals

    expect(mine?.entries.map((entry) => entry.kind).sort()).toEqual(['daily', 'weekly'])
  })

  it('el sprint ve la agenda de su grupo para su proyecto, y nadie más', async () => {
    const { built, admin, me, mgomez, lruiz } = await world()
    const { today } = await me.agenda()
    const group = json(
      await me.call('POST', '/groups', {
        projectId: 10,
        place: 'Cluster 2',
        dates: [plus(today, 1)],
        start: '16:00',
        end: '18:00',
      }),
    ) as GroupView

    expect(
      (await mgomez.call('POST', `/groups/${group.id}/join`, { progress: 30 })).statusCode,
    ).toBe(204)

    const mine = json(
      await me.call('POST', '/agenda/goals', { projectId: 10, targetDay: plus(today, 4) }),
    ) as AgendaGoal
    const theirs = json(
      await mgomez.call('POST', '/agenda/goals', {
        projectId: 10,
        targetDay: plus(today, 6),
        progress: 30,
        checkpoints: ['works', 'leaks'],
      }),
    ) as AgendaGoal

    // Una meta de otro proyecto no sale en el tablero.
    await mgomez.call('POST', '/agenda/goals', { projectId: 11, targetDay: plus(today, 6) })
    await mgomez.call(
      'PUT',
      `/agenda/goals/${theirs.id}/checkpoints/${theirs.checkpoints[0]?.id ?? 0}`,
      {
        done: true,
      },
    )
    await mgomez.call('POST', `/agenda/goals/${theirs.id}/entries`, {
      kind: 'daily',
      day: today,
      outcome: 'not_done',
      problem: 'bug',
      solution: 'sprint',
      note: 'Segfault con %s y NULL',
    })

    // En la agenda, la meta sale enmarcada en su sprint.
    expect((await me.agenda()).goals[0]?.sprints).toEqual([
      { groupId: group.id, place: 'Cluster 2', members: 2 },
    ])

    const board = json(await me.call('GET', `/agenda/sprints/${group.id}`)) as SprintBoard

    expect(board).toMatchObject({ groupId: group.id, projectId: 10, place: 'Cluster 2' })
    expect(board.members.map((member) => member.login)).toEqual(['albrodri', 'mgomez'])

    const other = board.members[1]?.goal

    expect(other).toMatchObject({
      id: theirs.id,
      progress: 30,
      done: 1,
      total: 2,
      stuckOn: { key: 'leaks' },
      blocker: { problem: 'bug', solution: 'sprint', day: today },
    })
    expect(other?.entries[0]?.note).toBe('Segfault con %s y NULL')
    expect(board.members[0]?.goal).toMatchObject({ id: mine.id, done: 0, total: 8 })

    // Un daily sin atasco lo da por resuelto.
    await mgomez.call('POST', `/agenda/goals/${theirs.id}/entries`, {
      kind: 'daily',
      day: plus(today, 1),
      outcome: 'done',
    })
    expect(
      (json(await me.call('GET', `/agenda/sprints/${group.id}`)) as SprintBoard).members[1]?.goal
        ?.blocker,
    ).toBeNull()

    // Fuera del grupo no se ve nada: ni el tablero ni las metas de nadie.
    expect((await lruiz.call('GET', `/agenda/sprints/${group.id}`)).statusCode).toBe(403)
    expect((await lruiz.agenda()).goals).toEqual([])
    expect((await lruiz.call('PUT', `/agenda/goals/${mine.id}`, { progress: 5 })).statusCode).toBe(
      404,
    )
    expect((await lruiz.call('DELETE', `/agenda/goals/${mine.id}`)).statusCode).toBe(404)
    expect(
      (await lruiz.call('POST', `/agenda/goals/${mine.id}/entries`, { kind: 'daily', day: today }))
        .statusCode,
    ).toBe(404)
    expect((await me.call('GET', '/agenda/sprints/987654')).statusCode).toBe(404)

    // Quien se va del grupo deja de ver el tablero.
    expect((await mgomez.call('DELETE', `/groups/${group.id}/join`)).statusCode).toBe(204)
    expect((await mgomez.call('GET', `/agenda/sprints/${group.id}`)).statusCode).toBe(403)
    expect((await mgomez.call('POST', `/groups/${group.id}/join`)).statusCode).toBe(204)

    // Quien está oculto a los estudiantes no sale en el tablero de quien es estudiante.
    const hidden = await built.app.inject({
      method: 'PUT',
      url: '/admin/hidden/mgomez',
      headers: { cookie: admin, 'content-type': 'application/json' },
      payload: { fromStudents: true, fromPool: false, reason: 'prueba' },
    })

    expect(hidden.statusCode).toBe(200)
    expect(
      (json(await me.call('GET', `/agenda/sprints/${group.id}`)) as SprintBoard).members.map(
        (member) => member.login,
      ),
    ).toEqual(['albrodri'])
  })

  it('el tope de metas en marcha, y borrar una se lleva lo suyo', async () => {
    const { me, built } = await world()
    const { today } = await me.agenda()
    const ids: number[] = []

    for (let index = 0; index < 8; index++) {
      const created = await me.call('POST', '/agenda/goals', {
        projectId: 10,
        targetDay: plus(today, index + 1),
      })

      expect(created.statusCode).toBe(201)
      ids.push((json(created) as AgendaGoal).id)
    }
    expect(
      (await me.call('POST', '/agenda/goals', { projectId: 10, targetDay: today })).statusCode,
    ).toBe(409)

    const [first = 0] = ids

    await me.call('POST', `/agenda/goals/${first}/entries`, { kind: 'daily', day: today })
    expect((await me.call('DELETE', `/agenda/goals/${first}`)).statusCode).toBe(204)
    expect(
      (
        await built.db.execute({
          sql: 'SELECT COUNT(*) AS n FROM scrum_entries WHERE goal_id = ?',
          args: [first],
        })
      ).rows[0]?.n,
    ).toBe(0)
    expect(
      (await me.call('POST', '/agenda/goals', { projectId: 10, targetDay: today })).statusCode,
    ).toBe(201)
  })
})
