/**
 * El curso de RAG (`packages/ragsim`): que cada punto se gane con su solución
 * con ★★★ (y no empiece ganado ni salga con respuestas al azar), que el
 * objetivo salga del motor, que los textos estén en los dos idiomas dentro de
 * los límites de la plantilla de explicación y que el camino tenga la forma de
 * la plantilla de cursos.
 */
import { wordsIn } from '@sanatorio/course'
import {
  accepts,
  askView,
  baseOf,
  BLOCKS,
  blockOf,
  caseView,
  checkAttempt,
  checkRun,
  encodeRun,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  exampleOf,
  FINALS,
  KNOBS,
  LIMITS,
  measure,
  missing,
  objectivesOf,
  orderView,
  parseRun,
  respond,
  starGoals,
  tally,
  targetOf,
  TIERS,
  timeGoalsOf,
  tuned,
  unitIn,
  unitOf,
  UNITS,
} from '@sanatorio/ragsim'
import type { Run, Task, Unit } from '@sanatorio/ragsim'
import { describe, expect, it } from 'vitest'

const unit = (id: string): Unit => {
  const found = unitOf(id)

  if (found === undefined) throw new Error(`falta ${id}`)

  return found
}

/** Una respuesta equivocada pero bien formada para una tarea. */
function wrong(task: Task, t: number): Run {
  switch (task.kind) {
    case 'tune':
      return { t, c: {} }
    case 'calc':
      return { t, v: task.asks.map((each) => askView(each).expected + 7) }
    case 'pick':
      return { t, p: task.cases.map(() => ['nada']) }
    case 'order':
      return { t, o: [...orderView(task).expected].reverse() }
    case 'api':
      return { t, r: { method: 'GET', path: '/nada', q: '', k: 1 } }
  }
}

describe('curso de RAG: cada punto', () => {
  for (const each of UNITS)
    it(`${each.id}: se gana con su solución y no empieza ganado`, () => {
      const seconds = each.limit === undefined ? undefined : 1
      const won = checkAttempt(each, each.solution, seconds)

      expect(won.misses).toEqual([])
      expect(won.done).toBe(true)
      expect(won.stars).toBe(3)
      expect(won.commands).toBe(each.solution.length)
      expect(checkAttempt(each, [], seconds)).toMatchObject({ done: false, stars: 0, commands: 0 })

      // Con todo mal (o con la tubería tal como viene) no sale ninguna tarea.
      const bad = each.tasks.map((task, t) => encodeRun(wrong(task, t)))

      expect(checkAttempt(each, bad, seconds).misses).toEqual(each.tasks.map((_, t) => `task:${t}`))
      for (const task of each.tasks) expect(objectivesOf(task).length).toBeGreaterThan(0)
      if (each.kind === 'unit') {
        const frames = exampleOf(each)

        expect(frames.length).toBeGreaterThan(0)
        expect(unitIn(each, 'es').frames).toHaveLength(frames.length)
        expect(unitIn(each, 'en').frames).toHaveLength(frames.length)
      }
    })
})

