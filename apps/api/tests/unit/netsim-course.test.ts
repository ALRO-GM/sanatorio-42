/**
 * El curso de NetPractice (`packages/netsim`): que cada punto se gane con su
 * solución con ★★★ (y no empiece ganado), que valgan otras soluciones
 * correctas, que las estrellas cuenten las comprobaciones, que el ejemplo lo
 * ejecute el motor, que los textos estén en los dos idiomas dentro de su
 * límite de palabras y que el camino tenga la forma de la plantilla de cursos.
 */
import { checkGoals, starsFor } from '@sanatorio/course'
import {
  BLOCKS,
  checkAttempt,
  encodeEntry,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  evaluate,
  exampleOf,
  fieldsOf,
  FINALS,
  goalOf,
  LIMITS,
  questionsOf,
  schemeOf,
  solutionOf,
  startOf,
  theoryWords,
  TIERS,
  timeGoalsOf,
  unitIn,
  unitOf,
  UNITS,
} from '@sanatorio/netsim'
import type { Unit } from '@sanatorio/netsim'
import { describe, expect, it } from 'vitest'

const unit = (id: string): Unit => {
  const found = unitOf(id)

  if (found === undefined) throw new Error(`falta la unidad ${id}`)

  return found
}

const solved = (each: Unit): string => encodeEntry(solutionOf(each))
const time = (each: Unit): number | undefined => (each.limit === undefined ? undefined : 1)

describe('estrellas por comprobaciones (plantilla de cursos)', () => {
  it('★★★ a la primera, ★★☆ con hasta tres y ★☆☆ con más', () => {
    const goals = checkGoals()

    expect(goals).toEqual({ three: 1, two: 3 })
    expect([1, 2, 3, 4, 40].map((used) => starsFor(used, goals))).toEqual([3, 2, 2, 1, 1])
  })
})

describe('curso de NetPractice: cada punto', () => {
  for (const each of UNITS)
    it(`${each.id}: se gana con su solución y no empieza ganado`, () => {
      expect(goalOf(each).length).toBeGreaterThan(0)

      const won = checkAttempt(each, [solved(each)], time(each))

      expect(won).toEqual({ done: true, misses: [], stars: 3, commands: 1 })
      expect(checkAttempt(each, [], time(each))).toMatchObject({ done: false, stars: 0 })
      expect(checkAttempt(each, [encodeEntry(startOf(each))], time(each)).done).toBe(false)
      expect(fieldsOf(each).length).toBeLessThanOrEqual(LIMITS.fields)
      expect(solved(each).length).toBeLessThan(LIMITS.entry)
      // Un esquema o unas cuentas: nunca las dos cosas ni ninguna.
      expect(schemeOf(each) === null).toBe(questionsOf(each).length > 0)
    })
})

describe('curso de NetPractice: el ejemplo lo ejecuta el motor', () => {
  for (const each of UNITS.filter((one) => one.kind === 'unit'))
    it(`${each.id}: el ejemplo llega y, con su error típico, muere donde dice la teoría`, () => {
      const example = exampleOf(each)

      if (example === null) throw new Error('sin ejemplo')
      if (example.kind === 'calc') {
        expect(example.bits).toHaveLength(32)
        expect(example.subnet.hosts).toBeGreaterThan(0)

        return
      }
      expect(example.trace.ok).toBe(true)
      // La red del ejemplo no es la de la prueba: allí decide quien juega.
      expect(example.network).not.toEqual(schemeOf(each)?.net)
      if (example.broken !== null) {
        expect(example.broken.trace.ok).toBe(false)
        expect(example.broken.changed.length).toBeGreaterThan(0)
      }
    })

  it('los jefes no tienen ejemplo', () => {
    expect(exampleOf(unit('net-boss-printer'))).toBeNull()
  })
})

