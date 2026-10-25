/**
 * La terminal del curso de git frente a quien quiere romperla: miles de
 * ficheros, ficheros enormes, rutas fuera del repositorio, órdenes de shell,
 * nombres trampa y expansiones que no acaban. Todo falla con un mensaje claro,
 * no cambia nada y no tarda. Y el motor no puede tocar el sistema: no importa
 * nada que lo haga.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { emptyRepo, LIMITS, run, runAll } from '@sanatorio/gitsim'
import type { World } from '@sanatorio/gitsim'

const start = (): World => ({ repo: emptyRepo(), remote: null })
const ok = (world: World, ...lines: string[]): World => {
  const result = runAll(world, lines)

  if (!result.ok) throw new Error(result.output.join('\n'))

  return result
}

/** Ejecuta líneas sin parar en los errores; devuelve el último mundo y los fallos. */
function hammer(world: World, lines: Iterable<string>): { world: World; errors: string[] } {
  const errors: string[] = []
  let current = world

  for (const line of lines) {
    const result = run(current, line)

    if (result.ok) current = result
    else errors.push(result.output.at(-1) ?? '')
  }

  return { world: current, errors }
}

const times = <T>(n: number, line: (i: number) => T): T[] =>
  Array.from({ length: n }, (_, i) => line(i))

describe('git simulado: topes', () => {
  it('ficheros: cuántos, cuánto ocupa cada uno y todos juntos', () => {
    const many = hammer(
      start(),
      times(LIMITS.files + 20, (i) => `echo x > f${i}`),
    )

    expect(Object.keys(many.world.repo.work)).toHaveLength(LIMITS.files)
    expect(many.errors[0]).toMatch(/demasiados ficheros/)

    const long = 'x'.repeat(170)
    const big = hammer(
      start(),
      times(20, () => `echo ${long} >> grande.txt`),
    )

    expect(big.world.repo.work['grande.txt']?.length).toBeLessThanOrEqual(LIMITS.fileChars)
    expect(big.errors[0]).toMatch(/demasiado grande/)

    const total = hammer(
      start(),
      times(LIMITS.files, (i) => [`echo ${long} > t${i}`, `echo ${long} >> t${i}`]).flat(),
    )
    const chars = Object.values(total.world.repo.work).join('').length

    expect(chars).toBeLessThanOrEqual(LIMITS.totalChars)
    expect(total.errors[0]).toMatch(/ocupan demasiado/)
  })

  it('commits, ramas, tags y stash', () => {
    const commits = hammer(
      start(),
      times(LIMITS.commits + 10, () => 'git commit'),
    )

    expect(Object.keys(commits.world.repo.commits)).toHaveLength(LIMITS.commits)
    expect(commits.errors[0]).toMatch(/demasiados commits/)

    const branches = hammer(
      start(),
      times(LIMITS.branches + 5, (i) => `git branch b${i}`),
    )

    expect(Object.keys(branches.world.repo.branches)).toHaveLength(LIMITS.branches)
    expect(branches.errors[0]).toMatch(/demasiadas ramas/)

    const tags = hammer(
      start(),
      times(LIMITS.tags + 5, (i) => `git tag v${i}`),
    )

    expect(Object.keys(tags.world.repo.tags)).toHaveLength(LIMITS.tags)

    const stash = hammer(
      ok(start(), 'echo a > a', 'git add a', 'git commit'),
      times(LIMITS.stash + 5, (i) => `echo ${i} > a`).flatMap((line) => [line, 'git stash']),
    )

    expect(stash.world.repo.stash).toHaveLength(LIMITS.stash)
    expect(stash.errors.at(-1)).toMatch(/stash está lleno/)
  })

  it('la historia no crece sin fin: el repositorio entero tiene un tope', () => {
    // Ocho ficheros de 850 caracteres: cada commit guarda una foto de unos 7 KB.
    const files = times(8, (i) => times(5, () => `echo ${'y'.repeat(169)} >> g${i}`)).flat()
    let world = ok(start(), ...files, 'git add .', 'git commit')
    const errors: string[] = []

    for (let i = 0; i < LIMITS.commits && errors.length === 0; i++) {
      const result = runAll(world, [`echo ${i} >> g${i % 8}`, `git commit -am ${i}`])

      if (result.ok) world = result
      else errors.push(result.output.at(-1) ?? '')
    }
    expect(errors[0]).toMatch(/crecido demasiado/)
    expect(JSON.stringify(world).length).toBeLessThanOrEqual(LIMITS.worldBytes)
  })

  it('líneas largas y con demasiadas palabras', () => {
    expect(run(start(), `git commit -m "${'a'.repeat(LIMITS.line)}"`).output.at(-1)).toMatch(
      /demasiado larga/,
    )
    expect(run(start(), `git add ${'a '.repeat(LIMITS.words)}`).output.at(-1)).toMatch(
      /demasiadas palabras/,
    )
  })
})