describe('curso de RAG: el banco de pruebas', () => {
  it('ajustar: el umbral sale de la solución y solo cuentan los mandos de la tarea', () => {
    const task = unit('rag-chunk-size').tasks[0]

    if (task?.kind !== 'tune') throw new Error('se esperaba una tarea de ajustar')

    const target = targetOf(task)

    expect(target).toEqual({ whole: 1, tokens: 165 })
    expect(measure(task, baseOf(task)).metrics.whole).toBeLessThan(0.3)
    // Lo que no es un mando de la tarea se ignora: no se puede «arreglar» por otro lado.
    expect(tuned(task, { size: 50, chunker: 'structure', mode: 'hybrid' })).toMatchObject({
      size: 50,
      chunker: 'fixed',
      mode: 'lexical',
    })
    expect(checkRun(task, { t: 0, c: { size: 50 } })).toEqual([])
    expect(checkRun(task, { t: 0, c: { size: 120 } })).toEqual(['tokens'])
    expect(checkRun(task, { t: 0, c: { size: 20 } })).toEqual(['whole'])
    // Una ejecución de otra forma no es de esta tarea.
    expect(checkRun(task, { t: 0, v: [1] })).toBeNull()
    for (const knob of task.knobs) expect(KNOBS[knob]).toBeDefined()
  })

  it('varias configuraciones equivalentes valen igual', () => {
    const bm25 = unit('rag-bm25')
    const run = (c: Record<string, unknown>): string[] => [encodeRun({ t: 0, c })]

    for (const c of [{ k1: 0.4, b: 0 }, { k1: 0 }, { k1: 1.2, b: 0 }, { k1: 0, b: 1 }])
      expect(checkAttempt(bm25, run(c)), JSON.stringify(c)).toMatchObject({ done: true, stars: 3 })
    expect(checkAttempt(bm25, run({ k1: 3, b: 0.75 })).done).toBe(false)

    const cost = unit('rag-cost')

    for (const c of [
      { depth: 5, k: 5 },
      { depth: 5, k: 3 },
      { rerank: false, k: 5 },
    ])
      expect(checkAttempt(cost, [encodeRun({ t: 0, c })]).done, JSON.stringify(c)).toBe(true)
    expect(checkAttempt(cost, [encodeRun({ t: 0, c: { depth: 20, k: 3 } })]).done).toBe(false)
  })

  it('calcular: el motor da el valor y admite el redondeo, no cualquier número', () => {
    const idf = askView({
      kind: 'idf',
      term: 'cola',
      docs: ['docs/colas.md', 'docs/reintentos.md'],
    })

    expect(idf.expected).toBeCloseTo(Math.log(1 + (7 - 3 + 0.5) / (3 + 0.5)))
    expect(idf.steps.at(-1)).toContain('0.83')
    expect(accepts(idf, 0.83)).toBe(true)
    expect(accepts(idf, 0.82)).toBe(true)
    expect(accepts(idf, 0.9)).toBe(false)
    expect(accepts(idf, Number.NaN)).toBe(false)

    const tf = askView({
      kind: 'tf',
      term: 'cola',
      chunk: 'docs/colas.md#1',
      docs: ['docs/colas.md'],
    })

    // Un entero es exacto: ni 3 ni 4,4.
    expect(tf.expected).toBe(4)
    expect(accepts(tf, 4)).toBe(true)
    expect(accepts(tf, 3)).toBe(false)
    expect(accepts(tf, 4.4)).toBe(false)

    const rrf = askView({ kind: 'rrf', question: 'dead', chunk: 'docs/reintentos.md#3' })

    expect(rrf.expected).toBeCloseTo(2 / 63)
    expect(rrf.decimals).toBe(4)
    expect(accepts(rrf, 0.0317)).toBe(true)
    expect(accepts(rrf, 0.03)).toBe(false)
  })

  it('elegir y ordenar: lo esperado lo calcula el motor', () => {
    const gold = caseView({ of: 'relevant', question: 'python', show: 5 })

    expect(gold.multi).toBe(true)
    expect(gold.options).toHaveLength(5)
    expect([...gold.expected].sort()).toEqual(['README.md#2', 'docs/instalacion.md#1'])

    const eyeball = unit('rag-eyeball').tasks[0]

    if (eyeball?.kind !== 'pick') throw new Error('se esperaba una tarea de elegir')

    const view = caseView(eyeball.cases[0] ?? { of: 'stage', question: '' })

    // En las dos preguntas de la demo gana A; en el conjunto, B.
    expect(
      view.judged.filter((each) => each.option === 'A').every((each) => each.judged.rank === 1),
    ).toBe(true)
    expect(view.expected).toEqual(['B'])
    expect(view.measured.B).toBeGreaterThan(view.measured.A ?? 1)
    // Marcar de más o de menos no vale.
    expect(checkRun(eyeball, { t: 0, p: [['A', 'B']] })).toEqual(['case:0'])
    expect(checkRun(eyeball, { t: 0, p: [] })).toEqual(['case:0'])

    const rrf = unit('rag-rrf').tasks[1]

    if (rrf?.kind !== 'order') throw new Error('se esperaba una tarea de ordenar')

    const order = orderView(rrf)

    expect(order.items.map((item) => item.id)).not.toEqual(order.expected)
    expect([...order.items.map((item) => item.id)].sort()).toEqual([...order.expected].sort())
    expect(checkRun(rrf, { t: 1, o: order.expected })).toEqual([])
    expect(checkRun(rrf, { t: 1, o: order.expected.slice(1) })).toEqual(['order'])
  })

  it('la API valida antes de trabajar', () => {
    const task = unit('rag-api').tasks[0]

    if (task?.kind !== 'api') throw new Error('se esperaba la tarea de la API')

    const call = (method: 'GET' | 'POST', path: string, q: string, k: number) =>
      respond(task, { method, path, q, k })

    expect(call('GET', '/healthz', '', 0)).toMatchObject({ status: 200, body: { status: 'ok' } })
    expect(call('GET', '/answer', 'heartbeat', 3)).toMatchObject({ status: 405 })
    expect(call('POST', '/nada', 'heartbeat', 3)).toMatchObject({ status: 404 })
    expect(call('POST', '/answer', '', 3).body).toEqual({ error: 'empty_query' })
    // Una pregunta que no está entre las de la tarea es una consulta vacía.
    expect(call('POST', '/answer', 'legacy', 3).body).toEqual({ error: 'empty_query' })
    for (const k of [0, -1, 2.5, 11, 1e9])
      expect(call('POST', '/answer', 'heartbeat', k).body, String(k)).toEqual({
        error: 'k_out_of_range',
      })
    expect(call('GET', '/search', 'heartbeat', 2)).toMatchObject({
      status: 200,
      body: { sources: [{ n: 1, path: 'docs/workers.md' }, { n: 2 }] },
    })
    expect(call('POST', '/answer', 'price', 3)).toMatchObject({
      status: 200,
      body: { answer: null, cites: null },
    })
    expect(
      checkRun(task, { t: 0, r: { method: 'POST', path: '/answer', q: 'heartbeat', k: 2 } }),
    ).toEqual(['body'])
  })
})