describe('curso de NetPractice: se comprueba lo que hace la red, no lo que se escribió', () => {
  it('otra dirección del mismo rango vale igual, y con otra forma de escribir la máscara', () => {
    const range = unit('net-range-pick')
    const other = encodeEntry({
      'logs.eth0.ip': '192.168.20.193',
      'alertas.eth0.ip': ' 192.168.20.222 ',
      'alertas.eth0.mask': '/27',
    })

    expect(checkAttempt(range, [other])).toMatchObject({ done: true, stars: 3 })
    // Fuera del rango (.223 es el broadcast y .224, otra red) no vale.
    for (const bad of ['192.168.20.223', '192.168.20.224', '192.168.20.196'])
      expect(evaluate(range, { ...solutionOf(range), 'logs.eth0.ip': bad }).misses, bad).toContain(
        'goal:logs>metrics',
      )
  })

  it('la ruta por defecto, de las dos maneras, o una que resuma', () => {
    const route = unit('net-default')

    for (const dest of ['default', '0.0.0.0/0', '10.2.0.0/15'])
      expect(
        evaluate(route, { 'r1.route0.dest': dest, 'r1.route0.via': '10.9.9.2' }).done,
        dest,
      ).toBe(true)
    // Solo media: git sí, wiki no.
    expect(
      evaluate(route, { 'r1.route0.dest': '10.2.0.0/24', 'r1.route0.via': '10.9.9.2' }).misses,
    ).toEqual(['goal:oficina>wiki'])
  })

  it('las cuentas admiten espacios, pero cada notación de máscara es la suya', () => {
    const mask = unit('net-mask')
    const right = solutionOf(mask)

    expect(right).toEqual({
      'q0.prefix': '/16',
      'q1.decimal': '255.255.255.128',
      'q2.prefix': '/26',
      'q3.decimal': '255.255.255.252',
    })
    expect(evaluate(mask, { ...right, 'q0.prefix': ' 16 ' }).done).toBe(true)
    expect(evaluate(mask, { ...right, 'q0.prefix': '255.255.0.0' }).misses).toEqual(['q0.prefix'])
    expect(evaluate(mask, { ...right, 'q1.decimal': '/25' }).misses).toEqual(['q1.decimal'])
    expect(solutionOf(unit('net-fit'))).toEqual({
      'q0.prefix': '/26',
      'q1.prefix': '/29',
      'q2.prefix': '/25',
      'q3.prefix': '/28',
      'q4.prefix': '/26',
    })
    expect(
      evaluate(unit('net-range'), { ...solutionOf(unit('net-range')), 'q0.hosts': '256' }).misses,
    ).toEqual(['q0.hosts'])
  })

  it('solo se tocan los campos de la unidad: lo demás del esquema no se puede cambiar', () => {
    const pair = unit('net-pair')
    const cheat = { ...solutionOf(pair), 'api.eth0.ip': '10.0.5.9', 'cache.eth0.mask': '/8' }

    expect(evaluate(pair, cheat).traces[0]).toMatchObject({ ok: true, source: '10.0.5.1' })
  })
})

describe('curso de NetPractice: las estrellas cuentan las comprobaciones', () => {
  const pair = unit('net-pair')
  const wrong = encodeEntry({ 'cache.eth0.ip': '10.0.6.2' })

  it('cada fallo antes de acertar resta, y lo de después de acertar no cuenta', () => {
    expect(checkAttempt(pair, [wrong, solved(pair)])).toMatchObject({ stars: 2, commands: 2 })
    expect(checkAttempt(pair, [wrong, wrong, solved(pair)])).toMatchObject({
      stars: 2,
      commands: 3,
    })
    expect(checkAttempt(pair, [wrong, wrong, wrong, solved(pair)])).toMatchObject({
      stars: 1,
      commands: 4,
    })
    expect(checkAttempt(pair, [solved(pair), wrong, wrong])).toMatchObject({
      stars: 3,
      commands: 1,
    })
    expect(checkAttempt(pair, [wrong])).toEqual({
      done: false,
      misses: ['goal:api>cache'],
      stars: 0,
      commands: 1,
    })
  })

  it('en un jefe manda el tiempo, no las comprobaciones', () => {
    const boss = unit('net-boss-printer')
    const limit = boss.limit ?? 0

    expect(timeGoalsOf(boss)).toEqual({ three: limit / 2, two: limit * 0.75, limit })
    expect(checkAttempt(boss, [wrong, wrong, wrong, wrong, solved(boss)], 10).stars).toBe(3)
    expect(checkAttempt(boss, [solved(boss)], limit * 0.7).stars).toBe(2)
    expect(checkAttempt(boss, [solved(boss)], limit).stars).toBe(1)
    expect(checkAttempt(boss, [solved(boss)], limit + 1)).toMatchObject({
      done: false,
      misses: ['time'],
    })
  })

  it('lo imprevisible cuenta como una comprobación fallida y no rompe nada', () => {
    const junk = [
      '',
      'no es json',
      '[]',
      'null',
      '42',
      '{"cache.eth0.ip":42}',
      '{"__proto__":{"cache.eth0.ip":"10.0.5.2"}}',
      '{"constructor":"x","cache.eth0.ip":"<script>"}',
      `{"cache.eth0.ip":"${'9'.repeat(LIMITS.value * 3)}"}`,
      'x'.repeat(LIMITS.entry + 1),
    ]

    expect(checkAttempt(pair, junk)).toMatchObject({ done: false, commands: junk.length })
    expect(checkAttempt(pair, [...junk, solved(pair)])).toMatchObject({ done: true, stars: 1 })
    // Más comprobaciones que el tope: las de más no se miran.
    expect(
      checkAttempt(pair, [
        ...Array.from({ length: LIMITS.attemptEntries }, () => wrong),
        solved(pair),
      ]),
    ).toMatchObject({ done: false, commands: LIMITS.attemptEntries })
  })
})

