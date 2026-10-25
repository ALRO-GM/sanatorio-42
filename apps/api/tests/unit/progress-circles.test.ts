/**
 * Avance por círculos: cada línea cae justo en las rayas del eje (Alberto,
 * 2026-10-26). Cada círculo pesa 1/7 en cualquier juego de casillas (el plan,
 * lo que hizo quien terminó, con proyectos de más o de menos), así que completar
 * los círculos 0…k deja la línea en (k + 1) / 7, la marca del círculo k. Con los
 * planes de verdad de C y de Python (`docs/blackhole.md`).
 */
import { describe, expect, it } from 'vitest'

import { COMMON_CORE } from '../../src/modules/replica/common-core.js'
import { CHOICES, VERSIONS } from '../../src/modules/replica/index.js'
import {
  circleMarks,
  milestonesOf,
  ownUnits,
  paceLines,
  settled,
  standingOf,
  unitsOf,
} from '../../src/modules/stats/progress.rules.js'
import type { PlanProject, Unit } from '../../src/modules/stats/progress.rules.js'

const DAY = 86_400_000
const START = Date.UTC(2025, 8, 29)
const NOW = START + 900 * DAY
const MARKS = [14.3, 28.6, 42.9, 57.1, 71.4, 85.7, 100]

/** Un id por slug, siempre el mismo. */
const ids = new Map<string, number>()
const idOf = (slug: string): number => {
  const known = ids.get(slug)

  if (known !== undefined) return known
  ids.set(slug, ids.size + 1)

  return ids.size
}

/** Un proyecto del plan con su círculo; las versiones de otro plan, adoptadas si se dice. */
const project = (slug: string, circle: number, adopted = false): PlanProject => ({
  id: idOf(slug),
  slug,
  circle,
  hours: 50,
  ...(adopted ? { adopted } : {}),
})

/** El plan de C: el common core entero, con las versiones `42next-` en el mismo círculo. */
const CLASSIC: PlanProject[] = COMMON_CORE.flatMap((projects, circle) =>
  projects.flatMap((each) => each.slugs.map((slug) => project(slug, circle))),
)

/**
 * El plan de Python como sale en producción: Born2beroot en el 2 y push_swap en
 * el 1; sus versiones de C, adoptadas en el círculo que tienen en C.
 */
const PYTHON_CIRCLES: string[][] = [
  ['42cursus-libft'],
  ['42cursus-ft_printf', '42cursus-get_next_line', '42next-push_swap'],
  [
    '42next-born2beroot',
    'a-maze-ing',
    ...Array.from({ length: 11 }, (_, n) => `python-module-${String(n).padStart(2, '0')}`),
    'python-module-05-bis',
    'python-module-06-bis',
    '42next-exam-rank-02',
  ],
  ['codexion', 'fly-in', 'call-me-maybe', '42next-exam-rank-03'],
  ['42next-exam-rank-04', 'netpractice', 'rag-against-the-machine', 'pac-man'],
  ['42next-exam-rank-05', 'inception', 'the-answer-protocol', 'agent-smith'],
  ['42next-exam-rank-06', 'ft_transcendence'],
]
const PYTHON: PlanProject[] = [
  ...PYTHON_CIRCLES.flatMap((slugs, circle) => slugs.map((slug) => project(slug, circle))),
  project('born2beroot', 1, true),
  project('42cursus-push_swap', 2, true),
  ...[2, 3, 4, 5, 6].map((rank) => project(`exam-rank-0${String(rank)}`, rank, true)),
]

const plans = {
  classic: unitsOf(CLASSIC, CHOICES, VERSIONS),
  next: unitsOf(PYTHON, CHOICES, VERSIONS),
}

/**
 * Aprobado todo lo de los círculos 0…`upTo` de esas casillas, en orden: el
 * círculo `c` entre los días 20·c + 1 y 20·c + 19. De cada casilla, el primero
 * de sus proyectos (o el que diga `pick`).
 */
function passCircles(
  units: readonly Unit[],
  upTo: number,
  pick: (unit: Unit) => number = (unit) => unit.ids[0] ?? 0,
): Map<number, number> {
  const done = new Map<number, number>()
  const seen = new Map<number, number>()

  for (const unit of units) {
    if (unit.circle > upTo) continue
    const n = (seen.get(unit.circle) ?? 0) + 1

    seen.set(unit.circle, n)
    done.set(pick(unit), START + (20 * unit.circle + Math.min(19, n)) * DAY)
  }

  return done
}

/** Dónde deja la línea lo aprobado: el valor de su último hito. */
const lineAt = (units: readonly Unit[], done: Map<number, number>): number =>
  milestonesOf(units, done, START, NOW).at(-1)?.value.circles ?? 0