describe('curso de RAG: estrellas y corrección', () => {
  it('cuentan las comprobaciones: mirar no, lo mal formado tampoco, y lo de después de ganar, menos', () => {
    const why = unit('rag-why')
    const off = encodeRun({ t: 0, c: { context: false } })
    const on = encodeRun({ t: 0, c: { context: true } })

    expect(starGoals(why)).toEqual({ three: 3, two: 6 })
    expect(checkAttempt(why, [on])).toMatchObject({ done: true, stars: 3, commands: 1 })
    expect(checkAttempt(why, [off, off, on])).toMatchObject({ stars: 3, commands: 3 })
    expect(checkAttempt(why, [off, off, off, on])).toMatchObject({ stars: 2, commands: 4 })
    expect(checkAttempt(why, [...Array<string>(6).fill(off), on])).toMatchObject({
      stars: 1,
      commands: 7,
    })
    // Lo que no es una ejecución no cuenta ni rompe; lo de después de ganar no suma.
    expect(
      checkAttempt(why, ['', 'hola', '{', '[]', '{"t":9,"c":{}}', '{"t":0}', on, off, off]),
    ).toMatchObject({ done: true, stars: 3, commands: 1 })
    expect(tally(why, [off]).last).toEqual([['answers', 'invented']])
    expect(missing(tally(why, [off]))).toEqual(['task:0'])
  })

  it('un jefe necesita todas sus tareas y va por tiempo', () => {
    const boss = unit('rag-boss-invents')
    const [first, second] = boss.solution

    if (first === undefined || second === undefined) throw new Error('el jefe tiene dos tareas')
    expect(timeGoalsOf(boss)).toEqual({ three: 120, two: 180, limit: 240 })
    expect(timeGoalsOf(unit('rag-why'))).toBeNull()
    expect(checkAttempt(boss, [first], 10)).toMatchObject({ done: false, misses: ['task:1'] })
    // El orden de las tareas da igual.
    expect(checkAttempt(boss, [second, first], 100)).toMatchObject({ done: true, stars: 3 })
    expect(checkAttempt(boss, boss.solution, 150).stars).toBe(2)
    expect(checkAttempt(boss, boss.solution, 240).stars).toBe(1)
    expect(checkAttempt(boss, boss.solution, 241)).toMatchObject({
      done: false,
      stars: 0,
      misses: ['time'],
    })
    expect(checkAttempt(boss, boss.solution)).toMatchObject({ done: false, misses: ['time'] })
  })

  it('topes: ejecuciones largas, demasiadas o con formas raras', () => {
    const why = unit('rag-why')
    const on = encodeRun({ t: 0, c: { context: true } })

    expect(parseRun(`{"t":0,"c":{"x":"${'a'.repeat(LIMITS.entry)}"}}`)).toBeNull()
    expect(parseRun('{"t":0.5,"c":{}}')).toBeNull()
    expect(parseRun('{"t":-1,"c":{}}')).toBeNull()
    expect(
      parseRun(
        `{"t":0,"v":[${Array(LIMITS.values + 1)
          .fill(1)
          .join(',')}]}`,
      ),
    ).toBeNull()
    expect(parseRun('{"t":0,"v":["1"]}')).toBeNull()
    expect(parseRun('{"t":0,"p":[["a"],"b"]}')).toBeNull()
    expect(parseRun('{"t":0,"r":{"method":"DELETE","path":"/answer","q":"x","k":1}}')).toBeNull()
    expect(parseRun('{"t":0,"r":{"method":"GET","path":"/search","q":"x","k":1e308}}')).toEqual({
      t: 0,
      r: { method: 'GET', path: '/search', q: 'x', k: 1000 },
    })
    expect(parseRun('{"t":1,"o":["a","b"]}')).toEqual({ t: 1, o: ['a', 'b'] })
    // Más ejecuciones de las que se corrigen: las de detrás ni se miran.
    const flood = [...Array<string>(LIMITS.attemptEntries).fill('{"t":0,"c":{}}'), on]

    expect(checkAttempt(why, flood)).toMatchObject({ done: false, commands: LIMITS.attemptEntries })
    // Mandos disparatados: se recortan a sus topes, no cuelgan nada.
    expect(
      checkAttempt(unit('rag-chunk-size'), [encodeRun({ t: 0, c: { size: 1e12 } })]).done,
    ).toBe(false)
  })
})

