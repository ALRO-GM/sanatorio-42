/**
 * El curso de Docker (`packages/dockersim`): que cada punto se gane con su
 * solución con ★★★ (y no empiece ganado), que los textos estén en los dos
 * idiomas y que el camino tenga la forma de la plantilla de cursos.
 */
import {
  BLOCKS,
  checkAttempt,
  estimateOfCourse,
  exampleOf,
  FINALS,
  goalOf,
  timeGoalsOf,
  TIERS,
  unitIn,
  UNITS,
} from '@sanatorio/dockersim'
import { describe, expect, it } from 'vitest'

describe('curso de Docker: cada punto', () => {
  for (const unit of UNITS)
    it(`${unit.id}: se gana con su solución y no empieza ganado`, () => {
      const goal = goalOf(unit)
      const won = checkAttempt(unit, unit.solution, unit.limit === undefined ? undefined : 1)

      expect(won.misses).toEqual([])
      expect(won.done).toBe(true)
      expect(won.stars).toBe(3)
      expect(Object.keys(goal.goal).length + (goal.output === null ? 0 : 1)).toBeGreaterThan(0)

      const empty = checkAttempt(unit, [], unit.limit === undefined ? undefined : 1)

      expect(empty.done).toBe(false)
      if (unit.kind === 'unit') expect(exampleOf(unit).length).toBeGreaterThan(0)
    })
})

describe('curso de Docker: forma del camino', () => {
  it('ids únicos, bloques de 3 a 6 unidades con su jefe y un jefe final por nivel', () => {
    expect(new Set(UNITS.map((unit) => unit.id)).size).toBe(UNITS.length)
    for (const block of BLOCKS) {
      const units = UNITS.filter((unit) => unit.block === block.n && unit.kind === 'unit')
      const bosses = UNITS.filter((unit) => unit.block === block.n && unit.kind === 'boss')

      expect(units.length).toBeGreaterThanOrEqual(3)
      expect(units.length).toBeLessThanOrEqual(6)
      expect(bosses).toHaveLength(1)
      for (const boss of bosses) expect(timeGoalsOf(boss)).not.toBeNull()
    }
    for (const tier of TIERS) {
      const final = UNITS.find((unit) => unit.id === FINALS[tier])

      expect(final?.kind).toBe('final')
      expect(final?.tier).toBe(tier)
      // El jefe final cierra su nivel: es el último punto de él.
      expect(UNITS.filter((unit) => unit.tier === tier).at(-1)?.id).toBe(FINALS[tier])
    }
    expect(estimateOfCourse()).toBeGreaterThan(3600)
  })

  it('cada punto tiene sus textos en castellano y en inglés', () => {
    for (const unit of UNITS)
      for (const lang of ['es', 'en']) {
        const text = unitIn(unit, lang)

        expect(text.title.length, `${unit.id} ${lang}`).toBeGreaterThan(3)
        expect(text.goal.length, `${unit.id} ${lang}`).toBeGreaterThan(10)
        if (unit.kind === 'unit') {
          expect(text.theory?.how.length, `${unit.id} ${lang}`).toBeGreaterThan(0)
          expect(text.example, `${unit.id} ${lang}`).toBeDefined()
        } else {
          expect(text.story, `${unit.id} ${lang}`).toBeDefined()
          expect(text.tasks?.length, `${unit.id} ${lang}`).toBeGreaterThan(0)
        }
      }
    for (const unit of UNITS.slice(0, 1)) {
      expect(unitIn(unit, 'ca').title).toBe(unit.es.title)
      expect(unitIn(unit, 'fr').title).toBe(unit.en.title)
    }
  })
})