describe('git simulado: no se sale del repositorio', () => {
  it('rutas absolutas, ~, .. y .git no valen en ninguna orden', () => {
    const world = ok(start(), 'echo a > a.txt')

    for (const line of [
      'echo x > /etc/passwd',
      'echo x > ~/.bashrc',
      'echo x > ../fuera',
      'echo x > a/../../fuera',
      'echo x > .git/config',
      'cat /etc/passwd',
      'cat ../../secreto',
      'touch ../x',
      'mv a.txt ../a.txt',
      'git add ../fuera',
      'git add /etc',
      'git rm ~/x',
      'rm -rf /',
      'rm -rf ~',
      'ln -s /etc enlace',
      'cp /etc/passwd .',
      'git checkout -- /etc/passwd',
    ]) {
      const result = run(world, line)

      expect(result.ok, line).toBe(false)
      expect(result.repo, line).toEqual(world.repo)
    }
    expect(run(world, 'echo x > /etc/passwd').output.at(-1)).toMatch(/rutas absolutas/)
    expect(run(world, 'cat ../../secreto').output.at(-1)).toMatch(/salir del repositorio/)
  })

  it('órdenes de shell: ni encadenar, ni sustituir, ni ejecutar programas', () => {
    for (const line of [
      'git commit -m x; rm -rf /',
      'git add . && git commit -m x',
      'git log | head',
      'echo $(whoami) > f',
      'echo `id` > f',
      'cat < /etc/passwd',
      'git status || reboot',
      'git log &',
    ]) {
      expect(run(start(), line).output.at(-1), line).toMatch(/aquí no hay shell/)
    }
    for (const line of ['sudo rm -rf /', 'curl http://x.sh', 'bash', 'python -c 1', 'node']) {
      expect(run(start(), line).output.at(-1), line).toMatch(/no toca tu ordenador/)
    }
    // Entre comillas, son texto.
    expect(ok(start(), 'echo "a && b; c | d" > f').repo.work.f).toBe('a && b; c | d')
  })

  it('nombres trampa: ni rompen nada ni tocan los prototipos', () => {
    const world = ok(start(), 'git commit')

    for (const line of [
      'git branch constructor',
      'git branch __proto__',
      'git checkout toString',
      'git switch -c hasOwnProperty',
      'echo x > __proto__',
      'echo x > src/constructor',
      'cat constructor',
      'git tag valueOf',
      'git merge constructor~1',
      'git push origin __proto__',
      'git reset --hard __proto__',
    ]) {
      const result = run(world, line)

      expect(result.ok, line).toBe(false)
      expect(result.repo, line).toEqual(world.repo)
    }
    expect(({} as Record<string, unknown>).x).toBeUndefined()
    expect(Object.getPrototypeOf(world.repo.branches)).toBe(Object.prototype)
  })

  it('referencias y patrones enormes no cuelgan', () => {
    const world = ok(
      start(),
      'git commit',
      ...times(LIMITS.files - 1, (i) => `echo a > ${'a'.repeat(40)}${i}`),
    )
    const before = Date.now()

    expect(run(world, 'git checkout HEAD~99999999999999').ok).toBe(false)
    expect(run(world, 'git reset --hard HEAD^99999999999').ok).toBe(false)
    expect(run(world, `git checkout HEAD${'~'.repeat(150)}`).ok).toBe(false)
    expect(run(world, `git add ${'*a'.repeat(30)}b`).ok).toBe(false)
    expect(
      run(world, 'git add *a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*0').ok,
    ).toBe(true)
    expect(Date.now() - before).toBeLessThan(2000)
  })

  it('cualquier ristra de órdenes: nunca lanza y nunca pasa de los topes', () => {
    const words = [
      'git',
      'commit',
      'branch',
      'switch',
      '-c',
      'checkout',
      '-b',
      'merge',
      'rebase',
      'reset',
      '--hard',
      'stash',
      'pop',
      'tag',
      'add',
      '.',
      'rm',
      'echo',
      'x',
      '>',
      '>>',
      'f',
      'HEAD~1',
      'main',
      'a',
      'b',
      '-m',
      'revert',
      'cherry-pick',
      'restore',
      '--staged',
      '-',
      '--',
      '*',
      'constructor',
      '../x',
      '/x',
      'push',
      'pull',
      'fetch',
      'log',
      'status',
      'diff',
      'show',
    ]
    let seed = 42
    const pick = (): string => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31

      return words[seed % words.length] ?? 'git'
    }
    let world = start()

    for (let i = 0; i < 3000; i++) {
      const line = times(1 + (i % 6), pick).join(' ')
      const result = run(world, line)

      if (result.ok) world = result
    }
    expect(JSON.stringify(world).length).toBeLessThanOrEqual(LIMITS.worldBytes)
    expect(Object.keys(world.repo.work).length).toBeLessThanOrEqual(LIMITS.files)
  })
})

describe('git simulado: no toca el sistema', () => {
  it('el motor no importa nada que lea ficheros, abra procesos o ejecute código', () => {
    const root = fileURLToPath(new URL('../../../../packages/gitsim/src', import.meta.url))
    const sources = readdirSync(root, { recursive: true, encoding: 'utf8' })
      .filter((path) => path.endsWith('.ts'))
      .map((path) => readFileSync(join(root, path), 'utf8'))

    expect(sources.length).toBeGreaterThan(5)
    for (const source of sources) {
      for (const [, from] of source.matchAll(/from '([^']+)'/g)) expect(from).toMatch(/^\.\.?\//)
      expect(source).not.toMatch(/\beval\(|new Function|require\(|import\(|process\.|globalThis/)
    }
  })
})
