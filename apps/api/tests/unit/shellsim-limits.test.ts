/**
 * Topes de la shell simulada (`packages/shellsim/src/limits.ts`): nada de lo
 * que se escriba cuelga la pestaña o la API, llena la memoria o sale del
 * simulador. Lo que se pasa falla con un mensaje y el mundo queda como estaba.
 */
import { LIMITS, run, startOf, UNITS } from '@sanatorio/shellsim'
import type { World } from '@sanatorio/shellsim'
import { describe, expect, it } from 'vitest'

const FIRST = UNITS.find((unit) => unit.id === 'ls') ?? UNITS[0]

if (FIRST === undefined) throw new Error('el curso no tiene unidades')
const START = FIRST

const start = (): World => startOf(START)

function timed(world: World, entry: string) {
  const t = Date.now()
  const result = run(world, entry)

  return { ...result, ms: Date.now() - t }
}

describe('shell simulada: topes', () => {
  it('los bucles sin fin, la recursión y las bombas se paran', () => {
    for (const entry of [
      'while true; do :; done',
      'until false; do echo x > /dev/null; done',
      'for ((i=0; ; i++)); do :; done',
      'f() { f; }; f',
      ':(){ :|:& };:',
      "printf '#!/bin/bash\\n./s.sh\\n' > s.sh; chmod +x s.sh; ./s.sh",
      'echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo $(echo hola)))))))))))))',
      "awk 'BEGIN { while (1) n++ }'",
    ]) {
      const result = timed(start(), entry)

      expect(result.ok, entry).toBe(false)
      expect(result.ms, entry).toBeLessThan(3000)
      expect(result.output.join(' '), entry).toMatch(/peer4u-sandbox|demasiad|bucle/)
    }
  })

  it('las expresiones regulares van en tiempo lineal (sin ReDoS)', () => {
    const world = run(start(), `echo ${'a'.repeat(150)}! > a.txt`).world

    for (const pattern of [
      "grep -E '(a+)+$' a.txt",
      "grep -E '(a|aa)*b' a.txt",
      "sed -E 's/(a*)*b/x/' a.txt",
      "awk '/(a+)+b/' a.txt",
      "grep -E '.*.*.*.*.*.*.*b' a.txt",
    ]) {
      const result = timed(world, pattern)

      expect(result.ms, pattern).toBeLessThan(2000)
    }
    expect(run(world, "grep -E '\\(a\\)\\1' a.txt").code).toBe(2)
  })

  it('las órdenes, los ficheros y la salida tienen tope', () => {
    expect(run(start(), 'x'.repeat(LIMITS.entry + 1)).output[0]).toMatch(/demasiado larga/)
    expect(
      run(start(), Array.from({ length: LIMITS.entryLines + 1 }, () => 'true').join('\n'))
        .output[0],
    ).toMatch(/demasiadas líneas/)
    expect(run(start(), 'touch f{1..500}').output.join(' ')).toMatch(/demasiados ficheros/)
    expect(
      run(
        start(),
        'seq 1000 > n.txt; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do cat n.txt n.txt >> big.txt; done',
      ).output.join(' '),
    ).toMatch(/demasiado grande/)
    expect(run(start(), 'echo {1..5000}').output.join(' ')).toMatch(/demasiadas palabras/)
    expect(run(start(), 'seq 100000').code).toBe(1)
    expect(run(start(), 'yes').code).toBe(1)

    const big = run(start(), 'for i in $(seq 900); do cat /var/log/nginx/access.log; done')

    expect(big.output.join('\n').length).toBeLessThan(LIMITS.output + 1000)
    expect(big.output.at(-1)).toMatch(/salida cortada/)
  })

  it('lo que falla por un tope deja el mundo como estaba', () => {
    const world = start()
    const result = run(world, 'mkdir intento; touch f{1..500}')

    expect(result.ok).toBe(false)
    expect(result.world).toBe(world)
    expect(run(result.world, 'ls intento').code).toBe(2)
  })

  it('no hay forma de salir del simulador ni de romperlo', () => {
    // No hay sistema de verdad debajo: todo esto falla o no toca nada fuera del mundo.
    expect(run(start(), 'rm -rf /').output[0]).toMatch(/dangerous/)
    expect(run(start(), 'sudo rm -rf /etc').output[0]).toMatch(/peer4u-sandbox/)
    expect(run(start(), 'cat /etc/shadow').code).toBe(1)
    expect(run(start(), 'cd ../../../../..; pwd').output[0]).toBe('/')
    expect(run(start(), 'node -e "process.exit(1)"').code).toBe(127)
    expect(run(start(), 'python3 -c "import os"').code).toBe(127)
    expect(run(start(), 'vim f').output[0]).toMatch(/editor/)
    // Los nombres de JavaScript no rompen los objetos del estado.
    for (const entry of [
      'touch __proto__',
      'mkdir constructor',
      '__proto__=1',
      'export toString=1',
      'sudo useradd __proto__',
      'cat hasOwnProperty',
    ])
      expect(run(start(), entry).output.join(' '), entry).not.toMatch(/error inesperado/)
    expect(run(start(), 'type constructor').code).toBe(1)
  })

  it('la API vuelve a ejecutar un intento largo en poco tiempo', () => {
    const unit = UNITS.find((each) => each.id === 'final-advanced')

    if (unit === undefined) throw new Error('falta el jefe final')

    let world = startOf(unit)
    const t = Date.now()

    for (let i = 0; i < LIMITS.attemptEntries; i++)
      world = run(
        world,
        i % 2 === 0
          ? 'ls -la /var/log'
          : "awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 3",
      ).world
    expect(Date.now() - t).toBeLessThan(15_000)
  }, 30_000)
})