describe('por círculos, cada línea cae en las rayas del eje', () => {
  it('las marcas son fijas, (k + 1) / 7, y los paces pasan por ellas', () => {
    expect(circleMarks()).toEqual(MARKS)
    for (const units of Object.values(plans)) {
      expect(
        paceLines(units)
          .circles[0]?.points.slice(1)
          .map(([, value]) => value),
      ).toEqual(MARKS)
    }
  })

  it('Libft, el primer salto, cae justo en la raya del círculo 0 (C y Python)', () => {
    for (const units of Object.values(plans)) {
      const done = new Map([[idOf('42cursus-libft'), START + 12 * DAY]])
      const [first] = milestonesOf(units, done, START, NOW)

      expect(first).toEqual({
        day: 12,
        ids: [idOf('42cursus-libft')],
        value: { circles: MARKS[0], hours: expect.any(Number) as number },
      })
    }
  })

  it('completar los círculos 0…k es la marca del círculo k, en los dos planes', () => {
    for (const units of Object.values(plans)) {
      for (let circle = 0; circle < 7; circle++) {
        const done = passCircles(units, circle)

        expect(lineAt(units, done)).toBe(MARKS[circle])
        expect(standingOf(units, done).circles).toBe(MARKS[circle])
      }
    }
  })

  it('quien hizo el otro proyecto de un grupo (minitalk, miniRT, webserv) también', () => {
    const units = plans.classic
    const last = (unit: Unit) => unit.ids.at(-1) ?? 0

    for (let circle = 0; circle < 7; circle++) {
      expect(lineAt(units, passCircles(units, circle, last))).toBe(MARKS[circle])
    }
  })

  it('con su propio juego, con proyectos de más y de menos, quien terminó cae igual', () => {
    // Quien terminó hace años no hizo NetPractice ni el CPP 09, y sí libasm (círculo 3)
    // y ft_containers (círculo 5): sus círculos 3, 4 y 5 tienen otras casillas que el
    // plan, y cada uno sigue pesando 1/7.
    const old = unitsOf(
      [...CLASSIC, project('libasm', 3), project('ft_containers', 5)],
      CHOICES,
      VERSIONS,
    )
    const skipped = new Set([idOf('netpractice'), idOf('cpp-module-09')])
    const all = passCircles(old, 6)

    for (const id of skipped) all.delete(id)
    const own = ownUnits(old, all)

    expect(own.length).toBe(old.length - 2)
    for (let circle = 0; circle < 7; circle++) {
      const done = new Map([...all].filter(([, at]) => at < START + 20 * (circle + 1) * DAY))

      expect(lineAt(own, done)).toBe(MARKS[circle])
    }
    // Arriba del todo el día que terminó: el examen 6 y ft_transcendence.
    expect(standingOf(own, all)).toMatchObject({ circle: 7, circles: 100, hours: 100 })
  })

  it('sin ningún proyecto de un círculo, ese se da por hecho con el siguiente', () => {
    // Quien terminó Python sin nada del círculo 4 en sus casillas (un traslado).
    const all = passCircles(plans.next, 6)

    for (const slug of PYTHON_CIRCLES[4] ?? []) all.delete(idOf(slug))
    const own = ownUnits(plans.next, all)
    const until = (circle: number) =>
      new Map([...all].filter(([, at]) => at < START + 20 * (circle + 1) * DAY))

    expect(own.some((unit) => unit.circle === 4)).toBe(false)
    expect(lineAt(own, until(3))).toBe(MARKS[3])
    // Completar el 5 cuenta el 4 y el 5 a la vez: cae en la marca del 5.
    expect(lineAt(own, until(5))).toBe(MARKS[5])
    expect(lineAt(own, all)).toBe(100)
  })

  it('quien empezó en C y pasó a Python: Born2beroot en el círculo 1, push_swap en el 2', () => {
    const units = plans.next
    const base = [
      idOf('42cursus-libft'),
      idOf('42cursus-ft_printf'),
      idOf('42cursus-get_next_line'),
    ]
    const done = (...more: string[]) =>
      new Map(
        [...base, ...more.map(idOf)].map((id, index) => [id, START + (10 + index) * DAY] as const),
      )

    // Con la Born2beroot de C (y sin push_swap), el círculo 1 está hecho: como dice 42.
    expect(standingOf(units, done('born2beroot'))).toMatchObject({ circle: 2, circles: MARKS[1] })
    // La push_swap de C, después, cuenta en el círculo 2.
    expect(standingOf(units, done('born2beroot', '42cursus-push_swap')).circle).toBe(2)
    // Quien empezó en Python: push_swap en el 1, Born2beroot en el 2.
    expect(standingOf(units, done('42next-push_swap'))).toMatchObject({
      circle: 2,
      circles: MARKS[1],
    })
    expect(standingOf(units, done('42next-born2beroot')).circles).toBeLessThan(MARKS[1] ?? 0)
  })
})

describe('Libft, como tarde cuando se apuntó a lo siguiente', () => {
  const libft = idOf('42cursus-libft')
  const printf = idOf('42cursus-ft_printf')
  const units = plans.classic

  it('42 reescribió su fecha en lote: cuenta cuando se apuntó a ft_printf', () => {
    const done = new Map([
      [libft, START + 700 * DAY],
      [printf, START + 40 * DAY],
    ])
    const fixed = settled(units, done, new Map([[printf, START + 15 * DAY]]))

    expect(fixed.get(libft)).toBe(START + 15 * DAY)
    expect(fixed.get(printf)).toBe(START + 40 * DAY)
    // Y su primer salto es Libft solo, en la raya del círculo 0.
    expect(milestonesOf(units, fixed, START, NOW)[0]).toMatchObject({
      day: 15,
      value: { circles: MARKS[0] },
    })
  })

  it('sin saber cuándo se apuntó a nada: un día antes de aprobar lo siguiente', () => {
    const done = new Map([
      [libft, START + 700 * DAY],
      [printf, START + 40 * DAY],
    ])

    expect(settled(units, done, new Map()).get(libft)).toBe(START + 39 * DAY)
  })

  it('si se apuntó a Libft después (lo repitió), se queda como está; sin nada más, también', () => {
    const done = new Map([
      [libft, START + 700 * DAY],
      [printf, START + 40 * DAY],
    ])
    const opened = new Map([
      [libft, START + 690 * DAY],
      [printf, START + 15 * DAY],
    ])

    expect(settled(units, done, opened).get(libft)).toBe(START + 700 * DAY)
    expect(settled(units, new Map([[libft, START]]), new Map())).toEqual(new Map([[libft, START]]))
    expect(settled([], new Map(), new Map())).toEqual(new Map())
  })
})