describe('curso de NetPractice: forma del camino', () => {
  it('ids únicos, bloques de 3 a 6 unidades con su jefe y un jefe final por nivel', () => {
    expect(new Set(UNITS.map((each) => each.id)).size).toBe(UNITS.length)
    expect(UNITS.every((each) => /^net-[a-z0-9-]+$/.test(each.id))).toBe(true)
    expect(BLOCKS).toHaveLength(9)
    for (const block of BLOCKS) {
      const units = UNITS.filter((each) => each.block === block.n && each.kind === 'unit')
      const bosses = UNITS.filter((each) => each.block === block.n && each.kind === 'boss')

      expect(units.length, `bloque ${block.n}`).toBeGreaterThanOrEqual(3)
      expect(units.length, `bloque ${block.n}`).toBeLessThanOrEqual(6)
      expect(bosses).toHaveLength(1)
      expect(units.every((each) => each.tier === block.tier)).toBe(true)
      for (const boss of bosses) expect(timeGoalsOf(boss)).not.toBeNull()
      expect(estimateOfBlock(block.n)).toBeGreaterThan(600)
    }
    for (const tier of TIERS) {
      const final = unitOf(FINALS[tier])

      expect(final).toMatchObject({ kind: 'final', tier })
      // El jefe final cierra su nivel: es el último punto de él.
      expect(UNITS.filter((each) => each.tier === tier).at(-1)?.id).toBe(FINALS[tier])
      expect(estimateOfTier(tier)).toBeGreaterThan(3600)
    }

    const units = UNITS.filter((each) => each.kind === 'unit')

    expect(units.length).toBeGreaterThanOrEqual(25)
    expect(units.length).toBeLessThanOrEqual(35)
    expect(estimateOfCourse()).toBe(TIERS.reduce((sum, tier) => sum + estimateOfTier(tier), 0))
  })

  it('nombres que caben en el dibujo y cables que llevan a algún sitio', () => {
    for (const each of UNITS) {
      const example = exampleOf(each)
      const networks = [schemeOf(each)?.net, example?.kind === 'net' ? example.network : undefined]

      for (const network of networks.flatMap((one) => (one === undefined ? [] : [one]))) {
        const ids = network.nodes.map((node) => node.id)

        expect(new Set(ids).size, each.id).toBe(ids.length)
        for (const node of network.nodes) {
          expect(node.id, each.id).toMatch(/^[a-z0-9]{1,9}$/)
          for (const iface of node.ifaces) expect(iface.id, each.id).toMatch(/^[a-z0-9]{1,5}$/)
        }
        // Dos nodos no caen en la misma casilla.
        expect(new Set(network.nodes.map((node) => `${node.x},${node.y}`)).size, each.id).toBe(
          ids.length,
        )
        for (const end of network.links.flat())
          expect(ids, `${each.id}: ${end}`).toContain(end.split('.')[0])
        // Un cable no pasa por encima de otro nodo: se leería como si lo conectara.
        const at = (end: string) => network.nodes.find((node) => node.id === end.split('.')[0])

        for (const [a, b] of network.links) {
          const from = at(a)
          const to = at(b)

          if (from === undefined || to === undefined) continue
          for (const node of network.nodes) {
            const cross = (to.x - from.x) * (node.y - from.y) - (to.y - from.y) * (node.x - from.x)
            const along = (node.x - from.x) * (to.x - from.x) + (node.y - from.y) * (to.y - from.y)
            const length = (to.x - from.x) ** 2 + (to.y - from.y) ** 2

            expect(
              node !== from && node !== to && cross === 0 && along > 0 && along < length,
              `${each.id}: ${a}-${b} pasa por ${node.id}`,
            ).toBe(false)
          }
        }
      }
    }
  })

  it('cada punto tiene sus textos en castellano y en inglés, dentro del límite de palabras', () => {
    const limit = { beginner: 130, intermediate: 100, advanced: 80 }

    for (const each of UNITS)
      for (const lang of ['es', 'en'] as const) {
        const text = unitIn(each, lang)
        const where = `${each.id} ${lang}`

        expect(text.title.length, where).toBeGreaterThan(3)
        expect(text.goal.length, where).toBeGreaterThan(10)
        if (each.kind === 'unit') {
          expect(text.theory?.how.length, where).toBeGreaterThan(1)
          expect(text.theory?.problems, where).toBeDefined()
          expect(theoryWords(each, lang), where).toBeLessThanOrEqual(limit[each.tier])
          // La predicción: «Antes de verlo: …?».
          expect(text.example, where).toMatch(
            lang === 'es' ? /^Antes de verlo: .*\?$/ : /^Before you look: .*\?$/,
          )
          expect(text.example?.split(/\s+/).length, where).toBeLessThanOrEqual(25)
        } else {
          expect(text.story?.length, where).toBeGreaterThan(40)
          expect(text.tasks?.length, where).toBeGreaterThan(1)
          expect(text.theory, where).toBeUndefined()
        }
      }
    expect(unitIn(unit('net-octets'), 'ca').title).toBe(unit('net-octets').es.title)
    expect(unitIn(unit('net-octets'), 'fr').title).toBe(unit('net-octets').en.title)
  })
})