describe('curso de RAG: forma del camino', () => {
  it('ids únicos, bloques de 3 a 6 unidades con su jefe y un jefe final por nivel', () => {
    expect(new Set(UNITS.map((each) => each.id)).size).toBe(UNITS.length)
    expect(UNITS.filter((each) => each.kind === 'unit').length).toBeGreaterThanOrEqual(25)
    expect(UNITS.filter((each) => each.kind === 'unit').length).toBeLessThanOrEqual(35)
    expect(BLOCKS).toHaveLength(9)
    for (const block of BLOCKS) {
      const units = UNITS.filter((each) => each.block === block.n && each.kind === 'unit')
      const bosses = UNITS.filter((each) => each.block === block.n && each.kind === 'boss')

      expect(units.length).toBeGreaterThanOrEqual(3)
      expect(units.length).toBeLessThanOrEqual(6)
      expect(bosses).toHaveLength(1)
      for (const boss of bosses) expect(timeGoalsOf(boss)).not.toBeNull()
      expect(units.every((each) => each.tier === block.tier)).toBe(true)
      expect(estimateOfBlock(block.n)).toBeGreaterThan(600)
    }
    for (const tier of TIERS) {
      const final = UNITS.find((each) => each.id === FINALS[tier])

      expect(final?.kind).toBe('final')
      expect(final?.tier).toBe(tier)
      // El jefe final cierra su nivel: es el último punto de él.
      expect(UNITS.filter((each) => each.tier === tier).at(-1)?.id).toBe(FINALS[tier])
      expect(estimateOfTier(tier)).toBeGreaterThan(1800)
    }
    expect(estimateOfCourse()).toBeGreaterThan(3 * 3600)
    expect(estimateOf(unit('rag-why'))).toBeGreaterThanOrEqual(120)
    expect(blockOf(1)?.tier).toBe('beginner')
    expect(blockOf(99)).toBeUndefined()
  })

  it('cada punto tiene sus textos en castellano y en inglés, dentro de los límites', () => {
    const limit = { beginner: 130, intermediate: 100, advanced: 80 }

    for (const each of UNITS)
      for (const lang of ['es', 'en']) {
        const text = unitIn(each, lang)
        const where = `${each.id} ${lang}`

        expect(text.title.length, where).toBeGreaterThan(3)
        expect(text.goal.length, where).toBeGreaterThan(10)
        if (each.kind === 'unit') {
          const theory = text.theory

          expect(theory?.how.length, where).toBeGreaterThan(1)
          expect(theory?.how.length, where).toBeLessThanOrEqual(5)
          expect(theory?.problems, where).toBeDefined()
          expect(theory?.whenNot, where).toBeDefined()
          // Plantilla de explicación: palabras por nivel y la pregunta de predicción.
          expect(
            wordsIn(theory?.what, theory?.how, theory?.when, theory?.whenNot, theory?.problems),
            where,
          ).toBeLessThanOrEqual(limit[each.tier])
          expect(text.example, where).toMatch(/^(Antes de verlo|Before you look): /)
          expect(wordsIn(text.example), where).toBeLessThanOrEqual(25)
          for (const line of theory?.how ?? [])
            expect(
              (line.split('#')[1] ?? '').trim().length,
              `${where}: ${line}`,
            ).toBeLessThanOrEqual(45)
        } else {
          expect(text.story, where).toBeDefined()
          // Una tarea escrita por cada banco de pruebas del jefe.
          expect(text.tasks, where).toHaveLength(each.tasks.length)
        }
      }
    expect(unitIn(unit('rag-why'), 'ca').title).toBe(unit('rag-why').es.title)
    expect(unitIn(unit('rag-why'), 'fr').title).toBe(unit('rag-why').en.title)
  })

  it('cada bloque dice qué pieza de tu RAG ya puedes escribir, sin dar la solución', () => {
    for (const block of BLOCKS)
      for (const text of [block.es, block.en]) {
        expect(text.title.length).toBeGreaterThan(3)
        expect(text.pitch.length).toBeGreaterThan(10)
        expect(text.build.piece.length).toBeGreaterThan(20)
        expect(text.build.verify.length).toBeGreaterThan(40)
        expect(text.build.skeleton.length).toBeGreaterThan(4)
        expect(text.build.skeleton.length).toBeLessThanOrEqual(12)
        // Un esqueleto: comentarios que dicen qué hacer, no el código que lo hace.
        expect(text.build.skeleton.filter((line) => line.includes('#')).length).toBeGreaterThan(3)
        expect(text.build.skeleton.every((line) => line.length <= 80)).toBe(true)
        expect(block.es.build.skeleton.length).toBe(block.en.build.skeleton.length)
        expect(block.jobs.length).toBeGreaterThan(0)
      }
  })
})
